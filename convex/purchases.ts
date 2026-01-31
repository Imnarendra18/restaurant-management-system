import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { authComponent } from "./auth";

// Get all purchases
export const list = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("received"), v.literal("cancelled"))),
    supplierId: v.optional(v.id("suppliers")),
  },
  handler: async (ctx, { startDate, endDate, status, supplierId }) => {
    let purchases = await ctx.db.query("purchases").order("desc").collect();

    // Apply filters
    if (startDate) {
      purchases = purchases.filter((p) => p.purchaseDate >= startDate);
    }
    if (endDate) {
      purchases = purchases.filter((p) => p.purchaseDate <= endDate);
    }
    if (status) {
      purchases = purchases.filter((p) => p.status === status);
    }
    if (supplierId) {
      purchases = purchases.filter((p) => p.supplierId === supplierId);
    }

    // Get supplier names
    const purchasesWithSupplier = await Promise.all(
      purchases.map(async (purchase) => {
        const supplier = await ctx.db.get(purchase.supplierId);
        return {
          ...purchase,
          supplierName: supplier?.name || "Unknown",
        };
      })
    );

    return purchasesWithSupplier;
  },
});

// Get single purchase with items
export const get = query({
  args: { id: v.id("purchases") },
  handler: async (ctx, { id }) => {
    const purchase = await ctx.db.get(id);
    if (!purchase) return null;

    const supplier = await ctx.db.get(purchase.supplierId);
    const items = await ctx.db
      .query("purchaseItems")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", id))
      .collect();

    // Get ingredient and unit names for each item
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const ingredient = await ctx.db.get(item.ingredientId);
        const unit = await ctx.db.get(item.unitId);
        return {
          ...item,
          ingredientName: ingredient?.name || "Unknown",
          unitName: unit?.name || "",
          unitSymbol: unit?.symbol || "",
        };
      })
    );

    return {
      ...purchase,
      supplierName: supplier?.name || "Unknown",
      items: itemsWithDetails,
    };
  },
});

// Create purchase
export const create = mutation({
  args: {
    supplierId: v.id("suppliers"),
    invoiceNo: v.string(),
    purchaseDate: v.number(),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.number(),
        unitId: v.id("units"),
        unitPrice: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      throw new Error("Not authenticated - please log in again");
    }
    if (!authUser) throw new Error("Not authenticated");

    const now = Date.now();

    // Calculate totals
    const totalAmount = args.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = args.taxAmount || 0;
    const discountAmount = args.discountAmount || 0;
    const netAmount = totalAmount + taxAmount - discountAmount;

    // Create purchase
    const purchaseId = await ctx.db.insert("purchases", {
      supplierId: args.supplierId,
      invoiceNo: args.invoiceNo,
      purchaseDate: args.purchaseDate,
      totalAmount,
      taxAmount,
      discountAmount,
      netAmount,
      status: "draft",
      notes: args.notes,
      createdBy: authUser._id,
      createdAt: now,
      updatedAt: now,
    });

    // Create purchase items
    for (const item of args.items) {
      await ctx.db.insert("purchaseItems", {
        purchaseId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unitId: item.unitId,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        createdAt: now,
      });
    }

    return purchaseId;
  },
});

// Receive purchase (update stock)
export const receive = mutation({
  args: {
    id: v.id("purchases"),
  },
  handler: async (ctx, { id }) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    const purchase = await ctx.db.get(id);
    if (!purchase) throw new Error("Purchase not found");

    if (purchase.status !== "draft") {
      throw new Error("Purchase already processed");
    }

    const now = Date.now();

    // Get purchase items
    const items = await ctx.db
      .query("purchaseItems")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", id))
      .collect();

    // Update ingredient stock
    for (const item of items) {
      const ingredient = await ctx.db.get(item.ingredientId);
      if (ingredient) {
        const previousStock = ingredient.currentStock;
        const newStock = previousStock + item.quantity;

        await ctx.db.patch(item.ingredientId, {
          currentStock: newStock,
          updatedAt: now,
        });

        // Create stock movement record
        await ctx.db.insert("stockMovements", {
          ingredientId: item.ingredientId,
          movementType: "purchase",
          quantity: item.quantity,
          previousStock,
          newStock,
          referenceType: "purchase",
          referenceId: id,
          createdBy: authUser._id,
          createdAt: now,
        });
      }
    }

    // Update purchase status
    await ctx.db.patch(id, {
      status: "received",
      updatedAt: now,
    });

    return { success: true };
  },
});

// Cancel purchase
export const cancel = mutation({
  args: { id: v.id("purchases") },
  handler: async (ctx, { id }) => {
    const purchase = await ctx.db.get(id);
    if (!purchase) throw new Error("Purchase not found");

    if (purchase.status === "received") {
      throw new Error("Cannot cancel received purchase");
    }

    await ctx.db.patch(id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

// Delete purchase (only if draft)
export const remove = mutation({
  args: { id: v.id("purchases") },
  handler: async (ctx, { id }) => {
    const purchase = await ctx.db.get(id);
    if (!purchase) throw new Error("Purchase not found");

    if (purchase.status !== "draft") {
      throw new Error("Cannot delete processed purchase");
    }

    // Delete purchase items first
    const items = await ctx.db
      .query("purchaseItems")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(id);
  },
});
