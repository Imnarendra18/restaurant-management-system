import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all discounts
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("discounts").collect();
  },
});

// Get active discounts only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const discounts = await ctx.db
      .query("discounts")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Filter by validity period
    return discounts.filter((d) => d.validFrom <= now && d.validTo >= now);
  },
});

// Get a single discount by ID
export const getById = query({
  args: { id: v.id("discounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Validate a discount code
export const validateCode = query({
  args: {
    code: v.string(),
    orderTotal: v.number(),
    orderType: v.union(v.literal("dine_in"), v.literal("takeaway"), v.literal("delivery")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const discount = await ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!discount) {
      return { valid: false, error: "Invalid discount code" };
    }

    if (!discount.isActive) {
      return { valid: false, error: "This discount is no longer active" };
    }

    if (discount.validFrom > now) {
      return { valid: false, error: "This discount is not yet valid" };
    }

    if (discount.validTo < now) {
      return { valid: false, error: "This discount has expired" };
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return { valid: false, error: "This discount has reached its usage limit" };
    }

    if (discount.minOrderAmount && args.orderTotal < discount.minOrderAmount) {
      return {
        valid: false,
        error: `Minimum order amount is Rs. ${discount.minOrderAmount}`,
      };
    }

    if (discount.applicableTo !== "all" && discount.applicableTo !== args.orderType) {
      return {
        valid: false,
        error: `This discount is only valid for ${discount.applicableTo.replace("_", " ")} orders`,
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === "percentage") {
      discountAmount = (args.orderTotal * discount.value) / 100;
      if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
        discountAmount = discount.maxDiscountAmount;
      }
    } else {
      discountAmount = discount.value;
    }

    return {
      valid: true,
      discount,
      discountAmount,
    };
  },
});

// Create a new discount
export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    type: v.union(v.literal("percentage"), v.literal("flat")),
    value: v.number(),
    minOrderAmount: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    validFrom: v.number(),
    validTo: v.number(),
    usageLimit: v.optional(v.number()),
    applicableTo: v.union(
      v.literal("all"),
      v.literal("dine_in"),
      v.literal("takeaway"),
      v.literal("delivery")
    ),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if code already exists
    if (args.code) {
      const existing = await ctx.db
        .query("discounts")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();

      if (existing) {
        throw new Error("A discount with this code already exists");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("discounts", {
      ...args,
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing discount
export const update = mutation({
  args: {
    id: v.id("discounts"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    type: v.optional(v.union(v.literal("percentage"), v.literal("flat"))),
    value: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    validFrom: v.optional(v.number()),
    validTo: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    applicableTo: v.optional(
      v.union(
        v.literal("all"),
        v.literal("dine_in"),
        v.literal("takeaway"),
        v.literal("delivery")
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Discount not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Increment usage count
export const incrementUsage = mutation({
  args: { id: v.id("discounts") },
  handler: async (ctx, args) => {
    const discount = await ctx.db.get(args.id);
    if (!discount) {
      throw new Error("Discount not found");
    }

    return await ctx.db.patch(args.id, {
      usedCount: discount.usedCount + 1,
      updatedAt: Date.now(),
    });
  },
});

// Delete a discount
export const remove = mutation({
  args: { id: v.id("discounts") },
  handler: async (ctx, args) => {
    // Check if discount has been used in orders
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("discountId"), args.id))
      .first();

    if (orders) {
      throw new Error("Cannot delete discount with usage history. Deactivate instead.");
    }

    await ctx.db.delete(args.id);
  },
});
