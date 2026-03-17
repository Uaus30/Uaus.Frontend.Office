import { useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  useGetCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  getGetCategoriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, Folder, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string) {
  const r = await fetch(`${window.location.origin}${BASE}/api${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function Categories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  const { data: categories, isLoading } = useGetCategories();

  const { data: reportData, isLoading: loadingReport } = useQuery({
    queryKey: ["category-report", selectedCatId],
    queryFn: () => apiGet(`/categories/${selectedCatId}/report`),
    enabled: !!selectedCatId,
  });

  const { mutate: createCategory, isPending: isCreating } = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
        toast({ title: "Categoria criada." });
        setModalOpen(false);
      }
    }
  });

  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
        toast({ title: "Categoria atualizada." });
        setModalOpen(false);
      }
    }
  });

  const { mutate: deleteCategory } = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
        toast({ title: "Categoria removida." });
      }
    }
  });

  const handleOpenModal = (cat?: any) => {
    if (cat) {
      setEditingId(cat.id);
      setFormData({ name: cat.name, description: cat.description || "" });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "" });
    }
    setModalOpen(true);
  };

  const handleOpenReport = (catId: number) => {
    setSelectedCatId(catId);
    setReportOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (editingId) updateCategory({ id: editingId, data: formData });
    else createCategory({ data: formData });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Categorias</h1>
            <p className="text-muted-foreground mt-1">Organize seus produtos.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="hover-elevate">
            <Plus className="w-4 h-4 mr-2" /> Nova Categoria
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Qtd Produtos</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : !categories?.length ? (
                  <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Nenhuma categoria cadastrada.</td></tr>
                ) : categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                        {cat.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{cat.description || '-'}</td>
                    <td className="px-6 py-4 font-medium">{cat.productCount}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 hover-elevate border-border/50"
                          onClick={() => handleOpenReport(cat.id)}
                        >
                          <BarChart3 className="w-4 h-4 mr-2 text-primary" /> Relatório
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate" onClick={() => handleOpenModal(cat)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate" onClick={() => {
                          if (confirm("Remover esta categoria?")) deleteCategory({ id: cat.id });
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de cadastro/edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="bg-background" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="hover-elevate">
                {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de relatório */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Relatório: {reportData?.category?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {loadingReport ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : reportData ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Faturamento Total", val: formatCurrency(reportData.totalRevenue), cls: "text-primary" },
                    { label: "Vendas (Qtd)", val: reportData.totalSales, cls: "" },
                    { label: "Estoque Total", val: `${reportData.totalStock} un`, cls: "" },
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
                        <th className="px-4 py-3">Preço</th>
                        <th className="px-4 py-3">Estoque</th>
                        <th className="px-4 py-3">Vendas</th>
                        <th className="px-4 py-3 text-right">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.products.map((p: any) => (
                        <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatCurrency(p.price)}</td>
                          <td className="px-4 py-3">{p.stock} un</td>
                          <td className="px-4 py-3">{p.totalSales}</td>
                          <td className="px-4 py-3 text-right font-medium text-primary">{formatCurrency(p.totalRevenue)}</td>
                        </tr>
                      ))}
                      {reportData.products.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-muted-foreground">
                            Nenhum produto cadastrado nesta categoria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button onClick={() => setReportOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
