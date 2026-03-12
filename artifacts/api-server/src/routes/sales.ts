import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, customersTable, productsTable } from "@workspace/db/schema";
import { eq, like, sql, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

async function getSaleWithRelations(id: number) {
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id)).limit(1);
  if (!sale) return null;

  let customer = null;
  if (sale.customerId) {
    const customers = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId)).limit(1);
    customer = customers[0] ? { ...customers[0], totalPurchases: 0, purchaseCount: 0 } : null;
  }

  const rawItems = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
  const items = await Promise.all(rawItems.map(async item => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
    return {
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      product: product ? { ...product, price: Number(product.price), costPrice: Number(product.costPrice), tags: [], category: null } : null,
    };
  }));

  return {
    ...sale,
    total: Number(sale.total),
    discount: Number(sale.discount),
    customer,
    items,
  };
}

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (customerId) conditions.push(eq(salesTable.customerId, customerId));
    if (startDate) conditions.push(gte(salesTable.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(salesTable.createdAt, new Date(endDate + "T23:59:59")));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(salesTable).where(whereClause);
    const sales = await db.select().from(salesTable).where(whereClause).orderBy(salesTable.createdAt).limit(limit).offset(offset);

    const withRelations = await Promise.all(sales.map(s => getSaleWithRelations(s.id)));
    res.json({ data: withRelations.filter(Boolean), total: count ?? 0, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { customerId, items, discount, paymentMethod, notes } = req.body;
    if (!items || items.length === 0) { res.status(400).json({ error: "Itens são obrigatórios" }); return; }
    if (!paymentMethod) { res.status(400).json({ error: "Forma de pagamento é obrigatória" }); return; }

    const subtotals = items.map((item: any) => item.quantity * item.unitPrice);
    const subtotal = subtotals.reduce((a: number, b: number) => a + b, 0);
    const total = subtotal - (discount ?? 0);

    const [sale] = await db.insert(salesTable).values({
      customerId: customerId ?? null,
      total: String(total),
      discount: String(discount ?? 0),
      paymentMethod,
      notes: notes ?? null,
    }).returning();

    const itemValues = items.map((item: any) => ({
      saleId: sale.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      subtotal: String(item.quantity * item.unitPrice),
    }));
    await db.insert(saleItemsTable).values(itemValues);

    // Update stock
    for (const item of items) {
      await db.execute(sql`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.productId} AND stock >= ${item.quantity}`);
    }

    const full = await getSaleWithRelations(sale.id);
    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const sale = await getSaleWithRelations(Number(req.params.id));
    if (!sale) { res.status(404).json({ error: "Venda não encontrada" }); return; }
    res.json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(saleItemsTable).where(eq(saleItemsTable.saleId, id));
    await db.delete(salesTable).where(eq(salesTable.id, id));
    res.json({ message: "Venda removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
