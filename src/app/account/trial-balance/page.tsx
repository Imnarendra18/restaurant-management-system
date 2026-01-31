"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Calendar, Printer, CheckCircle } from "lucide-react";

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");

  // Fetch trial balance from Convex
  const trialBalance = useQuery(api.accounting.getTrialBalance, {});

  const isLoading = trialBalance === undefined;

  // Build arrays from trial balance data
  const assets = trialBalance?.assets || [];
  const liabilities = trialBalance?.liabilities || [];
  const equity = trialBalance?.equity || [];
  const income = trialBalance?.income || [];
  const expenses = trialBalance?.expenses || [];

  const allAccounts = [...assets, ...liabilities, ...equity, ...income, ...expenses];

  const totalDebit = trialBalance?.totalDebits || 0;
  const totalCredit = trialBalance?.totalCredits || 0;
  const isBalanced = trialBalance?.isBalanced || false;

  const getCategoryColor = (code: string) => {
    if (code.startsWith("1")) return "bg-blue-500/10 text-blue-600";
    if (code.startsWith("2")) return "bg-red-500/10 text-red-600";
    if (code.startsWith("3")) return "bg-purple-500/10 text-purple-600";
    if (code.startsWith("4")) return "bg-green-500/10 text-green-600";
    if (code.startsWith("5")) return "bg-orange-500/10 text-orange-600";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trial Balance</h1>
          <p className="text-muted-foreground">
            Summary of all ledger account balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">As of:</span>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="current-quarter">Current Quarter</SelectItem>
                <SelectItem value="current-year">Current Year</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              {isBalanced ? (
                <Badge className="bg-green-500/10 text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Balanced
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Difference: Rs.{" "}
                  {Math.abs(totalDebit - totalCredit).toLocaleString()}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trial Balance Report */}
      <Card>
        <CardHeader className="text-center border-b">
          <CardTitle className="text-xl">Trial Balance</CardTitle>
          <CardDescription>
            As of {new Date(asOfDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right w-40">Debit (Rs.)</TableHead>
                  <TableHead className="text-right w-40">Credit (Rs.)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Assets Section */}
                {assets.length > 0 && (
                  <>
                    <TableRow className="bg-blue-500/5">
                      <TableCell colSpan={4} className="font-bold text-blue-700">
                        ASSETS
                      </TableCell>
                    </TableRow>
                    {assets.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(account.code)}>
                            {account.code}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Liabilities Section */}
                {liabilities.length > 0 && (
                  <>
                    <TableRow className="bg-red-500/5">
                      <TableCell colSpan={4} className="font-bold text-red-700">
                        LIABILITIES
                      </TableCell>
                    </TableRow>
                    {liabilities.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(account.code)}>
                            {account.code}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Equity Section */}
                {equity.length > 0 && (
                  <>
                    <TableRow className="bg-purple-500/5">
                      <TableCell colSpan={4} className="font-bold text-purple-700">
                        EQUITY
                      </TableCell>
                    </TableRow>
                    {equity.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(account.code)}>
                            {account.code}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Income Section */}
                {income.length > 0 && (
                  <>
                    <TableRow className="bg-green-500/5">
                      <TableCell colSpan={4} className="font-bold text-green-700">
                        INCOME
                      </TableCell>
                    </TableRow>
                    {income.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(account.code)}>
                            {account.code}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Expenses Section */}
                {expenses.length > 0 && (
                  <>
                    <TableRow className="bg-orange-500/5">
                      <TableCell colSpan={4} className="font-bold text-orange-700">
                        EXPENSES
                      </TableCell>
                    </TableRow>
                    {expenses.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(account.code)}>
                            {account.code}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Totals Row */}
                <TableRow className="bg-muted font-bold text-lg">
                  <TableCell colSpan={2} className="text-right">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right text-green-700">
                    {totalDebit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-red-700">
                    {totalCredit.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allAccounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Debit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              Rs. {totalDebit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              Rs. {totalCredit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
