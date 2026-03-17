import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customersTable, salesTable } from "@workspace/db/schema";
import { eq, ilike, sql, and } from "drizzle-orm";

const router: IRouter = Router();

async function getCustomerWithStats(id: number) {
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id)).limit(1);
  if (!customer) return null;
  const [stats] = await db.select({
    totalPurchases: sql<number>`coalesce(sum(${salesTable.total}), 0)`.mapWith(Number),
    purchaseCount: sql<number>`count(*)`.mapWith(Number),
  }).from(salesTable).where(eq(salesTable.customerId, id));
  return { ...customer, totalPurchases: stats?.totalPurchases ?? 0, purchaseCount: stats?.purchaseCount ?? 0 };
}

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * limit;

    const whereClause = search ? ilike(customersTable.name, `%${search}%`) : undefined;
    const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(customersTable).where(whereClause);
    const customers = await db.select().from(customersTable).where(whereClause).orderBy(customersTable.name).limit(limit).offset(offset);

    const withStats = await Promise.all(customers.map(c => getCustomerWithStats(c.id)));
    res.json({ data: withStats.filter(Boolean), total: count ?? 0, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, document, address } = req.body;
    if (!name) { res.status(400).json({ error: "Nome é obrigatório" }); return; }
    const [customer] = await db.insert(customersTable).values({ name, email, phone, document, address }).returning();
    res.status(201).json({ ...customer, totalPurchases: 0, purchaseCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const customer = await getCustomerWithStats(Number(req.params.id));
    if (!customer) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, phone, document, address } = req.body;
    const [customer] = await db.update(customersTable).set({ name, email, phone, document, address }).where(eq(customersTable.id, id)).returning();
    if (!customer) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    const full = await getCustomerWithStats(id);
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.json({ message: "Cliente removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
