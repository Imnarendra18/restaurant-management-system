"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

interface Account {
  _id: Id<"chartOfAccounts">;
  code: string;
  name: string;
  type: string;
  parentId?: Id<"chartOfAccounts">;
  isActive: boolean;
  openingBalance: number;
  currentBalance: number;
  children?: Account[];
}

function AccountRow({
  account,
  level = 0,
  expandedIds,
  toggleExpand,
  onEdit,
  onDelete,
}: {
  account: Account;
  level?: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (id: Id<"chartOfAccounts">) => void;
}) {
  const isExpanded = expandedIds.has(account._id);
  const hasChildren = account.children && account.children.length > 0;
  const isGroup = hasChildren;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "asset":
        return "bg-blue-500/10 text-blue-600";
      case "liability":
        return "bg-red-500/10 text-red-600";
      case "equity":
        return "bg-purple-500/10 text-purple-600";
      case "income":
        return "bg-green-500/10 text-green-600";
      case "expense":
        return "bg-orange-500/10 text-orange-600";
      default:
        return "";
    }
  };

  return (
    <>
      <TableRow className={isGroup ? "bg-muted/30" : ""}>
        <TableCell>
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(account._id)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            {isGroup ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {account.code}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <span className={isGroup ? "font-semibold" : ""}>
            {account.name}
          </span>
        </TableCell>
        <TableCell>
          <Badge className={getTypeColor(account.type)}>
            {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
          </Badge>
        </TableCell>
        <TableCell>
          {isGroup ? (
            <Badge variant="outline">Group</Badge>
          ) : (
            <Badge variant="secondary">Ledger</Badge>
          )}
        </TableCell>
        <TableCell className="text-right font-medium">
          Rs. {(account.currentBalance || 0).toLocaleString()}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(account)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {!isGroup && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(account._id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {isExpanded &&
        account.children?.map((child) => (
          <AccountRow
            key={child._id}
            account={child}
            level={level + 1}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

export default function ChartOfAccountsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Id<"chartOfAccounts"> | null>(null);

  // Convex queries and mutations
  const accountsTree = useQuery(api.chartOfAccounts.getTree);
  const accounts = useQuery(api.chartOfAccounts.list);
  const createAccount = useMutation(api.chartOfAccounts.create);
  const updateAccount = useMutation(api.chartOfAccounts.update);
  const deleteAccount = useMutation(api.chartOfAccounts.remove);

  const isLoading = accountsTree === undefined;

  // Form state
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<"asset" | "liability" | "equity" | "income" | "expense">("asset");
  const [parentAccount, setParentAccount] = useState<Id<"chartOfAccounts"> | null>(null);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (accs: Account[]) => {
      accs.forEach((acc) => {
        if (acc.children && acc.children.length > 0) {
          allIds.add(acc._id);
          collectIds(acc.children);
        }
      });
    };
    if (accountsTree) collectIds(accountsTree as Account[]);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setAccountCode(account.code);
    setAccountName(account.name);
    setAccountType(account.type as "asset" | "liability" | "equity" | "income" | "expense");
    setParentAccount(account.parentId || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: Id<"chartOfAccounts">) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount({ id: accountToDelete });
      toast.success("Account deleted successfully");
      setAccountToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete account");
    }
  };

  const handleSubmit = async () => {
    if (!accountCode || !accountName) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingAccount) {
        await updateAccount({
          id: editingAccount._id,
          code: accountCode,
          name: accountName,
          type: accountType,
          parentId: parentAccount || undefined,
        });
        toast.success("Account updated successfully");
      } else {
        await createAccount({
          code: accountCode,
          name: accountName,
          type: accountType,
          parentId: parentAccount || undefined,
        });
        toast.success("Account created successfully");
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save account");
    }
  };

  const resetForm = () => {
    setEditingAccount(null);
    setAccountCode("");
    setAccountName("");
    setAccountType("asset");
    setParentAccount(null);
  };

  // Calculate summary totals
  const getTotalByType = (type: string) => {
    if (!accounts) return 0;
    return accounts
      .filter((a) => a.type === type)
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your account structure and hierarchy
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Account" : "Add New Account"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Update account details"
                  : "Create a new account in the chart of accounts"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Code *</Label>
                  <Input
                    value={accountCode}
                    onChange={(e) => setAccountCode(e.target.value)}
                    placeholder="e.g., 1101"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <Select value={accountType} onValueChange={(v) => setAccountType(v as "asset" | "liability" | "equity" | "income" | "expense")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., Petty Cash"
                />
              </div>

              <div className="space-y-2">
                <Label>Parent Account</Label>
                <Select
                  value={parentAccount || "none"}
                  onValueChange={(v) =>
                    setParentAccount(v === "none" ? null : v as Id<"chartOfAccounts">)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Root Level)</SelectItem>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc._id} value={acc._id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingAccount ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart of Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (accountsTree || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No accounts found</p>
                <p className="text-sm text-muted-foreground">Click "Add Account" to create your first account</p>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[100px]">Category</TableHead>
                  <TableHead className="text-right w-[150px]">
                    Balance
                  </TableHead>
                  <TableHead className="text-right w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(accountsTree as Account[] || []).map((account) => (
                  <AccountRow
                    key={account._id}
                    account={account}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold text-blue-600">
                Rs. {getTotalByType("asset").toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold text-red-600">
                Rs. {getTotalByType("liability").toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold text-purple-600">
                Rs. {getTotalByType("equity").toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold text-green-600">
                Rs. {getTotalByType("income").toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold text-orange-600">
                Rs. {getTotalByType("expense").toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Account"
        description="Are you sure you want to delete this account? This action cannot be undone and may affect related transactions."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
