import { useState } from "react";
import { useGetDashboardMetrics, useGetSalesChart, useGetTopProducts, useGetSalesByCategory } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { DollarSign, ShoppingCart, TrendingUp, PackageSearch, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const { data: metrics, isLoading: loadingMetrics } = useGetDashboardMetrics({ period });
  const { data: chartData, isLoading: loadingChart } = useGetSalesChart({ period });
  const { data: topProducts, isLoading: loadingTopProducts } = useGetTopProducts();
  const { data: categoryData, isLoading: loadingCategories } = useGetSalesByCategory();

  const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Visão Geral</h1>
            <p className="text-muted-foreground mt-1">Acompanhe os principais indicadores da sua empresa.</p>
          </div>
          <div className="w-48">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="h-10 bg-card">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Faturamento Total" 
            value={metrics?.totalRevenue ? formatCurrency(metrics.totalRevenue) : "R$ 0,00"} 
            growth={metrics?.revenueGrowth || 0} 
            icon={DollarSign}
            loading={loadingMetrics}
          />
          <MetricCard 
            title="Total de Vendas" 
            value={metrics?.totalSales?.toString() || "0"} 
            growth={metrics?.salesGrowth || 0} 
            icon={ShoppingCart}
            loading={loadingMetrics}
          />
          <MetricCard 
            title="Ticket Médio" 
            value={metrics?.averageTicket ? formatCurrency(metrics.averageTicket) : "R$ 0,00"} 
            growth={metrics?.ticketGrowth || 0} 
            icon={TrendingUp}
            loading={loadingMetrics}
          />
          <MetricCard 
            title="Lucro Total" 
            value={metrics?.totalProfit ? formatCurrency(metrics.totalProfit) : "R$ 0,00"} 
            growth={metrics?.profitGrowth || 0} 
            icon={PackageSearch}
            loading={loadingMetrics}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN CHART */}
          <Card className="p-6 col-span-1 lg:col-span-2 shadow-lg shadow-black/5 border-border/50">
            <h3 className="text-lg font-bold mb-6">Faturamento e Lucro</h3>
            <div className="h-[350px] w-full">
              {loadingChart ? (
                <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="profit" name="Lucro" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* PIE CHART */}
          <Card className="p-6 shadow-lg shadow-black/5 border-border/50">
            <h3 className="text-lg font-bold mb-6">Vendas por Categoria</h3>
            <div className="h-[300px] w-full">
              {loadingCategories ? (
                <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData || []}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="totalRevenue"
                      nameKey="categoryName"
                    >
                      {(categoryData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* TOP PRODUCTS */}
        <Card className="p-6 shadow-lg shadow-black/5 border-border/50">
          <h3 className="text-lg font-bold mb-6">Produtos Mais Vendidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Produto</th>
                  <th className="px-4 py-3">Vendas</th>
                  <th className="px-4 py-3">Faturamento</th>
                  <th className="px-4 py-3 rounded-tr-lg">Estoque Atual</th>
                </tr>
              </thead>
              <tbody>
                {loadingTopProducts ? (
                  <tr><td colSpan={4} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                ) : topProducts?.map((product, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={product.id} 
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-4 font-medium">{product.name}</td>
                    <td className="px-4 py-4">{product.totalSales} un</td>
                    <td className="px-4 py-4 text-primary font-medium">{formatCurrency(product.totalRevenue)}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.stock < 10 ? 'bg-destructive/20 text-destructive' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {product.stock} un
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {!loadingTopProducts && (!topProducts || topProducts.length === 0) && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum dado disponível.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function MetricCard({ title, value, growth, icon: Icon, loading }: any) {
  const isPositive = growth >= 0;
  
  return (
    <Card className="p-6 relative overflow-hidden shadow-lg shadow-black/5 border-border/50 hover-elevate">
      <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
        <Icon className="w-16 h-16" />
      </div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {loading ? (
        <div className="h-10 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div>
          <h4 className="text-3xl font-display font-bold text-foreground">{value}</h4>
          <div className="flex items-center gap-1 mt-2">
            {isPositive ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
            <span className={`text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
              {Math.abs(growth)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">vs mês anterior</span>
          </div>
        </div>
      )}
    </Card>
  );
}
