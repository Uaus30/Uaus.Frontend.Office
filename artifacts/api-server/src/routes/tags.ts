import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tagsTable, productTagsTable, productsTable, saleItemsTable, salesTable } from "@workspace/db/schema";
import { eq, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const tags = await db.select().from(tagsTable).orderBy(tagsTable.name);
    const productCounts = await db
      .select({ tagId: productTagsTable.tagId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(productTagsTable)
      .groupBy(productTagsTable.tagId);
    const countMap = new Map(productCounts.map(p => [p.tagId, p.count]));
    res.json(tags.map(t => ({ ...t, productCount: countMap.get(t.id) ?? 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) { res.status(400).json({ error: "Nome é obrigatório" }); return; }
    const [tag] = await db.insert(tagsTable).values({ name, color: color ?? "#6366f1" }).returning();
    res.status(201).json({ ...tag, productCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, color } = req.body;
    const [tag] = await db.update(tagsTable).set({ name, color }).where(eq(tagsTable.id, id)).returning();
    if (!tag) { res.status(404).json({ error: "Etiqueta não encontrada" }); return; }
    const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(productTagsTable).where(eq(productTagsTable.tagId, id));
    res.json({ ...tag, productCount: count ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(productTagsTable).where(eq(productTagsTable.tagId, id));
    await db.delete(tagsTable).where(eq(tagsTable.id, id));
    res.json({ message: "Etiqueta removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:id/report", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tag] = await db.select().from(tagsTable).where(eq(tagsTable.id, id)).limit(1);
    if (!tag) { res.status(404).json({ error: "Etiqueta não encontrada" }); return; }

    const productLinks = await db.select({ productId: productTagsTable.productId }).from(productTagsTable).where(eq(productTagsTable.tagId, id));
    const productIds = productLinks.map(p => p.productId);

    if (productIds.length === 0) {
      res.json({ tag: { ...tag, productCount: 0 }, totalRevenue: 0, totalSales: 0, totalStock: 0, products: [] });
      return;
    }

    const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
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
      id: p.id,
      name: p.name,
      stock: p.stock,
      totalSales: statsMap.get(p.id)?.totalSales ?? 0,
      totalRevenue: statsMap.get(p.id)?.totalRevenue ?? 0,
    }));

    res.json({
      tag: { ...tag, productCount: productIds.length },
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
