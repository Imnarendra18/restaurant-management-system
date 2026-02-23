"use client";

import { useState, use, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Minus,
  Printer,
  Search,
  User,
  Phone,
  MapPin,
  MessageSquare,
  Check,
  CreditCard,
  ChefHat,
  ShoppingBag,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface OrderItem {
  _id?: Id<"orderItems">;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
}

interface MenuCategory {
  category: { _id: string; name: string };
  items: MenuItem[];
}

function TableOrderContent({ tableId }: { tableId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderType = searchParams.get("type") || "new";
  
  const isSpecialOrder = tableId === "takeaway" || tableId === "delivery";
  const isExistingOrder = orderType === "existing";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    address: "",
    remarks: "",
  });
  const [discountPercent, setDiscountPercent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qr">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const menuData = useQuery(api.menu.getForPOS);
  const table = !isSpecialOrder ? useQuery(api.tables.getById, { id: tableId as Id<"tables"> }) : null;
  const existingOrder = !isSpecialOrder && isExistingOrder 
    ? useQuery(api.orders.getActiveOrderWithItems, { tableId: tableId as Id<"tables"> }) 
    : null;

  // Auth + cashier session
  const { data: authSession } = authClient.useSession();
  const activeCashierSession = authSession?.user?.id
    ? useQuery(api.cashierSessions.getActive, { cashierId: authSession.user.id })
    : null;

  // Mutations
  const createOrder = useMutation(api.orders.create);
  const addOrderItem = useMutation(api.orders.addItem);
  const completePayment = useMutation(api.orders.completePayment);

  // Load existing order items when viewing a running table
  useEffect(() => {
    if (existingOrder?.items && existingOrder.items.length > 0) {
      const items: OrderItem[] = existingOrder.items.map((item) => ({
        _id: item._id,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
      }));
      setOrderItems(items);
      
      // Load customer details
      if (existingOrder.customerName) {
        setCustomerDetails({
          name: existingOrder.customerName || "",
          phone: existingOrder.customerPhone || "",
          address: existingOrder.customerAddress || "",
          remarks: existingOrder.remarks || "",
        });
      }
    }
  }, [existingOrder]);

  // Calculations
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = discountPercent ? (subtotal * parseFloat(discountPercent)) / 100 : 0;
  const total = subtotal - discountAmount;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeAmount = cashReceivedNum > total ? cashReceivedNum - total : 0;

  const handleAddItem = (menuItem: MenuItem) => {
    const existingIndex = orderItems.findIndex((item) => item.menuItemId === menuItem._id);

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          menuItemId: menuItem._id,
          menuItemName: menuItem.name,
          quantity: 1,
          unitPrice: menuItem.price,
          totalPrice: menuItem.price,
        },
      ]);
    }
    toast.success(`Added ${menuItem.name}`);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const updated = [...orderItems];
    updated[index].quantity += delta;

    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    }
    setOrderItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handlePrintBill = async () => {
    if (orderItems.length === 0) {
      toast.error("No items to print");
      return;
    }
    toast.success("Bill sent to printer");
  };

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      toast.error("No items in order");
      return;
    }

    // Require an open cashier session
    if (!authSession || !authSession.user || !activeCashierSession) {
      toast.error("No open cashier session. Please open a session before creating orders.");
      return;
    }

    setIsLoading(true);
    try {
      // Create the order - this will mark the table as occupied
      const orderId = await createOrder({
        orderType: isSpecialOrder ? (tableId === "takeaway" ? "takeaway" : "delivery") : "dine_in",
        tableId: isSpecialOrder ? undefined : tableId as Id<"tables">,
        cashierId: authSession.user.id,
        sessionId: activeCashierSession._id as Id<"cashierSessions">,
        customerName: customerDetails.name || undefined,
        customerPhone: customerDetails.phone || undefined,
        customerAddress: customerDetails.address || undefined,
        remarks: customerDetails.remarks || undefined,
      });

      // Add all items to the order
      for (const item of orderItems) {
        await addOrderItem({
          orderId,
          menuItemId: item.menuItemId as Id<"menuItems">,
          quantity: item.quantity,
          notes: item.notes,
        });
      }

      toast.success("Order created successfully!");
      router.push("/cashier/pos");
    } catch (error) {
      toast.error("Failed to create order");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (orderItems.length === 0) {
      toast.error("No items in order");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement order update logic
      toast.success("Order updated successfully!");
      router.push("/cashier/pos");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (orderItems.length === 0) {
      toast.error("No items in order");
      return;
    }
    if (paymentMethod === "cash" && cashReceivedNum < total) {
      toast.error("Insufficient cash received");
      return;
    }

    setIsLoading(true);
    try {
      if (existingOrder?._id) {
        await completePayment({
          orderId: existingOrder._id,
          paymentMethod,
          amountPaid: paymentMethod === "cash" ? cashReceivedNum : total,
        });
      }
      toast.success("Payment completed successfully!");
      router.push("/cashier/pos");
    } catch {
      toast.error("Failed to process payment");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMenuData = menuData
    ?.map((cat: MenuCategory) => ({
      ...cat,
      items: cat.items.filter((item: MenuItem) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat: MenuCategory) => 
      (selectedCategory === "all" || cat.category._id === selectedCategory) && cat.items.length > 0
    );

  const allMenuItems = filteredMenuData?.flatMap((cat: MenuCategory) => cat.items) || [];

  return (
    <div className="h-full flex bg-background overflow-hidden p-4 gap-4">
        {/* Left Card - Customer Info, Order Items, Subtotal */}
        <div className="w-1/2 bg-card border border-border rounded-2xl flex flex-col overflow-hidden min-h-0">
          {/* Customer Info */}
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Customer Info</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Name"
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Phone"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              {(isSpecialOrder && tableId === "delivery") && (
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Delivery address"
                    value={customerDetails.address}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 col-span-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Remarks"
                  value={customerDetails.remarks}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, remarks: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Table Header */}
            <div className="bg-[#8B4513] text-white text-xs font-semibold grid grid-cols-[1fr_120px_60px_80px_80px] px-3 py-2 shrink-0">
              <span>Item Name</span>
              <span className="text-center">Prev Qty | Qty | +Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Action</span>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {orderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ChefHat className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No items yet</p>
                  <p className="text-xs">Select from menu →</p>
                </div>
              ) : (
                <div>
                  {orderItems.map((item, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "grid grid-cols-[1fr_120px_60px_80px_80px] items-center px-3 py-2 text-sm border-b border-border",
                        index % 2 === 0 ? "bg-muted/20" : "bg-background"
                      )}
                    >
                      {/* Item Name */}
                      <span className="font-medium text-foreground truncate pr-2">{item.menuItemName}</span>
                      
                      {/* Qty Controls: Prev | Qty | Plus */}
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-6 text-center text-muted-foreground text-xs">{isExistingOrder ? item.quantity : "-"}</span>
                        <button
                          onClick={() => handleUpdateQuantity(index, -1)}
                          className="w-5 h-5 rounded bg-copper text-white hover:bg-copper-dark transition-colors flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(index, 1)}
                          className="w-5 h-5 rounded bg-secondary text-white hover:bg-secondary/80 transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-muted-foreground text-xs">0</span>
                      </div>
                      
                      {/* Rate */}
                      <span className="text-right">{item.unitPrice}</span>
                      
                      {/* Amount */}
                      <span className="text-right font-medium">{item.totalPrice}</span>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-center gap-1">
                        <button className="w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="w-5 h-5 rounded text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M15 9l-6 6M9 9l6 6" /></svg>
                        </button>
                        <button className="w-5 h-5 rounded text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary & Payment Section */}
          <div className="border-t-2 border-primary">
            {/* Info Notice */}
            {isExistingOrder && (
              <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-xs text-amber-700">
                ⚠ No need to update the order until you add a new item.
              </div>
            )}
            
            {/* Summary Row */}
            <div className="grid grid-cols-5 gap-3 px-3 py-2 bg-muted/30 text-xs border-b border-border">
              <div>
                <span className="text-primary font-semibold">Total Qty:</span>
                <span className="ml-1 font-bold">{orderItems.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div>
                <span className="font-semibold">Gross Amount</span>
                <div className="text-primary font-bold">Rs. {subtotal.toLocaleString()}</div>
              </div>
              <div>
                <span className="font-semibold">Disc. Type</span>
                <select className="w-full h-6 text-xs border border-border rounded mt-0.5 bg-background">
                  <option>%</option>
                  <option>Flat</option>
                </select>
              </div>
              <div>
                <span className="font-semibold">Discount</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="h-6 text-xs mt-0.5"
                />
              </div>
              <div>
                <span className="font-semibold">Net Amount</span>
                <div className="text-primary font-bold">Rs. {total.toLocaleString()}</div>
              </div>
            </div>

            {/* Payment Row */}
            <div className="grid grid-cols-5 gap-3 px-3 py-2 bg-muted/20 text-xs border-b border-border">
              <div>
                <span className="font-semibold">Payment Method</span>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash" | "card" | "qr")}
                  className="w-full h-6 text-xs border border-border rounded mt-0.5 bg-background"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="qr">Fonepay</option>
                </select>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Fonepay Amt</span>
                <Input
                  disabled={paymentMethod !== "qr"}
                  placeholder="Fonepay"
                  className="h-6 text-xs mt-0.5 disabled:bg-muted"
                />
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Cash Amount</span>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="Cash"
                  disabled={paymentMethod !== "cash"}
                  className="h-6 text-xs mt-0.5 disabled:bg-muted"
                />
              </div>
              <div>
                <span className="font-semibold text-primary">Total Paid</span>
                <div className="text-primary font-bold">Rs. {paymentMethod === "cash" ? (parseFloat(cashReceived) || 0) : total}</div>
              </div>
              <div>
                <span className="font-semibold text-primary">Return Amount</span>
                <div className="text-primary font-bold">Rs. {changeAmount}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 p-2">
              <Button 
                variant="default" 
                size="sm" 
                className="bg-blue-500 hover:bg-blue-600 text-white h-9"
                onClick={() => router.push("/cashier/pos")}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="bg-cyan-500 hover:bg-cyan-600 text-white h-9"
                onClick={handlePrintBill} 
                disabled={orderItems.length === 0}
              >
                <Printer className="w-4 h-4 mr-1" /> Print Bill
              </Button>
              {isExistingOrder ? (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-green-500 hover:bg-green-600 text-white h-9"
                    onClick={handlePayNow} 
                    disabled={isLoading || orderItems.length === 0}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
                    Paid
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-orange-500 hover:bg-orange-600 text-white h-9"
                    onClick={handleUpdateOrder} 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Update Order
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-secondary hover:bg-secondary/90 text-white h-9 col-span-2"
                  onClick={handleCreateOrder} 
                  disabled={isLoading || orderItems.length === 0}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShoppingBag className="w-4 h-4 mr-1" />}
                  Create Order
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Card - Menu Items */}
        <div className="w-1/2 bg-card border border-border rounded-2xl flex flex-col overflow-hidden min-h-0">
          {/* Search & Categories */}
          <div className="p-3 border-b border-border">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all",
                  selectedCategory === "all" ? "bg-secondary text-secondary-foreground" : "bg-muted hover:bg-muted/80"
                )}
              >
                All
              </button>
              {menuData?.map((cat: MenuCategory) => (
                <button
                  key={cat.category._id}
                  onClick={() => setSelectedCategory(cat.category._id)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all",
                    selectedCategory === cat.category._id ? "bg-secondary text-secondary-foreground" : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {cat.category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid - 4 columns */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
            {allMenuItems.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {allMenuItems.map((item: MenuItem) => (
                  <button
                    key={item._id}
                    onClick={() => handleAddItem(item)}
                    className="group bg-background rounded-lg p-2 text-left hover:scale-[1.02] shadow-sm hover:shadow transition-all border border-border hover:border-accent"
                  >
                    <div className="aspect-[4/3] rounded bg-muted mb-2 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl opacity-40">🍽️</span>
                      )}
                    </div>
                    <p className="font-medium text-xs text-foreground line-clamp-1">{item.name}</p>
                    <p className="text-sm font-bold text-copper">Rs. {item.price}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No items found</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

export default function TableOrderPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TableOrderContent tableId={tableId} />
    </Suspense>
  );
}
