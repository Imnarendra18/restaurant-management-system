import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all menu items
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const menuItems = await ctx.db.query("menuItems").collect();

    // Fetch related data for each menu item
    const menuItemsWithDetails = await Promise.all(
      menuItems.map(async (item) => {
        const category = await ctx.db.get(item.categoryId);
        const printer = item.printerId ? await ctx.db.get(item.printerId) : null;

        return {
          ...item,
          category,
          printer,
        };
      })
    );

    return menuItemsWithDetails;
  },
});

// Get active menu items only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get menu items by category
export const getByCategory = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();
  },
});

// Get a single menu item by ID with all details
export const getById = query({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    const category = await ctx.db.get(item.categoryId);
    const printer = item.printerId ? await ctx.db.get(item.printerId) : null;

    // Get ingredients for this menu item
    const menuIngredients = await ctx.db
      .query("menuIngredients")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.id))
      .collect();

    const ingredientsWithDetails = await Promise.all(
      menuIngredients.map(async (mi) => {
        const ingredient = await ctx.db.get(mi.ingredientId);
        const unit = await ctx.db.get(mi.unitId);
        return {
          ...mi,
          ingredient,
          unit,
        };
      })
    );

    return {
      ...item,
      category,
      printer,
      ingredients: ingredientsWithDetails,
    };
  },
});

// Create a new menu item
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("categories"),
    price: v.number(),
    printerId: v.optional(v.id("printers")),
    image: v.optional(v.string()),
    isActive: v.boolean(),
    preparationTime: v.optional(v.number()),
    ingredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          quantity: v.number(),
          unitId: v.id("units"),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { ingredients, ...menuItemData } = args;
    const now = Date.now();

    // Create menu item
    const menuItemId = await ctx.db.insert("menuItems", {
      ...menuItemData,
      createdAt: now,
      updatedAt: now,
    });

    // Create menu-ingredient mappings
    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        await ctx.db.insert("menuIngredients", {
          menuItemId,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unitId: ing.unitId,
          createdAt: now,
        });
      }
    }

    return menuItemId;
  },
});

// Update an existing menu item
export const update = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    price: v.optional(v.number()),
    printerId: v.optional(v.id("printers")),
    image: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    preparationTime: v.optional(v.number()),
    ingredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          quantity: v.number(),
          unitId: v.id("units"),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ingredients, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Menu item not found");
    }

    const now = Date.now();

    // Update menu item
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    // Update ingredients if provided
    if (ingredients !== undefined) {
      // Delete existing menu-ingredient mappings
      const existingIngredients = await ctx.db
        .query("menuIngredients")
        .withIndex("by_menuItemId", (q) => q.eq("menuItemId", id))
        .collect();

      for (const mi of existingIngredients) {
        await ctx.db.delete(mi._id);
      }

      // Create new mappings
      for (const ing of ingredients) {
        await ctx.db.insert("menuIngredients", {
          menuItemId: id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unitId: ing.unitId,
          createdAt: now,
        });
      }
    }

    return id;
  },
});

// Delete a menu item
export const remove = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    // Check if any orders contain this menu item
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.id))
      .first();

    if (orderItems) {
      throw new Error("Cannot delete menu item with order history. Deactivate it instead.");
    }

    // Delete menu-ingredient mappings
    const menuIngredients = await ctx.db
      .query("menuIngredients")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.id))
      .collect();

    for (const mi of menuIngredients) {
      await ctx.db.delete(mi._id);
    }

    // Delete the menu item
    await ctx.db.delete(args.id);
  },
});

// Get menu items for POS (grouped by category)
export const getForPOS = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const result = await Promise.all(
      categories.map(async (category) => {
        const items = await ctx.db
          .query("menuItems")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
          .collect();

        const activeItems = items.filter((item) => item.isActive);

        return {
          category,
          items: activeItems,
        };
      })
    );

    return result.filter((cat) => cat.items.length > 0);
  },
});
