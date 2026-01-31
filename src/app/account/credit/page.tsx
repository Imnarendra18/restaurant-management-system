"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  User,
  Phone,
  DollarSign,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export default function CreditPage() {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");

  // Fetch data from Convex
  const customersWithCredit = useQuery(api.customers.getWithCredit);
  const transactions = useQuery(api.customers.getCreditTransactions, {});
  const recordPayment = useMutation(api.customers.recordCreditPayment);

  const isLoading = customersWithCredit === undefined;
  const isLoadingTransactions = transactions === undefined;

  const handleRecordPayment = async () => {
    if (!selectedCustomer) return;
    if (paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await recordPayment({
        customerId: selectedCustomer._id as Id<"customers">,
        amount: paymentAmount,
        notes: paymentNote || undefined,
      });
      toast.success(
        `Payment of Rs. ${paymentAmount.toLocaleString()} recorded for ${selectedCustomer.name}`
      );
      setIsPaymentDialogOpen(false);
      setSelectedCustomer(null);
      setPaymentAmount(0);
      setPaymentMethod("cash");
      setPaymentNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    }
  };

  const getStatusBadge = (customer: any) => {
    const status = customer.currentCredit > customer.creditLimit 
      ? "overdue" 
      : customer.currentCredit > customer.creditLimit * 0.8 
        ? "warning" 
        : "good";
    
    switch (status) {
      case "good":
        return (
          <Badge className="bg-green-500/10 text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Good Standing
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-orange-500/10 text-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            High Balance
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-500/10 text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Over Limit
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCustomers = (customersWithCredit || []).filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const totalOutstanding = (customersWithCredit || []).reduce(
    (sum, c) => sum + c.currentCredit,
    0
  );
  const customersWithBalance = (customersWithCredit || []).filter(
    (c) => c.currentCredit > 0
  ).length;
  const overdueCustomers = (customersWithCredit || []).filter(
    (c) => c.currentCredit > c.creditLimit
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Management</h1>
          <p className="text-muted-foreground">
            Manage customer credit accounts and receivables
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-orange-600">
                Rs. {totalOutstanding.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credit Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {(customersWithCredit || []).length}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">
                {customersWithBalance}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Over Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-red-600">
                {overdueCustomers}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Credit Customers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Credit Customers</CardTitle>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No customers found
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.creditOrders?.length || 0} credit orders
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          Rs. {(customer.creditLimit || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              (customer.currentCredit || 0) > (customer.creditLimit || 0)
                                ? "text-red-600 font-bold"
                                : (customer.currentCredit || 0) > 0
                                ? "text-orange-600 font-medium"
                                : "text-green-600"
                            }
                          >
                            Rs. {(customer.currentCredit || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(customer)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(customer.currentCredit || 0) > 0 && (
                              <Dialog
                                open={
                                  isPaymentDialogOpen &&
                                  selectedCustomer?._id === customer._id
                                }
                                onOpenChange={(open) => {
                                  setIsPaymentDialogOpen(open);
                                  if (!open) setSelectedCustomer(null);
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedCustomer(customer)}
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Receive
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Record Payment</DialogTitle>
                                    <DialogDescription>
                                      Record payment from {customer.name}
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="space-y-4">
                                    <div className="p-4 bg-muted rounded-lg">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Current Balance
                                        </span>
                                        <span className="font-bold text-orange-600">
                                          Rs.{" "}
                                          {(customer.currentCredit || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Payment Amount *</Label>
                                      <Input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) =>
                                          setPaymentAmount(
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        placeholder="0"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setPaymentAmount(
                                              customer.currentCredit || 0
                                            )
                                          }
                                        >
                                          Full Amount
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setPaymentAmount(
                                              Math.floor(
                                                (customer.currentCredit || 0) / 2
                                              )
                                            )
                                          }
                                        >
                                          Half
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Payment Method</Label>
                                      <Select
                                        value={paymentMethod}
                                        onValueChange={setPaymentMethod}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="cash">
                                            Cash
                                          </SelectItem>
                                          <SelectItem value="bank">
                                            Bank Transfer
                                          </SelectItem>
                                          <SelectItem value="cheque">
                                            Cheque
                                          </SelectItem>
                                          <SelectItem value="qr">
                                            QR Payment
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Note (Optional)</Label>
                                      <Input
                                        value={paymentNote}
                                        onChange={(e) =>
                                          setPaymentNote(e.target.value)
                                        }
                                        placeholder="Payment reference or note"
                                      />
                                    </div>

                                    {paymentAmount > 0 && (
                                      <div className="p-4 bg-green-500/10 rounded-lg">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Remaining Balance
                                          </span>
                                          <span className="font-bold text-green-600">
                                            Rs.{" "}
                                            {Math.max(
                                              0,
                                              (customer.currentCredit || 0) -
                                                paymentAmount
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        setIsPaymentDialogOpen(false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button onClick={handleRecordPayment}>
                                      Record Payment
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Credit Transactions</CardTitle>
              <CardDescription>
                All credit sales and payment collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions === undefined ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(tx.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {"customerName" in tx ? String(tx.customerName) : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500/10 text-blue-600">
                          <Receipt className="h-3 w-3 mr-1" />
                          Credit
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {tx.orderNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600">
                          + Rs. {tx.amount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Aging Report</CardTitle>
              <CardDescription>
                Receivables summary by customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (customersWithCredit || []).length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No receivables</p>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Available Credit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(customersWithCredit || []).map((customer) => {
                    const outstanding = customer.currentCredit || 0;
                    const limit = customer.creditLimit || 0;
                    const available = Math.max(0, limit - outstanding);
                    return (
                      <TableRow key={customer._id}>
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                        <TableCell className="text-right">
                          Rs. {limit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          Rs. {outstanding.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          Rs. {available.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(customer)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      Rs. {(customersWithCredit || []).reduce((sum, c) => sum + (c.creditLimit || 0), 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      Rs. {totalOutstanding.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      Rs. {(customersWithCredit || []).reduce((sum, c) => sum + Math.max(0, (c.creditLimit || 0) - (c.currentCredit || 0)), 0).toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
