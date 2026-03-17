import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Search, Edit2, Trash2, Loader2, Tag as TagIcon, X, ImageIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_IMAGE_SIZE = 1024 * 1024;

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
        } finally { setCreating(false); }
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

function ProductImageSection({ images, onImagesChange, editingId, uploading, onUpload, onRemove, onReorder }: {
  images: any[];
  onImagesChange: (imgs: any[]) => void;
  editingId: number | null;
  uploading: boolean;
  onUpload: (files: FileList) => void;
  onRemove: (imageId: number) => void;
  onReorder: (newOrder: any[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, i: number) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(i);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newImgs = [...images];
    const [item] = newImgs.splice(dragIndex, 1);
    newImgs.splice(targetIndex, 0, item);
    const ordered = newImgs.map((img, i) => ({ ...img, displayOrder: i }));
    onReorder(ordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files);
  };

  return (
    <div className="pt-2 space-y-3 border-t border-border/30">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Imagens do Produto
          <span className="text-xs text-muted-foreground font-normal">(arraste para reordenar · primeira = principal · máx. 1MB)</span>
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Upload className="w-3 h-3 mr-1.5" />}
          Adicionar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && onUpload(e.target.files)}
          onClick={e => { (e.target as HTMLInputElement).value = ""; }}
        />
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              draggable
              onDragStart={e => handleDragStart(e, i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={e => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={`relative group cursor-grab active:cursor-grabbing transition-all duration-150 ${
                dragIndex === i ? "opacity-30 scale-95" : ""
              } ${dragOverIndex === i && dragIndex !== i ? "ring-2 ring-primary ring-offset-1 ring-offset-card rounded-lg" : ""}`}
            >
              <div className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${i === 0 ? "border-primary" : "border-border/30"}`}>
                <img src={`${BASE}${img.url}`} alt={img.name} className="w-full h-full object-cover pointer-events-none select-none" />
              </div>
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-primary-foreground px-1 rounded pointer-events-none">
                  Principal
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive"
              >
                <X className="w-3 h-3" />
              </button>
              <p className="text-[9px] text-muted-foreground truncate mt-0.5 px-0.5">{img.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border/40 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropZone}
        >
          <ImageIcon className="w-8 h-8 mx-auto opacity-20 mb-2" />
          <p className="text-xs text-muted-foreground">Clique ou arraste imagens aqui</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">JPG, PNG, WebP — máximo 1MB por imagem</p>
        </div>
      )}
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
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const deleteProduct = useMutation({
    mutationFn: (id: number) => apiMutate("DELETE", `/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Produto removido." }); },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", price: 0, costPrice: 0, stock: 0, tagIds: [], active: true, categoryId: null },
  });

  const [saving, setSaving] = useState(false);

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
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    form.reset();
    setProductImages([]);
    setEditingId(null);
  };

  const uploadImages = useCallback(async (files: FileList) => {
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      if (file.size > MAX_IMAGE_SIZE) {
        toast({ title: `"${file.name}" excede 1MB`, description: "Selecione uma imagem menor.", variant: "destructive" });
        continue;
      }
      setUploadingImage(true);
      try {
        const { uploadURL, objectPath } = await apiMutate("POST", "/images/upload-url", {
          name: file.name, size: file.size, contentType: file.type,
        });
        await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        const imgRecord = await apiMutate("POST", "/images", {
          name: file.name.replace(/\.[^/.]+$/, ""),
          type: "produtos",
          objectPath,
        });
        const newImg = { ...imgRecord, url: `/api/storage${imgRecord.objectPath}` };

        if (editingId) {
          setProductImages(prev => {
            const order = prev.length;
            apiMutate("POST", `/products/${editingId}/images`, { imageId: imgRecord.id, displayOrder: order });
            return [...prev, { ...newImg, displayOrder: order }];
          });
        } else {
          setProductImages(prev => [...prev, { ...newImg, displayOrder: prev.length }]);
        }
      } catch (err: any) {
        toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      } finally {
        setUploadingImage(false);
      }
    }
  }, [editingId, toast]);

  const removeImage = useCallback(async (imageId: number) => {
    if (editingId) {
      try {
        await apiMutate("DELETE", `/products/${editingId}/images/${imageId}`);
      } catch (err: any) {
        toast({ title: "Erro ao remover imagem", description: err.message, variant: "destructive" });
        return;
      }
    } else {
      try {
        await apiMutate("DELETE", `/images/${imageId}`);
      } catch {
        /* ignore staged image soft-delete errors */
      }
    }
    setProductImages(prev => prev.filter(i => i.id !== imageId));
  }, [editingId, toast]);

  const reorderImages = useCallback(async (ordered: any[]) => {
    setProductImages(ordered);
    if (editingId) {
      try {
        await apiMutate("PUT", `/products/${editingId}/images/reorder`, {
          order: ordered.map(img => ({ imageId: img.id, displayOrder: img.displayOrder })),
        });
      } catch (err: any) {
        toast({ title: "Erro ao reordenar", description: err.message, variant: "destructive" });
      }
    }
  }, [editingId, toast]);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      if (editingId) {
        await apiMutate("PUT", `/products/${editingId}`, data);
        toast({ title: "Produto atualizado." });
      } else {
        const product = await apiMutate("POST", "/products", data);
        for (let i = 0; i < productImages.length; i++) {
          await apiMutate("POST", `/products/${product.id}/images`, {
            imageId: productImages[i].id,
            displayOrder: i,
          });
        }
        toast({ title: "Produto criado." });
      }
      qc.invalidateQueries({ queryKey: ["products"] });
      handleCloseModal();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
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

            <ProductImageSection
              images={productImages}
              onImagesChange={setProductImages}
              editingId={editingId}
              uploading={uploadingImage}
              onUpload={uploadImages}
              onRemove={removeImage}
              onReorder={reorderImages}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" disabled={saving || uploadingImage} className="bg-primary text-primary-foreground hover-elevate">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
