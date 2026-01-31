import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = date.getTime().toString().slice(-6);
  return `ORD-${dateStr}-${timeStr}`;
};

// Get order by ID with full details
export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    // Get order items
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    // Get related data
    const table = order.tableId ? await ctx.db.get(order.tableId) : null;
    const customer = order.customerId ? await ctx.db.get(order.customerId) : null;
    const waiter = order.waiterId ? await ctx.db.get(order.waiterId) : null;
    const discount = order.discountId ? await ctx.db.get(order.discountId) : null;

    // Get payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    return {
      ...order,
      items: orderItems,
      table,
      customer,
      waiter,
      discount,
      payments,
    };
  },
});

// Get order by table ID
export const getByTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table || !table.currentOrderId) return null;

    return await ctx.db.get(table.currentOrderId);
  },
});

// Get active order with items for a table
export const getActiveOrderWithItems = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table || !table.currentOrderId) return null;

    const order = await ctx.db.get(table.currentOrderId);
    if (!order) return null;

    // Get order items
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", table.currentOrderId!))
      .collect();

    return {
      ...order,
      items: orderItems,
    };
  },
});

// Get active orders (not completed or cancelled)
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();

    return orders.filter(
      (o) => o.status !== "completed" && o.status !== "cancelled"
    );
  },
});

// Get orders by session
export const getBySession = query({
  args: { sessionId: v.id("cashierSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Get today's orders
export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .filter((q) => q.gte(q.field("createdAt"), todayTimestamp))
      .collect();
  },
});

// Create a new order
export const create = mutation({
  args: {
    orderType: v.union(v.literal("dine_in"), v.literal("takeaway"), v.literal("delivery")),
    tableId: v.optional(v.id("tables")),
    customerId: v.optional(v.id("customers")),
    waiterId: v.optional(v.id("staff")),
    cashierId: v.string(), // Better Auth user ID
    sessionId: v.id("cashierSessions"),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const orderNumber = generateOrderNumber();

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      orderType: args.orderType,
      tableId: args.tableId,
      customerId: args.customerId,
      waiterId: args.waiterId,
      cashierId: args.cashierId,
      sessionId: args.sessionId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerAddress: args.customerAddress,
      remarks: args.remarks,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      serviceCharge: 0,
      grandTotal: 0,
      status: "pending",
      paymentStatus: "unpaid",
      createdAt: now,
      updatedAt: now,
    });

    // If dine-in, update table status
    if (args.tableId) {
      await ctx.db.patch(args.tableId, {
        status: "occupied",
        currentOrderId: orderId,
        updatedAt: now,
      });
    }

    return orderId;
  },
});

// Add item to order
export const addItem = mutation({
  args: {
    orderId: v.id("orders"),
    menuItemId: v.id("menuItems"),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const menuItem = await ctx.db.get(args.menuItemId);
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    const now = Date.now();
    const totalPrice = menuItem.price * args.quantity;

    // Check if item already exists in order
    const existingItem = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .filter((q) => q.eq(q.field("menuItemId"), args.menuItemId))
      .first();

    if (existingItem && !args.notes) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + args.quantity;
      const newTotalPrice = menuItem.price * newQuantity;

      await ctx.db.patch(existingItem._id, {
        quantity: newQuantity,
        totalPrice: newTotalPrice,
        updatedAt: now,
      });
    } else {
      // Add new item
      await ctx.db.insert("orderItems", {
        orderId: args.orderId,
        menuItemId: args.menuItemId,
        menuItemName: menuItem.name,
        quantity: args.quantity,
        unitPrice: menuItem.price,
        totalPrice,
        notes: args.notes,
        status: "pending",
        kotPrinted: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Recalculate order totals
    await recalculateOrderTotals(ctx, args.orderId);

    return { success: true };
  },
});

// Update item quantity
export const updateItemQuantity = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem) {
      throw new Error("Order item not found");
    }

    if (args.quantity <= 0) {
      // Remove item if quantity is 0 or less
      await ctx.db.delete(args.orderItemId);
    } else {
      const totalPrice = orderItem.unitPrice * args.quantity;
      await ctx.db.patch(args.orderItemId, {
        quantity: args.quantity,
        totalPrice,
        updatedAt: Date.now(),
      });
    }

    // Recalculate order totals
    await recalculateOrderTotals(ctx, orderItem.orderId);

    return { success: true };
  },
});

// Remove item from order
export const removeItem = mutation({
  args: { orderItemId: v.id("orderItems") },
  handler: async (ctx, args) => {
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem) {
      throw new Error("Order item not found");
    }

    const orderId = orderItem.orderId;
    await ctx.db.delete(args.orderItemId);

    // Recalculate order totals
    await recalculateOrderTotals(ctx, orderId);

    return { success: true };
  },
});

// Apply discount to order
export const applyDiscount = mutation({
  args: {
    orderId: v.id("orders"),
    discountId: v.optional(v.id("discounts")),
    manualDiscountAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      discountId: args.discountId,
      updatedAt: Date.now(),
    });

    // Recalculate order totals
    await recalculateOrderTotals(ctx, args.orderId, args.manualDiscountAmount);

    return { success: true };
  },
});

// Update order status
export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("served"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "completed") {
      updates.completedAt = now;
    }

    await ctx.db.patch(args.orderId, updates);

    return { success: true };
  },
});

