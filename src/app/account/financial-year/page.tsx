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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function FinancialYearPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // New financial year form
  const [fyName, setFyName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Fetch financial years from Convex
  const financialYears = useQuery(api.financialYears.list);
  const currentYear = useQuery(api.financialYears.getCurrent);
  
  // Mutations
  const createYear = useMutation(api.financialYears.create);
  const closeYear = useMutation(api.financialYears.close);
  const setAsCurrent = useMutation(api.financialYears.setAsCurrent);

  const isLoading = financialYears === undefined;

  const handleCreateYear = async () => {
    if (!fyName || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createYear({
        name: fyName,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        setAsCurrent: true,
      });
      toast.success("Financial year created successfully");
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create financial year");
    }
  };

  const handleCloseYear = async () => {
    if (!selectedYear) return;
    
    try {
      await closeYear({ 
        id: selectedYear as Id<"financialYears">,
        carryForwardAccounts: true 
      });
      toast.success("Financial year closed successfully");
      setIsCloseDialogOpen(false);
      setSelectedYear(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close financial year");
    }
  };

  const handleSetAsCurrent = async (id: string) => {
    try {
      await setAsCurrent({ id: id as Id<"financialYears"> });
      toast.success("Financial year set as current");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set as current");
    }
  };

  const resetForm = () => {
    setFyName("");
    setStartDate("");
    setEndDate("");
    setOpeningBalance(0);
  };

  const getStatusBadge = (status: string, isCurrent: boolean) => {
    if (isCurrent) {
      return (
        <Badge className="bg-green-500/10 text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Current
        </Badge>
      );
    }
    switch (status) {
      case "active":
        return (
          <Badge className="bg-blue-500/10 text-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-gray-500/10 text-gray-600">
            <Lock className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Year</h1>
          <p className="text-muted-foreground">
            Manage accounting periods and year-end closing
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Financial Year
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Financial Year</DialogTitle>
              <DialogDescription>
                Set up a new accounting period
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Financial Year Name *</Label>
                <Input
                  value={fyName}
                  onChange={(e) => setFyName(e.target.value)}
                  placeholder="e.g., FY 2025-26"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  value={openingBalance}
                  onChange={(e) =>
                    setOpeningBalance(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  This will be auto-populated from the previous year&apos;s
                  closing balance if available.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateYear}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Financial Year Card */}
      {isLoading ? (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : currentYear ? (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Current Financial Year: {currentYear.name}
                </CardTitle>
                <CardDescription>
                  {new Date(currentYear.startDate).toLocaleDateString()} -{" "}
                  {new Date(currentYear.endDate).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className="bg-green-500/20 text-green-700 text-lg px-4 py-2">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="text-xl font-bold">
                  Rs. {(0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Days Remaining</p>
                <p className="text-xl font-bold">
                  {Math.max(0, Math.ceil(
                    (currentYear.endDate - Date.now()) / (1000 * 60 * 60 * 24)
                  ))}{" "}
                  days
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Progress</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((Date.now() - currentYear.startDate) /
                            (currentYear.endDate - currentYear.startDate)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(
                      ((Date.now() - currentYear.startDate) /
                        (currentYear.endDate - currentYear.startDate)) *
                        100
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No current financial year set. Create one to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Financial Years List */}
      <Card>
        <CardHeader>
          <CardTitle>All Financial Years</CardTitle>
          <CardDescription>
            History of all accounting periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !financialYears || financialYears.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No financial years found. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Opening Balance</TableHead>
                  <TableHead className="text-right">Closing Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialYears.map((fy) => (
                  <TableRow key={fy._id}>
                    <TableCell className="font-medium">{fy.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(fy.startDate).toLocaleDateString()} -{" "}
                        {new Date(fy.endDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      Rs. {(0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {fy.status === "closed" ? "Rs. 0" : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(fy.status, fy.isCurrent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fy.status === "active" && !fy.isCurrent && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSetAsCurrent(fy._id)}
                        >
                          Set as Current
                        </Button>
                      )}
                      {fy.isCurrent && (
                        <Dialog
                          open={isCloseDialogOpen && selectedYear === fy._id}
                          onOpenChange={(open) => {
                            setIsCloseDialogOpen(open);
                            if (!open) setSelectedYear(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedYear(fy._id)}
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Close Year
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                                Close Financial Year
                              </DialogTitle>
                              <DialogDescription>
                                Are you sure you want to close {fy.name}?
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <p className="text-sm text-orange-700 font-medium">
                                  Warning: This action cannot be undone!
                                </p>
                                <ul className="text-sm text-orange-600 mt-2 space-y-1 list-disc list-inside">
                                  <li>
                                    All transactions will be locked for this
                                    period
                                  </li>
                                  <li>
                                    Closing entries will be automatically
                                    generated
                                  </li>
                                  <li>
                                    Opening balance for next year will be
                                    calculated
                                  </li>
                                </ul>
                              </div>

                              <div className="p-4 border rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                  Estimated Closing Balance
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                  Rs. 0
                                </p>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsCloseDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleCloseYear}
                              >
                                <Lock className="h-4 w-4 mr-2" />
                                Close Year
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      {fy.status === "closed" && (
                        <Button variant="ghost" size="sm" disabled>
                          <Lock className="h-3 w-3 mr-1" />
                          Closed
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Year End Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Year-End Closing Checklist</CardTitle>
          <CardDescription>
            Ensure all tasks are completed before closing the financial year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                task: "Reconcile all bank accounts",
                completed: true,
              },
              {
                task: "Verify all accounts receivable",
                completed: true,
              },
              {
                task: "Confirm all accounts payable",
                completed: true,
              },
              {
                task: "Complete inventory count and valuation",
                completed: false,
              },
              {
                task: "Process all depreciation entries",
                completed: false,
              },
              {
                task: "Review and adjust accruals",
                completed: false,
              },
              {
                task: "Generate trial balance and verify",
                completed: false,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                  <span
                    className={
                      item.completed
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {item.task}
                  </span>
                </div>
                <Switch checked={item.completed} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
