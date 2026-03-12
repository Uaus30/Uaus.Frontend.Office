import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetSales, 
  useCreateSale, 
  useDeleteSale,
  useGetCustomers,
  useGetProducts,
  getGetSalesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Plus, Trash2, Loader2, Receipt, Search, Eye, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const paymentMethods = [
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "pix", label: "PIX" },
  { value: "transfer", label: "Transferência" },
];

export default function Sales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewSaleId, setViewSaleId] = useState<any>(null);

  const { data: salesPage, isLoading } = useGetSales({ page, limit: 15 });
  const { data: customersPage } = useGetCustomers({ limit: 100 });
  const { data: productsPage } = useGetProducts({ limit: 100 });

  const { mutate: createSale, isPending: isCreating } = useCreateSale({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        toast({ title: "Sucesso", description: "Venda registrada com sucesso." });
        setCreateModalOpen(false);
        resetSaleForm();
      },
      onError: (err: any) => {
        toast({ title: "Erro", description: err.message || "Erro ao registrar venda.", variant: "destructive" });
      }
    }
  });

  const { mutate: deleteSale } = useDeleteSale({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        toast({ title: "Removida", description: "Venda cancelada/removida." });
      }
    }
  });

  // Create Sale Form State
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [items, setItems] = useState<Array<{productId: number, quantity: number, unitPrice: number, product?: any}>>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<any>("pix");
  const [notes, setNotes] = useState("");

  // Select Item temporary state
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [selectedQty, setSelectedQty] = useState<number>(1);

  const resetSaleForm = () => {
    setCustomerId(null);
    setItems([]);
    setDiscount(0);
    setPaymentMethod("pix");
    setNotes("");
    setSelectedProductId("");
    setSelectedQty(1);
  };

  const addItem = () => {
    if (!selectedProductId || selectedQty <= 0) return;
    const prod = productsPage?.data.find(p => p.id === Number(selectedProductId));
    if (!prod) return;
    
    setItems(prev => {
      const existing = prev.find(i => i.productId === prod.id);
      if (existing) {
        return prev.map(i => i.productId === prod.id ? { ...i, quantity: i.quantity + selectedQty } : i);
      }
      return [...prev, { productId: prod.id, quantity: selectedQty, unitPrice: prod.price, product: prod }];
    });
    setSelectedProductId("");
    setSelectedQty(1);
  };

  const removeItem = (pid: number) => {
    setItems(prev => prev.filter(i => i.productId !== pid));
  };

  const subtotal = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
  const total = Math.max(0, subtotal - discount);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast({ title: "Atenção", description: "Adicione pelo menos um item à venda.", variant: "destructive" });
      return;
    }
    createSale({
      data: {
        customerId,
        items: items.map(({productId, quantity, unitPrice}) => ({productId, quantity, unitPrice})),
        discount,
        paymentMethod,
        notes: notes || undefined
      }
    });
  };

  const saleToView = viewSaleId ? salesPage?.data.find(s => s.id === viewSaleId) : null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Vendas</h1>
            <p className="text-muted-foreground mt-1">Histórico e registro de faturamento.</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="hover-elevate bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Nova Venda
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Pagamento</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : salesPage?.data.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-muted-foreground">#{sale.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                    <td className="px-6 py-4 font-medium">{sale.customer?.name || <span className="text-muted-foreground">Consumidor Final</span>}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-normal border-border/50">
                        {paymentMethods.find(p => p.value === sale.paymentMethod)?.label || sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-primary">{formatCurrency(sale.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate" onClick={() => setViewSaleId(sale.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate" onClick={() => {
                          if (confirm("Tem certeza que deseja estornar/cancelar esta venda? O estoque não será revertido automaticamente.")) deleteSale({ id: sale.id });
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
            <span>Mostrando página {salesPage?.page} de {Math.ceil((salesPage?.total || 0) / (salesPage?.limit || 15)) || 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={salesPage && salesPage.data.length < salesPage.limit} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE SALE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={(open) => {
        if (!open) resetSaleForm();
        setCreateModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border/50 flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Registrar Nova Venda
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente (Opcional)</label>
              <Select value={customerId?.toString() || "null"} onValueChange={(val) => setCustomerId(val === "null" ? null : Number(val))}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Consumidor Final" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Consumidor Final</SelectItem>
                  {customersPage?.data.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-border/50 rounded-xl p-4 bg-background/50 space-y-4">
              <h4 className="font-semibold text-sm">Itens da Venda</h4>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Produto</label>
                  <Select value={selectedProductId.toString()} onValueChange={(val) => setSelectedProductId(Number(val))}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
                    <SelectContent>
                      {productsPage?.data.filter(p => p.active && p.stock > 0).map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name} - {formatCurrency(p.price)} (Estoque: {p.stock})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs text-muted-foreground">Qtd</label>
                  <Input type="number" min="1" value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value))} className="bg-background" />
                </div>
                <Button type="button" onClick={addItem} variant="secondary" className="hover-elevate">Adicionar</Button>
              </div>

              {items.length > 0 && (
                <div className="mt-4 border border-border/50 rounded-lg overflow-hidden bg-card">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border/50">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Qtd</th>
                        <th className="px-3 py-2">Unitário</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.productId} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2">{item.product?.name}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeItem(item.productId)} className="text-destructive hover:opacity-70"><X className="w-4 h-4"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Método de Pagamento</label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(pm => <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Desconto (R$)</label>
                <Input type="number" step="0.01" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="bg-background" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} className="bg-background" placeholder="Anotações internas..." />
              </div>
            </div>

          </div>
          <div className="mt-auto border-t border-border/50 pt-4 px-2">
            <div className="flex justify-between items-end mb-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Subtotal: {formatCurrency(subtotal)}</p>
                <p>Desconto: -{formatCurrency(discount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total a Pagar</p>
                <p className="text-3xl font-display font-bold text-primary">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateSubmit} disabled={isCreating || items.length === 0} className="hover-elevate">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />} Finalizar Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW SALE MODAL */}
      <Dialog open={!!viewSaleId} onOpenChange={(open) => !open && setViewSaleId(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Detalhes da Venda #{saleToView?.id.toString().padStart(4, '0')}
            </DialogTitle>
          </DialogHeader>
          {saleToView && (
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Data</p>
                  <p className="font-medium mt-1">{formatDate(saleToView.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Cliente</p>
                  <p className="font-medium mt-1">{saleToView.customer?.name || 'Consumidor Final'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Pagamento</p>
                  <Badge variant="secondary" className="mt-1">{paymentMethods.find(p => p.value === saleToView.paymentMethod)?.label}</Badge>
                </div>
                {saleToView.notes && (
                  <div className="col-span-2 border-l-2 border-primary/50 pl-3 py-1 bg-primary/5 mt-2 rounded-r">
                    <p className="text-xs text-muted-foreground">Observação</p>
                    <p className="italic">{saleToView.notes}</p>
                  </div>
                )}
              </div>

              <div className="border border-border/50 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground text-xs">
                    <tr>
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2 text-center">Qtd</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleToView.items.map(item => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-medium">{item.product?.name || `Produto #${item.productId}`}</td>
                        <td className="px-4 py-3 text-center">{item.quantity} x {formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-background/50 rounded-xl p-4 border border-border/50 flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal Itens</span>
                  <span>{formatCurrency(saleToView.total + saleToView.discount)}</span>
                </div>
                {saleToView.discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Desconto</span>
                    <span>-{formatCurrency(saleToView.discount)}</span>
                  </div>
                )}
                <div className="border-t border-border/50 pt-2 mt-1 flex justify-between font-bold text-lg text-primary">
                  <span>Total</span>
                  <span>{formatCurrency(saleToView.total)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewSaleId(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
