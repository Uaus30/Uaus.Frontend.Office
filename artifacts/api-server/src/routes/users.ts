import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "gestao_salt_2024").digest("hex");
}

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(usersTable);
    const users = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, active: usersTable.active, createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(usersTable.name).limit(limit).offset(offset);
    res.json({ data: users, total: count ?? 0, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "Nome, email, senha e papel são obrigatórios" });
      return;
    }
    const [user] = await db.insert(usersTable).values({
      name, email, passwordHash: hashPassword(password), role,
    }).returning({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, active: usersTable.active, createdAt: usersTable.createdAt,
    });
    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "Email já cadastrado" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, password, role, active } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.passwordHash = hashPassword(password);
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;
    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, active: usersTable.active, createdAt: usersTable.createdAt,
    });
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ message: "Usuário removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
