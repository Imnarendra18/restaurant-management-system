import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all rooms with their tables
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();

    const roomsWithTables = await Promise.all(
      rooms.map(async (room) => {
        const tables = await ctx.db
          .query("tables")
          .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
          .collect();

        return {
          ...room,
          tables,
        };
      })
    );

    return roomsWithTables;
  },
});

// Get active rooms with their tables
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();
    const activeRooms = rooms.filter((r) => r.isActive);

    const roomsWithTables = await Promise.all(
      activeRooms.map(async (room) => {
        const tables = await ctx.db
          .query("tables")
          .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
          .collect();

        const activeTables = tables.filter((t) => t.isActive);

        return {
          ...room,
          tables: activeTables,
        };
      })
    );

    return roomsWithTables;
  },
});

// Get a single room by ID
export const getById = query({
  args: { id: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.id);
    if (!room) return null;

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.id))
      .collect();

    return { ...room, tables };
  },
});

// Create a new room
export const create = mutation({
  args: {
    name: v.string(),
    floorNumber: v.number(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("rooms", {
      name: args.name,
      floorNumber: args.floorNumber,
      description: args.description,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a room
export const update = mutation({
  args: {
    id: v.id("rooms"),
    name: v.optional(v.string()),
    floorNumber: v.optional(v.number()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Room not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a room
export const remove = mutation({
  args: { id: v.id("rooms") },
  handler: async (ctx, args) => {
    // Check if room has tables
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.id))
      .first();

    if (tables) {
      throw new Error("Cannot delete room with tables. Delete tables first.");
    }

    await ctx.db.delete(args.id);
  },
});
