import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { suppliersTable } from "@workspace/db/schema";
import { eq, ilike, and, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = [20, 50, 100].includes(Number(req.query.limit)) ? Number(req.query.limit) : 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const conditions: any[] = [];
    if (search) conditions.push(ilike(suppliersTable.name, `%${search}%`));
    if (status && ["ativo", "inativo", "pendente"].includes(status)) {
      conditions.push(eq(suppliersTable.status, status as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(suppliersTable).where(where);
    const data = await db.select().from(suppliersTable).where(where).orderBy(desc(suppliersTable.createdAt)).limit(limit).offset(offset);

    res.json({ data: data.map(s => ({ ...s, minPurchaseValue: Number(s.minPurchaseValue) })), total: count ?? 0, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, razaoSocial, cpfCnpj, vendedor, telefone, email, minPurchaseValue, status, cidade, uf, avatarColor } = req.body;
    if (!name || !vendedor || !telefone || !cidade || !uf) {
      res.status(400).json({ error: "Campos obrigatórios: nome, vendedor, telefone, cidade, UF" });
      return;
    }
    const [supplier] = await db.insert(suppliersTable).values({
      name, razaoSocial: razaoSocial || null,
      cpfCnpj: cpfCnpj || null,
      vendedor, telefone,
      email: email || null,
      minPurchaseValue: String(minPurchaseValue ?? 0),
      status: status ?? "ativo",
      cidade, uf,
      avatarColor: avatarColor ?? "#6366f1",
    }).returning();
    res.status(201).json({ ...supplier, minPurchaseValue: Number(supplier.minPurchaseValue) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
    if (!supplier) { res.status(404).json({ error: "Fornecedor não encontrado" }); return; }
    res.json({ ...supplier, minPurchaseValue: Number(supplier.minPurchaseValue) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, razaoSocial, cpfCnpj, vendedor, telefone, email, minPurchaseValue, status, cidade, uf, avatarColor } = req.body;
    const [supplier] = await db.update(suppliersTable).set({
      name, razaoSocial: razaoSocial || null,
      cpfCnpj: cpfCnpj || null,
      vendedor, telefone,
      email: email || null,
      minPurchaseValue: minPurchaseValue != null ? String(minPurchaseValue) : undefined,
      status, cidade, uf, avatarColor,
    }).where(eq(suppliersTable.id, id)).returning();
    if (!supplier) { res.status(404).json({ error: "Fornecedor não encontrado" }); return; }
    res.json({ ...supplier, minPurchaseValue: Number(supplier.minPurchaseValue) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    res.json({ message: "Fornecedor removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
