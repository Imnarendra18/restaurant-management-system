import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { components } from "./_generated/api";

// ==================== USER ROLES ====================
// Note: User data is managed by Better Auth component
// This file handles user role management and user queries

// Get all users with their roles (from Better Auth + userRoles)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    // Get all user roles
    const userRoles = await ctx.db.query("userRoles").collect();
    
    // Get all users from Better Auth using component API
    const usersResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: {
        cursor: null,
        numItems: 1000, // Get up to 1000 users
      },
    });
    
    // Join users with their roles
    const usersWithRoles = usersResult.page.map((user: { _id: string; name: string; email: string; emailVerified: boolean; image?: string | null; createdAt: number; updatedAt: number }) => {
      const userRole = userRoles.find((ur) => ur.authUserId === user._id);
      return {
        ...user,
        role: userRole?.role || "cashier",
        roleId: userRole?._id,
      };
    });
    
    return usersWithRoles;
  },
});

// Get user by ID with role (from Better Auth)
export const getUserById = query({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    // Get user from Better Auth
    const user = await authComponent.getAnyUserById(ctx, args.authUserId);
    if (!user) return null;
    
    // Get user role
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", args.authUserId))
      .first();
    
    return {
      ...user,
      role: userRole?.role || "cashier",
      roleId: userRole?._id,
    };
  },
});

// Get all user roles
export const getUserRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userRoles").collect();
  },
});

// Get user roles by role type
export const getUsersByRole = query({
  args: { role: v.union(v.literal("admin"), v.literal("accountant"), v.literal("cashier"), v.literal("user")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userRoles")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

// Get user role by auth user ID
export const getUserRoleById = query({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", args.authUserId))
      .first();
  },
});

// Create or update user role
export const setUserRole = mutation({
  args: {
    authUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("accountant"), v.literal("cashier"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", args.authUserId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userRoles", {
        authUserId: args.authUserId,
        role: args.role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Delete user role
export const deleteUserRole = mutation({
  args: { id: v.id("userRoles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
