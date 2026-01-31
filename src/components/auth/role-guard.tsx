"use client";

import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Role = "admin" | "cashier" | "account" | "user";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles: Role[];
  fallbackUrl?: string;
}

export function AuthGuard({
  children,
  allowedRoles,
  fallbackUrl = "/auth/login",
}: AuthGuardProps) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  // Only query for user role when we have a session
  const userWithRole = useQuery(
    api.auth.getCurrentUserWithRole,
    session ? {} : "skip"
  );
  const router = useRouter();

  const isPending = sessionPending || (session && userWithRole === undefined);

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        // Not logged in, redirect to login
        router.push(`${fallbackUrl}?callbackUrl=${window.location.pathname}`);
      } else if (userWithRole) {
        // Check if user has the required role
        const userRole = userWithRole.role || "user";
        if (!allowedRoles.includes(userRole as Role)) {
          // User doesn't have permission, redirect to unauthorized
          router.push("/unauthorized");
        }
      }
    }
  }, [session, userWithRole, isPending, router, allowedRoles, fallbackUrl]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = userWithRole?.role || "user";
  if (!allowedRoles.includes(userRole as Role)) {
    return null;
  }

  return <>{children}</>;
}

// Backward compatibility exports
export const RoleGuard = AuthGuard;

export function useCurrentUser() {
  return useQuery(api.auth.getCurrentUserWithRole);
}

export function useUserRole(): Role | null {
  const user = useQuery(api.auth.getCurrentUserWithRole);
  if (!user) return null;
  return (user.role as Role) || "cashier";
}
