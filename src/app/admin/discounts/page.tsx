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
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Percent,
  Ticket,
  Calendar,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface Discount {
  _id: string;
  name: string;
  code?: string;
  type: "percentage" | "flat";
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  validFrom: number;
  validTo: number;
  usageLimit?: number;
  usedCount: number;
  applicableTo: "all" | "dine_in" | "takeaway" | "delivery";
  isActive: boolean;
}

export default function DiscountsPage() {
  const discounts = useQuery(api.discounts.getAll);
  const createDiscount = useMutation(api.discounts.create);
  const updateDiscount = useMutation(api.discounts.update);
  const deleteDiscount = useMutation(api.discounts.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "percentage" as "percentage" | "flat",
    value: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    validFrom: "",
    validTo: "",
    usageLimit: "",
    applicableTo: "all" as "all" | "dine_in" | "takeaway" | "delivery",
    isActive: true,
  });

  const handleOpenDialog = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        name: discount.name,
        code: discount.code || "",
        type: discount.type,
        value: discount.value.toString(),
        minOrderAmount: discount.minOrderAmount?.toString() || "",
        maxDiscountAmount: discount.maxDiscountAmount?.toString() || "",
        validFrom: new Date(discount.validFrom).toISOString().split("T")[0],
        validTo: new Date(discount.validTo).toISOString().split("T")[0],
        usageLimit: discount.usageLimit?.toString() || "",
        applicableTo: discount.applicableTo,
        isActive: discount.isActive,
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        name: "",
        code: "",
        type: "percentage",
        value: "",
        minOrderAmount: "",
        maxDiscountAmount: "",
        validFrom: "",
        validTo: "",
        usageLimit: "",
        applicableTo: "all",
        isActive: true,
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.value || !formData.validFrom || !formData.validTo) {
      toast.error("Please fill in all required fields (name, value, valid from, valid to)");
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name: formData.name,
        code: formData.code || undefined,
        type: formData.type,
        value: parseFloat(formData.value),
        minOrderAmount: formData.minOrderAmount
          ? parseFloat(formData.minOrderAmount)
          : undefined,
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount)
          : undefined,
        validFrom: new Date(formData.validFrom).getTime(),
        validTo: new Date(formData.validTo).getTime(),
        usageLimit: formData.usageLimit
          ? parseInt(formData.usageLimit)
          : undefined,
        applicableTo: formData.applicableTo,
        isActive: formData.isActive,
      };

      if (editingDiscount) {
        await updateDiscount({
          id: editingDiscount._id as Id<"discounts">,
          ...data,
        });
        toast.success("Discount updated successfully");
      } else {
        await createDiscount(data);
        toast.success("Discount created successfully");
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(
        editingDiscount ? "Failed to update discount" : "Failed to create discount"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDiscountToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!discountToDelete) return;
    try {
      await deleteDiscount({ id: discountToDelete as Id<"discounts"> });
      toast.success("Discount deleted successfully");
      setDiscountToDelete(null);
    } catch (error) {
      toast.error("Failed to delete discount");
    }
  };

  const handleToggleActive = async (discount: Discount) => {
    try {
      await updateDiscount({
        id: discount._id as Id<"discounts">,
        isActive: !discount.isActive,
      });
      toast.success(`Discount ${discount.isActive ? "deactivated" : "activated"}`);
    } catch (error) {
      toast.error("Failed to update discount status");
    }
  };

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData({ ...formData, code });
  };

  // Filter discounts
  const filteredDiscounts = discounts?.filter((d) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return d.isActive;
    if (activeTab === "coupon") return d.code;
    return true;
  });

  const isExpired = (discount: Discount) => {
    if (!discount.validTo) return false;
    return discount.validTo < Date.now();
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discounts & Coupons</h1>
          <p className="text-muted-foreground">
            Manage discounts and coupon codes for your orders
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Discount
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Total Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{discounts?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Coupon Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {discounts?.filter((d) => d.code).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {discounts?.filter((d) => d.isActive).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {discounts?.reduce((sum, d) => sum + d.usedCount, 0) || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="coupon">Coupon Codes</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Discounts</CardTitle>
              <CardDescription>
                {filteredDiscounts?.length || 0} discounts found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {discounts === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDiscounts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No discounts found</p>
                  <p className="text-sm">
                    Click &quot;Add Discount&quot; to create your first discount
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDiscounts?.map((discount) => (
                      <TableRow key={discount._id}>
                        <TableCell className="font-medium">{discount.name}</TableCell>
                        <TableCell>
                          {discount.code ? (
                            <code className="px-2 py-1 bg-muted rounded text-sm">
                              {discount.code}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {discount.type === "percentage" ? (
                              <>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                {discount.value}%
                              </>
                            ) : (
                              <>Rs. {discount.value}</>
                            )}
                          </div>
                          {discount.maxDiscountAmount && (
                            <p className="text-xs text-muted-foreground">
                              Max: Rs. {discount.maxDiscountAmount}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(discount.validFrom)} - {formatDate(discount.validTo)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {discount.usedCount}
                            {discount.usageLimit && ` / ${discount.usageLimit}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isExpired(discount) && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                Expired
                              </Badge>
                            )}
                            <Badge
                              variant={discount.isActive ? "default" : "secondary"}
                              className={
                                discount.isActive
                                  ? "bg-green-500/10 text-green-600"
                                  : ""
                              }
                            >
                              {discount.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenDialog(discount)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(discount)}
                              >
                                {discount.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(discount._id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? "Edit Discount" : "Add New Discount"}
            </DialogTitle>
            <DialogDescription>
              {editingDiscount
                ? "Update discount details"
                : "Create a new discount or coupon code"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Sale, New Year Offer"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="e.g., SUMMER20"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for automatic discounts
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Discount Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "percentage" | "flat") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Fixed Amount (Rs.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">
                  Value * {formData.type === "percentage" ? "(%)" : "(Rs.)"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="0"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minOrderAmount">Min Order Amount</Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  placeholder="0"
                  value={formData.minOrderAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderAmount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscountAmount">Max Discount</Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  placeholder="No limit"
                  value={formData.maxDiscountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDiscountAmount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, validFrom: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validTo">Valid To *</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) =>
                    setFormData({ ...formData, validTo: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicableTo">Applicable To *</Label>
              <Select
                value={formData.applicableTo}
                onValueChange={(value: "all" | "dine_in" | "takeaway" | "delivery") =>
                  setFormData({ ...formData, applicableTo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="dine_in">Dine-in Only</SelectItem>
                  <SelectItem value="takeaway">Takeaway Only</SelectItem>
                  <SelectItem value="delivery">Delivery Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageLimit">Usage Limit</Label>
              <Input
                id="usageLimit"
                type="number"
                placeholder="Unlimited"
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, usageLimit: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this discount
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingDiscount ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Discount"
        description="Are you sure you want to delete this discount? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
