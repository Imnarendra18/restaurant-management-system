"use client";

import { useState, useMemo } from "react";
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
import {
  Plus,
  Search,
  Trash2,
  Eye,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Package,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

interface PurchaseItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  unitPrice: number;
  totalPrice: number;
}

interface Supplier {
  _id: Id<"suppliers">;
  name: string;
  phone: string;
  isActive: boolean;
}

interface Ingredient {
  _id: Id<"ingredients">;
  name: string;
  unitId: Id<"units">;
  isActive: boolean;
}

interface Unit {
  _id: Id<"units">;
  name: string;
  symbol: string;
  isActive: boolean;
}

export default function PurchasesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convex queries
  const purchases = useQuery(api.purchases.list, {
    status: statusFilter !== "all" ? statusFilter as "draft" | "received" | "cancelled" : undefined,
  });
  const suppliers = useQuery(api.suppliers.getActive);
  const ingredients = useQuery(api.ingredients.getActive);
  const units = useQuery(api.units.getActive);

  // Convex mutations
  const createPurchase = useMutation(api.purchases.create);
  const receivePurchase = useMutation(api.purchases.receive);
  const cancelPurchase = useMutation(api.purchases.cancel);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!purchases) return { totalAmount: 0, receivedCount: 0, draftCount: 0, purchaseCount: 0 };
    
    const totalAmount = purchases.reduce((sum, p) => sum + p.netAmount, 0);
    const receivedCount = purchases.filter(p => p.status === "received").length;
    const draftCount = purchases.filter(p => p.status === "draft").length;
    
    return {
      totalAmount,
      receivedCount,
      draftCount,
      purchaseCount: purchases.length,
    };
  }, [purchases]);

  const handleAddItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        ingredientId: "",
        ingredientName: "",
        quantity: 0,
        unitId: "",
        unitName: "",
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Calculate total price when quantity or unit price changes
    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].totalPrice =
        updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    // Update ingredient name when ingredient is selected
    if (field === "ingredientId" && ingredients) {
      const ingredient = ingredients.find((i: Ingredient) => i._id === value);
      if (ingredient) {
        updatedItems[index].ingredientName = ingredient.name;
      }
    }

    // Update unit name when unit is selected
    if (field === "unitId" && units) {
      const unit = units.find((u: Unit) => u._id === value);
      if (unit) {
        updatedItems[index].unitName = unit.name;
      }
    }

    setPurchaseItems(updatedItems);
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }
    if (!invoiceNumber) {
      toast.error("Please enter invoice number");
      return;
    }
    if (purchaseItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    // Validate all items have required fields
    for (const item of purchaseItems) {
      if (!item.ingredientId || !item.unitId || item.quantity <= 0 || item.unitPrice <= 0) {
        toast.error("Please fill in all item details (ingredient, quantity, unit, and price)");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createPurchase({
        supplierId: selectedSupplier as Id<"suppliers">,
        invoiceNo: invoiceNumber,
        purchaseDate: new Date(purchaseDate).getTime(),
        items: purchaseItems.map((item) => ({
          ingredientId: item.ingredientId as Id<"ingredients">,
          quantity: item.quantity,
          unitId: item.unitId as Id<"units">,
          unitPrice: item.unitPrice,
        })),
      });
      toast.success("Purchase recorded successfully");
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceive = async (purchaseId: Id<"purchases">) => {
    try {
      await receivePurchase({ id: purchaseId });
      toast.success("Purchase received and stock updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to receive purchase");
    }
  };

  const handleCancel = async (purchaseId: Id<"purchases">) => {
    try {
      await cancelPurchase({ id: purchaseId });
      toast.success("Purchase cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel purchase");
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setInvoiceNumber("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseItems([]);
    setPaidAmount(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return (
          <Badge className="bg-green-500/10 text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Received
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-orange-500/10 text-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/10 text-red-600">
            <X className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter purchases based on search query
  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    return purchases.filter(
      (purchase) =>
        purchase.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [purchases, searchQuery]);

  const isLoading = purchases === undefined || suppliers === undefined || ingredients === undefined || units === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-muted-foreground">
            Manage supplier purchases and inventory entries
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="min-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Record New Purchase</DialogTitle>
              <DialogDescription>
                Enter purchase details and items from supplier
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Purchase Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier *</Label>
                    <Select
                      value={selectedSupplier || ""}
                      onValueChange={setSelectedSupplier}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((supplier: Supplier) => (
                          <SelectItem key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Number *</Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g., INV-2025-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Date *</Label>
                    <Input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Purchase Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {purchaseItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                      No items added. Click &quot;Add Item&quot; to start.
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingredient</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Select
                                  value={item.ingredientId}
                                  onValueChange={(value) =>
                                    handleItemChange(index, "ingredientId", value)
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ingredients?.map((ing: Ingredient) => (
                                      <SelectItem key={ing._id} value={ing._id}>
                                        {ing.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "quantity",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.unitId}
                                  onValueChange={(value) =>
                                    handleItemChange(index, "unitId", value)
                                  }
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {units?.map((unit: Unit) => (
                                      <SelectItem key={unit._id} value={unit._id}>
                                        {unit.symbol}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "unitPrice",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-28"
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                Rs. {item.totalPrice.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Payment Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Amount Paid</Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) =>
                        setPaidAmount(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                    <p className="text-sm text-muted-foreground">
                      Due: Rs. {(calculateTotal() - paidAmount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-end justify-end">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold">
                        Rs. {calculateTotal().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-2xl font-bold">Rs. {summaryStats.totalAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">All time</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-green-600">{summaryStats.receivedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-orange-600">{summaryStats.draftCount}</p>
                <p className="text-sm text-muted-foreground">Pending receipt</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Purchase Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold">{summaryStats.purchaseCount}</p>
                <p className="text-sm text-muted-foreground">Transactions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchases List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Purchase History</CardTitle>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No purchases found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell className="font-medium">
                        {purchase.invoiceNo}
                      </TableCell>
                      <TableCell>{purchase.supplierName}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rs. {purchase.netAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {purchase.status === "draft" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReceive(purchase._id)}
                              >
                                <Package className="h-4 w-4 mr-1" />
                                Receive
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleCancel(purchase._id)}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </>
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
    </div>
  );
}
