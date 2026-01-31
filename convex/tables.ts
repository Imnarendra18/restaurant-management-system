import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all tables
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const tables = await ctx.db.query("tables").collect();

    const tablesWithDetails = await Promise.all(
      tables.map(async (table) => {
        const room = await ctx.db.get(table.roomId);
        const waiter = table.assignedWaiterId
          ? await ctx.db.get(table.assignedWaiterId)
          : null;
        const order = table.currentOrderId
          ? await ctx.db.get(table.currentOrderId)
          : null;

        return {
          ...table,
          room,
          waiter,
          currentOrder: order,
        };
      })
    );

    return tablesWithDetails;
  },
});

// Get tables by room
export const getByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

// Get available tables
export const getAvailable = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();
  },
});

// Get occupied tables
export const getOccupied = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_status", (q) => q.eq("status", "occupied"))
      .collect();
  },
});

// Get a single table by ID
export const getById = query({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.id);
    if (!table) return null;

    const room = await ctx.db.get(table.roomId);
    const waiter = table.assignedWaiterId
      ? await ctx.db.get(table.assignedWaiterId)
      : null;
    const order = table.currentOrderId
      ? await ctx.db.get(table.currentOrderId)
      : null;

    return {
      ...table,
      room,
      waiter,
      currentOrder: order,
    };
  },
});

// Create a new table
export const create = mutation({
  args: {
    roomId: v.id("rooms"),
    tableNumber: v.string(),
    capacity: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if table number already exists in the room
    const existingTable = await ctx.db
      .query("tables")
      .filter((q) =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.eq(q.field("tableNumber"), args.tableNumber)
        )
      )
      .first();

    if (existingTable) {
      throw new Error("Table number already exists in this room");
    }

    const now = Date.now();
    return await ctx.db.insert("tables", {
      roomId: args.roomId,
      tableNumber: args.tableNumber,
      capacity: args.capacity,
      status: "available",
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a table
export const update = mutation({
  args: {
    id: v.id("tables"),
    roomId: v.optional(v.id("rooms")),
    tableNumber: v.optional(v.string()),
    capacity: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Table not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Update table status
export const updateStatus = mutation({
  args: {
    id: v.id("tables"),
    status: v.union(
      v.literal("available"),
      v.literal("occupied"),
      v.literal("reserved"),
      v.literal("maintenance")
    ),
    currentOrderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Table not found");
    }

    return await ctx.db.patch(args.id, {
      status: args.status,
      currentOrderId: args.currentOrderId,
      updatedAt: Date.now(),
    });
  },
});

// Assign waiter to table
export const assignWaiter = mutation({
  args: {
    id: v.id("tables"),
    waiterId: v.optional(v.id("staff")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Table not found");
    }

    return await ctx.db.patch(args.id, {
      assignedWaiterId: args.waiterId,
      updatedAt: Date.now(),
    });
  },
});

// Transfer table (move order to another table)
export const transfer = mutation({
  args: {
    fromTableId: v.id("tables"),
    toTableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const fromTable = await ctx.db.get(args.fromTableId);
    const toTable = await ctx.db.get(args.toTableId);

    if (!fromTable || !toTable) {
      throw new Error("Table not found");
    }

    if (toTable.status !== "available") {
      throw new Error("Target table is not available");
    }

    if (!fromTable.currentOrderId) {
      throw new Error("Source table has no active order");
    }

    const now = Date.now();

    // Update the order's tableId
    await ctx.db.patch(fromTable.currentOrderId, {
      tableId: args.toTableId,
      updatedAt: now,
    });

    // Update source table
    await ctx.db.patch(args.fromTableId, {
      status: "available",
      currentOrderId: undefined,
      updatedAt: now,
    });

    // Update target table
    await ctx.db.patch(args.toTableId, {
      status: "occupied",
      currentOrderId: fromTable.currentOrderId,
      assignedWaiterId: fromTable.assignedWaiterId,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Delete a table
export const remove = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.id);
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.status === "occupied") {
      throw new Error("Cannot delete an occupied table");
    }

    await ctx.db.delete(args.id);
  },
});

// Get table summary for POS dashboard
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const tables = await ctx.db.query("tables").collect();
    const activeTables = tables.filter((t) => t.isActive);

    const available = activeTables.filter((t) => t.status === "available").length;
    const occupied = activeTables.filter((t) => t.status === "occupied").length;
    const reserved = activeTables.filter((t) => t.status === "reserved").length;

    return {
      total: activeTables.length,
      available,
      occupied,
      reserved,
    };
  },
});
