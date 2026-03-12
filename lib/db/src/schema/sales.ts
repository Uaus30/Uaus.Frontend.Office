import { pgTable, serial, text, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const paymentMethodEnum = pgEnum("payment_method", ["cash", "credit_card", "debit_card", "pix", "transfer"]);

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => salesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
