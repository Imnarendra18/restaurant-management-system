"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Search,
  Phone,
  User,
  Banknote,
  CreditCard,
  QrCode,
  Loader2,
  History,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CustomerWithCredit {
  _id: Id<"customers">;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  currentCredit: number;
  creditLimit: number;
  totalOrders: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  creditOrders: Array<{
    _id: Id<"orders">;
    orderNumber: string;
    createdAt: number;
    grandTotal: number;
    paymentStatus: string;
  }>;
}

export default function CreditPaymentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithCredit | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qr">("cash");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch customers with credit using Convex
  const customersWithCredit = useQuery(api.customers.getWithCredit);
  const recordPayment = useMutation(api.customers.recordCreditPayment);

  // Filter customers based on search
  const filteredCustomers = (customersWithCredit ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handlePayment = async () => {
    if (!selectedCustomer) {
      toast.error("No customer selected");
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedCustomer.currentCredit) {
      toast.error("Payment amount exceeds outstanding balance");
      return;
    }

    setIsLoading(true);
    try {
      await recordPayment({
        customerId: selectedCustomer._id,
        amount: amount,
      });

      toast.success("Payment recorded successfully");
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setSelectedCustomer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPay = (amount: number) => {
    setPaymentAmount(amount.toString());
  };

  const handleSelectCustomer = (customer: CustomerWithCredit) => {
    setSelectedCustomer(customer);
  };

  // Loading state
  if (customersWithCredit === undefined) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Credit Payment</h1>
          <p className="text-muted-foreground">
            Collect credit payments from customers
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-col items-center justify-center h-[500px]">
              <Skeleton className="h-16 w-16 rounded-full mb-4" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Credit Payment</h1>
        <p className="text-muted-foreground">
          Collect credit payments from customers
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer Search */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Find Customer</CardTitle>
            <CardDescription>
              Search by name or phone number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => handleSelectCustomer(customer as CustomerWithCredit)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedCustomer?._id === customer._id
                        ? "bg-primary/10 border-primary border"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            customer.currentCredit > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          Rs. {customer.currentCredit.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Due</p>
                      </div>
                    </div>
                  </button>
                ))}

                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No customers with credit found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Customer Details & Credit History */}
        <Card className="lg:col-span-2">
          {selectedCustomer ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedCustomer.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      {selectedCustomer.phone}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowPaymentDialog(true)}>
                    <Banknote className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Credit Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-red-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold text-red-600">
                      Rs. {selectedCustomer.currentCredit.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Credit Limit</p>
                    <p className="text-2xl font-bold">
                      Rs. {selectedCustomer.creditLimit.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rs.{" "}
                      {(
                        selectedCustomer.creditLimit - selectedCustomer.currentCredit
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Credit Utilization Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Credit Utilization</span>
                    <span>
                      {selectedCustomer.creditLimit > 0
                        ? Math.round(
                            (selectedCustomer.currentCredit /
                              selectedCustomer.creditLimit) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        selectedCustomer.creditLimit > 0 &&
                        selectedCustomer.currentCredit /
                          selectedCustomer.creditLimit >
                          0.8
                          ? "bg-red-500"
                          : selectedCustomer.creditLimit > 0 &&
                            selectedCustomer.currentCredit /
                              selectedCustomer.creditLimit >
                              0.5
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${
                          selectedCustomer.creditLimit > 0
                            ? Math.min(
                                (selectedCustomer.currentCredit /
                                  selectedCustomer.creditLimit) *
                                  100,
                                100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Credit Orders */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Pending Credit Orders
                    </h3>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCustomer.creditOrders.length > 0 ? (
                        selectedCustomer.creditOrders.map((order) => (
                          <TableRow key={order._id}>
                            <TableCell className="font-medium">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              Rs. {order.grandTotal.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {order.paymentStatus === "paid" ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Paid
                                </Badge>
                              ) : order.paymentStatus === "partial" ? (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                  Partial
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No pending credit orders
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <User className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a Customer</p>
              <p className="text-sm">
                Search and select a customer to view their credit details
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Credit Payment</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.name} - Outstanding: Rs.{" "}
              {selectedCustomer?.currentCredit.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Quick Pay Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => handleQuickPay(1000)}
              >
                Rs. 1,000
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickPay(2000)}
              >
                Rs. 2,000
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickPay(5000)}
              >
                Rs. 5,000
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                handleQuickPay(selectedCustomer?.currentCredit || 0)
              }
            >
              Full Amount: Rs.{" "}
              {selectedCustomer?.currentCredit.toLocaleString()}
            </Button>

            <Separator />

            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Banknote className="h-5 w-5" />
                  <span className="text-xs">Cash</span>
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs">Card</span>
                </Button>
                <Button
                  variant={paymentMethod === "qr" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("qr")}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <QrCode className="h-5 w-5" />
                  <span className="text-xs">QR</span>
                </Button>
              </div>
            </div>

            {paymentAmount && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Current Outstanding</span>
                  <span>Rs. {selectedCustomer?.currentCredit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Payment</span>
                  <span>- Rs. {parseFloat(paymentAmount || "0").toLocaleString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>New Balance</span>
                  <span>
                    Rs.{" "}
                    {Math.max(
                      (selectedCustomer?.currentCredit || 0) -
                        parseFloat(paymentAmount || "0"),
                      0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
