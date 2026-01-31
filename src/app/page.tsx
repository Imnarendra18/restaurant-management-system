"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import {
  UtensilsCrossed,
  ChefHat,
  BarChart3,
  CreditCard,
  Users,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userRole = useQuery(
    api.auth.getUserRoleById,
    session?.user?.id ? { authUserId: session.user.id } : "skip"
  );

  const handleDashboardClick = () => {
    if (!session) {
      router.push("/auth/login");
      return;
    }

    // Redirect based on role
    switch (userRole) {
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
        router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cornsilk via-background to-cornsilk">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <UtensilsCrossed className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl text-primary">Restaurant ERP</span>
            </Link>
            <div className="flex items-center gap-4">
              {session ? (
                <Button onClick={handleDashboardClick} className="gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full text-secondary mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Complete Restaurant Management Solution</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 leading-tight">
            Manage Your Restaurant
            <br />
            <span className="text-copper">Like Never Before</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            All-in-one ERP system for restaurants. POS, inventory, accounting, staff management, 
            and analytics — everything you need to run a successful restaurant.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg px-8 py-6 gap-2" onClick={handleDashboardClick}>
              {session ? "Open Dashboard" : "Start Free Trial"}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-primary-foreground/70">Restaurants</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1M+</div>
              <div className="text-primary-foreground/70">Orders Processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-primary-foreground/70">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-primary-foreground/70">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for restaurant operations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-shadow">
              <div className="p-3 bg-copper/10 rounded-xl w-fit mb-6">
                <CreditCard className="h-8 w-8 text-copper" />
              </div>
              <h3 className="text-xl font-bold mb-3">POS System</h3>
              <p className="text-muted-foreground">
                Fast, intuitive point-of-sale with table management, split bills, 
                and multiple payment methods.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-shadow">
              <div className="p-3 bg-secondary/10 rounded-xl w-fit mb-6">
                <ChefHat className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Kitchen Management</h3>
              <p className="text-muted-foreground">
                Real-time order tickets, kitchen display system, and 
                inventory tracking for ingredients.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-shadow">
              <div className="p-3 bg-accent/20 rounded-xl w-fit mb-6">
                <BarChart3 className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-3">Analytics & Reports</h3>
              <p className="text-muted-foreground">
                Detailed sales reports, profit margins, popular items, 
                and peak hour analysis.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-shadow">
              <div className="p-3 bg-primary/10 rounded-xl w-fit mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Staff Management</h3>
              <p className="text-muted-foreground">
                Role-based access, attendance tracking, payroll management, 
                and performance metrics.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-shadow">
              <div className="p-3 bg-green-500/10 rounded-xl w-fit mb-6">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Accounting</h3>
              <p className="text-muted-foreground">
                Complete double-entry accounting, journal entries, 
                trial balance, and financial reports.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-shadow">
              <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-6">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-time Sync</h3>
              <p className="text-muted-foreground">
                All data syncs in real-time across devices. 
                Never miss an order or transaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <Clock className="h-12 w-12 text-accent mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Restaurant?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10">
            Join hundreds of restaurants already using our platform to 
            streamline operations and boost profits.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8 py-6 gap-2"
            onClick={handleDashboardClick}
          >
            {session ? "Go to Dashboard" : "Get Started Today"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-primary">Restaurant ERP</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2026 Restaurant ERP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
