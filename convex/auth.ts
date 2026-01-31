import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import authConfig from "./auth.config";

// Use SITE_URL from Convex environment
const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    // Allow requests from various development origins
    trustedOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      // Allow any local network IP on port 3000 for development
      "http://192.168.*:3000",
      "http://10.*:3000",
    ],
    plugins: [
      convex({ authConfig }),
    ],
  });
};

// Get the current authenticated user (basic - from Better Auth)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});

// Get the current user with role
export const getCurrentUserWithRole = query({
  args: {},
  handler: async (ctx) => {
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
    
    if (!authUser) return null;
    
    // Look up user role in our userRoles table using the authUser._id
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .first();
    
    return {
      ...authUser,
      role: userRole?.role || "user",
    };
  },
});

// Get user role by auth user ID (for when we have session but getAuthUser fails)
export const getUserRoleById = query({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", args.authUserId))
      .first();
    
    return userRole?.role || "user";
  },
});

// Initialize user role when they first sign up (called after registration)
export const initializeUserRole = mutation({
  args: { 
    authUserId: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("cashier"), v.literal("accountant"), v.literal("user"))),
  },
  handler: async (ctx, args) => {
    // Check if role already exists
    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", args.authUserId))
      .first();
    
    if (existing) return existing._id;
    
    // Create new role entry
    return await ctx.db.insert("userRoles", {
      authUserId: args.authUserId,
      role: args.role || "user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update user role (admin only)
export const updateUserRole = mutation({
  args: {
    authUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("cashier"), v.literal("accountant")),
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
    } else {
      await ctx.db.insert("userRoles", {
        authUserId: args.authUserId,
        role: args.role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Ensure current user has a role - creates one if missing
export const ensureCurrentUserRole = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;
    
    // Check if role already exists
    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .first();
    
    if (existing) return existing;
    
    // Create new role entry with default role
    const roleId = await ctx.db.insert("userRoles", {
      authUserId: authUser._id,
      role: "cashier",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(roleId);
  },
});
