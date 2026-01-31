import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get payments by order
export const getByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

// Get payments by session
export const getBySession = query({
  args: { sessionId: v.id("cashierSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Get payment summary by method
export const getSummaryByMethod = query({
  args: { sessionId: v.id("cashierSessions") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const summary = {
      cash: 0,
      card: 0,
      qr: 0,
      fonepay: 0,
      credit: 0,
      total: 0,
    };

    for (const payment of payments) {
      summary[payment.method] += payment.amount;
      summary.total += payment.amount;
    }

    return summary;
  },
});

// Process a payment
export const process = mutation({
  args: {
    orderId: v.id("orders"),
    sessionId: v.id("cashierSessions"),
    method: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("qr"),
      v.literal("fonepay"),
      v.literal("credit")
    ),
    amount: v.number(),
    reference: v.optional(v.string()),
    receivedBy: v.string(), // Better Auth user ID
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    // Create payment record
    const paymentId = await ctx.db.insert("payments", {
      orderId: args.orderId,
      sessionId: args.sessionId,
      method: args.method,
      amount: args.amount,
      reference: args.reference,
      receivedBy: args.receivedBy,
      notes: args.notes,
      createdAt: now,
    });

    // Get all payments for this order
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Update order payment status
    let paymentStatus: "unpaid" | "partial" | "paid" | "credit" = "unpaid";
    if (args.method === "credit") {
      paymentStatus = "credit";
    } else if (totalPaid >= order.grandTotal) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    }

    await ctx.db.patch(args.orderId, {
      paymentStatus,
      updatedAt: now,
    });

    // Update session totals
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      const updateField = {
        cash: "totalCashSales",
        card: "totalCardSales",
        qr: "totalQrSales",
        fonepay: "totalQrSales",
        credit: "totalCreditSales",
      }[args.method];

      await ctx.db.patch(args.sessionId, {
        [updateField]: (session as any)[updateField] + args.amount,
        updatedAt: now,
      });
    }

    // If credit payment, update customer credit balance
    if (args.method === "credit" && order.customerId) {
      const customer = await ctx.db.get(order.customerId);
      if (customer) {
        await ctx.db.patch(order.customerId, {
          currentCredit: customer.currentCredit + args.amount,
          updatedAt: now,
        });
      }
    }

    return paymentId;
  },
});

// Process split payment
export const processSplit = mutation({
  args: {
    orderId: v.id("orders"),
    sessionId: v.id("cashierSessions"),
    receivedBy: v.string(), // Better Auth user ID
    payments: v.array(
      v.object({
        method: v.union(
          v.literal("cash"),
          v.literal("card"),
          v.literal("qr"),
          v.literal("fonepay"),
          v.literal("credit")
        ),
        amount: v.number(),
        reference: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();
    const paymentIds = [];

    for (const payment of args.payments) {
      if (payment.amount <= 0) continue;

      const paymentId = await ctx.db.insert("payments", {
        orderId: args.orderId,
        sessionId: args.sessionId,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference,
        receivedBy: args.receivedBy,
        createdAt: now,
      });

      paymentIds.push(paymentId);

      // Update session totals
      const session = await ctx.db.get(args.sessionId);
      if (session) {
        const updateField = {
          cash: "totalCashSales",
          card: "totalCardSales",
          qr: "totalQrSales",
          fonepay: "totalQrSales",
          credit: "totalCreditSales",
        }[payment.method];

        await ctx.db.patch(args.sessionId, {
          [updateField]: (session as any)[updateField] + payment.amount,
          updatedAt: now,
        });
      }

      // If credit payment, update customer credit balance
      if (payment.method === "credit" && order.customerId) {
        const customer = await ctx.db.get(order.customerId);
        if (customer) {
          await ctx.db.patch(order.customerId, {
            currentCredit: customer.currentCredit + payment.amount,
            updatedAt: now,
          });
        }
      }
    }

    // Get all payments for this order
    const allPayments = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const hasCredit = allPayments.some((p) => p.method === "credit");

    // Update order payment status
    let paymentStatus: "unpaid" | "partial" | "paid" | "credit" = "unpaid";
    if (hasCredit && totalPaid >= order.grandTotal) {
      paymentStatus = "credit";
    } else if (totalPaid >= order.grandTotal) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    }

    await ctx.db.patch(args.orderId, {
      paymentStatus,
      updatedAt: now,
    });

    return paymentIds;
  },
});

// Record credit payment (customer paying off credit)
export const recordCreditPayment = mutation({
  args: {
    customerId: v.id("customers"),
    amount: v.number(),
    method: v.union(v.literal("cash"), v.literal("card"), v.literal("qr")),
    reference: v.optional(v.string()),
    receivedBy: v.string(), // Better Auth user ID
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    if (args.amount > customer.currentCredit) {
      throw new Error("Payment amount exceeds outstanding credit");
    }

    const now = Date.now();

    // Update customer credit balance
    await ctx.db.patch(args.customerId, {
      currentCredit: customer.currentCredit - args.amount,
      updatedAt: now,
    });

    // We could also create an accounting entry here for the credit payment
    // This would be implemented in the accounting module

    return { success: true, newBalance: customer.currentCredit - args.amount };
  },
});
