import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["CUSTOMER", "BAKER", "ADMIN"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "BAKING",
  "READY",
  "COLLECTED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "UNPAID",
  "HOLD_RESERVED",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const optionTypeEnum = pgEnum("option_type", ["SIZE", "FLAVOUR"]);

// 1. Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    role: userRoleEnum("role").default("CUSTOMER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

// 2. Categories Table
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("categories_slug_idx").on(table.slug),
  ]
);

// 3. Products (Cakes) Table
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    basePriceInCents: integer("base_price_in_cents").notNull(), // Minor units (e.g. $45.00 = 4500)
    imageUrl: text("image_url").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    minLeadTimeHours: integer("min_lead_time_hours").default(48).notNull(), // Minimum lead time in hours
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    check("base_price_positive_check", sql`base_price_in_cents >= 0`),
    check("min_lead_time_check", sql`min_lead_time_hours >= 0`),
  ]
);

// 4. Product Categories Join Table
export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("prod_cat_product_idx").on(table.productId),
    index("prod_cat_category_idx").on(table.categoryId),
  ]
);

// 5. Product Options Table (Sizes, Flavours)
export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: optionTypeEnum("type").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    priceDeltaInCents: integer("price_delta_in_cents").default(0).notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
  },
  (table) => [
    index("product_options_product_idx").on(table.productId),
  ]
);

// 6. Dietary Tags Table (Eggless, Gluten-Free, Nut-Free, Vegan)
export const dietaryTags = pgTable(
  "dietary_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
  },
  (table) => [
    uniqueIndex("dietary_tags_slug_idx").on(table.slug),
  ]
);

// 7. Product Dietary Tags Join Table
export const productDietaryTags = pgTable(
  "product_dietary_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    dietaryTagId: uuid("dietary_tag_id")
      .notNull()
      .references(() => dietaryTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("prod_diet_product_idx").on(table.productId),
    index("prod_diet_tag_idx").on(table.dietaryTagId),
  ]
);

// 8. Daily Capacity Table (Per Bakery Date with strict check constraints)
export const dailyCapacity = pgTable(
  "daily_capacity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bakeryDate: date("bakery_date").notNull(), // Format YYYY-MM-DD
    maxCakes: integer("max_cakes").default(12).notNull(),
    reservedCakes: integer("reserved_cakes").default(0).notNull(),
    isClosed: boolean("is_closed").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("daily_capacity_date_idx").on(table.bakeryDate),
    check("reserved_cakes_le_max_check", sql`reserved_cakes <= max_cakes`),
    check("reserved_cakes_non_neg_check", sql`reserved_cakes >= 0`),
    check("max_cakes_non_neg_check", sql`max_cakes >= 0`),
  ]
);

// 9. Pickup Slots Table (Time windows for pickup per date)
export const pickupSlots = pgTable(
  "pickup_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bakeryDate: date("bakery_date").notNull(),
    startTime: varchar("start_time", { length: 10 }).notNull(), // e.g. "10:00"
    endTime: varchar("end_time", { length: 10 }).notNull(), // e.g. "12:00"
    maxOrders: integer("max_orders").default(4).notNull(),
    reservedOrders: integer("reserved_orders").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    index("pickup_slots_date_idx").on(table.bakeryDate),
    check("reserved_orders_le_max_check", sql`reserved_orders <= max_orders`),
    check("reserved_orders_non_neg_check", sql`reserved_orders >= 0`),
  ]
);

// 10. Orders Table
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 32 }).notNull().unique(), // e.g. "CC-2026-AB12"
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    pickupDate: date("pickup_date").notNull(),
    pickupSlotId: uuid("pickup_slot_id")
      .notNull()
      .references(() => pickupSlots.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").default("PENDING").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("UNPAID").notNull(),
    subtotalInCents: integer("subtotal_in_cents").notNull(),
    customisationFeeInCents: integer("customisation_fee_in_cents").default(0).notNull(),
    messageFeeInCents: integer("message_fee_in_cents").default(0).notNull(),
    totalInCents: integer("total_in_cents").notNull(),
    
    // Hold reservation & Cancellation
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }), // 10 minute hold window
    cancelCutoff: timestamp("cancel_cutoff", { withTimezone: true, mode: "date" }).notNull(), // 24 hours before pickup
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    
    // Pickup verification token for QR code
    pickupQrToken: varchar("pickup_qr_token", { length: 64 }).notNull(),
    referenceImageUrl: text("reference_image_url"),
    specialNotes: text("special_notes"),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_customer_idx").on(table.customerId),
    index("orders_pickup_date_idx").on(table.pickupDate),
    index("orders_status_idx").on(table.status),
    index("orders_expires_at_idx").on(table.expiresAt),
  ]
);

// 11. Order Items Table
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").default(1).notNull(),
    unitPriceInCents: integer("unit_price_in_cents").notNull(),
    totalPriceInCents: integer("total_price_in_cents").notNull(),
    // Enforce 40 character limit at database level
    cakeMessage: varchar("cake_message", { length: 40 }),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    check("item_quantity_positive", sql`quantity > 0`),
  ]
);

// 12. Order Customisations Table
export const orderCustomisations = pgTable(
  "order_customisations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    optionId: uuid("option_id").references(() => productOptions.id, { onDelete: "set null" }),
    optionType: varchar("option_type", { length: 20 }).notNull(), // SIZE or FLAVOUR
    optionName: varchar("option_name", { length: 100 }).notNull(),
    priceDeltaInCents: integer("price_delta_in_cents").default(0).notNull(),
  },
  (table) => [
    index("order_customisations_item_idx").on(table.orderItemId),
  ]
);

// 13. Payments Table (Idempotent tracking)
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
    provider: varchar("provider", { length: 50 }).default("STRIPE_TEST").notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 128 }),
    amountInCents: integer("amount_in_cents").notNull(),
    status: varchar("status", { length: 50 }).notNull(), // PENDING, SUCCEEDED, FAILED, REFUNDED
    rawResponse: jsonb("raw_response"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("payments_idempotency_idx").on(table.idempotencyKey),
    index("payments_order_idx").on(table.orderId),
  ]
);

// 14. Audit Logs Table
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // ORDER, CAPACITY, USER
    entityId: varchar("entity_id", { length: 64 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    performedBy: uuid("performed_by").references(() => users.id, { onDelete: "set null" }),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_idx").on(table.createdAt),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  categories: many(productCategories),
  options: many(productOptions),
  dietaryTags: many(productDietaryTags),
  orderItems: many(orderItems),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(productCategories),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const dietaryTagsRelations = relations(dietaryTags, ({ many }) => ({
  products: many(productDietaryTags),
}));

export const productDietaryTagsRelations = relations(productDietaryTags, ({ one }) => ({
  product: one(products, {
    fields: [productDietaryTags.productId],
    references: [products.id],
  }),
  dietaryTag: one(dietaryTags, {
    fields: [productDietaryTags.dietaryTagId],
    references: [dietaryTags.id],
  }),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  pickupSlot: one(pickupSlots, {
    fields: [orders.pickupSlotId],
    references: [pickupSlots.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  customisations: many(orderCustomisations),
}));

export const orderCustomisationsRelations = relations(orderCustomisations, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderCustomisations.orderItemId],
    references: [orderItems.id],
  }),
  option: one(productOptions, {
    fields: [orderCustomisations.optionId],
    references: [productOptions.id],
  }),
}));
