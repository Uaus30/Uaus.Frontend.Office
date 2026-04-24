import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, ImageIcon, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import {
  buildProductCollections,
  buildPublicImageUrl,
  createImageFromFile,
  createOrReuseProductGroup,
  deleteProduct,
  getAllCategories,
  getAllDepartments,
  getAllImages,
  getAllProductGroups,
  getAllProductImages,
  getAllProductTags,
  getAllTags,
  getEnumOptions,
  getProductsPage,
  syncProductImages,
  syncProductTags,
  upsertProduct,
} from "@/lib/backend";

type ProductForm = {
  departmentId: string;
  categoryId: string;
  productGroupName: string;
  name: string;
  description: string;
  price: number;
  status: string;
  tagIds: number[];
};

type LocalImage = {
  imageId?: number;
  associationId?: number;
  name: string;
  url: string;
  file?: File;
};

export default function Products() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [form, setForm] = useState<ProductForm>({
    departmentId: "",
    categoryId: "",
    productGroupName: "",
    name: "",
    description: "",
    price: 0,
    status: "",
    tagIds: [],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-all-for-products"],
    queryFn: () => getAllDepartments(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all-for-products"],
    queryFn: () => getAllCategories(),
  });

  const { data: productGroups = [] } = useQuery({
    queryKey: ["product-groups-all-for-products"],
    queryFn: () => getAllProductGroups(),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags-all-for-products"],
    queryFn: () => getAllTags(),
  });

  const { data: productTags = [] } = useQuery({
    queryKey: ["product-tags-all-for-products"],
    queryFn: () => getAllProductTags(),
  });

  const { data: productImages = [] } = useQuery({
    queryKey: ["product-images-all-for-products"],
    queryFn: () => getAllProductImages(),
  });

  const { data: imagesCatalog = [] } = useQuery({
    queryKey: ["images-all-for-products"],
    queryFn: () => getAllImages(),
  });

  const { data: statusOptions = [] } = useQuery({
    queryKey: ["product-status-options"],
    queryFn: () => getEnumOptions("/Products/enums/product-status"),
  });

  const { data: productPage, isLoading } = useQuery({
    queryKey: ["products-page", { search, page, limit }],
    queryFn: () => getProductsPage({ search, page, limit }),
  });

  const selectableStatusOptions = useMemo(
    () => statusOptions.filter((item) => item.allowSelect),
    [statusOptions],
  );

  const enrichedProducts = useMemo(() => {
    const pageProducts = productPage?.data ?? [];
    return buildProductCollections({
      products: pageProducts,
      productGroups,
      categories,
      departments,
      tags,
      productTags,
      images: imagesCatalog,
      productImages,
    }).enrichedProducts;
  }, [categories, departments, imagesCatalog, productGroups, productImages, productPage?.data, productTags, tags]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        form.departmentId ? category.departmentId === Number(form.departmentId) : true,
      ),
    [categories, form.departmentId],
  );

  function resetForm() {
    setEditingId(null);
    setForm({
      departmentId: departments[0]?.id.toString() ?? "",
      categoryId: "",
      productGroupName: "",
      name: "",
      description: "",
      price: 0,
      status: selectableStatusOptions[0]?.id.toString() ?? "",
      tagIds: [],
    });
    setImages([]);
  }

  function openModal(product?: any) {
    if (product) {
      setEditingId(product.id);
      setForm({
        departmentId: product.department?.id.toString() ?? "",
        categoryId: product.category?.id.toString() ?? "",
        productGroupName: product.productGroup?.name ?? "",
        name: product.name,
        description: product.description || "",
        price: product.price,
        status: String(product.status),
        tagIds: product.tags.map((tag) => tag.id),
      });
      setImages(
        product.images.map((item) => ({
          imageId: item.imageId,
          associationId: item.associationId,
          name: item.image.name,
          url: buildPublicImageUrl(item.image.url),
        })),
      );
    } else {
      resetForm();
    }

    setModalOpen(true);
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(event.target.files ?? []);
    const nextImages = fileList.map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((current) => [...current, ...nextImages]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.categoryId || !form.productGroupName.trim() || !form.name.trim() || !form.status) {
      toast({
        title: "Preencha categoria, grupo, nome e status.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const productGroupId = await createOrReuseProductGroup({
        categoryId: Number(form.categoryId),
        name: form.productGroupName,
        existingGroups: productGroups,
      });

      const productId = await upsertProduct({
        id: editingId,
        productGroupId,
        name: form.name,
        description: form.description,
        price: form.price,
        status: Number(form.status),
      });

      const currentTagAssociations = productTags.filter((item) => item.productId === productId);
      await syncProductTags({
        productId,
        currentAssociations: currentTagAssociations,
        nextTagIds: form.tagIds,
      });

      const persistedNewImages = [];
      for (const image of images) {
        if (image.imageId || !image.file) continue;
        const created = await createImageFromFile({
          file: image.file,
          name: image.name,
          type: 3,
        });
        persistedNewImages.push({
          ...image,
          imageId: created.id,
          url: buildPublicImageUrl(created.url),
        });
      }

      const allImages = images
        .filter((image) => image.imageId)
        .concat(persistedNewImages)
        .map((image) => ({
          imageId: image.imageId as number,
          displayOrder: 0,
        }))
        .map((image, index) => ({ ...image, displayOrder: index }));

      await syncProductImages({
        productId,
        currentAssociations: productImages.filter((item) => item.productId === productId),
        nextImages: allImages,
      });

      queryClient.invalidateQueries({ queryKey: ["products-page"] });
      queryClient.invalidateQueries({ queryKey: ["product-groups-all-for-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-tags-all-for-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-images-all-for-products"] });
      queryClient.invalidateQueries({ queryKey: ["images-all-for-products"] });

      toast({ title: editingId ? "Produto atualizado." : "Produto criado." });
      setModalOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar produto",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId: number) {
    try {
      await deleteProduct(productId);
      queryClient.invalidateQueries({ queryKey: ["products-page"] });
      toast({ title: "Produto removido." });
    } catch (error) {
      toast({
        title: "Erro ao remover produto",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil((productPage?.total || 0) / limit));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Produtos</h1>
            <p className="mt-1 text-muted-foreground">Gerencie o catálogo real da loja no modelo departamento, categoria, grupo e produto.</p>
          </div>
          <Button onClick={() => openModal()} className="bg-primary text-primary-foreground hover-elevate">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg shadow-black/5">
          <div className="border-b border-border/50 p-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="bg-background pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Imagem</th>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Grupo</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4">Estoque</th>
                  <th className="px-6 py-4">Etiquetas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : (
                  enrichedProducts.map((product) => {
                    const mainImage = product.images[0]?.image;
                    return (
                      <tr key={product.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                        <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                        <td className="px-6 py-4">
                          {mainImage ? (
                            <img src={buildPublicImageUrl(mainImage.url)} alt={mainImage.name} className="h-10 w-10 rounded-lg border border-border/50 object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{product.department?.name || "-"}</td>
                        <td className="px-6 py-4 text-muted-foreground">{product.category?.name || "-"}</td>
                        <td className="px-6 py-4 text-muted-foreground">{product.productGroup?.name || "-"}</td>
                        <td className="px-6 py-4 font-medium text-primary">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${product.stock < 10 ? "bg-destructive/20 text-destructive" : "bg-secondary text-secondary-foreground"}`}>
                            {product.stock} un
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {product.tags.map((tag) => (
                              <span key={tag.id} className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}>
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={product.status === 2 ? "default" : "outline"}>
                            {statusOptions.find((option) => option.id === product.status)?.name ?? product.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate"
                              onClick={() => openModal(product)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate"
                              onClick={() => {
                                if (confirm("Remover este produto?")) {
                                  void handleDelete(product.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-2">Total: {productPage?.total || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </Button>
              <span className="px-2 text-xs">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => !open ? setModalOpen(false) : setModalOpen(true)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border/50 bg-card sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Departamento</label>
                <Select
                  value={form.departmentId}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      departmentId: value,
                      categoryId: "",
                    }))
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id.toString()}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={form.categoryId} onValueChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grupo Comercial</label>
                <Input value={form.productGroupName} onChange={(event) => setForm((current) => ({ ...current, productGroupName: event.target.value }))} className="bg-background" placeholder="Ex: Copo térmico 500ml" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Produto</label>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="bg-background" placeholder="Ex: Copo térmico 500ml azul" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço de Venda (R$)</label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableStatusOptions.map((status) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Etiquetas</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-background/50 p-3 sm:grid-cols-3">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.tagIds.includes(tag.id)}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          tagIds: checked
                            ? [...current.tagIds, tag.id]
                            : current.tagIds.filter((id) => id !== tag.id),
                        }))
                      }
                    />
                    <span style={{ color: tag.color }}>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-border/30 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Imagens do Produto</label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
                  <Upload className="h-4 w-4" />
                  Adicionar imagens
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelection} />
                </label>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((image, index) => (
                    <div key={`${image.name}-${index}`} className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50">
                      <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                      <div className="p-2">
                        <p className="truncate text-xs font-medium">{image.name}</p>
                        {index === 0 && <p className="mt-1 text-[10px] text-primary">Imagem principal</p>}
                      </div>
                      <div className="absolute right-2 top-2 flex gap-1">
                        <button type="button" className="rounded bg-card/90 p-1" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                          ↑
                        </button>
                        <button type="button" className="rounded bg-card/90 p-1" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded bg-card/90 p-1 text-destructive"
                          onClick={() => setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border/40 p-8 text-center text-muted-foreground">
                  Nenhuma imagem selecionada.
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover-elevate">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
