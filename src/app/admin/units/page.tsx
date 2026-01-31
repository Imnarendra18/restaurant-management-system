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
  DialogTrigger,
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
  Scale,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface Unit {
  _id: Id<"units">;
  name: string;
  symbol: string;
  baseUnit?: Id<"units">;
  conversionFactor: number;
  isActive: boolean;
}

export default function UnitsPage() {
  const units = useQuery(api.units.getAll);
  const createUnit = useMutation(api.units.create);
  const updateUnit = useMutation(api.units.update);
  const deleteUnit = useMutation(api.units.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Id<"units"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    baseUnit: "",
    conversionFactor: "1",
  });

  const handleOpenDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        symbol: unit.symbol,
        baseUnit: unit.baseUnit || "",
        conversionFactor: unit.conversionFactor.toString(),
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: "",
        symbol: "",
        baseUnit: "",
        conversionFactor: "1",
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.symbol) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const baseUnitValue = formData.baseUnit && formData.baseUnit !== "none" 
        ? formData.baseUnit as Id<"units"> 
        : undefined;
        
      if (editingUnit) {
        await updateUnit({
          id: editingUnit._id,
          name: formData.name,
          symbol: formData.symbol,
          baseUnit: baseUnitValue,
          conversionFactor: parseFloat(formData.conversionFactor) || 1,
        });
        toast.success("Unit updated successfully");
      } else {
        await createUnit({
          name: formData.name,
          symbol: formData.symbol,
          baseUnit: baseUnitValue,
          conversionFactor: parseFloat(formData.conversionFactor) || 1,
          isActive: true,
        });
        toast.success("Unit created successfully");
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(editingUnit ? "Failed to update unit" : "Failed to create unit");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: Id<"units">) => {
    setUnitToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;
    try {
      await deleteUnit({ id: unitToDelete });
      toast.success("Unit deleted successfully");
      setUnitToDelete(null);
    } catch (error) {
      toast.error("Failed to delete unit");
    }
  };

  const handleToggleActive = async (unit: Unit) => {
    try {
      await updateUnit({
        id: unit._id,
        isActive: !unit.isActive,
      });
      toast.success(`Unit ${unit.isActive ? "deactivated" : "activated"}`);
    } catch (error) {
      toast.error("Failed to update unit status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Units of Measurement</h1>
          <p className="text-muted-foreground">
            Manage units for ingredients and stock management
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Units</CardTitle>
          <CardDescription>
            Define base units and their conversions for inventory management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {units === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : units.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No units created yet</p>
              <p className="text-sm">Click &quot;Add Unit&quot; to create your first unit</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Base Unit</TableHead>
                  <TableHead>Conversion</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit._id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{unit.symbol}</Badge>
                    </TableCell>
                    <TableCell>
                      {unit.baseUnit ? (
                        <span>{units?.find(u => u._id === unit.baseUnit)?.symbol || unit.baseUnit}</span>
                      ) : (
                        <span className="text-muted-foreground">Base unit</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.baseUnit ? (
                        <span>
                          1 {unit.symbol} = {unit.conversionFactor} {units?.find(u => u._id === unit.baseUnit)?.symbol || ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={unit.isActive ? "default" : "secondary"}
                        className={
                          unit.isActive
                            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            : ""
                        }
                      >
                        {unit.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(unit)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(unit)}
                          >
                            {unit.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(unit._id)}
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
              {editingUnit ? "Edit Unit" : "Add New Unit"}
            </DialogTitle>
            <DialogDescription>
              {editingUnit
                ? "Update the unit details"
                : "Create a new unit of measurement"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Kilogram"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., kg"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUnit">Base Unit (for conversion)</Label>
              <Select
                value={formData.baseUnit}
                onValueChange={(value) =>
                  setFormData({ ...formData, baseUnit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select base unit (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (this is a base unit)</SelectItem>
                  {units?.filter(u => u._id !== editingUnit?._id).map((unit) => (
                    <SelectItem key={unit._id} value={unit._id}>
                      {unit.name} ({unit.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty if this unit is a base unit (like kg, pcs)
              </p>
            </div>
            {formData.baseUnit && formData.baseUnit !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="conversionFactor">Conversion Factor</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">1 {formData.symbol || "unit"} =</span>
                  <Input
                    id="conversionFactor"
                    type="number"
                    step="0.001"
                    className="w-24"
                    value={formData.conversionFactor}
                    onChange={(e) =>
                      setFormData({ ...formData, conversionFactor: e.target.value })
                    }
                  />
                  <span className="text-sm text-muted-foreground">{units?.find(u => u._id === formData.baseUnit)?.symbol || ""}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: 1 dozen = 12 pcs, 1 kg = 1000 g
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUnit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Unit"
        description="Are you sure you want to delete this unit? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
