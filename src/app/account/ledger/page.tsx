"use client";

import { useState } from "react";
import { useQuery } from "convex/react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

export default function LedgerPage() {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch accounts from Convex
  const accounts = useQuery(api.chartOfAccounts.list);
  
  // Build date range for query
  const dateRange = {
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  };

  // Fetch ledger entries from Convex
  const ledgerEntries = useQuery(
    api.accounting.getLedgerEntries,
    selectedAccount
      ? {
          accountId: selectedAccount as Id<"chartOfAccounts">,
          startDate: dateRange.from?.getTime(),
          endDate: dateRange.to?.getTime(),
        }
      : "skip"
  );

  const isLoading = accounts === undefined;
  const isLoadingEntries = selectedAccount && ledgerEntries === undefined;

  const selectedAccountData = accounts?.find((a) => a._id === selectedAccount);
  const selectedAccountName = selectedAccountData?.name || "Select an account";
  const openingBalance = selectedAccountData?.openingBalance || 0;

  // Filter entries by search query (if entries are loaded)
  const filteredEntries = (ledgerEntries || []).filter((entry) => {
    const matchesSearch = entry.particulars
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalDebit = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + e.credit, 0);
  const closingBalance = filteredEntries.length > 0 
    ? filteredEntries[filteredEntries.length - 1].balance 
    : openingBalance;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ledger</h1>
          <p className="text-muted-foreground">
            View account-wise transaction history
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Account Selection & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Filters</CardTitle>
          <CardDescription>
            Select account and date range to view transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From date"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To date"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">Rs. {openingBalance.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Period Movement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEntries ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="font-medium">Rs. {totalDebit.toLocaleString()}</span>
                </div>
                <div className="flex items-center text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span className="font-medium">
                    Rs. {totalCredit.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEntries ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">Rs. {closingBalance.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{selectedAccountName} Ledger</CardTitle>
              <CardDescription>
                {!selectedAccount 
                  ? "Please select an account to view transactions"
                  : `Showing ${filteredEntries.length} transactions`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoadingEntries ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !selectedAccount ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p>Select an account to view its ledger entries</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p>No transactions found for this account</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead className="w-[300px]">Particulars</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Opening Balance Row */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-medium">-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="font-medium">Opening Balance</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-medium">
                      Rs. {openingBalance.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {entry.voucherNo}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.particulars}</TableCell>
                      <TableCell className="text-right">
                        {entry.debit > 0 && (
                          <span className="text-green-600 font-medium">
                            Rs. {entry.debit.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit > 0 && (
                          <span className="text-red-600 font-medium">
                            Rs. {entry.credit.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rs. {entry.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={3} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      Rs. {totalDebit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      Rs. {totalCredit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      Rs. {closingBalance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
