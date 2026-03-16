import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "gestao_salt_2024").digest("hex");
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios" });
      return;
    }
    const hash = hashPassword(password);
    const isEmail = email.includes("@");
    const users = isEmail
      ? await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1)
      : await db.select().from(usersTable).where(eq(usersTable.username, email)).limit(1);
    const user = users[0];
    if (!user || user.passwordHash !== hash) {
      res.status(401).json({ error: "Email/usuário ou senha inválidos" });
      return;
    }
    if (!user.active) {
      res.status(401).json({ error: "Usuário inativo" });
      return;
    }
    (req as any).session = { userId: user.id };
    (req as any).sessionData = { userId: user.id };
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("session_user_id", String(user.id), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
      },
      message: "Login realizado com sucesso",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/logout", (_req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("session_user_id", {
    path: "/",
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  });
  res.json({ message: "Logout realizado com sucesso" });
});

router.get("/me", async (req, res) => {
  try {
    const userId = (req as any).cookies?.session_user_id;
    if (!userId) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const users = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId))).limit(1);
    const user = users[0];
    if (!user || !user.active) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export { hashPassword };
export default router;
