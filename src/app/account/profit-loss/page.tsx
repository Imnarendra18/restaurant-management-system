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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  Calendar,
  Printer,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");

  // Build date range for query
  const dateRange = {
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  };

  // Fetch profit/loss from Convex
  const profitLoss = useQuery(api.accounting.getProfitLoss, {
    startDate: dateRange.from?.getTime() || 0,
    endDate: dateRange.to?.getTime() || Date.now(),
  });

  const isLoading = profitLoss === undefined;

  // Calculate values with fallbacks
  const revenue = profitLoss?.revenue || { items: [], total: 0 };
  const costOfGoodsSold = profitLoss?.costOfGoodsSold || { items: [], total: 0 };
  const operatingExpenses = profitLoss?.operatingExpenses || { items: [], total: 0 };
  const depreciation = profitLoss?.depreciation || { items: [], total: 0 };
  const otherExpenses = profitLoss?.otherExpenses || { items: [], total: 0 };

  const grossProfit = revenue.total - costOfGoodsSold.total;
  const operatingProfit = grossProfit - operatingExpenses.total;
  const profitBeforeDepreciation = operatingProfit;
  const profitAfterDepreciation = profitBeforeDepreciation - depreciation.total;
  const netProfit = profitAfterDepreciation - otherExpenses.total;

  const grossMargin = revenue.total > 0 
    ? ((grossProfit / revenue.total) * 100).toFixed(1)
    : "0.0";
  const netMargin = revenue.total > 0
    ? ((netProfit / revenue.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">
            Income statement showing profitability
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
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">
                Rs. {revenue.total.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <p className="text-2xl font-bold text-blue-600">
                  Rs. {grossProfit.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{grossMargin}% margin</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-2xl font-bold ${
                      netProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    Rs. {Math.abs(netProfit).toLocaleString()}
                  </p>
                  {netProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{netMargin}% margin</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-red-600">
                Rs.{" "}
                {(
                  costOfGoodsSold.total +
                  operatingExpenses.total +
                  depreciation.total +
                  otherExpenses.total
                ).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader className="text-center border-b">
          <CardTitle className="text-xl">
            Statement of Profit and Loss
          </CardTitle>
          <CardDescription>
            For the period {new Date(dateFrom).toLocaleDateString()} to{" "}
            {new Date(dateTo).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(15)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[60%]">Particulars</TableHead>
                  <TableHead className="text-right">Amount (Rs.)</TableHead>
                  <TableHead className="text-right">Total (Rs.)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Revenue Section */}
                <TableRow className="bg-green-500/5">
                  <TableCell colSpan={3} className="font-bold text-green-700">
                    REVENUE
                  </TableCell>
                </TableRow>
                {revenue.items.map((item, index) => (
                  <TableRow key={`rev-${index}`}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-green-500/10">
                  <TableCell className="pl-4">Total Revenue</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-green-700 font-bold">
                    {revenue.total.toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* COGS Section */}
                <TableRow className="bg-red-500/5">
                  <TableCell colSpan={3} className="font-bold text-red-700">
                    COST OF GOODS SOLD
                  </TableCell>
                </TableRow>
                {costOfGoodsSold.items.map((item, index) => (
                  <TableRow key={`cogs-${index}`}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-red-500/10">
                  <TableCell className="pl-4">Total Cost of Goods Sold</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-red-700 font-bold">
                    ({costOfGoodsSold.total.toLocaleString()})
                  </TableCell>
                </TableRow>

                {/* Gross Profit */}
                <TableRow className="bg-blue-500/10 font-bold text-lg">
                  <TableCell>GROSS PROFIT</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-blue-700">
                    {grossProfit.toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* Operating Expenses */}
                <TableRow className="bg-orange-500/5">
                  <TableCell colSpan={3} className="font-bold text-orange-700">
                    OPERATING EXPENSES
                  </TableCell>
                </TableRow>
                {operatingExpenses.items.map((item, index) => (
                  <TableRow key={`opex-${index}`}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-orange-500/10">
                  <TableCell className="pl-4">Total Operating Expenses</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-orange-700 font-bold">
                    ({operatingExpenses.total.toLocaleString()})
                  </TableCell>
                </TableRow>

                {/* Operating Profit */}
                <TableRow className="bg-muted font-bold">
                  <TableCell>OPERATING PROFIT (EBITDA)</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">
                    {operatingProfit.toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* Depreciation */}
                <TableRow className="bg-gray-500/5">
                  <TableCell colSpan={3} className="font-bold text-gray-700">
                    DEPRECIATION & AMORTIZATION
                  </TableCell>
                </TableRow>
                {depreciation.items.map((item, index) => (
                  <TableRow key={`dep-${index}`}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-gray-500/10">
                  <TableCell className="pl-4">Total Depreciation</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-gray-700 font-bold">
                    ({depreciation.total.toLocaleString()})
                  </TableCell>
                </TableRow>

                {/* Profit Before Tax */}
                <TableRow className="bg-muted font-bold">
                  <TableCell>PROFIT BEFORE INTEREST & TAX (EBIT)</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">
                    {profitAfterDepreciation.toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* Other Expenses */}
                <TableRow className="bg-purple-500/5">
                  <TableCell colSpan={3} className="font-bold text-purple-700">
                    OTHER EXPENSES
                  </TableCell>
                </TableRow>
                {otherExpenses.items.map((item, index) => (
                  <TableRow key={`other-${index}`}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-purple-500/10">
                  <TableCell className="pl-4">Total Other Expenses</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-purple-700 font-bold">
                    ({otherExpenses.total.toLocaleString()})
                  </TableCell>
                </TableRow>

                {/* Net Profit */}
                <TableRow
                  className={`font-bold text-lg ${
                    netProfit >= 0 ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                >
                  <TableCell className="text-lg">
                    NET {netProfit >= 0 ? "PROFIT" : "LOSS"}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell
                    className={`text-right text-xl ${
                      netProfit >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {netProfit >= 0 ? "" : "("}
                    {Math.abs(netProfit).toLocaleString()}
                    {netProfit >= 0 ? "" : ")"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
