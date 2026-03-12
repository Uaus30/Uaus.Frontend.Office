import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  useGetCategories,
  useGetTags,
  getGetProductsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Search, Edit2, Trash2, Loader2, Tag as TagIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preço deve ser positivo"),
  costPrice: z.coerce.number().min(0, "Custo deve ser positivo"),
  stock: z.coerce.number().int().min(0, "Estoque não pode ser negativo"),
  categoryId: z.coerce.number().nullable().optional(),
  tagIds: z.array(z.number()).default([]),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function Products() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: productsData, isLoading } = useGetProducts({ search, page, limit: 15 });
  const { data: categories } = useGetCategories();
  const { data: tags } = useGetTags();

  const { mutate: createProduct, isPending: isCreating } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        toast({ title: "Sucesso", description: "Produto criado com sucesso." });
        handleCloseModal();
      }
    }
  });

  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        toast({ title: "Sucesso", description: "Produto atualizado com sucesso." });
        handleCloseModal();
      }
    }
  });

  const { mutate: deleteProduct } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        toast({ title: "Removido", description: "Produto removido com sucesso." });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", price: 0, costPrice: 0, stock: 0, tagIds: [], active: true, categoryId: null }
  });

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingId(product.id);
      form.reset({
        name: product.name,
        description: product.description || "",
        price: product.price,
        costPrice: product.costPrice,
        stock: product.stock,
        categoryId: product.categoryId,
        tagIds: product.tags.map((t: any) => t.id),
        active: product.active
      });
    } else {
      setEditingId(null);
      form.reset({ name: "", description: "", price: 0, costPrice: 0, stock: 0, tagIds: [], active: true, categoryId: null });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    form.reset();
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      updateProduct({ id: editingId, data });
    } else {
      createProduct({ data });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground mt-1">Gerencie seu catálogo de produtos e estoque.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="hover-elevate bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar produtos..." 
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
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4">Estoque</th>
                  <th className="px-6 py-4">Etiquetas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : productsData?.data.map((product) => (
                  <tr key={product.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.category?.name || '-'}</td>
                    <td className="px-6 py-4 font-medium text-primary">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${product.stock < 10 ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>
                        {product.stock} un
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.tags.map(tag => (
                          <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium border" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.active ? (
                        <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 no-default-active-elevate border-0">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate" onClick={() => handleOpenModal(product)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate" onClick={() => {
                          if (confirm("Tem certeza que deseja remover este produto?")) deleteProduct({ id: product.id });
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
            <span>Mostrando página {productsData?.page} de {Math.ceil((productsData?.total || 0) / (productsData?.limit || 15)) || 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={productsData && productsData.data.length < productsData.limit} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Nome do Produto</label>
                <Input {...form.register("name")} className="bg-background" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input {...form.register("description")} className="bg-background" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Preço de Venda (R$)</label>
                <Input type="number" step="0.01" {...form.register("price")} className="bg-background" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Preço de Custo (R$)</label>
                <Input type="number" step="0.01" {...form.register("costPrice")} className="bg-background" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estoque Inicial</label>
                <Input type="number" {...form.register("stock")} className="bg-background" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value?.toString() || ""} onValueChange={(val) => field.onChange(val === "null" ? null : Number(val))}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Nenhuma</SelectItem>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><TagIcon className="w-4 h-4"/> Etiquetas</label>
                <div className="flex flex-wrap gap-2 p-3 border border-border/50 rounded-xl bg-background/50">
                  <Controller
                    control={form.control}
                    name="tagIds"
                    render={({ field }) => (
                      <>
                        {tags?.map(tag => (
                          <label key={tag.id} className="flex items-center gap-2 cursor-pointer p-1.5 pr-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                            <Checkbox 
                              checked={field.value.includes(tag.id)} 
                              onCheckedChange={(checked) => {
                                if (checked) field.onChange([...field.value, tag.id]);
                                else field.onChange(field.value.filter(id => id !== tag.id));
                              }}
                            />
                            <span className="text-sm font-medium" style={{ color: tag.color }}>{tag.name}</span>
                          </label>
                        ))}
                        {(!tags || tags.length === 0) && <span className="text-xs text-muted-foreground">Nenhuma etiqueta cadastrada.</span>}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="col-span-2 flex items-center gap-2 mt-2">
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <Checkbox id="active" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">Produto Ativo</label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="bg-primary text-primary-foreground hover-elevate">
                {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
