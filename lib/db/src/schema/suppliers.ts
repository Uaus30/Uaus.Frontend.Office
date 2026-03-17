import { pgTable, serial, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";

export const supplierStatusEnum = pgEnum("supplier_status", ["ativo", "inativo", "pendente"]);

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  razaoSocial: text("razao_social"),
  cpfCnpj: text("cpf_cnpj"),
  vendedor: text("vendedor").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  minPurchaseValue: numeric("min_purchase_value").notNull().default("0"),
  status: supplierStatusEnum("status").notNull().default("ativo"),
  cidade: text("cidade").notNull(),
  uf: text("uf").notNull(),
  avatarColor: text("avatar_color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Supplier = typeof suppliersTable.$inferSelect;
