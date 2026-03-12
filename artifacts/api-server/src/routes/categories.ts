import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

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

export default router;
