import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all printers
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("printers").collect();
  },
});

// Get active printers only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const printers = await ctx.db.query("printers").collect();
    return printers.filter((p) => p.isActive);
  },
});

// Get printers by type
export const getByType = query({
  args: { type: v.union(v.literal("kot"), v.literal("bill"), v.literal("both")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("printers")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

// Get KOT printers (kot or both)
export const getKotPrinters = query({
  args: {},
  handler: async (ctx) => {
    const printers = await ctx.db.query("printers").collect();
    return printers.filter(
      (p) => p.isActive && (p.type === "kot" || p.type === "both")
    );
  },
});

// Get a single printer by ID
export const getById = query({
  args: { id: v.id("printers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new printer
export const create = mutation({
  args: {
    name: v.string(),
    ipAddress: v.string(),
    port: v.number(),
    type: v.union(v.literal("kot"), v.literal("bill"), v.literal("both")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("printers", {
      name: args.name,
      ipAddress: args.ipAddress,
      port: args.port,
      type: args.type,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing printer
export const update = mutation({
  args: {
    id: v.id("printers"),
    name: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    port: v.optional(v.number()),
    type: v.optional(v.union(v.literal("kot"), v.literal("bill"), v.literal("both"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Printer not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a printer
export const remove = mutation({
  args: { id: v.id("printers") },
  handler: async (ctx, args) => {
    // Check if any menu items are using this printer
    const menuItems = await ctx.db
      .query("menuItems")
      .filter((q) => q.eq(q.field("printerId"), args.id))
      .first();

    if (menuItems) {
      throw new Error("Cannot delete printer used by menu items");
    }

    await ctx.db.delete(args.id);
  },
});
