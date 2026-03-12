import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetCustomers, 
  useCreateCustomer, 
  useUpdateCustomer, 
  useDeleteCustomer,
  getGetCustomersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatShortDate } from "@/lib/formatters";

export default function Customers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: "", email: "", phone: "", document: "", address: "" 
  });

  const { data: customersPage, isLoading } = useGetCustomers({ search, page, limit: 15 });

  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        toast({ title: "Sucesso", description: "Cliente cadastrado." });
        setModalOpen(false);
      }
    }
  });

  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        toast({ title: "Sucesso", description: "Dados atualizados." });
        setModalOpen(false);
      }
    }
  });

  const { mutate: deleteCustomer } = useDeleteCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        toast({ title: "Removido", description: "Cliente removido." });
      }
    }
  });

  const handleOpenModal = (customer?: any) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({ 
        name: customer.name, 
        email: customer.email || "", 
        phone: customer.phone || "", 
        document: customer.document || "", 
        address: customer.address || "" 
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", email: "", phone: "", document: "", address: "" });
    }
    setModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (editingId) updateCustomer({ id: editingId, data: formData });
    else createCustomer({ data: formData });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-1">Gerencie sua base de clientes e histórico.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="hover-elevate bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
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
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : customersPage?.data.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {customer.name.substring(0,2)}
                        </div>
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{customer.email || '-'}</span>
                        <span className="text-xs">{customer.phone || ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.document || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{formatCurrency(customer.totalPurchases)}</span>
                        <span className="text-xs text-muted-foreground">{customer.purchaseCount} compra(s)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatShortDate(customer.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate" onClick={() => handleOpenModal(customer)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate" onClick={() => {
                          if (confirm("Remover este cliente?")) deleteCustomer({ id: customer.id });
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
          
          <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando página {customersPage?.page} de {Math.ceil((customersPage?.total || 0) / (customersPage?.limit || 15)) || 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={customersPage && customersPage.data.length < customersPage.limit} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> {editingId ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="bg-background" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF / CNPJ</label>
              <Input value={formData.document} onChange={e => setFormData(p => ({...p, document: e.target.value}))} className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço</label>
              <Input value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} className="bg-background" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="hover-elevate">
                {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
