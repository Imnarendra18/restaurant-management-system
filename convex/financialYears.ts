import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all financial years
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("financialYears").order("desc").collect();
  },
});

// Get current financial year
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("financialYears")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .first();
  },
});

// Get single financial year
export const get = query({
  args: { id: v.id("financialYears") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create financial year
export const create = mutation({
  args: {
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    setAsCurrent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate dates
    if (args.startDate >= args.endDate) {
      throw new Error("Start date must be before end date");
    }

    // Check for overlapping years
    const existingYears = await ctx.db.query("financialYears").collect();
    for (const year of existingYears) {
      if (
        (args.startDate >= year.startDate && args.startDate <= year.endDate) ||
        (args.endDate >= year.startDate && args.endDate <= year.endDate)
      ) {
        throw new Error("Financial year overlaps with existing year");
      }
    }

    // If setting as current, unset all others
    if (args.setAsCurrent) {
      const currentYear = await ctx.db
        .query("financialYears")
        .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
        .first();

      if (currentYear) {
        await ctx.db.patch(currentYear._id, {
          isCurrent: false,
          updatedAt: now,
        });
      }
    }

    return await ctx.db.insert("financialYears", {
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      isCurrent: args.setAsCurrent || false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Set as current financial year
export const setAsCurrent = mutation({
  args: { id: v.id("financialYears") },
  handler: async (ctx, { id }) => {
    const now = Date.now();

    // Unset current on all years
    const years = await ctx.db.query("financialYears").collect();
    for (const year of years) {
      if (year.isCurrent) {
        await ctx.db.patch(year._id, {
          isCurrent: false,
          updatedAt: now,
        });
      }
    }

    // Set this year as current
    await ctx.db.patch(id, {
      isCurrent: true,
      updatedAt: now,
    });
  },
});

// Close financial year
export const close = mutation({
  args: {
    id: v.id("financialYears"),
    carryForwardAccounts: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, carryForwardAccounts = true }) => {
    const year = await ctx.db.get(id);
    if (!year) throw new Error("Financial year not found");

    if (year.status === "closed") {
      throw new Error("Financial year already closed");
    }

    const now = Date.now();

    // If carry forward, create new year with opening balances
    if (carryForwardAccounts) {
      // Get all balance sheet accounts
      const accounts = await ctx.db
        .query("chartOfAccounts")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Create next financial year
      const nextStartDate = year.endDate + 1;
      const nextEndDate = nextStartDate + 365 * 24 * 60 * 60 * 1000; // Approx 1 year

      const nextYearId = await ctx.db.insert("financialYears", {
        name: `FY ${new Date(nextStartDate).getFullYear()}-${new Date(nextEndDate).getFullYear()}`,
        startDate: nextStartDate,
        endDate: nextEndDate,
        isCurrent: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      // Update account opening balances for new year
      for (const account of accounts) {
        if (["asset", "liability", "equity"].includes(account.type)) {
          await ctx.db.patch(account._id, {
            openingBalance: account.currentBalance,
            updatedAt: now,
          });
        } else {
          // Reset income/expense accounts
          await ctx.db.patch(account._id, {
            currentBalance: 0,
            updatedAt: now,
          });
        }
      }
    }

    // Close the year
    await ctx.db.patch(id, {
      status: "closed",
      isCurrent: false,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Update financial year
export const update = mutation({
  args: {
    id: v.id("financialYears"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const year = await ctx.db.get(id);
    if (!year) throw new Error("Financial year not found");

    if (year.status === "closed") {
      throw new Error("Cannot update closed financial year");
    }

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filtered,
      updatedAt: Date.now(),
    });
  },
});

// Delete financial year (only if no transactions)
export const remove = mutation({
  args: { id: v.id("financialYears") },
  handler: async (ctx, { id }) => {
    // Check if year has transactions
    const transactions = await ctx.db
      .query("accountingTransactions")
      .withIndex("by_financialYearId", (q) => q.eq("financialYearId", id))
      .first();

    if (transactions) {
      throw new Error("Cannot delete financial year with transactions");
    }

    await ctx.db.delete(id);
  },
});
