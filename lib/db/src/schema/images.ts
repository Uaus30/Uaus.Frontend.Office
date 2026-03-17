import { pgTable, serial, text, timestamp, integer, pgEnum, unique } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const imageTypeEnum = pgEnum("image_type", ["banner", "institucional", "produtos", "carrossel"]);

export const imagesTable = pgTable("images", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: imageTypeEnum("type").notNull().default("produtos"),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productImagesTable = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  imageId: integer("image_id").notNull().references(() => imagesTable.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
}, (t) => [unique().on(t.productId, t.imageId)]);

export type Image = typeof imagesTable.$inferSelect;
export type ProductImage = typeof productImagesTable.$inferSelect;
