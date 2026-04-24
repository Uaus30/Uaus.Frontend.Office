import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { ArrowDownRight, ArrowUpRight, CalendarRange, DollarSign, PackageSearch, ShoppingCart, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import {
  dashboardMockCategoryData,
  dashboardMockChartData,
  dashboardMockMetrics,
  dashboardMockTopProducts,
} from "@/lib/mock-data";

type PeriodPreset = "7d" | "30d" | "90d" | "1y";
type PeriodMode = "preset" | "custom";

export default function Dashboard() {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("preset");
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedCustomStart, setAppliedCustomStart] = useState("");
  const [appliedCustomEnd, setAppliedCustomEnd] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const periodLabel =
    periodMode === "custom" && appliedCustomStart && appliedCustomEnd
      ? `${appliedCustomStart} → ${appliedCustomEnd}`
      : {
          "7d": "Últimos 7 dias",
          "30d": "Últimos 30 dias",
          "90d": "Últimos 90 dias",
          "1y": "Último ano",
        }[period];

  const pieColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  function handleApplyCustom() {
    if (!customStart || !customEnd) return;
    setAppliedCustomStart(customStart);
    setAppliedCustomEnd(customEnd);
    setPeriodMode("custom");
    setPopoverOpen(false);
  }

  function handleSelectPreset(value: string) {
    setPeriod(value as PeriodPreset);
    setPeriodMode("preset");
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Visão Geral</h1>
            <p className="mt-1 text-muted-foreground">Acompanhe os principais indicadores da sua empresa.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodMode === "preset" ? period : ""} onValueChange={handleSelectPreset}>
              <SelectTrigger className="h-10 w-44 bg-card">
                <SelectValue placeholder={periodMode === "custom" ? "Período personalizado" : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant={periodMode === "custom" ? "default" : "outline"} size="sm" className="h-10 gap-2 text-sm">
                  <CalendarRange className="h-4 w-4" />
                  {periodMode === "custom" && appliedCustomStart
                    ? `${appliedCustomStart} → ${appliedCustomEnd}`
                    : "Período personalizado"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 border-border bg-card p-4" align="end">
                <p className="mb-3 text-sm font-semibold">Selecionar período</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Data inicial</Label>
                    <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-9 bg-background text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data final</Label>
                    <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} max={new Date().toISOString().split("T")[0]} className="h-9 bg-background text-sm" />
                  </div>
                  <Button className="h-9 w-full" onClick={handleApplyCustom} disabled={!customStart || !customEnd || customStart > customEnd}>
                    Aplicar período
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="-mt-4 flex items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            Exibindo: {periodLabel}
          </span>
          <MockBadge />
          {periodMode === "custom" && (
            <button onClick={() => setPeriodMode("preset")} className="text-xs text-primary hover:underline">
              Limpar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Faturamento Total" value={formatCurrency(dashboardMockMetrics.totalRevenue)} growth={dashboardMockMetrics.revenueGrowth} icon={DollarSign} />
          <MetricCard title="Total de Vendas" value={dashboardMockMetrics.totalSales.toString()} growth={dashboardMockMetrics.salesGrowth} icon={ShoppingCart} />
          <MetricCard title="Ticket Médio" value={formatCurrency(dashboardMockMetrics.averageTicket)} growth={dashboardMockMetrics.ticketGrowth} icon={TrendingUp} />
          <MetricCard title="Lucro Total" value={formatCurrency(dashboardMockMetrics.totalProfit)} growth={dashboardMockMetrics.profitGrowth} icon={PackageSearch} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="col-span-1 border-border/50 p-6 shadow-lg shadow-black/5 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Faturamento e Lucro</h3>
              <MockBadge />
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardMockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem", color: "hsl(var(--foreground))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" name="Lucro" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-border/50 p-6 shadow-lg shadow-black/5">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Vendas por Categoria</h3>
              <MockBadge />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardMockCategoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="totalRevenue"
                    nameKey="categoryName"
                  >
                    {dashboardMockCategoryData.map((entry, index) => (
                      <Cell key={`${entry.categoryName}-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "0.5rem" }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="border-border/50 p-6 shadow-lg shadow-black/5">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Produtos Mais Vendidos</h3>
            <MockBadge />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="rounded-tl-lg rounded-tr-lg border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Vendas</th>
                  <th className="px-4 py-3">Faturamento</th>
                  <th className="px-4 py-3">Estoque Atual</th>
                </tr>
              </thead>
              <tbody>
                {dashboardMockTopProducts.map((product, index) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={product.id}
                    className="border-b border-border/50 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-4 font-medium">{product.name}</td>
                    <td className="px-4 py-4">{product.totalSales} un</td>
                    <td className="px-4 py-4 font-medium text-primary">{formatCurrency(product.totalRevenue)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.stock < 10 ? "bg-destructive/20 text-destructive" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {product.stock} un
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  growth,
  icon: Icon,
}: {
  title: string;
  value: string;
  growth: number;
  icon: typeof DollarSign;
}) {
  const isPositive = growth >= 0;

  return (
    <Card className="relative overflow-hidden border-border/50 p-6 shadow-lg shadow-black/5 hover-elevate">
      <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-5">
        <Icon className="h-16 w-16" />
      </div>
      <div className="mb-4 flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <h4 className="text-3xl font-display font-bold text-foreground">{value}</h4>
        <div className="mt-2 flex items-center gap-1">
          {isPositive ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
          <span className={`text-sm font-medium ${isPositive ? "text-emerald-500" : "text-destructive"}`}>
            {Math.abs(growth).toFixed(1)}%
          </span>
          <span className="ml-1 text-xs text-muted-foreground">vs período anterior</span>
        </div>
      </div>
    </Card>
  );
}

function MockBadge() {
  return (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
      Dados mockados
    </span>
  );
}
