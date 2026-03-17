import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { imagesTable } from "@workspace/db/schema";
import { eq, like, desc, and, ilike } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post("/upload-url", async (req, res) => {
  try {
    const { name, size, contentType } = req.body;
    if (!name || !contentType) {
      res.status(400).json({ error: "name e contentType são obrigatórios" });
      return;
    }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar URL de upload" });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = [20, 50, 100].includes(Number(req.query.limit)) ? Number(req.query.limit) : 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;

    const conditions: any[] = [];
    if (search) conditions.push(ilike(imagesTable.name, `%${search}%`));
    if (type && ["banner","institucional","produtos","carrossel"].includes(type)) {
      conditions.push(eq(imagesTable.type, type as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const allRows = await db.select().from(imagesTable).where(where).orderBy(desc(imagesTable.createdAt));
    const total = allRows.length;
    const data = allRows.slice(offset, offset + limit).map(img => ({
      ...img,
      url: `/api/storage${img.objectPath}`,
    }));

    res.json({ data, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, objectPath } = req.body;
    if (!name || !objectPath) {
      res.status(400).json({ error: "nome e objectPath são obrigatórios" });
      return;
    }
    const [image] = await db.insert(imagesTable).values({
      name,
      type: type ?? "produtos",
      objectPath,
    }).returning();
    res.status(201).json({ ...image, url: `/api/storage${image.objectPath}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(imagesTable).where(eq(imagesTable.id, id));
    res.json({ message: "Imagem removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
