import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get active session for a cashier
export const getActive = query({
  args: { cashierId: v.string() }, // Better Auth user ID
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cashierSessions")
      .withIndex("by_cashierId", (q) => q.eq("cashierId", args.cashierId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();
  },
});

// Get session by ID
export const getById = query({
  args: { id: v.id("cashierSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get today's session
export const getTodaySession = query({
  args: { cashierId: v.string() }, // Better Auth user ID
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return await ctx.db
      .query("cashierSessions")
      .withIndex("by_cashierId", (q) => q.eq("cashierId", args.cashierId))
      .filter((q) => q.gte(q.field("sessionDate"), todayTimestamp))
      .first();
  },
});

// Get session summary
export const getSummary = query({
  args: { sessionId: v.id("cashierSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Get all orders for this session
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get all payments for this session
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Calculate totals by payment method
    const cashTotal = payments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + p.amount, 0);

    const cardTotal = payments
      .filter((p) => p.method === "card")
      .reduce((sum, p) => sum + p.amount, 0);

    const qrTotal = payments
      .filter((p) => p.method === "qr" || p.method === "fonepay")
      .reduce((sum, p) => sum + p.amount, 0);

    const creditTotal = payments
      .filter((p) => p.method === "credit")
      .reduce((sum, p) => sum + p.amount, 0);

    const completedOrders = orders.filter((o) => o.status === "completed");
    const cancelledOrders = orders.filter((o) => o.status === "cancelled");

    return {
      session,
      orders: {
        total: orders.length,
        completed: completedOrders.length,
        cancelled: cancelledOrders.length,
      },
      sales: {
        cash: cashTotal,
        card: cardTotal,
        qr: qrTotal,
        credit: creditTotal,
        total: cashTotal + cardTotal + qrTotal,
        grandTotal: cashTotal + cardTotal + qrTotal + creditTotal,
      },
      expectedCash: session.openingCash + cashTotal,
    };
  },
});

// Open a new session
export const open = mutation({
  args: {
    cashierId: v.string(), // Better Auth user ID
    openingCash: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if there's already an open session
    const existingSession = await ctx.db
      .query("cashierSessions")
      .withIndex("by_cashierId", (q) => q.eq("cashierId", args.cashierId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    if (existingSession) {
      throw new Error("You already have an open session. Please close it first.");
    }

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await ctx.db.insert("cashierSessions", {
      cashierId: args.cashierId,
      sessionDate: today.getTime(),
      openingCash: args.openingCash,
      totalCashSales: 0,
      totalCardSales: 0,
      totalQrSales: 0,
      totalCreditSales: 0,
      totalOrders: 0,
      status: "open",
      openedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Close a session
export const close = mutation({
  args: {
    sessionId: v.id("cashierSessions"),
    closingCash: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status === "closed") {
      throw new Error("Session is already closed");
    }

    // Calculate expected cash
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const cashSales = payments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + p.amount, 0);

    const expectedCash = session.openingCash + cashSales;
    const variance = args.closingCash - expectedCash;

    const now = Date.now();

    return await ctx.db.patch(args.sessionId, {
      closingCash: args.closingCash,
      expectedCash,
      cashVariance: variance,
      status: "closed",
      closedAt: now,
      notes: args.notes,
      updatedAt: now,
    });
  },
});

// Update session totals (called when payment is made)
export const updateTotals = mutation({
  args: {
    sessionId: v.id("cashierSessions"),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("qr"),
      v.literal("fonepay"),
      v.literal("credit")
    ),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const updates: Record<string, number> = { updatedAt: Date.now() };

    switch (args.paymentMethod) {
      case "cash":
        updates.totalCashSales = session.totalCashSales + args.amount;
        break;
      case "card":
        updates.totalCardSales = session.totalCardSales + args.amount;
        break;
      case "qr":
      case "fonepay":
        updates.totalQrSales = session.totalQrSales + args.amount;
        break;
      case "credit":
        updates.totalCreditSales = session.totalCreditSales + args.amount;
        break;
    }

    return await ctx.db.patch(args.sessionId, updates);
  },
});

// Increment order count
export const incrementOrderCount = mutation({
  args: { sessionId: v.id("cashierSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    return await ctx.db.patch(args.sessionId, {
      totalOrders: session.totalOrders + 1,
      updatedAt: Date.now(),
    });
  },
});

// Get session history
export const getHistory = query({
  args: {
    cashierId: v.optional(v.string()), // Better Auth user ID
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let sessions;

    if (args.cashierId) {
      sessions = await ctx.db
        .query("cashierSessions")
        .withIndex("by_cashierId", (q) => q.eq("cashierId", args.cashierId!))
        .collect();
    } else {
      sessions = await ctx.db.query("cashierSessions").collect();
    }

    if (args.startDate) {
      sessions = sessions.filter((s) => s.sessionDate >= args.startDate!);
    }

    if (args.endDate) {
      sessions = sessions.filter((s) => s.sessionDate <= args.endDate!);
    }

    // Sort by date descending
    sessions.sort((a, b) => b.sessionDate - a.sessionDate);

    return sessions;
  },
});
