"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRightLeft,
  Package,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Table {
  _id: string;
  tableNumber: string;
  capacity: number;
  status: string;
  currentOrderTotal?: number;
}

interface Room {
  _id: string;
  name: string;
  floorNumber: number;
  tables: Table[];
}

export default function POSPage() {
  const router = useRouter();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [transferToTable, setTransferToTable] = useState<string>("");
  const [showWaiterDialog, setShowWaiterDialog] = useState(false);
  const [selectedWaiterTable, setSelectedWaiterTable] = useState<string | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<string>("");

  const rooms = useQuery(api.rooms.getActive);
  const tableSummary = useQuery(api.tables.getSummary);
  const activeOrders = useQuery(api.orders.getActive);
  const staff = useQuery(api.staff.getActive);

  // Running tables - tables with active orders
  const runningTables = useMemo(() => {
    if (!rooms) return [];
    return rooms.flatMap((room: Room) =>
      room.tables
        .filter((t: Table) => t.status === "occupied")
        .map((t: Table) => ({
          ...t,
          roomName: room.name,
          orderTotal: activeOrders?.find((o) => o.tableId === t._id)?.grandTotal || 0,
        }))
    );
  }, [rooms, activeOrders]);

  // Available tables
  const availableTables = useMemo(() => {
    if (!rooms) return [];
    return rooms.flatMap((room: Room) =>
      room.tables
        .filter((t: Table) => t.status === "available")
        .map((t: Table) => ({ ...t, roomName: room.name, roomId: room._id }))
    );
  }, [rooms]);

  // Waiters list (filter staff by position)
  const waiters = useMemo(() => {
    if (!staff) return [];
    return staff.filter((s) => 
      s.position.toLowerCase().includes("waiter") || 
      s.position.toLowerCase().includes("server")
    );
  }, [staff]);

  // Calculate today's summary
  const todaysSummary = useMemo(() => {
    const totalOrders = activeOrders?.length || 0;
    const totalRevenue = runningTables.reduce((sum, t) => sum + (t.orderTotal || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalOrders, totalRevenue, avgOrderValue };
  }, [activeOrders, runningTables]);

  const handleTableClick = (tableId: string, status: string) => {
    if (status === "available") {
      router.push(`/cashier/pos/table/${tableId}?type=new`);
    } else if (status === "occupied") {
      router.push(`/cashier/pos/table/${tableId}?type=existing`);
    }
  };

  const handleTransfer = async () => {
    if (!selectedTable || !transferToTable) {
      toast.error("Please select both tables");
      return;
    }
    toast.success("Table transferred successfully");
    setShowTransferDialog(false);
    setSelectedTable(null);
    setTransferToTable("");
  };

  const handleAssignWaiter = async () => {
    if (!selectedWaiterTable || !selectedWaiter) {
      toast.error("Please select both table and waiter");
      return;
    }
    toast.success("Waiter assigned successfully");
    setShowWaiterDialog(false);
    setSelectedWaiterTable(null);
    setSelectedWaiter("");
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden p-6">
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Column - Tables */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Running Tables Section */}
          <section className="bg-card border border-border rounded-2xl p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Running Tables</h2>
              <span className="text-sm text-muted-foreground">({runningTables.length})</span>
            </div>
            <div className="flex-1 overflow-auto">
              {runningTables.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No active orders</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {runningTables.map((table: Table & { roomName: string; orderTotal: number }) => (
                    <button
                      key={table._id}
                      onClick={() => handleTableClick(table._id, "occupied")}
                      className="bg-secondary/10 border-2 border-secondary rounded-xl p-4 hover:bg-secondary/20 transition-all text-left"
                    >
                      <p className="text-xl font-bold text-foreground">{table.tableNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{table.roomName}</p>
                      <p className="text-sm font-semibold text-secondary mt-2">Rs. {table.orderTotal.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Available Tables Section */}
          <section className="bg-card border border-border rounded-2xl p-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Available Tables</h2>
              <span className="text-sm text-muted-foreground">({availableTables.length})</span>
            </div>
            <div className="flex-1 overflow-auto">
              {availableTables.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No available tables</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {availableTables.map((table: Table & { roomName: string }) => (
                    <button
                      key={table._id}
                      onClick={() => handleTableClick(table._id, "available")}
                      className="bg-background border-2 border-border rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <p className="text-xl font-bold text-foreground">{table.tableNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{table.roomName}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="w-80 flex flex-col gap-6">
          {/* Today's Summary */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Today&apos;s Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-xl font-bold text-foreground">{todaysSummary.totalOrders}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-xl font-bold text-foreground">Rs. {todaysSummary.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-copper/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-copper" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Tables</p>
                    <p className="text-xl font-bold text-foreground">{runningTables.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Table Swap & Waiter Assignment */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Table Swap & Waiter Assignment</h2>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12"
                onClick={() => setShowTransferDialog(true)}
              >
                <ArrowRightLeft className="w-5 h-5 text-secondary" />
                <span>Transfer Table</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12"
                onClick={() => setShowWaiterDialog(true)}
              >
                <UserCheck className="w-5 h-5 text-accent" />
                <span>Assign Waiter</span>
              </Button>
            </div>
          </section>

          {/* Home Delivery / Take Away */}
          <section className="bg-card border border-border rounded-2xl p-5 flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="delivery" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="delivery">Home Delivery</TabsTrigger>
                <TabsTrigger value="takeaway">Take Away</TabsTrigger>
              </TabsList>
              <TabsContent value="delivery" className="flex-1 overflow-auto m-0">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-16 justify-start gap-3"
                    onClick={() => router.push("/cashier/pos/table/delivery?type=new")}
                  >
                    <Truck className="w-6 h-6 text-copper" />
                    <div className="text-left">
                      <p className="font-semibold">New Delivery</p>
                      <p className="text-xs text-muted-foreground">Create new delivery order</p>
                    </div>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="takeaway" className="flex-1 overflow-auto m-0">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-16 justify-start gap-3"
                    onClick={() => router.push("/cashier/pos/table/takeaway?type=new")}
                  >
                    <Package className="w-6 h-6 text-accent" />
                    <div className="text-left">
                      <p className="font-semibold">New Takeaway</p>
                      <p className="text-xs text-muted-foreground">Create new takeaway order</p>
                    </div>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>

      {/* Transfer Table Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Table</DialogTitle>
            <DialogDescription>
              Move an order from one table to another.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>From Table</Label>
              <Select value={selectedTable || ""} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select occupied table" />
                </SelectTrigger>
                <SelectContent>
                  {runningTables.map((table: Table & { roomName: string }) => (
                    <SelectItem key={table._id} value={table._id}>
                      {table.roomName} - {table.tableNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>To Table</Label>
              <Select value={transferToTable} onValueChange={setTransferToTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select available table" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table: Table & { roomName: string }) => (
                    <SelectItem key={table._id} value={table._id}>
                      {table.roomName} - {table.tableNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer} 
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              disabled={!selectedTable || !transferToTable}
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Waiter Dialog */}
      <Dialog open={showWaiterDialog} onOpenChange={setShowWaiterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Waiter</DialogTitle>
            <DialogDescription>
              Assign a waiter to a table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Table</Label>
              <Select value={selectedWaiterTable || ""} onValueChange={setSelectedWaiterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {runningTables.map((table: Table & { roomName: string }) => (
                    <SelectItem key={table._id} value={table._id}>
                      {table.roomName} - {table.tableNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Waiter</Label>
              <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select waiter" />
                </SelectTrigger>
                <SelectContent>
                  {waiters.length === 0 ? (
                    <SelectItem value="none" disabled>No waiters available</SelectItem>
                  ) : (
                    waiters.map((waiter) => (
                      <SelectItem key={waiter._id} value={waiter._id}>
                        {waiter.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaiterDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignWaiter} 
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              disabled={!selectedWaiterTable || !selectedWaiter}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
