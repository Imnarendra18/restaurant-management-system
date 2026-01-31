import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all accounts
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("chartOfAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get accounts as tree structure
export const getTree = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query("chartOfAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Build tree structure
    const accountMap = new Map(accounts.map((a) => [a._id, { ...a, children: [] as any[] }]));
    const tree: any[] = [];

    for (const account of accountMap.values()) {
      if (account.parentId && accountMap.has(account.parentId)) {
        accountMap.get(account.parentId)!.children.push(account);
      } else {
        tree.push(account);
      }
    }

    // Sort by code
    const sortByCode = (items: any[]): any[] => {
      items.sort((a, b) => a.code.localeCompare(b.code));
      for (const item of items) {
        if (item.children?.length) {
          sortByCode(item.children);
        }
      }
      return items;
    };

    return sortByCode(tree);
  },
});

// Get accounts by type
export const getByType = query({
  args: {
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("income"),
      v.literal("expense")
    ),
  },
  handler: async (ctx, { type }) => {
    return await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_type", (q) => q.eq("type", type))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get single account
export const get = query({
  args: { id: v.id("chartOfAccounts") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create account
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("income"),
      v.literal("expense")
    ),
    parentId: v.optional(v.id("chartOfAccounts")),
    openingBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if code is unique
    const existing = await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("Account code already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("chartOfAccounts", {
      code: args.code,
      name: args.name,
      type: args.type,
      parentId: args.parentId,
      isActive: true,
      openingBalance: args.openingBalance || 0,
      currentBalance: args.openingBalance || 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update account
export const update = mutation({
  args: {
    id: v.id("chartOfAccounts"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("asset"),
        v.literal("liability"),
        v.literal("equity"),
        v.literal("income"),
        v.literal("expense")
      )
    ),
    parentId: v.optional(v.id("chartOfAccounts")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    // If code is being updated, check uniqueness
    if (updates.code) {
      const existing = await ctx.db
        .query("chartOfAccounts")
        .withIndex("by_code", (q) => q.eq("code", updates.code!))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("Account code already exists");
      }
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

// Delete account (soft delete)
export const remove = mutation({
  args: { id: v.id("chartOfAccounts") },
  handler: async (ctx, { id }) => {
    // Check if account has transactions
    const entries = await ctx.db
      .query("accountingEntries")
      .withIndex("by_accountId", (q) => q.eq("accountId", id))
      .first();

    if (entries) {
      throw new Error("Cannot delete account with transactions");
    }

    // Check if account has children
    const children = await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_parentId", (q) => q.eq("parentId", id))
      .first();

    if (children) {
      throw new Error("Cannot delete account with child accounts");
    }

    await ctx.db.patch(id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Initialize default chart of accounts
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("chartOfAccounts").first();
    if (existing) {
      throw new Error("Chart of accounts already initialized");
    }

    const now = Date.now();
    const defaultAccounts = [
      // Assets (1xxx)
      { code: "1000", name: "Current Assets", type: "asset" as const },
      { code: "1100", name: "Cash in Hand", type: "asset" as const },
      { code: "1101", name: "Cash at Bank", type: "asset" as const },
      { code: "1200", name: "Accounts Receivable", type: "asset" as const },
      { code: "1300", name: "Inventory", type: "asset" as const },
      { code: "2000", name: "Fixed Assets", type: "asset" as const },
      { code: "2100", name: "Kitchen Equipment", type: "asset" as const },
      { code: "2200", name: "Furniture & Fixtures", type: "asset" as const },

      // Liabilities (3xxx)
      { code: "3000", name: "Current Liabilities", type: "liability" as const },
      { code: "3100", name: "Accounts Payable", type: "liability" as const },
      { code: "3200", name: "Salaries Payable", type: "liability" as const },
      { code: "3300", name: "Taxes Payable", type: "liability" as const },

      // Equity (4xxx)
      { code: "4000", name: "Owner's Equity", type: "equity" as const },
      { code: "4100", name: "Capital", type: "equity" as const },
      { code: "4200", name: "Retained Earnings", type: "equity" as const },

      // Income (5xxx)
      { code: "5000", name: "Revenue", type: "income" as const },
      { code: "5100", name: "Food Sales", type: "income" as const },
      { code: "5200", name: "Beverage Sales", type: "income" as const },
      { code: "5300", name: "Service Charges", type: "income" as const },

      // Expenses (6xxx)
      { code: "6000", name: "Operating Expenses", type: "expense" as const },
      { code: "6100", name: "Cost of Goods Sold", type: "expense" as const },
      { code: "6200", name: "Salaries & Wages", type: "expense" as const },
      { code: "6300", name: "Rent Expense", type: "expense" as const },
      { code: "6400", name: "Utilities Expense", type: "expense" as const },
      { code: "6500", name: "Marketing Expense", type: "expense" as const },
    ];

    for (const account of defaultAccounts) {
      await ctx.db.insert("chartOfAccounts", {
        ...account,
        isActive: true,
        openingBalance: 0,
        currentBalance: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { created: defaultAccounts.length };
  },
});
