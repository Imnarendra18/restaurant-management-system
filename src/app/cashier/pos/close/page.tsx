"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  QrCode,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";

interface CashCount {
  denomination: number;
  quantity: number;
  total: number;
}

const DENOMINATIONS = [1000, 500, 100, 50, 20, 10, 5, 2, 1];

export default function DayClosePage() {
  const router = useRouter();

  // Fetch session summary from Convex
  const sessionSummary = useQuery(api.dashboard.getSessionSummary);
  const closeSession = useMutation(api.cashierSessions.close);

  const [cashCounts, setCashCounts] = useState<CashCount[]>(
    DENOMINATIONS.map((d) => ({ denomination: d, quantity: 0, total: 0 }))
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remarks, setRemarks] = useState("");

  // Calculate totals
  const countedCash = cashCounts.reduce((sum, c) => sum + c.total, 0);
  const expectedCash = sessionSummary?.expectedCash ?? 0;
  const variance = countedCash - expectedCash;

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...cashCounts];
    updated[index].quantity = quantity;
    updated[index].total = updated[index].denomination * quantity;
    setCashCounts(updated);
  };

  const handleCloseDay = async () => {
    if (!sessionSummary?.sessionId) {
      toast.error("No active session found");
      return;
    }

    setIsLoading(true);
    try {
      await closeSession({
        sessionId: sessionSummary.sessionId,
        closingCash: countedCash,
        notes: remarks || undefined,
      });

      toast.success("Day closed successfully");
      router.push("/cashier/pos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close day");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (sessionSummary === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b px-4 flex items-center justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // No active session state
  if (sessionSummary === null) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b px-4 flex items-center justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Day Close</h1>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No Active Session</p>
              <p className="text-sm mt-2">
                You don&apos;t have an active session to close. Please open a session first.
              </p>
              <Button className="mt-6" onClick={() => router.push("/cashier/pos")}>
                Go to POS
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-14 border-b px-4 flex items-center justify-between bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Day Close</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Sales Summary</CardTitle>
            <CardDescription>
              Overview of all transactions for this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm">Total Sales</span>
                </div>
                <p className="text-2xl font-bold">
                  Rs. {sessionSummary.totalSales.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sessionSummary.totalOrders} orders
                </p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Banknote className="h-4 w-4" />
                  <span className="text-sm">Cash Sales</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  Rs. {sessionSummary.cashSales.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Card Sales</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  Rs. {sessionSummary.cardSales.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm">QR/Online</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  Rs. {sessionSummary.qrSales.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Cash Count */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cash Count
              </CardTitle>
              <CardDescription>
                Count the cash in your drawer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Denomination</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashCounts.map((item, index) => (
                    <TableRow key={item.denomination}>
                      <TableCell className="font-medium">
                        Rs. {item.denomination}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            handleQuantityChange(index, parseInt(e.target.value) || 0)
                          }
                          className="w-20 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        Rs. {item.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Counted</span>
                <span>Rs. {countedCash.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Reconciliation */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Reconciliation</CardTitle>
              <CardDescription>
                Compare counted cash with expected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Opening Cash</span>
                  <span className="font-medium">
                    Rs. {sessionSummary.openingCash.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Cash Sales</span>
                  <span className="font-medium">
                    + Rs. {sessionSummary.cashSales.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="font-medium">Expected Cash</span>
                  <span className="font-bold text-lg">
                    Rs. {expectedCash.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Counted Cash</span>
                  <span className="font-bold text-lg">
                    Rs. {countedCash.toLocaleString()}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Variance */}
              <div
                className={`p-4 rounded-lg ${
                  variance === 0
                    ? "bg-green-500/10"
                    : variance > 0
                    ? "bg-blue-500/10"
                    : "bg-red-500/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {variance === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          variance > 0 ? "text-blue-600" : "text-red-600"
                        }`}
                      />
                    )}
                    <span className="font-medium">Variance</span>
                  </div>
                  <span
                    className={`font-bold text-xl ${
                      variance === 0
                        ? "text-green-600"
                        : variance > 0
                        ? "text-blue-600"
                        : "text-red-600"
                    }`}
                  >
                    {variance > 0 ? "+" : ""}
                    Rs. {variance.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {variance === 0
                    ? "Cash count matches expected amount"
                    : variance > 0
                    ? "Cash surplus detected"
                    : "Cash shortage detected"}
                </p>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (optional)</Label>
                <Input
                  id="remarks"
                  placeholder="Any notes about the variance or the day..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {/* Close Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => setShowConfirmDialog(true)}
              >
                Close Day
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    Cash
                  </TableCell>
                  <TableCell className="text-right">
                    Rs. {sessionSummary.cashSales.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    Card
                  </TableCell>
                  <TableCell className="text-right">
                    Rs. {sessionSummary.cardSales.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-purple-600" />
                    QR/Fonepay
                  </TableCell>
                  <TableCell className="text-right">
                    Rs. {sessionSummary.qrSales.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-orange-600" />
                    Credit
                  </TableCell>
                  <TableCell className="text-right">
                    Rs. {sessionSummary.creditSales.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    Rs. {sessionSummary.totalSales.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Day Close</DialogTitle>
            <DialogDescription>
              Are you sure you want to close the day? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex justify-between">
              <span>Total Sales</span>
              <span className="font-medium">
                Rs. {sessionSummary.totalSales.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Counted Cash</span>
              <span className="font-medium">Rs. {countedCash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Variance</span>
              <span
                className={`font-medium ${
                  variance === 0
                    ? "text-green-600"
                    : variance > 0
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {variance > 0 ? "+" : ""}Rs. {variance.toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseDay} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
