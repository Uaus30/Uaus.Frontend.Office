import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable, productTagsTable, tagsTable, productImagesTable, imagesTable } from "@workspace/db/schema";
import { eq, ilike, and, sql, inArray, asc, isNull } from "drizzle-orm";

const router: IRouter = Router();

async function getProductWithRelations(id: number) {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!product) return null;

  let category = null;
  if (product.categoryId) {
    const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)).limit(1);
    if (cats[0]) {
      const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(productsTable).where(eq(productsTable.categoryId, cats[0].id));
      category = { ...cats[0], productCount: count ?? 0 };
    }
  }

  const tagLinks = await db.select({ tagId: productTagsTable.tagId }).from(productTagsTable).where(eq(productTagsTable.productId, id));
  let tags: any[] = [];
  if (tagLinks.length > 0) {
    const tagIds = tagLinks.map(t => t.tagId);
    const rawTags = await db.select().from(tagsTable).where(inArray(tagsTable.id, tagIds));
    const tagCounts = await db.select({ tagId: productTagsTable.tagId, count: sql<number>`count(*)`.mapWith(Number) }).from(productTagsTable).where(inArray(productTagsTable.tagId, tagIds)).groupBy(productTagsTable.tagId);
    const countMap = new Map(tagCounts.map(t => [t.tagId, t.count]));
    tags = rawTags.map(t => ({ ...t, productCount: countMap.get(t.id) ?? 0 }));
  }

  const imageLinks = await db
    .select({ pi: productImagesTable, img: imagesTable })
    .from(productImagesTable)
    .innerJoin(imagesTable, eq(productImagesTable.imageId, imagesTable.id))
    .where(and(eq(productImagesTable.productId, id), isNull(imagesTable.deletedAt)))
    .orderBy(asc(productImagesTable.displayOrder));
  const images = imageLinks.map(({ pi, img }) => ({
    id: img.id, name: img.name, type: img.type,
    objectPath: img.objectPath, url: `/api/storage${img.objectPath}`,
    displayOrder: pi.displayOrder, linkId: pi.id,
  }));

  return {
    ...product,
    price: Number(product.price),
    costPrice: Number(product.costPrice),
    category, tags, images,
  };
}

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = [20, 50, 100].includes(Number(req.query.limit)) ? Number(req.query.limit) : 20;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const tagId = req.query.tagId ? Number(req.query.tagId) : undefined;
    const offset = (page - 1) * limit;

    let productIds: number[] | undefined;
    if (tagId) {
      const links = await db.select({ productId: productTagsTable.productId }).from(productTagsTable).where(eq(productTagsTable.tagId, tagId));
      productIds = links.map(l => l.productId);
      if (productIds.length === 0) { res.json({ data: [], total: 0, page, limit }); return; }
    }

    const conditions: any[] = [];
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
    if (productIds) conditions.push(inArray(productsTable.id, productIds));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(productsTable).where(whereClause);
    const rawProducts = await db.select().from(productsTable).where(whereClause).orderBy(productsTable.name).limit(limit).offset(offset);

    const productList = await Promise.all(rawProducts.map(p => getProductWithRelations(p.id)));
    res.json({ data: productList.filter(Boolean), total: count ?? 0, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, price, costPrice, stock, categoryId, tagIds, active } = req.body;
    if (!name || price == null || costPrice == null) { res.status(400).json({ error: "Nome, preço e custo são obrigatórios" }); return; }
    const [product] = await db.insert(productsTable).values({
      name, description, price: String(price), costPrice: String(costPrice),
      stock: stock ?? 0, categoryId: categoryId ?? null, active: active ?? true,
    }).returning();
    if (tagIds?.length > 0) {
      await db.insert(productTagsTable).values(tagIds.map((tid: number) => ({ productId: product.id, tagId: tid })));
    }
    res.status(201).json(await getProductWithRelations(product.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await getProductWithRelations(Number(req.params.id));
    if (!product) { res.status(404).json({ error: "Produto não encontrado" }); return; }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, price, costPrice, stock, categoryId, tagIds, active } = req.body;
    const [product] = await db.update(productsTable).set({
      name, description,
      price: price != null ? String(price) : undefined,
      costPrice: costPrice != null ? String(costPrice) : undefined,
      stock, categoryId: categoryId ?? null, active,
    }).where(eq(productsTable.id, id)).returning();
    if (!product) { res.status(404).json({ error: "Produto não encontrado" }); return; }

    if (tagIds !== undefined) {
      await db.delete(productTagsTable).where(eq(productTagsTable.productId, id));
      if (tagIds.length > 0) {
        await db.insert(productTagsTable).values(tagIds.map((tid: number) => ({ productId: id, tagId: tid })));
      }
    }
    res.json(await getProductWithRelations(id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(productTagsTable).where(eq(productTagsTable.productId, id));
    await db.delete(productImagesTable).where(eq(productImagesTable.productId, id));
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ message: "Produto removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:id/images", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const links = await db
      .select({ pi: productImagesTable, img: imagesTable })
      .from(productImagesTable)
      .innerJoin(imagesTable, eq(productImagesTable.imageId, imagesTable.id))
      .where(and(eq(productImagesTable.productId, id), isNull(imagesTable.deletedAt)))
      .orderBy(asc(productImagesTable.displayOrder));
    res.json(links.map(({ pi, img }) => ({
      id: img.id, name: img.name, type: img.type,
      objectPath: img.objectPath, url: `/api/storage${img.objectPath}`,
      displayOrder: pi.displayOrder, linkId: pi.id,
    })));
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:id/images", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { imageId, displayOrder } = req.body;
    const existing = await db.select().from(productImagesTable)
      .where(and(eq(productImagesTable.productId, productId), eq(productImagesTable.imageId, imageId))).limit(1);
    if (existing.length > 0) { res.status(409).json({ error: "Imagem já vinculada" }); return; }
    const [link] = await db.insert(productImagesTable).values({ productId, imageId, displayOrder: displayOrder ?? 0 }).returning();
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:id/images/reorder", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { order } = req.body as { order: { imageId: number; displayOrder: number }[] };
    await Promise.all(order.map(({ imageId, displayOrder }) =>
      db.update(productImagesTable).set({ displayOrder })
        .where(and(eq(productImagesTable.productId, productId), eq(productImagesTable.imageId, imageId)))
    ));
    res.json({ message: "Ordem atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id/images/:imageId", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    await db.update(imagesTable)
      .set({ deletedAt: new Date() })
      .where(eq(imagesTable.id, imageId));
    await db.delete(productImagesTable).where(
      and(eq(productImagesTable.productId, productId), eq(productImagesTable.imageId, imageId))
    );
    res.json({ message: "Imagem removida" });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
