import { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Search, Edit2, Trash2, Loader2, Tag as TagIcon, X, ArrowUp, ArrowDown, ImageIcon, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  categoryId: z.coerce.number().nullable().optional(),
  tagIds: z.array(z.number()).default([]),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

function TagCombobox({ tagIds, onChange, allTags, onCreateTag }: {
  tagIds: number[];
  onChange: (ids: number[]) => void;
  allTags: any[];
  onCreateTag: (name: string) => Promise<any>;
}) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = allTags.filter(t =>
    t.name.toLowerCase().includes(inputValue.toLowerCase()) && !tagIds.includes(t.id)
  );
  const selected = allTags.filter(t => tagIds.includes(t.id));
  const exactMatch = allTags.some(t => t.name.toLowerCase() === inputValue.toLowerCase());

  const addTag = (id: number) => {
    if (!tagIds.includes(id)) onChange([...tagIds, id]);
    setInputValue("");
    setOpen(false);
  };

  const removeTag = (id: number) => onChange(tagIds.filter(i => i !== id));

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim() && !exactMatch) {
        setCreating(true);
        try {
          const newTag = await onCreateTag(inputValue.trim());
          onChange([...tagIds, newTag.id]);
          setInputValue("");
          setOpen(false);
        } finally {
          setCreating(false);
        }
      } else if (filtered.length > 0) {
        addTag(filtered[0].id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !inputValue && selected.length > 0) {
      removeTag(selected[selected.length - 1].id);
    }
  };

  return (
    <div className="relative">
      <div
        className="min-h-[42px] flex flex-wrap gap-1.5 items-center p-2 border border-border/50 rounded-xl bg-background/50 cursor-text"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selected.map(t => (
          <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border" style={{ borderColor: t.color, color: t.color, backgroundColor: `${t.color}18` }}>
            {t.name}
            <button type="button" onClick={e => { e.stopPropagation(); removeTag(t.id); }} className="hover:opacity-70 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length === 0 ? "Buscar ou criar etiqueta..." : ""}
          className="flex-1 min-w-28 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          disabled={creating}
        />
        {creating && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
      </div>

      {open && (inputValue || filtered.length > 0) && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden">
          {filtered.map(t => (
            <button
              key={t.id}
              type="button"
              onMouseDown={() => addTag(t.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="text-sm" style={{ color: t.color }}>{t.name}</span>
            </button>
          ))}
          {inputValue.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={async () => {
                setCreating(true);
                try {
                  const newTag = await onCreateTag(inputValue.trim());
                  onChange([...tagIds, newTag.id]);
                  setInputValue(""); setOpen(false);
                } finally { setCreating(false); }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/10 transition-colors text-left border-t border-border/30"
            >
              <Plus className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="text-sm text-primary">Criar "{inputValue.trim()}"</span>
            </button>
          )}
          {filtered.length === 0 && !inputValue.trim() && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nenhuma etiqueta disponível.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ImagePicker({ productId, currentImages, onClose, onRefresh }: {
  productId: number;
  currentImages: any[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const currentIds = new Set(currentImages.map(i => i.id));

  const { data } = useQuery({
    queryKey: ["images-picker", search, typeFilter],
    queryFn: () => apiGet("/images", { search: search || undefined, type: typeFilter !== "all" ? typeFilter : undefined, limit: 50 }),
  });

  const addImage = async (imageId: number) => {
    const maxOrder = currentImages.reduce((m, i) => Math.max(m, i.displayOrder ?? 0), -1);
    await apiMutate("POST", `/products/${productId}/images`, { imageId, displayOrder: maxOrder + 1 });
    onRefresh();
    toast({ title: "Imagem vinculada" });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar imagem..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm bg-background" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-8 bg-background text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="banner">Banner</SelectItem>
            <SelectItem value="institucional">Institucional</SelectItem>
            <SelectItem value="produtos">Produtos</SelectItem>
            <SelectItem value="carrossel">Carrossel</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
        {data?.data?.map((img: any) => {
          const linked = currentIds.has(img.id);
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => !linked && addImage(img.id)}
              disabled={linked}
              className={`relative rounded-lg border overflow-hidden transition-all text-left ${linked ? "opacity-40 cursor-default border-border/30" : "border-border/50 hover:border-primary/60 hover:shadow-md"}`}
            >
              <div className="aspect-square bg-muted/30">
                <img src={`${BASE}${img.url}`} alt={img.name} className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = "none"; }} />
              </div>
              <p className="px-1.5 py-1 text-[10px] truncate">{img.name}</p>
              {linked && <div className="absolute inset-0 flex items-center justify-center bg-background/30"><Badge className="text-[9px] bg-primary/80">Vinculada</Badge></div>}
            </button>
          );
        })}
        {!data?.data?.length && <p className="col-span-3 text-center py-6 text-xs text-muted-foreground">Nenhuma imagem encontrada.</p>}
      </div>
    </div>
  );
}

export default function Products() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productImages, setProductImages] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", { search, page, limit }],
    queryFn: () => apiGet("/products", { search: search || undefined, page, limit }),
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => apiGet("/categories") });
  const { data: tagsData } = useQuery({
    queryKey: ["tags-all"],
    queryFn: () => apiGet("/tags", { limit: 200 }),
  });
  const allTags = tagsData?.data || [];

  const createTag = useMutation({
    mutationFn: (name: string) => apiMutate("POST", "/tags", { name, color: "#6366f1" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags-all"] }),
  });

  const createProduct = useMutation({
    mutationFn: (data: any) => apiMutate("POST", "/products", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Produto criado." }); handleCloseModal(); },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: any) => apiMutate("PUT", `/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Produto atualizado." }); handleCloseModal(); },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => apiMutate("DELETE", `/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Produto removido." }); },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", price: 0, costPrice: 0, stock: 0, tagIds: [], active: true, categoryId: null },
  });

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingId(product.id);
      form.reset({
        name: product.name, description: product.description || "",
        price: product.price, costPrice: product.costPrice, stock: product.stock,
        categoryId: product.categoryId, tagIds: product.tags.map((t: any) => t.id), active: product.active,
      });
      setProductImages(product.images || []);
    } else {
      setEditingId(null);
      form.reset({ name: "", description: "", price: 0, costPrice: 0, stock: 0, tagIds: [], active: true, categoryId: null });
      setProductImages([]);
    }
    setShowPicker(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => { setModalOpen(false); form.reset(); setProductImages([]); setShowPicker(false); };

  const refreshImages = async () => {
    if (!editingId) return;
    const imgs = await apiGet(`/products/${editingId}/images`);
    setProductImages(imgs);
  };

  const moveImage = async (index: number, dir: -1 | 1) => {
    const newImgs = [...productImages];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= newImgs.length) return;
    [newImgs[index], newImgs[swapIdx]] = [newImgs[swapIdx], newImgs[index]];
    const ordered = newImgs.map((img, i) => ({ ...img, displayOrder: i }));
    setProductImages(ordered);
    if (editingId) {
      await apiMutate("PUT", `/products/${editingId}/images/reorder`, {
        order: ordered.map(img => ({ imageId: img.id, displayOrder: img.displayOrder })),
      });
    }
  };

  const removeImage = async (imageId: number) => {
    if (!editingId) {
      setProductImages(prev => prev.filter(i => i.id !== imageId));
      return;
    }
    await apiMutate("DELETE", `/products/${editingId}/images/${imageId}`);
    setProductImages(prev => prev.filter(i => i.id !== imageId));
  };

  const onSubmit = (data: FormValues) => {
    if (editingId) updateProduct.mutate({ id: editingId, data });
    else createProduct.mutate(data);
  };

  const totalPages = Math.max(1, Math.ceil((productsData?.total || 0) / limit));

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
          <div className="p-4 border-b border-border/50 flex gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar produtos..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 bg-background" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Imagem</th>
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
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : productsData?.data?.map((product: any) => {
                  const mainImage = product.images?.[0];
                  return (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                      <td className="px-6 py-4">
                        {mainImage ? (
                          <img src={`${BASE}${mainImage.url}`} alt={mainImage.name} className="w-10 h-10 rounded-lg object-cover border border-border/50" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{product.category?.name || '-'}</td>
                      <td className="px-6 py-4 font-medium text-primary">{formatCurrency(product.price)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${product.stock < 10 ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>
                          {product.stock} un
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {product.tags.map((tag: any) => (
                            <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium border" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {product.active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0">Ativo</Badge>
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
                            if (confirm("Remover este produto?")) deleteProduct.mutate(product.id);
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              <span className="ml-2">Total: {productsData?.total || 0}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-xs px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={open => { if (!open) handleCloseModal(); }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
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
                <label className="text-sm font-medium">Estoque</label>
                <Input type="number" {...form.register("stock")} className="bg-background" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value?.toString() || ""} onValueChange={val => field.onChange(val === "null" ? null : Number(val))}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Nenhuma</SelectItem>
                        {(categories?.data || categories || []).map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TagIcon className="w-4 h-4" /> Etiquetas
                  <span className="text-xs text-muted-foreground font-normal">(busque ou tecle Enter para criar)</span>
                </label>
                <Controller
                  control={form.control}
                  name="tagIds"
                  render={({ field }) => (
                    <TagCombobox
                      tagIds={field.value}
                      onChange={field.onChange}
                      allTags={allTags}
                      onCreateTag={async (name) => {
                        const tag = await createTag.mutateAsync(name);
                        return tag;
                      }}
                    />
                  )}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 mt-1">
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => <Checkbox id="active" checked={field.value} onCheckedChange={field.onChange} />}
                />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">Produto Ativo</label>
              </div>
            </div>

            {editingId && (
              <div className="pt-2 space-y-3 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Imagens do Produto
                    <span className="text-xs text-muted-foreground font-normal">(primeira = principal)</span>
                  </label>
                  <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowPicker(v => !v)}>
                    <Link2 className="w-3 h-3 mr-1.5" /> {showPicker ? "Fechar seletor" : "Adicionar imagem"}
                  </Button>
                </div>

                {showPicker && (
                  <div className="p-3 bg-background/50 border border-border/30 rounded-xl">
                    <ImagePicker productId={editingId} currentImages={productImages} onClose={() => setShowPicker(false)} onRefresh={refreshImages} />
                  </div>
                )}

                {productImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {productImages.map((img, i) => (
                      <div key={img.id} className="relative group">
                        <div className={`aspect-square rounded-lg overflow-hidden border-2 ${i === 0 ? "border-primary" : "border-border/30"}`}>
                          <img src={`${BASE}${img.url}`} alt={img.name} className="w-full h-full object-cover" />
                        </div>
                        {i === 0 && <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-primary-foreground px-1 rounded">Principal</span>}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                          <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="p-1 rounded bg-white/20 hover:bg-white/30 disabled:opacity-30">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => moveImage(i, 1)} disabled={i === productImages.length - 1} className="p-1 rounded bg-white/20 hover:bg-white/30 disabled:opacity-30">
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => removeImage(img.id)} className="p-1 rounded bg-destructive/60 hover:bg-destructive/80">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate mt-0.5 px-0.5">{img.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">Nenhuma imagem vinculada. Use o botão acima para adicionar.</p>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="bg-primary text-primary-foreground hover-elevate">
                {(createProduct.isPending || updateProduct.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
