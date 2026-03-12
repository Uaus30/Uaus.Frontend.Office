import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetTags, 
  useCreateTag, 
  useUpdateTag, 
  useDeleteTag,
  useGetTagReport,
  getGetTagsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, Tags as TagsIcon, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

export default function Tags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "#6366f1" });

  const { data: tags, isLoading } = useGetTags();

  // The hook needs an ID, if null we just pass 0 and disable it using hook config is not possible directly here if the generated hook requires id:number without options wrapper. Actually we can use enabled option.
  const { data: reportData, isLoading: loadingReport } = useGetTagReport(selectedTagId || 0, {
    query: { enabled: !!selectedTagId }
  });

  const { mutate: createTag, isPending: isCreating } = useCreateTag({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTagsQueryKey() });
        toast({ title: "Sucesso", description: "Etiqueta criada." });
        setModalOpen(false);
      }
    }
  });

  const { mutate: updateTag, isPending: isUpdating } = useUpdateTag({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTagsQueryKey() });
        toast({ title: "Sucesso", description: "Etiqueta atualizada." });
        setModalOpen(false);
      }
    }
  });

  const { mutate: deleteTag } = useDeleteTag({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTagsQueryKey() });
        toast({ title: "Removida", description: "Etiqueta removida." });
      }
    }
  });

  const handleOpenModal = (tag?: any) => {
    if (tag) {
      setEditingId(tag.id);
      setFormData({ name: tag.name, color: tag.color });
    } else {
      setEditingId(null);
      setFormData({ name: "", color: "#6366f1" });
    }
    setModalOpen(true);
  };

  const openReport = (id: number) => {
    setSelectedTagId(id);
    setReportModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (editingId) updateTag({ id: editingId, data: formData });
    else createTag({ data: formData });
  };

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4">Etiqueta</th>
                  <th className="px-6 py-4">Qtd Produtos</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={3} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : tags?.map((tag) => (
                  <tr key={tag.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: tag.color }} />
                        <span style={{ color: tag.color }} className="font-semibold">{tag.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{tag.productCount}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-8 hover-elevate border-border/50" onClick={() => openReport(tag.id)}>
                          <BarChart3 className="w-4 h-4 mr-2 text-primary" /> Relatório
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate" onClick={() => handleOpenModal(tag)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate" onClick={() => {
                          if (confirm("Remover esta etiqueta?")) deleteTag({ id: tag.id });
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

      {/* Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? 'Editar Etiqueta' : 'Nova Etiqueta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <div className="flex gap-4 items-center">
                <Input type="color" value={formData.color} onChange={e => setFormData(p => ({...p, color: e.target.value}))} className="w-16 h-12 p-1 bg-background cursor-pointer" />
                <span className="text-sm font-mono text-muted-foreground">{formData.color}</span>
              </div>
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

      {/* Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Relatório da Etiqueta: <span style={{ color: reportData?.tag.color }}>{reportData?.tag.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {loadingReport ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : reportData ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Faturamento Total</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(reportData.totalRevenue)}</p>
                  </div>
                  <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Vendas (Qtd)</p>
                    <p className="text-xl font-bold">{reportData.totalSales}</p>
                  </div>
                  <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Estoque Total</p>
                    <p className="text-xl font-bold">{reportData.totalStock}</p>
                  </div>
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
                      {reportData.products.map(p => (
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
          <DialogFooter>
            <Button onClick={() => setReportModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
