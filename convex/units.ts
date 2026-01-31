import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all units
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("units").collect();
  },
});

// Get active units only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const units = await ctx.db.query("units").collect();
    return units.filter((u) => u.isActive);
  },
});

// Get a single unit by ID
export const getById = query({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get base units (units that have no baseUnit reference)
export const getBaseUnits = query({
  args: {},
  handler: async (ctx) => {
    const units = await ctx.db.query("units").collect();
    return units.filter((u) => !u.baseUnit && u.isActive);
  },
});

// Create a new unit
export const create = mutation({
  args: {
    name: v.string(),
    symbol: v.string(),
    baseUnit: v.optional(v.id("units")),
    conversionFactor: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("units", {
      name: args.name,
      symbol: args.symbol,
      baseUnit: args.baseUnit,
      conversionFactor: args.conversionFactor,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing unit
export const update = mutation({
  args: {
    id: v.id("units"),
    name: v.optional(v.string()),
    symbol: v.optional(v.string()),
    baseUnit: v.optional(v.id("units")),
    conversionFactor: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Unit not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a unit
export const remove = mutation({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    // Check if any ingredients are using this unit
    const ingredients = await ctx.db
      .query("ingredients")
      .filter((q) => q.eq(q.field("unitId"), args.id))
      .first();

    if (ingredients) {
      throw new Error("Cannot delete unit used by ingredients");
    }

    await ctx.db.delete(args.id);
  },
});

// Convert quantity between units
export const convert = query({
  args: {
    quantity: v.number(),
    fromUnitId: v.id("units"),
    toUnitId: v.id("units"),
  },
  handler: async (ctx, args) => {
    const fromUnit = await ctx.db.get(args.fromUnitId);
    const toUnit = await ctx.db.get(args.toUnitId);

    if (!fromUnit || !toUnit) {
      throw new Error("Unit not found");
    }

    // Convert to base unit first, then to target unit
    const baseQuantity = args.quantity * fromUnit.conversionFactor;
    const convertedQuantity = baseQuantity / toUnit.conversionFactor;

    return convertedQuantity;
  },
});
