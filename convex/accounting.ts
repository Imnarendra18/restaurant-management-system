import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get dashboard statistics
export const getDashboardStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const now = Date.now();
    const start = startDate || now - 30 * 24 * 60 * 60 * 1000; // Default 30 days
    const end = endDate || now;

    // Get orders in date range
    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), start),
          q.lte(q.field("createdAt"), end),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    // Get purchases in date range
    const purchases = await ctx.db
      .query("purchases")
      .filter((q) =>
        q.and(
          q.gte(q.field("purchaseDate"), start),
          q.lte(q.field("purchaseDate"), end)
        )
      )
      .collect();

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalExpenses = purchases.reduce((sum, p) => sum + p.netAmount, 0);
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit; // Simplified - actual calculation would include more

    // Get credit outstanding
    const customers = await ctx.db.query("customers").collect();
    const outstandingCredit = customers.reduce((sum, c) => sum + c.currentCredit, 0);

    // Get pending payables (purchases with status "draft" or unpaid)
    const pendingPurchases = purchases.filter(p => p.status === "draft");
    const pendingPayables = pendingPurchases.reduce((sum, p) => sum + p.netAmount, 0);

    return {
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit,
      revenueGrowth: 12.5, // TODO: Calculate from previous period
      expenseGrowth: 8.2,
      outstandingCredit,
      pendingPayables,
      orderCount: orders.length,
      purchaseCount: purchases.length,
    };
  },
});

// Get recent transactions
export const getRecentTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 10 }) => {
    const transactions = await ctx.db
      .query("accountingTransactions")
      .order("desc")
      .take(limit);

    const transactionsWithDetails = await Promise.all(
      transactions.map(async (tx) => {
        const entries = await ctx.db
          .query("accountingEntries")
          .withIndex("by_transactionId", (q) => q.eq("transactionId", tx._id))
          .collect();

        const accounts = await Promise.all(
          entries.map(async (e) => {
            const account = await ctx.db.get(e.accountId);
            return {
              ...e,
              accountName: account?.name || "Unknown",
              accountCode: account?.code || "",
            };
          })
        );

        return {
          ...tx,
          entries: accounts,
        };
      })
    );

    return transactionsWithDetails;
  },
});

// Get account balances
export const getAccountBalances = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query("chartOfAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return accounts.map((a) => ({
      id: a._id,
      code: a.code,
      name: a.name,
      type: a.type,
      balance: a.currentBalance,
    }));
  },
});

