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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Home,
  Grid3X3,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface Room {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  tableCount?: number;
}

interface TableType {
  _id: string;
  tableNumber: string;
  roomId: string;
  roomName?: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  isActive: boolean;
}

export default function RoomsTablesPage() {
  // Queries
  const rooms = useQuery(api.rooms.getAll);
  const tables = useQuery(api.tables.getAll);
  const createRoom = useMutation(api.rooms.create);
  const updateRoom = useMutation(api.rooms.update);
  const deleteRoom = useMutation(api.rooms.remove);
  const createTable = useMutation(api.tables.create);
  const updateTable = useMutation(api.tables.update);
  const deleteTable = useMutation(api.tables.remove);

  // State
  const [activeTab, setActiveTab] = useState("rooms");
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteRoomDialogOpen, setDeleteRoomDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [deleteTableDialogOpen, setDeleteTableDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);

  const [roomFormData, setRoomFormData] = useState({
    name: "",
    description: "",
  });

  const [tableFormData, setTableFormData] = useState({
    tableNumber: "",
    roomId: "",
    capacity: "4",
  });

  // Room handlers
  const handleOpenRoomDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomFormData({
        name: room.name,
        description: room.description || "",
      });
    } else {
      setEditingRoom(null);
      setRoomFormData({ name: "", description: "" });
    }
    setShowRoomDialog(true);
  };

  const handleSubmitRoom = async () => {
    if (!roomFormData.name) {
      toast.error("Please enter a room name");
      return;
    }

    setIsLoading(true);
    try {
      if (editingRoom) {
        await updateRoom({
          id: editingRoom._id as Id<"rooms">,
          name: roomFormData.name,
          description: roomFormData.description || undefined,
        });
        toast.success("Room updated successfully");
      } else {
        await createRoom({
          name: roomFormData.name,
          description: roomFormData.description || undefined,
          isActive: true,
          floorNumber: 1,
        });
        toast.success("Room created successfully");
      }
      setShowRoomDialog(false);
    } catch (error) {
      toast.error(editingRoom ? "Failed to update room" : "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    setRoomToDelete(id);
    setDeleteRoomDialogOpen(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await deleteRoom({ id: roomToDelete as Id<"rooms"> });
      toast.success("Room deleted successfully");
      setRoomToDelete(null);
    } catch (error) {
      toast.error("Failed to delete room");
    }
  };

  // Table handlers
  const handleOpenTableDialog = (table?: TableType) => {
    if (table) {
      setEditingTable(table);
      setTableFormData({
        tableNumber: table.tableNumber,
        roomId: table.roomId,
        capacity: table.capacity.toString(),
      });
    } else {
      setEditingTable(null);
      setTableFormData({
        tableNumber: "",
        roomId: rooms?.[0]?._id || "",
        capacity: "4",
      });
    }
    setShowTableDialog(true);
  };

  const handleSubmitTable = async () => {
    if (!tableFormData.tableNumber || !tableFormData.roomId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      if (editingTable) {
        await updateTable({
          id: editingTable._id as Id<"tables">,
          tableNumber: tableFormData.tableNumber,
          roomId: tableFormData.roomId as Id<"rooms">,
          capacity: parseInt(tableFormData.capacity) || 4,
        });
        toast.success("Table updated successfully");
      } else {
        await createTable({
          tableNumber: tableFormData.tableNumber,
          roomId: tableFormData.roomId as Id<"rooms">,
          capacity: parseInt(tableFormData.capacity) || 4,
          isActive: true,
        });
        toast.success("Table created successfully");
      }
      setShowTableDialog(false);
    } catch (error) {
      toast.error(editingTable ? "Failed to update table" : "Failed to create table");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    setTableToDelete(id);
    setDeleteTableDialogOpen(true);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      await deleteTable({ id: tableToDelete as Id<"tables"> });
      toast.success("Table deleted successfully");
      setTableToDelete(null);
    } catch (error) {
      toast.error("Failed to delete table");
    }
  };

  const updateTableStatus = useMutation(api.tables.updateStatus);

  const handleUpdateTableStatus = async (table: TableType, status: TableType["status"]) => {
    try {
      await updateTableStatus({
        id: table._id as Id<"tables">,
        status,
      });
      toast.success(`Table status updated to ${status}`);
    } catch (error) {
      toast.error("Failed to update table status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-600";
      case "occupied":
        return "bg-red-500/10 text-red-600";
      case "reserved":
        return "bg-yellow-500/10 text-yellow-600";
      case "maintenance":
        return "bg-gray-500/10 text-gray-600";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rooms & Tables</h1>
          <p className="text-muted-foreground">
            Manage your restaurant floor layout
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              Total Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rooms?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Total Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tables?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {tables?.reduce((sum, t) => sum + t.capacity, 0) || 0} seats
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              Available Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {tables?.filter((t) => t.status === "available").length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
          </TabsList>
          <Button
            onClick={() =>
              activeTab === "rooms" ? handleOpenRoomDialog() : handleOpenTableDialog()
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === "rooms" ? "Room" : "Table"}
          </Button>
        </div>

        {/* Rooms Tab */}
        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <CardTitle>All Rooms</CardTitle>
              <CardDescription>
                Manage your restaurant rooms/floors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rooms === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No rooms created yet</p>
                  <p className="text-sm">Click &quot;Add Room&quot; to create your first room</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Tables</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => {
                      const roomTables = tables?.filter((t) => t.roomId === room._id) || [];
                      return (
                        <TableRow key={room._id}>
                          <TableCell className="font-medium">{room.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {room.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{roomTables.length} tables</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={room.isActive ? "default" : "secondary"}
                              className={
                                room.isActive
                                  ? "bg-green-500/10 text-green-600"
                                  : ""
                              }
                            >
                              {room.isActive ? "Active" : "Inactive"}
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
                                <DropdownMenuItem onClick={() => handleOpenRoomDialog(room)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteRoom(room._id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>All Tables</CardTitle>
              <CardDescription>
                Manage tables across all rooms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tables === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tables created yet</p>
                  <p className="text-sm">Click &quot;Add Table&quot; to create your first table</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table #</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table._id}>
                        <TableCell className="font-medium">
                          Table {table.tableNumber}
                        </TableCell>
                        <TableCell>{table.room?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {table.capacity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(table.status)}>
                            {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
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
                              <DropdownMenuItem onClick={() => handleOpenTableDialog(table)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateTableStatus(table, "available")}
                              >
                                Set Available
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateTableStatus(table, "reserved")}
                              >
                                Set Reserved
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateTableStatus(table, "maintenance")}
                              >
                                Set Maintenance
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteTable(table._id)}
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

      {/* Room Dialog */}
      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Room" : "Add New Room"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom ? "Update room details" : "Create a new room/floor"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name *</Label>
              <Input
                id="roomName"
                placeholder="e.g., Ground Floor, Terrace"
                value={roomFormData.name}
                onChange={(e) =>
                  setRoomFormData({ ...roomFormData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomDescription">Description</Label>
              <Input
                id="roomDescription"
                placeholder="Optional description"
                value={roomFormData.description}
                onChange={(e) =>
                  setRoomFormData({ ...roomFormData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoomDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRoom} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRoom ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Table" : "Add New Table"}
            </DialogTitle>
            <DialogDescription>
              {editingTable ? "Update table details" : "Create a new table"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tableNumber">Table Number *</Label>
                <Input
                  id="tableNumber"
                  placeholder="e.g., 1, A1"
                  value={tableFormData.tableNumber}
                  onChange={(e) =>
                    setTableFormData({ ...tableFormData, tableNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={tableFormData.capacity}
                  onChange={(e) =>
                    setTableFormData({ ...tableFormData, capacity: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableRoom">Room *</Label>
              <Select
                value={tableFormData.roomId}
                onValueChange={(value) =>
                  setTableFormData({ ...tableFormData, roomId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((room) => (
                    <SelectItem key={room._id} value={room._id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitTable} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTable ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteRoomDialogOpen}
        onOpenChange={setDeleteRoomDialogOpen}
        title="Delete Room"
        description="Are you sure you want to delete this room? All tables in this room will also be deleted. This action cannot be undone."
        onConfirm={confirmDeleteRoom}
      />

      <DeleteDialog
        open={deleteTableDialogOpen}
        onOpenChange={setDeleteTableDialogOpen}
        title="Delete Table"
        description="Are you sure you want to delete this table? This action cannot be undone."
        onConfirm={confirmDeleteTable}
      />
    </div>
  );
}
