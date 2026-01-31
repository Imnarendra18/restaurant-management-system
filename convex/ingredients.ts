import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all ingredients
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const ingredients = await ctx.db.query("ingredients").collect();
    
    // Fetch unit details for each ingredient
    const ingredientsWithUnits = await Promise.all(
      ingredients.map(async (ingredient) => {
        const unit = await ctx.db.get(ingredient.unitId);
        return {
          ...ingredient,
          unit,
        };
      })
    );
    
    return ingredientsWithUnits;
  },
});

// Get active ingredients only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const ingredients = await ctx.db.query("ingredients").collect();
    const activeIngredients = ingredients.filter((i) => i.isActive);
    
    // Fetch unit details for each ingredient
    const ingredientsWithUnits = await Promise.all(
      activeIngredients.map(async (ingredient) => {
        const unit = await ctx.db.get(ingredient.unitId);
        return {
          ...ingredient,
          unit,
        };
      })
    );
    
    return ingredientsWithUnits;
  },
});

// Get low stock ingredients
export const getLowStock = query({
  args: {},
  handler: async (ctx) => {
    const ingredients = await ctx.db.query("ingredients").collect();
    return ingredients.filter(
      (i) => i.isActive && i.currentStock <= i.reorderLevel
    );
  },
});

// Get a single ingredient by ID
export const getById = query({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) return null;
    
    const unit = await ctx.db.get(ingredient.unitId);
    return { ...ingredient, unit };
  },
});

// Create a new ingredient
export const create = mutation({
  args: {
    name: v.string(),
    unitId: v.id("units"),
    currentStock: v.number(),
    reorderLevel: v.number(),
    costPerUnit: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ingredients", {
      name: args.name,
      unitId: args.unitId,
      currentStock: args.currentStock,
      reorderLevel: args.reorderLevel,
      costPerUnit: args.costPerUnit,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing ingredient
export const update = mutation({
  args: {
    id: v.id("ingredients"),
    name: v.optional(v.string()),
    unitId: v.optional(v.id("units")),
    currentStock: v.optional(v.number()),
    reorderLevel: v.optional(v.number()),
    costPerUnit: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Ingredient not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete an ingredient
export const remove = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    // Check if any menu items are using this ingredient
    const menuIngredients = await ctx.db
      .query("menuIngredients")
      .withIndex("by_ingredientId", (q) => q.eq("ingredientId", args.id))
      .first();

    if (menuIngredients) {
      throw new Error("Cannot delete ingredient used in menu items");
    }

    await ctx.db.delete(args.id);
  },
});

// Adjust stock (for manual adjustments)
export const adjustStock = mutation({
  args: {
    id: v.id("ingredients"),
    quantity: v.number(), // Positive for addition, negative for deduction
    reason: v.string(),
    userId: v.string(), // Better Auth user ID
  },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    const previousStock = ingredient.currentStock;
    const newStock = previousStock + args.quantity;

    if (newStock < 0) {
      throw new Error("Stock cannot be negative");
    }

    // Update ingredient stock
    await ctx.db.patch(args.id, {
      currentStock: newStock,
      updatedAt: Date.now(),
    });

    // Record stock movement
    await ctx.db.insert("stockMovements", {
      ingredientId: args.id,
      movementType: args.quantity > 0 ? "adjustment" : "adjustment",
      quantity: args.quantity,
      previousStock,
      newStock,
      referenceType: "adjustment",
      notes: args.reason,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    return { previousStock, newStock };
  },
});
