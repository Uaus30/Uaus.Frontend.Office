import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, productsTable, customersTable, categoriesTable } from "@workspace/db/schema";
import { sql, gte, and } from "drizzle-orm";

const router: IRouter = Router();

function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y": return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function getPrevPeriodDate(period: string, fromDate: Date): Date {
  const duration = new Date().getTime() - fromDate.getTime();
  return new Date(fromDate.getTime() - duration);
}

router.get("/metrics", async (req, res) => {
  try {
    const period = (req.query.period as string) || "30d";
    const fromDate = getPeriodDate(period);
    const prevFromDate = getPrevPeriodDate(period, fromDate);

    const [current] = await db.select({
      totalRevenue: sql<number>`coalesce(sum(${salesTable.total}), 0)`.mapWith(Number),
      totalSales: sql<number>`count(*)`.mapWith(Number),
    }).from(salesTable).where(gte(salesTable.createdAt, fromDate));

    const [previous] = await db.select({
      totalRevenue: sql<number>`coalesce(sum(${salesTable.total}), 0)`.mapWith(Number),
      totalSales: sql<number>`count(*)`.mapWith(Number),
    }).from(salesTable).where(and(gte(salesTable.createdAt, prevFromDate), sql`${salesTable.createdAt} < ${fromDate}`));

    const [profitData] = await db.select({
      totalRevenue: sql<number>`coalesce(sum(${saleItemsTable.subtotal}), 0)`.mapWith(Number),
      totalCost: sql<number>`coalesce(sum(${saleItemsTable.quantity} * ${productsTable.costPrice}::numeric), 0)`.mapWith(Number),
    }).from(saleItemsTable)
      .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
      .leftJoin(salesTable, sql`${saleItemsTable.saleId} = ${salesTable.id}`)
      .where(gte(salesTable.createdAt, fromDate));

    const [prevProfitData] = await db.select({
      totalCost: sql<number>`coalesce(sum(${saleItemsTable.quantity} * ${productsTable.costPrice}::numeric), 0)`.mapWith(Number),
    }).from(saleItemsTable)
      .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
      .leftJoin(salesTable, sql`${saleItemsTable.saleId} = ${salesTable.id}`)
      .where(and(gte(salesTable.createdAt, prevFromDate), sql`${salesTable.createdAt} < ${fromDate}`));

    const [{ totalProducts }] = await db.select({ totalProducts: sql<number>`count(*)`.mapWith(Number) }).from(productsTable);
    const [{ activeCustomers }] = await db.select({ activeCustomers: sql<number>`count(distinct ${salesTable.customerId})`.mapWith(Number) }).from(salesTable).where(gte(salesTable.createdAt, fromDate));
    const [{ lowStockProducts }] = await db.select({ lowStockProducts: sql<number>`count(*)`.mapWith(Number) }).from(productsTable).where(sql`${productsTable.stock} < 5`);

    const totalRevenue = current?.totalRevenue ?? 0;
    const totalSales = current?.totalSales ?? 0;
    const prevRevenue = previous?.totalRevenue ?? 0;
    const prevSales = previous?.totalSales ?? 0;
    const totalProfit = (profitData?.totalRevenue ?? 0) - (profitData?.totalCost ?? 0);
    const prevProfit = prevRevenue - (prevProfitData?.totalCost ?? 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const prevAvgTicket = prevSales > 0 ? prevRevenue / prevSales : 0;

    const growth = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;

    res.json({
      totalRevenue,
      revenueGrowth: growth(totalRevenue, prevRevenue),
      totalSales,
      salesGrowth: growth(totalSales, prevSales),
      averageTicket,
      ticketGrowth: growth(averageTicket, prevAvgTicket),
      totalProfit,
      profitGrowth: growth(totalProfit, prevProfit),
      totalProducts: totalProducts ?? 0,
      activeCustomers: activeCustomers ?? 0,
      lowStockProducts: lowStockProducts ?? 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/sales-chart", async (req, res) => {
  try {
    const period = (req.query.period as string) || "30d";
    const fromDate = getPeriodDate(period);

    const rows = await db.select({
      date: sql<string>`date_trunc('day', ${salesTable.createdAt})::date`.mapWith(String),
      revenue: sql<number>`coalesce(sum(${salesTable.total}), 0)`.mapWith(Number),
      sales: sql<number>`count(*)`.mapWith(Number),
    }).from(salesTable)
      .where(gte(salesTable.createdAt, fromDate))
      .groupBy(sql`date_trunc('day', ${salesTable.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${salesTable.createdAt})::date`);

    const profitRows = await db.select({
      date: sql<string>`date_trunc('day', ${salesTable.createdAt})::date`.mapWith(String),
      totalCost: sql<number>`coalesce(sum(${saleItemsTable.quantity} * ${productsTable.costPrice}::numeric), 0)`.mapWith(Number),
      totalRevenue: sql<number>`coalesce(sum(${saleItemsTable.subtotal}), 0)`.mapWith(Number),
    }).from(saleItemsTable)
      .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
      .leftJoin(salesTable, sql`${saleItemsTable.saleId} = ${salesTable.id}`)
      .where(gte(salesTable.createdAt, fromDate))
      .groupBy(sql`date_trunc('day', ${salesTable.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${salesTable.createdAt})::date`);

    const profitMap = new Map(profitRows.map(p => [p.date, p.totalRevenue - p.totalCost]));

    res.json(rows.map(r => ({
      date: r.date,
      revenue: r.revenue,
      sales: r.sales,
      profit: profitMap.get(r.date) ?? 0,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/top-products", async (req, res) => {
  try {
    const rows = await db.select({
      productId: saleItemsTable.productId,
      totalSales: sql<number>`sum(${saleItemsTable.quantity})`.mapWith(Number),
      totalRevenue: sql<number>`sum(${saleItemsTable.subtotal})`.mapWith(Number),
    }).from(saleItemsTable)
      .groupBy(saleItemsTable.productId)
      .orderBy(sql`sum(${saleItemsTable.subtotal}) desc`)
      .limit(10);

    const result = await Promise.all(rows.map(async r => {
      const [product] = await db.select().from(productsTable).where(sql`${productsTable.id} = ${r.productId}`).limit(1);
      return {
        id: r.productId,
        name: product?.name ?? "Produto removido",
        totalSales: r.totalSales,
        totalRevenue: r.totalRevenue,
        stock: product?.stock ?? 0,
      };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/sales-by-category", async (req, res) => {
  try {
    const rows = await db.select({
      categoryId: productsTable.categoryId,
      totalRevenue: sql<number>`coalesce(sum(${saleItemsTable.subtotal}), 0)`.mapWith(Number),
    }).from(saleItemsTable)
      .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
      .groupBy(productsTable.categoryId);

    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);

    const result = await Promise.all(rows.map(async r => {
      let categoryName = "Sem categoria";
      if (r.categoryId) {
        const [cat] = await db.select().from(categoriesTable).where(sql`${categoriesTable.id} = ${r.categoryId}`).limit(1);
        categoryName = cat?.name ?? "Sem categoria";
      }
      return {
        categoryId: r.categoryId,
        categoryName,
        totalRevenue: r.totalRevenue,
        percentage: totalRevenue > 0 ? (r.totalRevenue / totalRevenue) * 100 : 0,
      };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
