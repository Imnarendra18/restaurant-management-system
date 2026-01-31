"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  TrendingUp,
  FileText,
  PieChart,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Calculator,
  Package,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { AuthGuard } from "@/components/auth/auth-guard";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/account/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Purchases",
    href: "/account/purchases",
    icon: ShoppingCart,
  },
  {
    title: "Ingredients",
    href: "/account/ingredients",
    icon: Package,
  },
  {
    title: "Suppliers",
    href: "/account/suppliers",
    icon: Truck,
  },
  {
    title: "Ledger",
    href: "/account/ledger",
    icon: BookOpen,
  },
  {
    title: "Trial Balance",
    href: "/account/trial-balance",
    icon: Calculator,
  },
  {
    title: "Profit & Loss",
    href: "/account/profit-loss",
    icon: TrendingUp,
  },
  {
    title: "Balance Sheet",
    href: "/account/balance-sheet",
    icon: FileText,
  },
  {
    title: "Financial Year",
    href: "/account/financial-year",
    icon: Calendar,
  },
  {
    title: "Credit Management",
    href: "/account/credit",
    icon: CreditCard,
  },
  {
    title: "Chart of Accounts",
    href: "/account/chart-of-accounts",
    icon: PieChart,
  },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <AuthGuard allowedRoles={["admin", "accountant"]}>
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-r bg-background transition-all duration-300",
            collapsed ? "w-16" : "w-64"
          )}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            {!collapsed && (
              <Link href="/account/dashboard" className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Accounting</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(collapsed && "mx-auto")}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="flex flex-col gap-1 px-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg mx-auto",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <Separator />
          <div className="p-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 mx-auto"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
    </AuthGuard>
  );
}