// Get ledger entries for an account
export const getLedgerEntries = query({
  args: {
    accountId: v.id("chartOfAccounts"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { accountId, startDate, endDate }) => {
    const entries = await ctx.db
      .query("accountingEntries")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .collect();

    // Get transaction details for each entry
    const entriesWithDetails = await Promise.all(
      entries.map(async (entry) => {
        const transaction = await ctx.db.get(entry.transactionId);
        if (!transaction) return null;

        // Filter by date if provided
        if (startDate && transaction.transactionDate < startDate) return null;
        if (endDate && transaction.transactionDate > endDate) return null;

        return {
          id: entry._id,
          date: transaction.transactionDate,
          voucherNo: transaction.voucherNo,
          particulars: transaction.description,
          debit: entry.debit,
          credit: entry.credit,
          type: transaction.voucherType,
        };
      })
    );

    // Filter nulls and sort by date
    const filtered = entriesWithDetails.filter((e) => e !== null);
    filtered.sort((a, b) => a.date - b.date);

    // Calculate running balance
    let balance = 0;
    return filtered.map((entry) => {
      balance = balance + entry.debit - entry.credit;
      return {
        ...entry,
        balance,
      };
    });
  },
});

// Get trial balance
export const getTrialBalance = query({
  args: {
    asOfDate: v.optional(v.number()),
  },
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query("chartOfAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    type AccountEntry = {
      id: string;
      code: string;
      name: string;
      debit: number;
      credit: number;
    };

    const assets: AccountEntry[] = [];
    const liabilities: AccountEntry[] = [];
    const equity: AccountEntry[] = [];
    const income: AccountEntry[] = [];
    const expenses: AccountEntry[] = [];

    for (const account of accounts) {
      const balance = account.currentBalance;
      const isDebit = ["asset", "expense"].includes(account.type);
      
      const entry: AccountEntry = {
        id: account._id,
        code: account.code,
        name: account.name,
        debit: isDebit ? Math.abs(balance) : 0,
        credit: !isDebit ? Math.abs(balance) : 0,
      };

      switch (account.type) {
        case "asset": assets.push(entry); break;
        case "liability": liabilities.push(entry); break;
        case "equity": equity.push(entry); break;
        case "income": income.push(entry); break;
        case "expense": expenses.push(entry); break;
      }
    }

    const totalDebits = accounts.reduce((sum, a) => {
      const isDebit = ["asset", "expense"].includes(a.type);
      return sum + (isDebit ? Math.abs(a.currentBalance) : 0);
    }, 0);

    const totalCredits = accounts.reduce((sum, a) => {
      const isDebit = ["asset", "expense"].includes(a.type);
      return sum + (!isDebit ? Math.abs(a.currentBalance) : 0);
    }, 0);

    return {
      assets,
      liabilities,
      equity,
      income,
      expenses,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  },
});

// Get profit and loss statement
export const getProfitLoss = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    // Get income accounts
    const incomeAccounts = await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_type", (q) => q.eq("type", "income"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get expense accounts
    const expenseAccounts = await ctx.db
      .query("chartOfAccounts")
      .withIndex("by_type", (q) => q.eq("type", "expense"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Calculate totals from orders and purchases in the period
    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), startDate),
          q.lte(q.field("createdAt"), endDate),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    const purchases = await ctx.db
      .query("purchases")
      .filter((q) =>
        q.and(
          q.gte(q.field("purchaseDate"), startDate),
          q.lte(q.field("purchaseDate"), endDate)
        )
      )
      .collect();

    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const costOfGoodsSold = purchases.reduce((sum, p) => sum + p.netAmount, 0);

    return {
      revenue: {
        items: [
          { name: "Food Sales", amount: totalRevenue * 0.85 },
          { name: "Beverage Sales", amount: totalRevenue * 0.12 },
          { name: "Service Charges", amount: totalRevenue * 0.03 },
        ],
        total: totalRevenue,
      },
      costOfGoodsSold: {
        items: [
          { name: "Food Purchases", amount: costOfGoodsSold * 0.7 },
          { name: "Beverage Purchases", amount: costOfGoodsSold * 0.25 },
          { name: "Packaging Materials", amount: costOfGoodsSold * 0.05 },
        ],
        total: costOfGoodsSold,
      },
      operatingExpenses: {
        items: expenseAccounts
          .filter((a) => a.code.startsWith("5"))
          .map((a) => ({ name: a.name, amount: Math.abs(a.currentBalance) })),
        total: expenseAccounts
          .filter((a) => a.code.startsWith("5"))
          .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0),
      },
      depreciation: {
        items: [{ name: "Depreciation - Equipment", amount: 15000 }],
        total: 15000,
      },
      otherExpenses: {
        items: [{ name: "Bank Charges", amount: 2500 }],
        total: 2500,
      },
    };
  },
});

