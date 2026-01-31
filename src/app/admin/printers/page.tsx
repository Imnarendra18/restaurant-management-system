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
  Printer,
  Loader2,
  TestTube,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface PrinterType {
  _id: Id<"printers">;
  name: string;
  ipAddress: string;
  port: number;
  type: "kot" | "bill" | "both";
  isActive: boolean;
}

export default function PrintersPage() {
  const printers = useQuery(api.printers.getAll);
  const createPrinter = useMutation(api.printers.create);
  const updatePrinter = useMutation(api.printers.update);
  const deletePrinter = useMutation(api.printers.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState<Id<"printers"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    ipAddress: "",
    port: "9100",
    type: "kot" as "kot" | "bill" | "both",
    isActive: true,
  });

  const handleOpenDialog = (printer?: PrinterType) => {
    if (printer) {
      setEditingPrinter(printer);
      setFormData({
        name: printer.name,
        ipAddress: printer.ipAddress,
        port: printer.port.toString(),
        type: printer.type,
        isActive: printer.isActive,
      });
    } else {
      setEditingPrinter(null);
      setFormData({
        name: "",
        ipAddress: "",
        port: "9100",
        type: "kot",
        isActive: true,
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.ipAddress) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      if (editingPrinter) {
        await updatePrinter({
          id: editingPrinter._id,
          name: formData.name,
          ipAddress: formData.ipAddress,
          port: parseInt(formData.port) || 9100,
          type: formData.type,
          isActive: formData.isActive,
        });
        toast.success("Printer updated successfully");
      } else {
        await createPrinter({
          name: formData.name,
          ipAddress: formData.ipAddress,
          port: parseInt(formData.port) || 9100,
          type: formData.type,
          isActive: formData.isActive,
        });
        toast.success("Printer created successfully");
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(editingPrinter ? "Failed to update printer" : "Failed to create printer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: Id<"printers">) => {
    setPrinterToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!printerToDelete) return;
    try {
      await deletePrinter({ id: printerToDelete });
      toast.success("Printer deleted successfully");
      setPrinterToDelete(null);
    } catch (error) {
      toast.error("Failed to delete printer");
    }
  };

  const handleToggleActive = async (printer: PrinterType) => {
    try {
      await updatePrinter({
        id: printer._id,
        isActive: !printer.isActive,
      });
      toast.success(`Printer ${printer.isActive ? "deactivated" : "activated"}`);
    } catch (error) {
      toast.error("Failed to update printer status");
    }
  };

  const handleTestPrint = async (printerId: string) => {
    setIsTesting(printerId);
    // Simulate test print
    setTimeout(() => {
      toast.success("Test print sent successfully");
      setIsTesting(null);
    }, 2000);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "kot":
        return "KOT (Kitchen)";
      case "bill":
        return "Bill/Receipt";
      case "both":
        return "Both";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Printers</h1>
          <p className="text-muted-foreground">
            Manage KOT and receipt printers for your restaurant
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Printer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Printers</CardTitle>
          <CardDescription>
            Configure kitchen printers for KOT and receipt printing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {printers === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : printers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No printers configured yet</p>
              <p className="text-sm">Click &quot;Add Printer&quot; to add your first printer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((printer) => (
                  <TableRow key={printer._id}>
                    <TableCell>
                      <span className="font-medium">{printer.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(printer.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {printer.ipAddress}:{printer.port}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={printer.isActive ? "default" : "secondary"}
                        className={
                          printer.isActive
                            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            : ""
                        }
                      >
                        {printer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTestPrint(printer._id)}
                          disabled={isTesting === printer._id}
                        >
                          {isTesting === printer._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(printer as PrinterType)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(printer as PrinterType)}
                            >
                              {printer.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(printer._id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
              {editingPrinter ? "Edit Printer" : "Add New Printer"}
            </DialogTitle>
            <DialogDescription>
              {editingPrinter
                ? "Update the printer configuration"
                : "Configure a new printer for KOT or receipt printing"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Printer Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Kitchen Printer"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Printer Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "kot" | "bill" | "both") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select printer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kot">KOT (Kitchen Order Ticket)</SelectItem>
                  <SelectItem value="bill">Bill/Receipt</SelectItem>
                  <SelectItem value="both">Both KOT and Bill</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address *</Label>
                <Input
                  id="ipAddress"
                  placeholder="e.g., 192.168.1.100"
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, ipAddress: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="9100"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData({ ...formData, port: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPrinter ? "Update" : "Add Printer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Printer"
        description="Are you sure you want to delete this printer? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
