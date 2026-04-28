import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetSales, getGetSalesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Eye, Loader2, Plus, Receipt, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getEnumOptions } from "@/services/core";
import { buildEnrichedSales, buildProductCollections } from "@/services/mappers";
import { getAllProducts, getAllProductGroups, getAllProductTags, getAllProductImages } from "@/services/products.service";
import { getAllCategories, getAllDepartments } from "@/services/categories.service";
import { getAllTags } from "@/services/tags.service";
import { getAllImages } from "@/services/images.service";
import { getAllCustomers } from "@/services/customers.service";
import { getAllSaleItems, createSaleWithItems, deleteSaleWithItems } from "@/services/sales.service";

export default function Sales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewSaleId, setViewSaleId] = useState<number | null>(null);

  const { data: salesPage, isLoading } = useGetSales({ page, limit: 15 });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-all-for-sales"],
    queryFn: () => getAllCustomers(),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-method-options"],
    queryFn: () => getEnumOptions("/Sales/enums/payment-method"),
  });

  const { data: paymentStatuses = [] } = useQuery({
    queryKey: ["payment-status-options"],
    queryFn: () => getEnumOptions("/Sales/enums/payment-status"),
  });

  const { data: enrichedProducts = [] } = useQuery({
    queryKey: ["products-enriched-for-sales"],
    queryFn: async () => {
      const [products, productGroups, categories, departments, tags, productTags, images, productImages] =
        await Promise.all([
          getAllProducts(),
          getAllProductGroups(),
          getAllCategories(),
          getAllDepartments(),
          getAllTags(),
          getAllProductTags(),
          getAllImages(),
          getAllProductImages(),
        ]);

      return buildProductCollections({
        products,
        productGroups,
        categories,
        departments,
        tags,
        productTags,
        images,
        productImages,
      }).enrichedProducts;
    },
  });

  const { data: saleItems = [] } = useQuery({
    queryKey: ["sale-items-all-for-sales"],
    queryFn: () => getAllSaleItems(),
  });

  const paymentMethodById = useMemo(
    () => Object.fromEntries(paymentMethods.map((item) => [item.id, item.name])),
    [paymentMethods],
  );

  const saleDetails = useMemo(() => {
    if (!salesPage) return [];
    return buildEnrichedSales({
      sales: salesPage.data,
      saleItems,
      customers,
      enrichedProducts,
    });
  }, [customers, enrichedProducts, saleItems, salesPage]);

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [items, setItems] = useState<Array<{ productId: number; quantity: number; unitPrice: number }>>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [savingSale, setSavingSale] = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState<number | null>(null);

  const availableProducts = useMemo(
    () => enrichedProducts.filter((product) => product.stock > 0 && product.status !== 4),
    [enrichedProducts],
  );

  function resetSaleForm() {
    setCustomerId(null);
    setItems([]);
    setDiscount(0);
    setPaymentMethod(
      paymentMethods.find((item) => item.allowSelect)?.id.toString() ?? "",
    );
    setPaymentStatus(
      paymentStatuses.find((item) => item.allowSelect)?.id.toString() ?? "",
    );
    setNotes("");
    setSelectedProductId("");
    setSelectedQty(1);
  }

  function addItem() {
    if (!selectedProductId || selectedQty <= 0) return;

    const product = availableProducts.find((item) => item.id === Number(selectedProductId));
    if (!product) return;

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + selectedQty }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          quantity: selectedQty,
          unitPrice: product.price,
        },
      ];
    });

    setSelectedProductId("");
    setSelectedQty(1);
  }

  function removeItem(productId: number) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);
  const saleToView = saleDetails.find((sale) => sale.id === viewSaleId) ?? null;

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (items.length === 0) {
      toast({
        title: "Adicione pelo menos um item à venda.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod || !paymentStatus) {
      toast({
        title: "Selecione o método e o status do pagamento.",
        variant: "destructive",
      });
      return;
    }

    setSavingSale(true);
    try {
      await createSaleWithItems({
        customerId,
        discount,
        paymentMethod: Number(paymentMethod),
        paymentStatus: Number(paymentStatus),
        notes,
        items,
      });

      queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["sale-items-all-for-sales"] });
      queryClient.invalidateQueries({ queryKey: ["customers-all-for-sales"] });
      queryClient.invalidateQueries({ queryKey: ["products-enriched-for-sales"] });

      toast({ title: "Venda registrada com sucesso." });
      setCreateModalOpen(false);
      resetSaleForm();
    } catch (error) {
      toast({
        title: "Erro ao registrar venda",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingSale(false);
    }
  }

  async function handleDeleteSale(saleId: number) {
    setDeletingSaleId(saleId);

    try {
      await deleteSaleWithItems(saleId);
      queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["sale-items-all-for-sales"] });
      toast({ title: "Venda removida." });
    } catch (error) {
      toast({
        title: "Erro ao remover venda",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingSaleId(null);
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Vendas</h1>
            <p className="mt-1 text-muted-foreground">Histórico e registro de faturamento.</p>
          </div>
          <Button
            onClick={() => {
              resetSaleForm();
              setCreateModalOpen(true);
            }}
            className="bg-primary text-primary-foreground hover-elevate"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Venda
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
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
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : saleDetails.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4 font-mono font-medium text-muted-foreground">
                      #{sale.id.toString().padStart(4, "0")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                    <td className="px-6 py-4 font-medium">
                      {sale.customer?.name || <span className="text-muted-foreground">Consumidor Final</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-border/50 font-normal">
                        {paymentMethodById[sale.paymentMethod] ?? sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-primary">{formatCurrency(sale.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate"
                          onClick={() => setViewSaleId(sale.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate"
                          onClick={() => {
                            if (confirm("Remover esta venda e seus itens?")) {
                              void handleDeleteSale(sale.id);
                            }
                          }}
                        >
                          {deletingSaleId === sale.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 p-4 text-sm text-muted-foreground">
            <span>
              Mostrando página {salesPage?.page} de{" "}
              {Math.ceil((salesPage?.total || 0) / (salesPage?.limit || 15)) || 1}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={salesPage ? salesPage.data.length < salesPage.limit : true}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={createModalOpen}
        onOpenChange={(open) => {
          if (!open) resetSaleForm();
          setCreateModalOpen(open);
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col border-border/50 bg-card sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display">
              <Receipt className="h-5 w-5 text-primary" /> Registrar Nova Venda
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-6 overflow-y-auto py-4 pr-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente (Opcional)</label>
              <Select
                value={customerId?.toString() || "null"}
                onValueChange={(value) => setCustomerId(value === "null" ? null : Number(value))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Consumidor Final" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Consumidor Final</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 rounded-xl border border-border/50 bg-background/50 p-4">
              <h4 className="text-sm font-semibold">Itens da Venda</h4>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Produto</label>
                  <Select
                    value={selectedProductId.toString()}
                    onValueChange={(value) => setSelectedProductId(Number(value))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione um produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} - {formatCurrency(product.price)} (Estoque: {product.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs text-muted-foreground">Qtd</label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedQty}
                    onChange={(event) => setSelectedQty(Number(event.target.value))}
                    className="bg-background"
                  />
                </div>
                <Button type="button" onClick={addItem} variant="secondary" className="hover-elevate">
                  Adicionar
                </Button>
              </div>

              {items.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-lg border border-border/50 bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border/50 bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Qtd</th>
                        <th className="px-3 py-2">Unitário</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="w-10 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const product = availableProducts.find((entry) => entry.id === item.productId);
                        return (
                          <tr key={item.productId} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-2">{product?.name || `Produto #${item.productId}`}</td>
                            <td className="px-3 py-2">{item.quantity}</td>
                            <td className="px-3 py-2">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.productId)}
                                className="text-destructive hover:opacity-70"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Método de Pagamento</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods
                      .filter((option) => option.allowSelect)
                      .map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status do Pagamento</label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatuses
                      .filter((option) => option.allowSelect)
                      .map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Desconto (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value))}
                  className="bg-background"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="bg-background"
                  placeholder="Anotações internas..."
                />
              </div>
            </div>
          </div>
          <div className="mt-auto border-t border-border/50 px-2 pt-4">
            <div className="mb-4 flex items-end justify-between">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Subtotal: {formatCurrency(subtotal)}</p>
                <p>Desconto: -{formatCurrency(discount)}</p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total a Pagar</p>
                <p className="text-3xl font-display font-bold text-primary">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSubmit} disabled={savingSale || items.length === 0} className="hover-elevate">
                {savingSale ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="mr-2 h-4 w-4" />
                )}
                Finalizar Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewSaleId} onOpenChange={(open) => !open && setViewSaleId(null)}>
        <DialogContent className="border-border/50 bg-card sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display">
              <Receipt className="h-5 w-5 text-primary" /> Detalhes da Venda #{saleToView?.id.toString().padStart(4, "0")}
            </DialogTitle>
          </DialogHeader>
          {saleToView && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Data</p>
                  <p className="mt-1 font-medium">{formatDate(saleToView.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Cliente</p>
                  <p className="mt-1 font-medium">{saleToView.customer?.name || "Consumidor Final"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Pagamento</p>
                  <Badge variant="secondary" className="mt-1">
                    {paymentMethodById[saleToView.paymentMethod] ?? saleToView.paymentMethod}
                  </Badge>
                </div>
                {saleToView.notes && (
                  <div className="col-span-2 mt-2 rounded-r border-l-2 border-primary/50 bg-primary/5 py-1 pl-3">
                    <p className="text-xs text-muted-foreground">Observação</p>
                    <p className="italic">{saleToView.notes}</p>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2 text-center">Qtd</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleToView.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-medium">{item.product?.name || `Produto #${item.productId}`}</td>
                        <td className="px-4 py-3 text-center">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/50 p-4 text-sm">
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
                <div className="mt-1 flex justify-between border-t border-border/50 pt-2 text-lg font-bold text-primary">
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
