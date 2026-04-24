import type {
  CategoryReport,
  DashboardCategorySlice,
  DashboardChartPoint,
  DashboardMetrics,
  TagReport,
  TopProduct,
} from "@/lib/backend";

export const dashboardMockMetrics: DashboardMetrics = {
  totalRevenue: 12840.5,
  revenueGrowth: 12.4,
  totalSales: 287,
  salesGrowth: 8.1,
  averageTicket: 44.74,
  ticketGrowth: 3.9,
  totalProfit: 4217.3,
  profitGrowth: 10.6,
};

export const dashboardMockChartData: DashboardChartPoint[] = [
  { date: "01/04", revenue: 820, profit: 260 },
  { date: "05/04", revenue: 1140, profit: 380 },
  { date: "09/04", revenue: 980, profit: 320 },
  { date: "13/04", revenue: 1320, profit: 450 },
  { date: "17/04", revenue: 1210, profit: 390 },
  { date: "21/04", revenue: 1490, profit: 510 },
];

export const dashboardMockCategoryData: DashboardCategorySlice[] = [
  { categoryName: "Brinquedos", totalRevenue: 4820 },
  { categoryName: "Utilidades", totalRevenue: 3510 },
  { categoryName: "Papelaria", totalRevenue: 2260 },
  { categoryName: "Cozinha", totalRevenue: 1340 },
  { categoryName: "Presentes", totalRevenue: 910 },
];

export const dashboardMockTopProducts: TopProduct[] = [
  { id: 1, name: "Copo térmico infantil", stock: 14, totalSales: 39, totalRevenue: 1169.61 },
  { id: 2, name: "Carrinho mini aventura", stock: 9, totalSales: 31, totalRevenue: 927.69 },
  { id: 3, name: "Kit colorir diversão", stock: 22, totalSales: 28, totalRevenue: 559.72 },
  { id: 4, name: "Boneca fashion pocket", stock: 11, totalSales: 24, totalRevenue: 719.76 },
  { id: 5, name: "Organizador multiuso", stock: 18, totalSales: 19, totalRevenue: 568.81 },
];

export function buildMockCategoryReport(categoryName: string): CategoryReport {
  return {
    category: {
      id: 0,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      departmentId: 0,
      name: categoryName,
      description: "Dados demonstrativos para pré-carregamento",
    },
    totalRevenue: 3240.9,
    totalSales: 87,
    totalStock: 142,
    products: [
      { id: 1, name: `${categoryName} Destaque`, price: 24.9, stock: 38, totalSales: 29, totalRevenue: 722.1 },
      { id: 2, name: `${categoryName} Premium`, price: 29.9, stock: 21, totalSales: 22, totalRevenue: 657.8 },
      { id: 3, name: `${categoryName} Econômico`, price: 14.9, stock: 47, totalSales: 19, totalRevenue: 283.1 },
      { id: 4, name: `${categoryName} Novidade`, price: 19.9, stock: 36, totalSales: 17, totalRevenue: 338.3 },
    ],
  };
}

export function buildMockTagReport(tagName: string, color: string): TagReport {
  return {
    tag: {
      id: 0,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      name: tagName,
      color,
    },
    totalRevenue: 1875.4,
    totalSales: 54,
    totalStock: 96,
    products: [
      { id: 1, name: `${tagName} Produto A`, stock: 28, totalSales: 18, totalRevenue: 538.2 },
      { id: 2, name: `${tagName} Produto B`, stock: 19, totalSales: 14, totalRevenue: 418.6 },
      { id: 3, name: `${tagName} Produto C`, stock: 31, totalSales: 12, totalRevenue: 357.6 },
      { id: 4, name: `${tagName} Produto D`, stock: 18, totalSales: 10, totalRevenue: 561.0 },
    ],
  };
}
