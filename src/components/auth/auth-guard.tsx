"use client";

import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Role = "admin" | "cashier" | "accountant" | "user";

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
  
  // Query user role directly from userRoles table using session user ID
  const role = useQuery(
    api.auth.getUserRoleById,
    session?.user?.id ? { authUserId: session.user.id } : "skip"
  );
  
  const router = useRouter();
  const isPending = sessionPending || (session?.user && role === undefined);

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        router.push(`${fallbackUrl}?callbackUrl=${window.location.pathname}`);
      } else if (role !== undefined) {
        if (!allowedRoles.includes(role as Role)) {
          router.push("/unauthorized");
        }
      }
    }
  }, [session, role, isPending, router, allowedRoles, fallbackUrl]);

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

  if (!allowedRoles.includes(role as Role)) {
    return null;
  }

  return <>{children}</>;
}
