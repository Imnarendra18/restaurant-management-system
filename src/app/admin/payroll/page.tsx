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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Loader2,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function PayrollPage() {
  const staff = useQuery(api.staff.getActive);

  const [activeTab, setActiveTab] = useState("current");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<{
    _id: Id<"payroll">;
    staffName: string;
    staffPosition: string;
    staffDepartment: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    netPay: number;
    status: string;
    paidAt?: number;
    month: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const [generateFormData, setGenerateFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Real Convex queries
  const currentMonth = filterYear * 100 + filterMonth; // YYYYMM format
  const payrolls = useQuery(api.payroll.getByMonth, { month: currentMonth });
  const summary = useQuery(api.payroll.getSummary, { month: currentMonth });
  const generatePayroll = useMutation(api.payroll.generateForMonth);
  const markAsPaid = useMutation(api.payroll.markAsPaid);
  const processAll = useMutation(api.payroll.processAllPayments);

  const handleGeneratePayroll = async () => {
    setIsLoading(true);
    try {
      const generateMonth = generateFormData.year * 100 + generateFormData.month;
      const result = await generatePayroll({ month: generateMonth });
      toast.success(`Payroll generated for ${result.created} staff members`);
      setShowGenerateDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPayroll) return;

    setIsLoading(true);
    try {
      await markAsPaid({ id: selectedPayroll._id });
      toast.success(`Payment processed for ${selectedPayroll.staffName}`);
      setShowPayDialog(false);
      setSelectedPayroll(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process payment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkPay = async () => {
    const pendingCount = summary?.pendingCount || 0;
    if (pendingCount === 0) {
      toast.error("No pending payments to process");
      return;
    }

    setIsLoading(true);
    try {
      const result = await processAll({ month: currentMonth });
      toast.success(`${result.processed} payments processed successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process bulk payment");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/10 text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "processed":
        return (
          <Badge className="bg-blue-500/10 text-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            Processed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMonthName = (month: number) => {
    return MONTHS.find((m) => m.value === month)?.label || String(month);
  };

  const isLoadingData = payrolls === undefined || summary === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">
            Manage staff salaries and payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBulkPay} disabled={isLoading || isLoadingData}>
            <DollarSign className="h-4 w-4 mr-2" />
            Pay All Pending
          </Button>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Payroll
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Current Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {getMonthName(filterMonth)} {filterYear}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">
                Rs. {(summary?.totalPayroll || 0).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold text-green-600">{summary?.paidCount || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold text-yellow-600">{summary?.pendingCount || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll List</CardTitle>
          <CardDescription>
            {getMonthName(filterMonth)} {filterYear} - {payrolls?.length || 0} staff
            members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : payrolls && payrolls.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((payroll) => (
                <TableRow key={payroll._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(payroll.staffName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{payroll.staffName}</span>
                        {payroll.staffPosition && (
                          <p className="text-xs text-muted-foreground">{payroll.staffPosition}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    Rs. {payroll.baseSalary.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    + Rs. {payroll.allowances.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    - Rs. {payroll.deductions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    Rs. {payroll.netPay.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                  <TableCell>
                    {payroll.status !== "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPayroll(payroll);
                          setShowPayDialog(true);
                        }}
                      >
                        Pay
                      </Button>
                    )}
                    {payroll.status === "paid" && payroll.paidAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(payroll.paidAt).toLocaleDateString()}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payroll records for this period.</p>
              <p className="text-sm">Click "Generate Payroll" to create payroll entries for active staff.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Payroll Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Monthly Payroll</DialogTitle>
            <DialogDescription>
              Generate payroll for all active staff members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={String(generateFormData.month)}
                  onValueChange={(value) =>
                    setGenerateFormData({ ...generateFormData, month: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={String(generateFormData.year)}
                  onValueChange={(value) =>
                    setGenerateFormData({ ...generateFormData, year: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Summary</p>
              <div className="flex justify-between text-sm">
                <span>Active Staff</span>
                <span>{staff?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Period</span>
                <span>
                  {getMonthName(generateFormData.month)} {generateFormData.year}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This will create payroll entries for all active staff members based on
              their current salary settings.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleGeneratePayroll} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Confirm salary payment for {selectedPayroll?.staffName}
            </DialogDescription>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium">{selectedPayroll.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position</span>
                  <span>{selectedPayroll.staffPosition || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span>
                    {getMonthName(selectedPayroll.month % 100)} {Math.floor(selectedPayroll.month / 100)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span>Rs. {selectedPayroll.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Allowances</span>
                  <span>+ Rs. {selectedPayroll.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Deductions</span>
                  <span>- Rs. {selectedPayroll.deductions.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Net Pay</span>
                  <span>Rs. {selectedPayroll.netPay.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessPayment} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <DollarSign className="h-4 w-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
