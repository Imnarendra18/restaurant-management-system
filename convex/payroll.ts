import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get payroll records by month
export const getByMonth = query({
  args: {
    month: v.number(), // YYYYMM format
  },
  handler: async (ctx, { month }) => {
    const payrolls = await ctx.db
      .query("payroll")
      .withIndex("by_month", (q) => q.eq("month", month))
      .collect();

    // Get staff details for each payroll
    const payrollsWithStaff = await Promise.all(
      payrolls.map(async (payroll) => {
        const staff = await ctx.db.get(payroll.staffId);
        return {
          ...payroll,
          staffName: staff?.name || "Unknown",
          staffPosition: staff?.position || "",
          staffDepartment: staff?.department || "",
        };
      })
    );

    return payrollsWithStaff;
  },
});

// Get single payroll
export const get = query({
  args: { id: v.id("payroll") },
  handler: async (ctx, { id }) => {
    const payroll = await ctx.db.get(id);
    if (!payroll) return null;

    const staff = await ctx.db.get(payroll.staffId);
    return {
      ...payroll,
      staffName: staff?.name || "Unknown",
      staffPosition: staff?.position || "",
    };
  },
});

// Get payroll summary
export const getSummary = query({
  args: {
    month: v.number(),
  },
  handler: async (ctx, { month }) => {
    const payrolls = await ctx.db
      .query("payroll")
      .withIndex("by_month", (q) => q.eq("month", month))
      .collect();

    const totalPayroll = payrolls.reduce((sum, p) => sum + p.netPay, 0);
    const totalAllowances = payrolls.reduce((sum, p) => sum + p.allowances, 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + p.deductions, 0);
    const pendingCount = payrolls.filter((p) => p.status === "pending").length;
    const paidCount = payrolls.filter((p) => p.status === "paid").length;

    return {
      totalPayroll,
      totalAllowances,
      totalDeductions,
      totalBase: payrolls.reduce((sum, p) => sum + p.baseSalary, 0),
      pendingCount,
      paidCount,
      totalCount: payrolls.length,
    };
  },
});

// Generate payroll for month
export const generateForMonth = mutation({
  args: {
    month: v.number(), // YYYYMM format
  },
  handler: async (ctx, { month }) => {
    // Check if payroll already exists for this month
    const existing = await ctx.db
      .query("payroll")
      .withIndex("by_month", (q) => q.eq("month", month))
      .first();

    if (existing) {
      throw new Error("Payroll already generated for this month");
    }

    // Get all active staff
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();
    const created = [];

    for (const member of staff) {
      // Calculate payroll (simplified - can be enhanced)
      const baseSalary = member.salary;
      const allowances = 0; // Can be calculated based on attendance, etc.
      const deductions = 0; // Can be calculated based on absences, loans, etc.
      const netPay = baseSalary + allowances - deductions;

      const payrollId = await ctx.db.insert("payroll", {
        staffId: member._id,
        month,
        baseSalary,
        allowances,
        deductions,
        netPay,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      created.push(payrollId);
    }

    return { created: created.length };
  },
});

// Update payroll entry
export const update = mutation({
  args: {
    id: v.id("payroll"),
    allowances: v.optional(v.number()),
    deductions: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const payroll = await ctx.db.get(id);
    if (!payroll) throw new Error("Payroll not found");

    if (payroll.status === "paid") {
      throw new Error("Cannot modify paid payroll");
    }

    const allowances = updates.allowances ?? payroll.allowances;
    const deductions = updates.deductions ?? payroll.deductions;
    const netPay = payroll.baseSalary + allowances - deductions;

    await ctx.db.patch(id, {
      allowances,
      deductions,
      netPay,
      notes: updates.notes ?? payroll.notes,
      updatedAt: Date.now(),
    });
  },
});

// Mark payroll as paid
export const markAsPaid = mutation({
  args: {
    id: v.id("payroll"),
  },
  handler: async (ctx, { id }) => {
    const payroll = await ctx.db.get(id);
    if (!payroll) throw new Error("Payroll not found");

    if (payroll.status === "paid") {
      throw new Error("Payroll already paid");
    }

    const now = Date.now();
    await ctx.db.patch(id, {
      status: "paid",
      paidAt: now,
      updatedAt: now,
    });
  },
});

// Process all pending payments for month
export const processAllPayments = mutation({
  args: {
    month: v.number(),
  },
  handler: async (ctx, { month }) => {
    const payrolls = await ctx.db
      .query("payroll")
      .withIndex("by_month", (q) => q.eq("month", month))
      .collect();

    const pending = payrolls.filter((p) => p.status === "pending");
    const now = Date.now();

    for (const payroll of pending) {
      await ctx.db.patch(payroll._id, {
        status: "paid",
        paidAt: now,
        updatedAt: now,
      });
    }

    return { processed: pending.length };
  },
});

// Delete payroll entry (only if pending)
export const remove = mutation({
  args: { id: v.id("payroll") },
  handler: async (ctx, { id }) => {
    const payroll = await ctx.db.get(id);
    if (!payroll) throw new Error("Payroll not found");

    if (payroll.status === "paid") {
      throw new Error("Cannot delete paid payroll");
    }

    await ctx.db.delete(id);
  },
});
