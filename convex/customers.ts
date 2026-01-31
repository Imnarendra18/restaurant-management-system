import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all customers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get single customer
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get customers with credit balance
export const getWithCredit = query({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db
      .query("customers")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.gt(q.field("currentCredit"), 0)
        )
      )
      .collect();

    // Get pending orders for each customer
    const customersWithOrders = await Promise.all(
      customers.map(async (customer) => {
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_customerId", (q) => q.eq("customerId", customer._id))
          .filter((q) => q.eq(q.field("paymentStatus"), "credit"))
          .collect();

        return {
          ...customer,
          creditOrders: orders,
        };
      })
    );

    return customersWithOrders;
  },
});

// Get credit orders for a customer
export const getCreditOrders = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .filter((q) => q.eq(q.field("paymentStatus"), "credit"))
      .collect();

    return orders;
  },
});

// Get credit transactions (payments made against credit)
export const getCreditTransactions = query({
  args: { customerId: v.optional(v.id("customers")) },
  handler: async (ctx, { customerId }) => {
    // Get credit payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_method", (q) => q.eq("method", "credit"))
      .collect();

    if (!customerId) {
      // Get all credit transactions with customer info
      const transactionsWithDetails = await Promise.all(
        payments.map(async (payment) => {
          const order = await ctx.db.get(payment.orderId);
          if (!order || !order.customerId) return null;

          const customer = await ctx.db.get(order.customerId);
          return {
            id: payment._id,
            date: payment.createdAt,
            customerId: order.customerId,
            customerName: customer?.name || "Unknown",
            orderNumber: order.orderNumber,
            type: "credit",
            amount: payment.amount,
          };
        })
      );

      return transactionsWithDetails.filter((t) => t !== null);
    }

    // Get transactions for specific customer
    const customerOrders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .collect();

    const orderIds = new Set(customerOrders.map((o) => o._id));
    const customerPayments = payments.filter((p) => orderIds.has(p.orderId));

    return customerPayments.map((p) => {
      const order = customerOrders.find((o) => o._id === p.orderId);
      return {
        id: p._id,
        date: p.createdAt,
        orderNumber: order?.orderNumber || "",
        type: "credit",
        amount: p.amount,
      };
    });
  },
});

// Create customer
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("customers", {
      ...args,
      currentCredit: 0,
      totalOrders: 0,
      totalSpent: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update customer
export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, {
      ...filtered,
      updatedAt: Date.now(),
    });
  },
});

// Record credit payment
export const recordCreditPayment = mutation({
  args: {
    customerId: v.id("customers"),
    amount: v.number(),
    orderId: v.optional(v.id("orders")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, amount, orderId, notes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await ctx.db.get(customerId);
    if (!customer) throw new Error("Customer not found");

    if (amount > customer.currentCredit) {
      throw new Error("Payment amount exceeds credit balance");
    }

    const now = Date.now();

    // Update customer credit balance
    await ctx.db.patch(customerId, {
      currentCredit: customer.currentCredit - amount,
      updatedAt: now,
    });

    // If specific order, update its payment status
    if (orderId) {
      const order = await ctx.db.get(orderId);
      if (order) {
        // Get total payments for this order
        const existingPayments = await ctx.db
          .query("payments")
          .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
          .collect();

        const totalPaid =
          existingPayments.reduce((sum, p) => sum + p.amount, 0) + amount;

        // Get active session
        const session = await ctx.db
          .query("cashierSessions")
          .withIndex("by_status", (q) => q.eq("status", "open"))
          .first();

        if (session) {
          // Record payment
          await ctx.db.insert("payments", {
            orderId,
            sessionId: session._id,
            method: "cash",
            amount,
            notes: notes || "Credit payment",
            receivedBy: identity.subject as any,
            createdAt: now,
          });
        }

        // Update order status
        await ctx.db.patch(orderId, {
          paymentStatus: totalPaid >= order.grandTotal ? "paid" : "partial",
          updatedAt: now,
        });
      }
    }

    return { success: true, newBalance: customer.currentCredit - amount };
  },
});

// Delete customer (soft delete)
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});