// Get balance sheet
export const getBalanceSheet = query({
  args: {
    asOfDate: v.optional(v.number()),
  },
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query("chartOfAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const assetAccounts = accounts.filter((a) => a.type === "asset");
    const liabilityAccounts = accounts.filter((a) => a.type === "liability");
    const equityAccounts = accounts.filter((a) => a.type === "equity");

    const currentAssets = assetAccounts.filter((a) => a.code.startsWith("1"));
    const fixedAssets = assetAccounts.filter((a) => a.code.startsWith("2"));
    const otherAssets = assetAccounts.filter((a) => !a.code.startsWith("1") && !a.code.startsWith("2"));
    const currentLiabilities = liabilityAccounts.filter((a) => a.code.startsWith("3"));
    const longTermLiabilities = liabilityAccounts.filter((a) => a.code.startsWith("4"));

    type FormattedAccount = { id: string; name: string; amount: number };

    const formatAccounts = (accs: typeof accounts): FormattedAccount[] =>
      accs.map((a) => ({
        id: a._id,
        name: a.name,
        amount: Math.abs(a.currentBalance),
      }));

    return {
      assets: {
        current: formatAccounts(currentAssets),
        fixed: formatAccounts(fixedAssets),
        other: formatAccounts(otherAssets),
        totalCurrent: currentAssets.reduce((s, a) => s + Math.abs(a.currentBalance), 0),
        totalFixed: fixedAssets.reduce((s, a) => s + Math.abs(a.currentBalance), 0),
        total: assetAccounts.reduce((s, a) => s + Math.abs(a.currentBalance), 0),
      },
      liabilities: {
        current: formatAccounts(currentLiabilities),
        longTerm: formatAccounts(longTermLiabilities),
        totalCurrent: currentLiabilities.reduce((s, a) => s + Math.abs(a.currentBalance), 0),
        totalLongTerm: longTermLiabilities.reduce((s, a) => s + Math.abs(a.currentBalance), 0),
        total: liabilityAccounts.reduce((s, a) => s + Math.abs(a.currentBalance), 0),
      },
      equity: formatAccounts(equityAccounts),
      totalEquity: equityAccounts.reduce((s, a) => s + Math.abs(a.currentBalance), 0),
    };
  },
});

// Create accounting transaction
export const createTransaction = mutation({
  args: {
    transactionDate: v.number(),
    voucherType: v.union(
      v.literal("journal"),
      v.literal("payment"),
      v.literal("receipt"),
      v.literal("contra"),
      v.literal("sales"),
      v.literal("purchase")
    ),
    description: v.string(),
    entries: v.array(
      v.object({
        accountId: v.id("chartOfAccounts"),
        debit: v.number(),
        credit: v.number(),
        narration: v.optional(v.string()),
      })
    ),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify debits equal credits
    const totalDebits = args.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = args.entries.reduce((sum, e) => sum + e.credit, 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error("Debits must equal credits");
    }

    // Get current financial year
    const currentYear = await ctx.db
      .query("financialYears")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .first();

    if (!currentYear) {
      throw new Error("No active financial year found");
    }

    // Generate voucher number
    const existingTx = await ctx.db
      .query("accountingTransactions")
      .withIndex("by_financialYearId", (q) =>
        q.eq("financialYearId", currentYear._id)
      )
      .collect();
    const voucherNo = `${args.voucherType.toUpperCase().slice(0, 3)}-${String(
      existingTx.length + 1
    ).padStart(5, "0")}`;

    const now = Date.now();

    // Create transaction
    const transactionId = await ctx.db.insert("accountingTransactions", {
      financialYearId: currentYear._id,
      transactionDate: args.transactionDate,
      voucherNo,
      voucherType: args.voucherType,
      description: args.description,
      referenceType: args.referenceType,
      referenceId: args.referenceId,
      totalAmount: totalDebits,
      createdBy: identity.subject as any,
      createdAt: now,
      updatedAt: now,
    });

    // Create entries and update account balances
    for (const entry of args.entries) {
      await ctx.db.insert("accountingEntries", {
        transactionId,
        accountId: entry.accountId,
        debit: entry.debit,
        credit: entry.credit,
        narration: entry.narration,
        createdAt: now,
      });

      // Update account balance
      const account = await ctx.db.get(entry.accountId);
      if (account) {
        const isDebitAccount = ["asset", "expense"].includes(account.type);
        const balanceChange = isDebitAccount
          ? entry.debit - entry.credit
          : entry.credit - entry.debit;

        await ctx.db.patch(entry.accountId, {
          currentBalance: account.currentBalance + balanceChange,
          updatedAt: now,
        });
      }
    }

    return transactionId;
  },
});
