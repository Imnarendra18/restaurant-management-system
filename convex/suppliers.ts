import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all suppliers
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suppliers").collect();
  },
});

// Get active suppliers only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("suppliers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get a single supplier by ID
export const getById = query({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new supplier
export const create = mutation({
  args: {
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    gstin: v.optional(v.string()),
    panNumber: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("suppliers", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing supplier
export const update = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    gstin: v.optional(v.string()),
    panNumber: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Supplier not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a supplier
export const remove = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    // Check if any purchases are associated with this supplier
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_supplierId", (q) => q.eq("supplierId", args.id))
      .first();

    if (purchases) {
      throw new Error("Cannot delete supplier with purchase history. Deactivate instead.");
    }

    await ctx.db.delete(args.id);
  },
});
