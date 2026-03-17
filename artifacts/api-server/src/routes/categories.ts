import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable, saleItemsTable } from "@workspace/db/schema";
import { eq, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    const productCounts = await db
      .select({ categoryId: productsTable.categoryId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(productsTable)
      .groupBy(productsTable.categoryId);
    const countMap = new Map(productCounts.map(p => [p.categoryId, p.count]));
    res.json(categories.map(c => ({ ...c, productCount: countMap.get(c.id) ?? 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const [cat] = await db.insert(categoriesTable).values({ name, description }).returning();
    res.status(201).json({ ...cat, productCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body;
    const [cat] = await db.update(categoriesTable).set({ name, description }).where(eq(categoriesTable.id, id)).returning();
    if (!cat) { res.status(404).json({ error: "Categoria não encontrada" }); return; }
    const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(productsTable).where(eq(productsTable.categoryId, id));
    res.json({ ...cat, productCount: count ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ message: "Categoria removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:id/report", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
    if (!category) { res.status(404).json({ error: "Categoria não encontrada" }); return; }

    const products = await db.select().from(productsTable).where(eq(productsTable.categoryId, id));
    const productIds = products.map(p => p.id);

    if (productIds.length === 0) {
      res.json({ category: { ...category, productCount: 0 }, totalRevenue: 0, totalSales: 0, totalStock: 0, products: [] });
      return;
    }

    const saleStats = await db
      .select({
        productId: saleItemsTable.productId,
        totalSales: sql<number>`sum(${saleItemsTable.quantity})`.mapWith(Number),
        totalRevenue: sql<number>`sum(${saleItemsTable.subtotal})`.mapWith(Number),
      })
      .from(saleItemsTable)
      .where(inArray(saleItemsTable.productId, productIds))
      .groupBy(saleItemsTable.productId);

    const statsMap = new Map(saleStats.map(s => [s.productId, s]));
    const productStats = products.map(p => ({
      id: p.id, name: p.name, stock: p.stock,
      price: Number(p.price),
      totalSales: statsMap.get(p.id)?.totalSales ?? 0,
      totalRevenue: statsMap.get(p.id)?.totalRevenue ?? 0,
    }));

    res.json({
      category: { ...category, productCount: productIds.length },
      totalRevenue: productStats.reduce((s, p) => s + p.totalRevenue, 0),
      totalSales: productStats.reduce((s, p) => s + p.totalSales, 0),
      totalStock: productStats.reduce((s, p) => s + p.stock, 0),
      products: productStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
