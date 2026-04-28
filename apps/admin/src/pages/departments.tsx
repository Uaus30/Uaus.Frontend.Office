import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, Edit2, FolderTree, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createDepartment,
  deleteDepartment,
  getAllCategories,
  getDepartmentsPage,
  updateDepartment,
} from "@/services/categories.service";

export default function Departments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: departmentsPage, isLoading } = useQuery({
    queryKey: ["departments-page", { search, page }],
    queryFn: () =>
      getDepartmentsPage({
        search,
        page,
        limit: 20,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all-for-departments"],
    queryFn: () => getAllCategories(),
  });

  const departmentsWithStats = useMemo(() => {
    return (departmentsPage?.data ?? []).map((department) => ({
      ...department,
      categoriesCount: categories.filter((category) => category.departmentId === department.id).length,
    }));
  }, [categories, departmentsPage?.data]);

  function openModal(department?: any) {
    if (department) {
      setEditingId(department.id);
      setFormData({
        name: department.name,
        description: department.description || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
      });
    }

    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };

      if (editingId) {
        await updateDepartment({ id: editingId, ...payload });
        toast({ title: "Departamento atualizado." });
      } else {
        await createDepartment(payload);
        toast({ title: "Departamento criado." });
      }

      queryClient.invalidateQueries({ queryKey: ["departments-page"] });
      queryClient.invalidateQueries({ queryKey: ["departments-all-for-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-all-for-departments"] });
      setModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar departamento",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(departmentId: number) {
    try {
      await deleteDepartment(departmentId);
      queryClient.invalidateQueries({ queryKey: ["departments-page"] });
      queryClient.invalidateQueries({ queryKey: ["departments-all-for-categories"] });
      toast({ title: "Departamento removido." });
    } catch (error) {
      toast({
        title: "Erro ao remover departamento",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Departamentos</h1>
            <p className="mt-1 text-muted-foreground">Organize a estrutura principal para agrupar categorias.</p>
          </div>
          <Button onClick={() => openModal()} className="hover-elevate">
            <Plus className="mr-2 h-4 w-4" /> Novo Departamento
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg shadow-black/5">
          <div className="border-b border-border/50 p-4">
            <Input
              placeholder="Buscar departamento..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="bg-background sm:max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Qtd Categorias</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : departmentsWithStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                      Nenhum departamento cadastrado.
                    </td>
                  </tr>
                ) : (
                  departmentsWithStats.map((department) => (
                    <tr key={department.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          {department.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{department.description || "-"}</td>
                      <td className="px-6 py-4 font-medium">
                        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
                          <FolderTree className="h-3.5 w-3.5" />
                          {department.categoriesCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate"
                            onClick={() => openModal(department)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate"
                            onClick={() => {
                              if (confirm("Remover este departamento?")) {
                                void handleDelete(department.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 p-4 text-sm text-muted-foreground">
            <span>
              Mostrando página {departmentsPage?.page || 1} de{" "}
              {Math.ceil((departmentsPage?.total || 0) / (departmentsPage?.limit || 20)) || 1}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={departmentsPage ? departmentsPage.data.length < departmentsPage.limit : true}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {editingId ? "Editar Departamento" : "Novo Departamento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                required
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                className="bg-background"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="hover-elevate">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
