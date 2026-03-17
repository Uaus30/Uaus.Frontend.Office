import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, BarChart3, Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string, params?: Record<string, any>) {
  const url = new URL(`${window.location.origin}${BASE}/api${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
  const r = await fetch(url.toString(), { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiMutate(method: string, path: string, body?: any) {
  const r = await fetch(`${window.location.origin}${BASE}/api${path}`, {
    method, credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

type SortDir = "asc" | "desc";
type SortBy = "name" | "productCount" | "createdAt";

function SortIcon({ col, sortBy, sortDir }: { col: SortBy; sortBy: SortBy; sortDir: SortDir }) {
  if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 inline ml-1 text-primary" />
    : <ArrowDown className="w-3 h-3 inline ml-1 text-primary" />;
}

export default function Tags() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "#6366f1" });

  const params = { search: search || undefined, sortBy, sortDir, page, limit };
  const { data, isLoading } = useQuery({
    queryKey: ["tags", params],
    queryFn: () => apiGet("/tags", params),
  });

  const { data: reportData, isLoading: loadingReport } = useQuery({
    queryKey: ["tag-report", selectedTagId],
    queryFn: () => apiGet(`/tags/${selectedTagId}/report`),
    enabled: !!selectedTagId,
  });

  const createTag = useMutation({
    mutationFn: (d: any) => apiMutate("POST", "/tags", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); toast({ title: "Etiqueta criada." }); setModalOpen(false); },
  });

  const updateTag = useMutation({
    mutationFn: ({ id, d }: any) => apiMutate("PUT", `/tags/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); toast({ title: "Etiqueta atualizada." }); setModalOpen(false); },
  });

  const deleteTag = useMutation({
    mutationFn: (id: number) => apiMutate("DELETE", `/tags/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); toast({ title: "Etiqueta removida." }); },
  });

  const handleOpenModal = (tag?: any) => {
    if (tag) { setEditingId(tag.id); setFormData({ name: tag.name, color: tag.color }); }
    else { setEditingId(null); setFormData({ name: "", color: "#6366f1" }); }
    setModalOpen(true);
  };

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (editingId) updateTag.mutate({ id: editingId, d: formData });
    else createTag.mutate(formData);
  };

  const tags = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const thClass = "px-6 py-4 cursor-pointer hover:text-foreground select-none";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Etiquetas</h1>
            <p className="text-muted-foreground mt-1">Classifique produtos para análises personalizadas.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="hover-elevate">
            <Plus className="w-4 h-4 mr-2" /> Nova Etiqueta
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className={thClass} onClick={() => toggleSort("name")}>
                    Etiqueta <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort("productCount")}>
                    Qtd Produtos <SortIcon col="productCount" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort("createdAt")}>
                    Data Cadastro <SortIcon col="createdAt" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : tags.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Nenhuma etiqueta encontrada.</td></tr>
                ) : tags.map((tag: any) => (
                  <tr key={tag.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: tag.color }} />
                        <span style={{ color: tag.color }} className="font-semibold">{tag.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{tag.productCount}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(tag.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-8 hover-elevate border-border/50" onClick={() => { setSelectedTagId(tag.id); setReportModalOpen(true); }}>
                          <BarChart3 className="w-4 h-4 mr-2 text-primary" /> Relatório
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate" onClick={() => handleOpenModal(tag)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate" onClick={() => { if (confirm("Remover esta etiqueta?")) deleteTag.mutate(tag.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <Select value={String(limit)} onValueChange={v => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-20 bg-background text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-2">Total: {total}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-xs px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? "Editar Etiqueta" : "Nova Etiqueta"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <div className="flex gap-4 items-center">
                <Input type="color" value={formData.color} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))} className="w-16 h-12 p-1 bg-background cursor-pointer" />
                <span className="text-sm font-mono text-muted-foreground">{formData.color}</span>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTag.isPending || updateTag.isPending} className="hover-elevate">
                {(createTag.isPending || updateTag.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Relatório: <span style={{ color: reportData?.tag.color }}>{reportData?.tag.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {loadingReport ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : reportData ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Faturamento Total", val: formatCurrency(reportData.totalRevenue), cls: "text-primary" },
                    { label: "Vendas (Qtd)", val: reportData.totalSales, cls: "" },
                    { label: "Estoque Total", val: reportData.totalStock, cls: "" },
                  ].map(c => (
                    <div key={c.label} className="bg-background/50 border border-border/50 p-4 rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                      <p className={`text-xl font-bold ${c.cls}`}>{c.val}</p>
                    </div>
                  ))}
                </div>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Estoque</th>
                        <th className="px-4 py-3">Vendas</th>
                        <th className="px-4 py-3 text-right">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.products.map((p: any) => (
                        <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3">{p.stock}</td>
                          <td className="px-4 py-3">{p.totalSales}</td>
                          <td className="px-4 py-3 text-right font-medium text-primary">{formatCurrency(p.totalRevenue)}</td>
                        </tr>
                      ))}
                      {reportData.products.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum produto vendido com esta etiqueta.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter><Button onClick={() => setReportModalOpen(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
