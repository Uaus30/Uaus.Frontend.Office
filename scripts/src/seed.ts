import { db } from "@workspace/db";
import {
  usersTable, categoriesTable, tagsTable, productsTable, productTagsTable,
  customersTable, salesTable, saleItemsTable
} from "@workspace/db/schema";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "gestao_salt_2024").digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  // Users
  const users = await db.insert(usersTable).values([
    { name: "Admin GestãoPro", email: "admin@gestao.pro", passwordHash: hashPassword("admin123"), role: "admin", active: true },
    { name: "Maria Gerente", email: "maria@gestao.pro", passwordHash: hashPassword("maria123"), role: "manager", active: true },
    { name: "João Vendedor", email: "joao@gestao.pro", passwordHash: hashPassword("joao123"), role: "seller", active: true },
  ]).onConflictDoNothing().returning();
  console.log("Users seeded:", users.length);

  // Categories
  const categories = await db.insert(categoriesTable).values([
    { name: "Eletrônicos", description: "Produtos eletrônicos e acessórios" },
    { name: "Roupas", description: "Vestuário masculino e feminino" },
    { name: "Alimentação", description: "Produtos alimentícios e bebidas" },
    { name: "Casa & Decoração", description: "Móveis e decoração" },
    { name: "Esportes", description: "Equipamentos e acessórios esportivos" },
  ]).onConflictDoNothing().returning();
  console.log("Categories seeded:", categories.length);

  // Tags
  const tags = await db.insert(tagsTable).values([
    { name: "Promoção", color: "#ef4444" },
    { name: "Destaque", color: "#f59e0b" },
    { name: "Novo", color: "#10b981" },
    { name: "Importado", color: "#6366f1" },
    { name: "Black Friday", color: "#8b5cf6" },
  ]).onConflictDoNothing().returning();
  console.log("Tags seeded:", tags.length);

  if (categories.length === 0 || tags.length === 0) {
    console.log("Data already exists, skipping products/sales seed");
    return;
  }

  // Products
  const products = await db.insert(productsTable).values([
    { name: "Smartphone Samsung Galaxy", description: "Smartphone Android 128GB", price: "1899.90", costPrice: "1200.00", stock: 45, categoryId: categories[0].id, active: true },
    { name: "Notebook Dell Inspiron", description: "Notebook i5 8GB RAM 256GB SSD", price: "3499.99", costPrice: "2500.00", stock: 12, categoryId: categories[0].id, active: true },
    { name: "Fone Bluetooth JBL", description: "Fone sem fio com cancelamento de ruído", price: "299.90", costPrice: "180.00", stock: 80, categoryId: categories[0].id, active: true },
    { name: "Camiseta Premium", description: "Camiseta algodão pima 100%", price: "89.90", costPrice: "35.00", stock: 200, categoryId: categories[1].id, active: true },
    { name: "Calça Jeans Slim", description: "Calça jeans masculina slim fit", price: "159.90", costPrice: "75.00", stock: 120, categoryId: categories[1].id, active: true },
    { name: "Tênis Running Nike", description: "Tênis para corrida Air Max", price: "499.90", costPrice: "280.00", stock: 30, categoryId: categories[4].id, active: true },
    { name: "Café Gourmet Premium", description: "Café arábica torrado 500g", price: "45.90", costPrice: "18.00", stock: 500, categoryId: categories[2].id, active: true },
    { name: "Vinho Tinto Reserva", description: "Vinho tinto chileno 750ml", price: "89.90", costPrice: "45.00", stock: 150, categoryId: categories[2].id, active: true },
    { name: "Luminária LED", description: "Luminária de mesa LED com dimmer", price: "189.90", costPrice: "90.00", stock: 60, categoryId: categories[3].id, active: true },
    { name: "Almofada Decorativa", description: "Set com 3 almofadas coloridas", price: "79.90", costPrice: "35.00", stock: 3, categoryId: categories[3].id, active: true },
  ]).returning();
  console.log("Products seeded:", products.length);

  // Product tags
  await db.insert(productTagsTable).values([
    { productId: products[0].id, tagId: tags[2].id },
    { productId: products[0].id, tagId: tags[3].id },
    { productId: products[1].id, tagId: tags[1].id },
    { productId: products[2].id, tagId: tags[0].id },
    { productId: products[2].id, tagId: tags[4].id },
    { productId: products[3].id, tagId: tags[0].id },
    { productId: products[5].id, tagId: tags[1].id },
    { productId: products[6].id, tagId: tags[2].id },
    { productId: products[9].id, tagId: tags[0].id },
  ]);

  // Customers
  const customers = await db.insert(customersTable).values([
    { name: "Carlos Eduardo Silva", email: "carlos@email.com", phone: "(11) 99999-0001", document: "123.456.789-01" },
    { name: "Ana Beatriz Santos", email: "ana@email.com", phone: "(11) 99999-0002", document: "234.567.890-12" },
    { name: "Rafael Oliveira", email: "rafael@email.com", phone: "(21) 99999-0003", document: "345.678.901-23" },
    { name: "Fernanda Lima", email: "fernanda@email.com", phone: "(31) 99999-0004" },
    { name: "Lucas Pereira", email: "lucas@email.com", phone: "(41) 99999-0005", document: "567.890.123-45" },
    { name: "Mariana Costa", email: "mariana@email.com", phone: "(51) 99999-0006" },
    { name: "Thiago Martins", email: "thiago@email.com", phone: "(61) 99999-0007" },
  ]).returning();
  console.log("Customers seeded:", customers.length);

  // Generate sales for the past 60 days
  const paymentMethods = ["cash", "credit_card", "debit_card", "pix", "transfer"] as const;
  const salesData = [];
  const now = new Date();

  for (let i = 59; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const numSales = Math.floor(Math.random() * 5) + 1;
    for (let s = 0; s < numSales; s++) {
      salesData.push(date);
    }
  }

  for (const saleDate of salesData) {
    const customer = Math.random() > 0.3 ? customers[Math.floor(Math.random() * customers.length)] : null;
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;

    for (let i = 0; i < numItems; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const price = Number(product.price);
      const subtotal = qty * price;
      total += subtotal;
      items.push({ productId: product.id, quantity: qty, unitPrice: price, subtotal });
    }

    const discount = Math.random() > 0.8 ? Math.floor(total * 0.05) : 0;
    const finalTotal = total - discount;
    const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    const [sale] = await db.insert(salesTable).values({
      customerId: customer?.id ?? null,
      total: String(finalTotal),
      discount: String(discount),
      paymentMethod: method,
      createdAt: saleDate,
    }).returning();

    await db.insert(saleItemsTable).values(
      items.map(item => ({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        subtotal: String(item.subtotal),
      }))
    );
  }

  console.log("Sales seeded:", salesData.length);
  console.log("\n✅ Seed completed!");
  console.log("Login: admin@gestao.pro / admin123");
}

seed().catch(console.error).finally(() => process.exit(0));
