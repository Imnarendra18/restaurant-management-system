import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ USER ROLES (linked to Better Auth users) ============
  // Note: User data (name, email, etc.) is managed by Better Auth component
  // This table only stores role information for our app
  userRoles: defineTable({
    authUserId: v.string(), // The Better Auth user ID
    role: v.union(v.literal("admin"), v.literal("accountant"), v.literal("cashier"), v.literal("user")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user_id", ["authUserId"])
    .index("by_role", ["role"]),

  // ============ STAFF & PAYROLL ============
  staff: defineTable({
    authUserId: v.optional(v.string()), // Link to Better Auth user if applicable
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    position: v.string(),
    department: v.string(),
    salary: v.number(),
    joinDate: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("terminated")),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user_id", ["authUserId"])
    .index("by_status", ["status"])
    .index("by_department", ["department"]),

  payroll: defineTable({
    staffId: v.id("staff"),
    month: v.number(), // YYYYMM format e.g., 202601
    baseSalary: v.number(),
    allowances: v.number(),
    deductions: v.number(),
    netPay: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid")),
    paidAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_staffId", ["staffId"])
    .index("by_month", ["month"])
    .index("by_status", ["status"]),

  // ============ MENU & INVENTORY ============
  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sortOrder", ["sortOrder"])
    .index("by_isActive", ["isActive"]),

  units: defineTable({
    name: v.string(),
    symbol: v.string(),
    baseUnit: v.optional(v.id("units")), // Reference to base unit (null if this IS the base)
    conversionFactor: v.number(), // 1 for base units, e.g., 1000 for kg->g
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  printers: defineTable({
    name: v.string(),
    ipAddress: v.string(),
    port: v.number(),
    type: v.union(v.literal("kot"), v.literal("bill"), v.literal("both")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"]),

  ingredients: defineTable({
    name: v.string(),
    unitId: v.id("units"),
    currentStock: v.number(),
    reorderLevel: v.number(),
    costPerUnit: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_lowStock", ["currentStock", "reorderLevel"]),

  menuItems: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("categories"),
    price: v.number(),
    printerId: v.optional(v.id("printers")),
    image: v.optional(v.string()),
    isActive: v.boolean(),
    preparationTime: v.optional(v.number()), // in minutes
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_isActive", ["isActive"]),

  menuIngredients: defineTable({
    menuItemId: v.id("menuItems"),
    ingredientId: v.id("ingredients"),
    quantity: v.number(),
    unitId: v.id("units"),
    createdAt: v.number(),
  })
    .index("by_menuItemId", ["menuItemId"])
    .index("by_ingredientId", ["ingredientId"]),

  // ============ SUPPLIERS & PURCHASES ============
  suppliers: defineTable({
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    gstin: v.optional(v.string()),
    panNumber: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_isActive", ["isActive"]),

  purchases: defineTable({
    supplierId: v.id("suppliers"),
    invoiceNo: v.string(),
    purchaseDate: v.number(),
    totalAmount: v.number(),
    taxAmount: v.number(),
    discountAmount: v.number(),
    netAmount: v.number(),
    status: v.union(v.literal("draft"), v.literal("received"), v.literal("cancelled")),
    notes: v.optional(v.string()),
    createdBy: v.string(), // Better Auth user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_supplierId", ["supplierId"])
    .index("by_status", ["status"])
    .index("by_purchaseDate", ["purchaseDate"]),

  purchaseItems: defineTable({
    purchaseId: v.id("purchases"),
    ingredientId: v.id("ingredients"),
    quantity: v.number(),
    unitId: v.id("units"),
    unitPrice: v.number(),
    totalPrice: v.number(),
    createdAt: v.number(),
  })
    .index("by_purchaseId", ["purchaseId"])
    .index("by_ingredientId", ["ingredientId"]),

  // ============ ROOMS & TABLES ============
  rooms: defineTable({
    name: v.string(),
    floorNumber: v.number(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_floorNumber", ["floorNumber"]),

  tables: defineTable({
    roomId: v.id("rooms"),
    tableNumber: v.string(),
    capacity: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("occupied"),
      v.literal("reserved"),
      v.literal("maintenance")
    ),
    currentOrderId: v.optional(v.id("orders")),
    assignedWaiterId: v.optional(v.id("staff")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_status", ["status"])
    .index("by_tableNumber", ["tableNumber"]),

  // ============ CUSTOMERS ============
  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.number(),
    currentCredit: v.number(), // Outstanding credit balance
    totalOrders: v.number(),
    totalSpent: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_name", ["name"]),

  // ============ DISCOUNTS ============
  discounts: defineTable({
    name: v.string(),
    code: v.optional(v.string()), // Coupon code for promo discounts
    type: v.union(v.literal("percentage"), v.literal("flat")),
    value: v.number(),
    minOrderAmount: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()), // Cap for percentage discounts
    validFrom: v.number(),
    validTo: v.number(),
    usageLimit: v.optional(v.number()),
    usedCount: v.number(),
    applicableTo: v.union(v.literal("all"), v.literal("dine_in"), v.literal("takeaway"), v.literal("delivery")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_isActive", ["isActive"]),

  // ============ ORDERS ============
  orders: defineTable({
    orderNumber: v.string(),
    orderType: v.union(v.literal("dine_in"), v.literal("takeaway"), v.literal("delivery")),
    tableId: v.optional(v.id("tables")),
    customerId: v.optional(v.id("customers")),
    waiterId: v.optional(v.id("staff")),
    cashierId: v.string(), // Better Auth user ID
    sessionId: v.id("cashierSessions"),
    
    // Customer details for delivery/takeaway
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
    remarks: v.optional(v.string()),
    
    // Amounts
    subtotal: v.number(),
    discountId: v.optional(v.id("discounts")),
    discountAmount: v.number(),
    taxAmount: v.number(),
    serviceCharge: v.number(),
    grandTotal: v.number(),
    
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("served"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    paymentStatus: v.union(v.literal("unpaid"), v.literal("partial"), v.literal("paid"), v.literal("credit")),
    
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_tableId", ["tableId"])
    .index("by_customerId", ["customerId"])
    .index("by_status", ["status"])
    .index("by_sessionId", ["sessionId"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_createdAt", ["createdAt"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    menuItemId: v.id("menuItems"),
    menuItemName: v.string(), // Denormalized for history
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("sent_to_kitchen"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("served"),
      v.literal("cancelled")
    ),
    kotPrinted: v.boolean(),
    kotPrintedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_menuItemId", ["menuItemId"])
    .index("by_status", ["status"]),

  // ============ PAYMENTS ============
  payments: defineTable({
    orderId: v.id("orders"),
    sessionId: v.id("cashierSessions"),
    method: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("qr"),
      v.literal("fonepay"),
      v.literal("credit")
    ),
    amount: v.number(),
    reference: v.optional(v.string()), // Transaction ID for card/QR
    receivedBy: v.string(), // Better Auth user ID
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_method", ["method"]),

  // ============ CASHIER SESSIONS ============
  cashierSessions: defineTable({
    cashierId: v.string(), // Better Auth user ID
    sessionDate: v.number(), // Date timestamp (start of day)
    openingCash: v.number(),
    closingCash: v.optional(v.number()),
    expectedCash: v.optional(v.number()),
    cashVariance: v.optional(v.number()),
    totalCashSales: v.number(),
    totalCardSales: v.number(),
    totalQrSales: v.number(),
    totalCreditSales: v.number(),
    totalOrders: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    openedAt: v.number(),
    closedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_cashierId", ["cashierId"])
    .index("by_sessionDate", ["sessionDate"])
    .index("by_status", ["status"]),

  // ============ STOCK MOVEMENTS ============
  stockMovements: defineTable({
    ingredientId: v.id("ingredients"),
    movementType: v.union(
      v.literal("purchase"),
      v.literal("sale"),
      v.literal("adjustment"),
      v.literal("waste"),
      v.literal("transfer")
    ),
    quantity: v.number(), // Positive for in, negative for out
    previousStock: v.number(),
    newStock: v.number(),
    referenceType: v.optional(v.string()), // "purchase", "order", "adjustment"
    referenceId: v.optional(v.string()), // ID of related document
    notes: v.optional(v.string()),
    createdBy: v.string(), // Better Auth user ID
    createdAt: v.number(),
  })
    .index("by_ingredientId", ["ingredientId"])
    .index("by_movementType", ["movementType"])
    .index("by_createdAt", ["createdAt"]),

  // ============ ACCOUNTING ============
  financialYears: defineTable({
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    isCurrent: v.boolean(),
    status: v.union(v.literal("active"), v.literal("closed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isCurrent", ["isCurrent"])
    .index("by_status", ["status"]),

  chartOfAccounts: defineTable({
    code: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("income"),
      v.literal("expense")
    ),
    parentId: v.optional(v.id("chartOfAccounts")),
    isActive: v.boolean(),
    openingBalance: v.number(),
    currentBalance: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_type", ["type"])
    .index("by_parentId", ["parentId"]),

  accountingTransactions: defineTable({
    financialYearId: v.id("financialYears"),
    transactionDate: v.number(),
    voucherNo: v.string(),
    voucherType: v.union(
      v.literal("journal"),
      v.literal("payment"),
      v.literal("receipt"),
      v.literal("contra"),
      v.literal("sales"),
      v.literal("purchase")
    ),
    description: v.string(),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    totalAmount: v.number(),
    createdBy: v.string(), // Better Auth user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_financialYearId", ["financialYearId"])
    .index("by_transactionDate", ["transactionDate"])
    .index("by_voucherType", ["voucherType"])
    .index("by_voucherNo", ["voucherNo"]),

  accountingEntries: defineTable({
    transactionId: v.id("accountingTransactions"),
    accountId: v.id("chartOfAccounts"),
    debit: v.number(),
    credit: v.number(),
    narration: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_transactionId", ["transactionId"])
    .index("by_accountId", ["accountId"]),

  // ============ TAX SETTINGS ============
  taxSettings: defineTable({
    name: v.string(),
    rate: v.number(), // Percentage
    isInclusive: v.boolean(), // Tax included in price or added
    applicableTo: v.array(v.string()), // ["dine_in", "takeaway", "delivery"]
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"]),

  // ============ SYSTEM SETTINGS ============
  systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  // ============ KOT RECORDS ============
  kotRecords: defineTable({
    orderId: v.id("orders"),
    kotNumber: v.string(),
    printerId: v.id("printers"),
    items: v.array(v.object({
      orderItemId: v.id("orderItems"),
      menuItemName: v.string(),
      quantity: v.number(),
      notes: v.optional(v.string()),
    })),
    status: v.union(v.literal("printed"), v.literal("reprinted"), v.literal("cancelled")),
    printedAt: v.number(),
    printedBy: v.string(), // Better Auth user ID
    createdAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_printerId", ["printerId"]),
});
