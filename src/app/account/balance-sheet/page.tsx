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
import { Download, Calendar, Printer, Scale } from "lucide-react";

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  // Fetch balance sheet from Convex
  const balanceSheet = useQuery(api.accounting.getBalanceSheet, {});

  const isLoading = balanceSheet === undefined;

  // Extract data with fallbacks
  const assets = balanceSheet?.assets || { current: [], fixed: [], other: [], totalCurrent: 0, totalFixed: 0, total: 0 };
  const liabilities = balanceSheet?.liabilities || { current: [], longTerm: [], totalCurrent: 0, totalLongTerm: 0, total: 0 };
  const equity = balanceSheet?.equity || [];
  const totalEquity = balanceSheet?.totalEquity || 0;

  const totalLiabilitiesAndEquity = liabilities.total + totalEquity;
  const isBalanced = Math.abs(assets.total - totalLiabilitiesAndEquity) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Balance Sheet</h1>
          <p className="text-muted-foreground">
            Statement of financial position
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
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="last-month">End of Last Month</SelectItem>
                <SelectItem value="last-quarter">End of Last Quarter</SelectItem>
                <SelectItem value="last-year">End of Last Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : isBalanced ? (
                <span className="text-green-600 font-medium">
                  ✓ Balance Sheet is Balanced
                </span>
              ) : (
                <span className="text-red-600 font-medium">
                  ✗ Difference: Rs.{" "}
                  {Math.abs(assets.total - totalLiabilitiesAndEquity).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">
                Rs. {assets.total.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-red-600">
                Rs. {liabilities.total.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-green-600">
                Rs. {totalEquity.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance Sheet Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Side */}
        <Card>
          <CardHeader className="text-center border-b bg-blue-500/5">
            <CardTitle className="text-lg text-blue-700">ASSETS</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableBody>
                  {/* Current Assets */}
                  {assets.current.length > 0 && (
                    <>
                      <TableRow className="bg-blue-500/10">
                        <TableCell
                          colSpan={2}
                          className="font-bold text-blue-700"
                        >
                          Current Assets
                        </TableCell>
                      </TableRow>
                      {assets.current.map((item, index) => (
                        <TableRow key={`ca-${index}`}>
                          <TableCell className="pl-8">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-medium">
                        <TableCell className="pl-4">
                          Total Current Assets
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {assets.totalCurrent.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* Fixed Assets */}
                  {assets.fixed.length > 0 && (
                    <>
                      <TableRow className="bg-blue-500/10">
                        <TableCell
                          colSpan={2}
                          className="font-bold text-blue-700"
                        >
                          Fixed Assets
                        </TableCell>
                      </TableRow>
                      {assets.fixed.map((item, index) => (
                        <TableRow key={`fa-${index}`}>
                          <TableCell className="pl-8">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-medium">
                        <TableCell className="pl-4">
                          Total Fixed Assets (Net)
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {assets.totalFixed.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* Other Assets */}
                  {assets.other && assets.other.length > 0 && (
                    <>
                      <TableRow className="bg-blue-500/10">
                        <TableCell
                          colSpan={2}
                          className="font-bold text-blue-700"
                        >
                          Other Assets
                        </TableCell>
                      </TableRow>
                      {assets.other.map((item, index) => (
                        <TableRow key={`oa-${index}`}>
                          <TableCell className="pl-8">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Total Assets */}
                  <TableRow className="bg-blue-500/20 font-bold text-lg">
                    <TableCell>TOTAL ASSETS</TableCell>
                    <TableCell className="text-right text-blue-700">
                      Rs. {assets.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Liabilities & Equity Side */}
        <Card>
          <CardHeader className="text-center border-b bg-purple-500/5">
            <CardTitle className="text-lg text-purple-700">
              LIABILITIES & EQUITY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableBody>
                  {/* Current Liabilities */}
                  {liabilities.current.length > 0 && (
                    <>
                      <TableRow className="bg-red-500/10">
                        <TableCell
                          colSpan={2}
                          className="font-bold text-red-700"
                        >
                          Current Liabilities
                        </TableCell>
                      </TableRow>
                      {liabilities.current.map((item, index) => (
                        <TableRow key={`cl-${index}`}>
                          <TableCell className="pl-8">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-medium">
                        <TableCell className="pl-4">
                          Total Current Liabilities
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {liabilities.totalCurrent.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* Long Term Liabilities */}
                  {liabilities.longTerm.length > 0 && (
                    <>
                      <TableRow className="bg-red-500/10">
                        <TableCell
                          colSpan={2}
                          className="font-bold text-red-700"
                        >
                          Long Term Liabilities
                        </TableCell>
                      </TableRow>
                      {liabilities.longTerm.map((item, index) => (
                        <TableRow key={`lt-${index}`}>
                          <TableCell className="pl-8">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-medium">
                        <TableCell className="pl-4">
                          Total Long Term Liabilities
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {liabilities.totalLongTerm.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* Total Liabilities */}
                  <TableRow className="bg-red-500/20 font-bold">
                    <TableCell>TOTAL LIABILITIES</TableCell>
                    <TableCell className="text-right text-red-700">
                      {liabilities.total.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  {/* Equity */}
                  {equity.length > 0 && (
                    <>
                      <TableRow className="bg-green-500/10">
                        <TableCell
                          colSpan={2}
                          className="font-bold text-green-700"
                        >
                          Owner&apos;s Equity
                        </TableCell>
                      </TableRow>
                      {equity.map((item, index) => (
                        <TableRow key={`eq-${index}`}>
                          <TableCell className="pl-8">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-green-500/20">
                        <TableCell>TOTAL EQUITY</TableCell>
                        <TableCell className="text-right text-green-700">
                          {totalEquity.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* Total Liabilities & Equity */}
                  <TableRow className="bg-purple-500/20 font-bold text-lg">
                    <TableCell>TOTAL LIABILITIES & EQUITY</TableCell>
                    <TableCell className="text-right text-purple-700">
                      Rs. {totalLiabilitiesAndEquity.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Ratios */}
      <Card>
        <CardHeader>
          <CardTitle>Key Financial Ratios</CardTitle>
          <CardDescription>
            Important ratios derived from the balance sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Current Ratio</p>
                <p className="text-2xl font-bold">
                  {liabilities.totalCurrent > 0 
                    ? (assets.totalCurrent / liabilities.totalCurrent).toFixed(2)
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Current Assets / Current Liabilities
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Debt to Equity Ratio
                </p>
                <p className="text-2xl font-bold">
                  {totalEquity > 0
                    ? (liabilities.total / totalEquity).toFixed(2)
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Debt / Total Equity
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Quick Ratio</p>
                <p className="text-2xl font-bold">
                  {liabilities.totalCurrent > 0
                    ? ((assets.totalCurrent * 0.9) / liabilities.totalCurrent).toFixed(2)
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  (Current Assets - Inventory) / Current Liabilities
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Working Capital
                </p>
                <p className="text-2xl font-bold text-green-600">
                  Rs.{" "}
                  {(assets.totalCurrent - liabilities.totalCurrent).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Current Assets - Current Liabilities
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
