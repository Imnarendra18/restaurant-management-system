import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Get all staff members
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const staff = await ctx.db.query("staff").collect();

    const staffWithUsers = await Promise.all(
      staff.map(async (s) => {
        // Get user from Better Auth if authUserId is set
        const user = s.authUserId ? await authComponent.getAnyUserById(ctx, s.authUserId) : null;
        return { ...s, user };
      })
    );

    return staffWithUsers;
  },
});

// Get active staff only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// Get staff by department
export const getByDepartment = query({
  args: { department: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_department", (q) => q.eq("department", args.department))
      .collect();
  },
});

// Get waiters (staff in service department)
export const getWaiters = query({
  args: {},
  handler: async (ctx) => {
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_department", (q) => q.eq("department", "service"))
      .collect();

    return staff.filter((s) => s.status === "active");
  },
});

// Get a single staff member by ID
export const getById = query({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.id);
    if (!staff) return null;

    const user = staff.authUserId ? await authComponent.getAnyUserById(ctx, staff.authUserId) : null;
    return { ...staff, user };
  },
});

// Create a new staff member
export const create = mutation({
  args: {
    authUserId: v.optional(v.string()),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    position: v.string(),
    department: v.string(),
    salary: v.number(),
    joinDate: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("terminated")),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("staff", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing staff member
export const update = mutation({
  args: {
    id: v.id("staff"),
    authUserId: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
    salary: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("terminated"))),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Staff member not found");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a staff member
export const remove = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.id);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Check if staff has payroll records
    const payroll = await ctx.db
      .query("payroll")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.id))
      .first();

    if (payroll) {
      throw new Error("Cannot delete staff with payroll history. Mark as terminated instead.");
    }

    await ctx.db.delete(args.id);
  },
});

// Link staff to user account
export const linkToUser = mutation({
  args: {
    staffId: v.id("staff"),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify user exists in Better Auth
    const user = await authComponent.getAnyUserById(ctx, args.authUserId);
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.patch(args.staffId, {
      authUserId: args.authUserId,
      updatedAt: Date.now(),
    });
  },
});
