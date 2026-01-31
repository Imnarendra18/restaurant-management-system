"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function DashboardRedirect() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  
  // Query user role directly using the session user ID
  const role = useQuery(
    api.auth.getUserRoleById,
    session?.user?.id ? { authUserId: session.user.id } : "skip"
  );
  
  const isPending = sessionPending || (session?.user && role === undefined);

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        router.push("/auth/login");
      } else if (role) {
        switch (role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "accountant":
            router.push("/account/dashboard");
            break;
          case "cashier":
            router.push("/cashier/pos");
            break;
          default:
            router.push("/cashier/pos");
            break;
        }
      }
    }
  }, [session, role, isPending, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
