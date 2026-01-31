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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Loader2,
  Search,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface Ingredient {
  _id: Id<"ingredients">;
  name: string;
  unitId: Id<"units">;
  unit?: { name: string; symbol: string } | null;
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
  isActive: boolean;
}

export default function IngredientsPage() {
  const ingredients = useQuery(api.ingredients.getAll);
  const units = useQuery(api.units.getActive);
  const createIngredient = useMutation(api.ingredients.create);
  const updateIngredient = useMutation(api.ingredients.update);
  const deleteIngredient = useMutation(api.ingredients.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<Id<"ingredients"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    unitId: "",
    currentStock: "0",
    reorderLevel: "0",
    costPerUnit: "0",
  });

  const handleOpenDialog = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({
        name: ingredient.name,
        unitId: ingredient.unitId,
        currentStock: ingredient.currentStock.toString(),
        reorderLevel: ingredient.reorderLevel.toString(),
        costPerUnit: ingredient.costPerUnit.toString(),
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: "",
        unitId: "",
        currentStock: "0",
        reorderLevel: "0",
        costPerUnit: "0",
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.unitId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      if (editingIngredient) {
        await updateIngredient({
          id: editingIngredient._id,
          name: formData.name,
          unitId: formData.unitId as Id<"units">,
          currentStock: parseFloat(formData.currentStock) || 0,
          reorderLevel: parseFloat(formData.reorderLevel) || 0,
          costPerUnit: parseFloat(formData.costPerUnit) || 0,
        });
        toast.success("Ingredient updated successfully");
      } else {
        await createIngredient({
          name: formData.name,
          unitId: formData.unitId as Id<"units">,
          currentStock: parseFloat(formData.currentStock) || 0,
          reorderLevel: parseFloat(formData.reorderLevel) || 0,
          costPerUnit: parseFloat(formData.costPerUnit) || 0,
          isActive: true,
        });
        toast.success("Ingredient created successfully");
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(
        editingIngredient ? "Failed to update ingredient" : "Failed to create ingredient"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: Id<"ingredients">) => {
    setIngredientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!ingredientToDelete) return;
    try {
      await deleteIngredient({ id: ingredientToDelete });
      toast.success("Ingredient deleted successfully");
      setIngredientToDelete(null);
    } catch (error) {
      toast.error("Failed to delete ingredient");
    }
  };

  const handleToggleActive = async (ingredient: Ingredient) => {
    try {
      await updateIngredient({
        id: ingredient._id,
        isActive: !ingredient.isActive,
      });
      toast.success(`Ingredient ${ingredient.isActive ? "deactivated" : "activated"}`);
    } catch (error) {
      toast.error("Failed to update ingredient status");
    }
  };

  // Filter ingredients
  const filteredIngredients = ingredients?.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Low stock count
  const lowStockCount = ingredients?.filter(
    (i) => i.currentStock <= i.reorderLevel && i.isActive
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingredients</h1>
          <p className="text-muted-foreground">
            Manage ingredients for menu items and stock tracking
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ingredients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ingredients?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Ingredients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {ingredients?.filter((i) => i.isActive).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className={lowStockCount && lowStockCount > 0 ? "border-orange-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {lowStockCount && lowStockCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStockCount && lowStockCount > 0 ? "text-orange-500" : ""}`}>
              {lowStockCount || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Ingredients</CardTitle>
              <CardDescription>
                Manage your ingredient inventory and stock levels
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ingredients === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredIngredients?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ingredients found</p>
              <p className="text-sm">Click &quot;Add Ingredient&quot; to add your first ingredient</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients?.map((ingredient) => (
                  <TableRow key={ingredient._id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ingredient.unit?.symbol || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          ingredient.currentStock <= ingredient.reorderLevel
                            ? "text-orange-500 font-medium"
                            : ""
                        }
                      >
                        {ingredient.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{ingredient.reorderLevel}</TableCell>
                    <TableCell className="text-right">
                      Rs. {ingredient.costPerUnit.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ingredient.currentStock <= ingredient.reorderLevel && ingredient.isActive && (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low
                          </Badge>
                        )}
                        <Badge
                          variant={ingredient.isActive ? "default" : "secondary"}
                          className={
                            ingredient.isActive
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : ""
                          }
                        >
                          {ingredient.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(ingredient)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(ingredient)}
                          >
                            {ingredient.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(ingredient._id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIngredient ? "Edit Ingredient" : "Add New Ingredient"}
            </DialogTitle>
            <DialogDescription>
              {editingIngredient
                ? "Update the ingredient details"
                : "Create a new ingredient for inventory tracking"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Chicken Breast"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitId">Unit *</Label>
              <Select
                value={formData.unitId}
                onValueChange={(value) =>
                  setFormData({ ...formData, unitId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units?.map((unit) => (
                    <SelectItem key={unit._id} value={unit._id}>
                      {unit.name} ({unit.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  step="0.01"
                  value={formData.currentStock}
                  onChange={(e) =>
                    setFormData({ ...formData, currentStock: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderLevel">Reorder Level</Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  step="0.01"
                  value={formData.reorderLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderLevel: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPerUnit">Cost per Unit (Rs.)</Label>
              <Input
                id="costPerUnit"
                type="number"
                step="0.01"
                value={formData.costPerUnit}
                onChange={(e) =>
                  setFormData({ ...formData, costPerUnit: e.target.value })
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
              {editingIngredient ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Ingredient"
        description="Are you sure you want to delete this ingredient? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