// Complete order
export const complete = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    // If dine-in, free up the table
    if (order.tableId) {
      await ctx.db.patch(order.tableId, {
        status: "available",
        currentOrderId: undefined,
        updatedAt: now,
      });
    }

    // Deduct stock for all items
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const item of orderItems) {
      await deductStockForMenuItem(ctx, item.menuItemId, item.quantity, args.orderId, order.cashierId);
    }

    // Update customer totals if applicable
    if (order.customerId) {
      const customer = await ctx.db.get(order.customerId);
      if (customer) {
        await ctx.db.patch(order.customerId, {
          totalOrders: customer.totalOrders + 1,
          totalSpent: customer.totalSpent + order.grandTotal,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Cancel order
export const cancel = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "cancelled",
      remarks: args.reason ? `Cancelled: ${args.reason}` : order.remarks,
      updatedAt: now,
    });

    // If dine-in, free up the table
    if (order.tableId) {
      await ctx.db.patch(order.tableId, {
        status: "available",
        currentOrderId: undefined,
        updatedAt: now,
      });
    }

    // Update all order items status
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const item of orderItems) {
      await ctx.db.patch(item._id, {
        status: "cancelled",
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Helper function to recalculate order totals
async function recalculateOrderTotals(
  ctx: any,
  orderId: any,
  manualDiscountAmount?: number
) {
  const order = await ctx.db.get(orderId);
  if (!order) return;

  // Get all order items
  const orderItems = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .collect();

  // Calculate subtotal
  const subtotal = orderItems.reduce(
    (sum: number, item: any) => sum + item.totalPrice,
    0
  );

  // Calculate discount
  let discountAmount = 0;
  if (manualDiscountAmount !== undefined) {
    discountAmount = manualDiscountAmount;
  } else if (order.discountId) {
    const discount = await ctx.db.get(order.discountId);
    if (discount) {
      if (discount.type === "percentage") {
        discountAmount = (subtotal * discount.value) / 100;
        if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
          discountAmount = discount.maxDiscountAmount;
        }
      } else {
        discountAmount = discount.value;
      }
    }
  }

  // Get tax settings
  const taxSettings = await ctx.db
    .query("taxSettings")
    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
    .first();

  // Calculate tax
  let taxAmount = 0;
  if (taxSettings) {
    const taxableAmount = subtotal - discountAmount;
    taxAmount = (taxableAmount * taxSettings.rate) / 100;
  }

  // Calculate grand total
  const grandTotal = subtotal - discountAmount + taxAmount + order.serviceCharge;

  await ctx.db.patch(orderId, {
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
    updatedAt: Date.now(),
  });
}

// Helper function to deduct stock for menu item
async function deductStockForMenuItem(
  ctx: any,
  menuItemId: any,
  quantity: number,
  orderId: any,
  userId: any
) {
  // Get menu ingredients
  const menuIngredients = await ctx.db
    .query("menuIngredients")
    .withIndex("by_menuItemId", (q: any) => q.eq("menuItemId", menuItemId))
    .collect();

  for (const mi of menuIngredients) {
    const ingredient = await ctx.db.get(mi.ingredientId);
    if (!ingredient) continue;

    const deductQuantity = mi.quantity * quantity;
    const previousStock = ingredient.currentStock;
    const newStock = Math.max(0, previousStock - deductQuantity);

    // Update ingredient stock
    await ctx.db.patch(mi.ingredientId, {
      currentStock: newStock,
      updatedAt: Date.now(),
    });

    // Record stock movement
    await ctx.db.insert("stockMovements", {
      ingredientId: mi.ingredientId,
      movementType: "sale",
      quantity: -deductQuantity,
      previousStock,
      newStock,
      referenceType: "order",
      referenceId: orderId.toString(),
      createdBy: userId,
      createdAt: Date.now(),
    });
  }
}

// Get order items
export const getItems = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

// Complete payment for an order
export const completePayment = mutation({
  args: {
    orderId: v.id("orders"),
    paymentMethod: v.union(v.literal("cash"), v.literal("card"), v.literal("qr")),
    amountPaid: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    // Create payment record
    await ctx.db.insert("payments", {
      orderId: args.orderId,
      sessionId: order.sessionId,
      method: args.paymentMethod,
      amount: args.amountPaid,
      receivedBy: order.cashierId,
      createdAt: now,
    });

    // Update order status to completed and payment status to paid
    await ctx.db.patch(args.orderId, {
      status: "completed",
      paymentStatus: "paid",
      completedAt: now,
      updatedAt: now,
    });

    // If dine-in, free up the table
    if (order.tableId) {
      await ctx.db.patch(order.tableId, {
        status: "available",
        currentOrderId: undefined,
        updatedAt: now,
      });
    }

    // Deduct stock for all items
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const item of orderItems) {
      await deductStockForMenuItem(ctx, item.menuItemId, item.quantity, args.orderId, order.cashierId);
    }

    // Update customer totals if applicable
    if (order.customerId) {
      const customer = await ctx.db.get(order.customerId);
      if (customer) {
        await ctx.db.patch(order.customerId, {
          totalOrders: customer.totalOrders + 1,
          totalSpent: customer.totalSpent + order.grandTotal,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});
