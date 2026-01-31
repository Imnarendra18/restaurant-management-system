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
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Loader2,
  Search,
  Printer,
  Package,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  category?: { name: string } | null;
  printerId?: string;
  printer?: { name: string } | null;
  isActive: boolean;
}

interface MenuIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitId: string;
  unitSymbol: string;
}

export default function MenuItemsPage() {
  const menuItems = useQuery(api.menu.getAll);
  const categories = useQuery(api.categories.getActive);
  const printers = useQuery(api.printers.getActive);
  const ingredients = useQuery(api.ingredients.getActive);
  const createMenuItem = useMutation(api.menu.create);
  const updateMenuItem = useMutation(api.menu.update);
  const deleteMenuItem = useMutation(api.menu.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuItemToDelete, setMenuItemToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    printerId: "",
    isActive: true,
  });
  const [selectedIngredients, setSelectedIngredients] = useState<MenuIngredient[]>([]);
  const [ingredientToAdd, setIngredientToAdd] = useState({
    ingredientId: "",
    quantity: "",
  });

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        categoryId: item.categoryId,
        printerId: item.printerId || "",
        isActive: item.isActive,
      });
      // In real app, fetch menu ingredients here
      setSelectedIngredients([]);
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        categoryId: "",
        printerId: "",
        isActive: true,
      });
      setSelectedIngredients([]);
    }
    setShowDialog(true);
  };

  const handleAddIngredient = () => {
    if (!ingredientToAdd.ingredientId || !ingredientToAdd.quantity) {
      toast.error("Please select an ingredient and enter quantity");
      return;
    }

    const ingredient = ingredients?.find((i) => i._id === ingredientToAdd.ingredientId);
    if (!ingredient) return;

    // Check if already added
    if (selectedIngredients.some((i) => i.ingredientId === ingredientToAdd.ingredientId)) {
      toast.error("Ingredient already added");
      return;
    }

    setSelectedIngredients([
      ...selectedIngredients,
      {
        ingredientId: ingredientToAdd.ingredientId,
        ingredientName: ingredient.name,
        quantity: parseFloat(ingredientToAdd.quantity),
        unitId: ingredient.unitId,
        unitSymbol: ingredient.unit?.symbol || "",
      },
    ]);

    setIngredientToAdd({ ingredientId: "", quantity: "" });
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setSelectedIngredients(selectedIngredients.filter((i) => i.ingredientId !== ingredientId));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const printerIdValue = formData.printerId && formData.printerId !== "none" 
        ? formData.printerId as Id<"printers"> 
        : undefined;
        
      if (editingItem) {
        await updateMenuItem({
          id: editingItem._id as Id<"menuItems">,
          name: formData.name,
          description: formData.description || undefined,
          price: parseFloat(formData.price),
          categoryId: formData.categoryId as Id<"categories">,
          printerId: printerIdValue,
          isActive: formData.isActive,
          ingredients: selectedIngredients.map((i) => ({
            ingredientId: i.ingredientId as Id<"ingredients">,
            quantity: i.quantity,
            unitId: i.unitId as Id<"units">,
          })),
        });
        toast.success("Menu item updated successfully");
      } else {
        await createMenuItem({
          name: formData.name,
          description: formData.description || undefined,
          price: parseFloat(formData.price),
          categoryId: formData.categoryId as Id<"categories">,
          printerId: printerIdValue,
          isActive: formData.isActive,
          ingredients: selectedIngredients.map((i) => ({
            ingredientId: i.ingredientId as Id<"ingredients">,
            quantity: i.quantity,
            unitId: i.unitId as Id<"units">,
          })),
        });
        toast.success("Menu item created successfully");
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(editingItem ? "Failed to update menu item" : "Failed to create menu item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setMenuItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!menuItemToDelete) return;
    try {
      await deleteMenuItem({ id: menuItemToDelete as Id<"menuItems"> });
      toast.success("Menu item deleted successfully");
      setMenuItemToDelete(null);
    } catch (error) {
      toast.error("Failed to delete menu item");
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      await updateMenuItem({
        id: item._id as Id<"menuItems">,
        isActive: !item.isActive,
      });
      toast.success(`Item marked as ${item.isActive ? "unavailable" : "available"}`);
    } catch (error) {
      toast.error("Failed to update availability");
    }
  };

  // Filter menu items
  const filteredItems = menuItems?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Items</h1>
          <p className="text-muted-foreground">
            Manage your restaurant menu and item recipes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Menu Items</CardTitle>
          <CardDescription>
            {filteredItems?.length || 0} items found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menuItems === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No menu items found</p>
              <p className="text-sm">Click &quot;Add Menu Item&quot; to create your first item</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Printer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category?.name || "-"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      Rs. {item.price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {item.printer?.name ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Printer className="h-3 w-3" />
                          {item.printer.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={item.isActive ? "default" : "secondary"}
                          className={
                            item.isActive
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-600"
                          }
                        >
                          {item.isActive ? "Available" : "Unavailable"}
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAvailable(item)}>
                            {item.isActive ? "Mark Unavailable" : "Mark Available"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(item._id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the menu item details and recipe"
                : "Create a new menu item with ingredients"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="ingredients">
                Ingredients ({selectedIngredients.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Chicken Momo"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Short description of the item"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Rs.) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="printerId">KOT Printer</Label>
                <Select
                  value={formData.printerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, printerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select printer for KOT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific printer</SelectItem>
                    {printers?.map((printer) => (
                      <SelectItem key={printer._id} value={printer._id}>
                        {printer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select which printer should receive KOT for this item
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="isActive">Available for Order</Label>
                  <p className="text-sm text-muted-foreground">
                    Show this item on POS
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
            </TabsContent>

            <TabsContent value="ingredients" className="py-4">
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Add Ingredient</Label>
                    <Select
                      value={ingredientToAdd.ingredientId}
                      onValueChange={(value) =>
                        setIngredientToAdd({ ...ingredientToAdd, ingredientId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients?.map((ing) => (
                          <SelectItem key={ing._id} value={ing._id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={ingredientToAdd.quantity}
                      onChange={(e) =>
                        setIngredientToAdd({ ...ingredientToAdd, quantity: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleAddIngredient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-[250px]">
                  {selectedIngredients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No ingredients added</p>
                      <p className="text-xs">Add ingredients to track stock consumption</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedIngredients.map((ing) => (
                        <div
                          key={ing.ingredientId}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{ing.ingredientName}</p>
                            <p className="text-sm text-muted-foreground">
                              {ing.quantity} {ing.unitSymbol}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveIngredient(ing.ingredientId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Menu Item"
        description="Are you sure you want to delete this menu item? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
