import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetCustomersQueryKey,
  useCreateCustomer,
  useDeleteCustomer,
  useGetCustomers,
  useUpdateCustomer,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Loader2, Plus, Search, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import { buildCustomerStats } from "@/services/mappers";
import { getAllSales } from "@/services/sales.service";

export default function Customers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
    address: "",
  });

  const { data: customersPage, isLoading } = useGetCustomers({ search, page, limit: 15 });

  const { data: allSales = [] } = useQuery({
    queryKey: ["sales-all-for-customers"],
    queryFn: () => getAllSales(),
  });

  const statsByCustomerId = useMemo(() => buildCustomerStats(allSales), [allSales]);

  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        toast({ title: "Sucesso", description: "Cliente cadastrado." });
        setModalOpen(false);
      },
      onError: (error) =>
        toast({
          title: "Erro ao cadastrar cliente",
          description: error.message,
          variant: "destructive",
        }),
    },
  });

  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        toast({ title: "Sucesso", description: "Dados atualizados." });
        setModalOpen(false);
      },
      onError: (error) =>
        toast({
          title: "Erro ao atualizar cliente",
          description: error.message,
          variant: "destructive",
        }),
    },
  });

  const { mutate: deleteCustomer } = useDeleteCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        toast({ title: "Removido", description: "Cliente removido." });
      },
      onError: (error) =>
        toast({
          title: "Erro ao remover cliente",
          description: error.message,
          variant: "destructive",
        }),
    },
  });

  function handleOpenModal(customer?: any) {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        document: customer.document || "",
        address: customer.address || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", email: "", phone: "", document: "", address: "" });
    }

    setModalOpen(true);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      document: formData.document.trim() || null,
      address: formData.address.trim() || null,
    };

    if (editingId) {
      updateCustomer({ id: editingId, data: payload });
      return;
    }

    createCustomer({ data: payload });
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
            <p className="mt-1 text-muted-foreground">Gerencie sua base de clientes e histórico.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground hover-elevate">
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg shadow-black/5">
          <div className="flex flex-col gap-4 border-b border-border/50 p-4 sm:flex-row">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-background pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Total Gasto</th>
                  <th className="px-6 py-4">Desde</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : customersPage?.data.map((customer) => {
                  const stats = statsByCustomerId.get(customer.id) ?? {
                    totalPurchases: 0,
                    purchaseCount: 0,
                  };

                  return (
                    <tr key={customer.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">
                            {customer.name.substring(0, 2)}
                          </div>
                          {customer.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{customer.email || "-"}</span>
                          <span className="text-xs">{customer.phone || ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{customer.document || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">{formatCurrency(stats.totalPurchases)}</span>
                          <span className="text-xs text-muted-foreground">{stats.purchaseCount} compra(s)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatShortDate(customer.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate"
                            onClick={() => handleOpenModal(customer)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate"
                            onClick={() => {
                              if (confirm("Remover este cliente?")) deleteCustomer({ id: customer.id });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 p-4 text-sm text-muted-foreground">
            <span>
              Mostrando página {customersPage?.page} de{" "}
              {Math.ceil((customersPage?.total || 0) / (customersPage?.limit || 15)) || 1}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={customersPage ? customersPage.data.length < customersPage.limit : true}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display">
              <Users className="h-5 w-5 text-primary" /> {editingId ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <Input
                required
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF / CNPJ</label>
              <Input
                value={formData.document}
                onChange={(event) => setFormData((current) => ({ ...current, document: event.target.value }))}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço</label>
              <Input
                value={formData.address}
                onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
                className="bg-background"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="hover-elevate">
                {isCreating || isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
