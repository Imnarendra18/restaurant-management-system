import { query } from "./_generated/server";

// Get admin dashboard statistics
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Today's orders
    const todayOrders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), todayStart),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    const todaySales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Monthly orders
    const monthlyOrders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), monthStart),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Active staff count
    const activeStaff = await ctx.db
      .query("staff")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Low stock items
    const ingredients = await ctx.db.query("ingredients").collect();
    const lowStockItems = ingredients.filter(
      (i) => i.currentStock <= i.reorderLevel && i.isActive
    ).length;

    // Total menu items
    const menuItems = await ctx.db
      .query("menuItems")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Tables status
    const tables = await ctx.db.query("tables").collect();
    const occupiedTables = tables.filter((t) => t.status === "occupied").length;
    const availableTables = tables.filter((t) => t.status === "available").length;

    // Recent orders
    const recentOrders = await ctx.db
      .query("orders")
      .order("desc")
      .take(5);

    const recentOrdersWithDetails = await Promise.all(
      recentOrders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        return {
          id: order._id,
          orderNumber: order.orderNumber,
          type: order.orderType,
          status: order.status,
          total: order.grandTotal,
          itemCount: items.length,
          createdAt: order.createdAt,
        };
      })
    );

    // Categories with item counts
    const categories = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const categoryStats = await Promise.all(
      categories.map(async (cat) => {
        const items = await ctx.db
          .query("menuItems")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", cat._id))
          .collect();

        return {
          id: cat._id,
          name: cat.name,
          itemCount: items.filter((i) => i.isActive).length,
        };
      })
    );

    return {
      todaySales,
      todayOrders: todayOrders.length,
      monthlyRevenue,
      activeStaff: activeStaff.length,
      lowStockItems,
      totalMenuItems: menuItems.length,
      occupiedTables,
      availableTables,
      totalTables: tables.length,
      recentOrders: recentOrdersWithDetails,
      categoryStats,
    };
  },
});

// Get cashier session summary for close session
export const getSessionSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Get current open session
    const session = await ctx.db
      .query("cashierSessions")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .filter((q) => q.eq(q.field("cashierId"), identity.subject as any))
      .first();

    if (!session) return null;

    // Get all orders for this session
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    // Get all payments for this session
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    // Calculate totals
    const totalSales = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const cashSales = payments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + p.amount, 0);

    const cardSales = payments
      .filter((p) => p.method === "card")
      .reduce((sum, p) => sum + p.amount, 0);

    const qrSales = payments
      .filter((p) => p.method === "qr" || p.method === "fonepay")
      .reduce((sum, p) => sum + p.amount, 0);

    const creditSales = payments
      .filter((p) => p.method === "credit")
      .reduce((sum, p) => sum + p.amount, 0);

    const expectedCash = session.openingCash + cashSales;

    return {
      sessionId: session._id,
      openingCash: session.openingCash,
      totalSales,
      totalOrders: orders.filter((o) => o.status !== "cancelled").length,
      cashSales,
      cardSales,
      qrSales,
      creditSales,
      expectedCash,
      openedAt: session.openedAt,
    };
  },
});
