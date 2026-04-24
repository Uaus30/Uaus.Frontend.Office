import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import {
  buildProductCollections,
  buildPublicImageUrl,
  createImageFromFile,
  createProductGroup,
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
  updateProductGroup,
  upsertProduct,
} from "@/lib/backend";
import { Edit2, ImageIcon, Loader2, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";

type ProductGroupForm = {
  departmentId: string;
  categoryId: string;
  productGroupName: string;
  hasVariations: boolean;
};

type ProductEditorForm = {
  id: number | null;
  name: string;
  description: string;
  price: number;
  status: string;
  tagIds: number[];
};

type VariationDraft = {
  name: string;
  description: string;
  price: number;
  status: string;
};

type LocalImage = {
  imageId?: number;
  associationId?: number;
  name: string;
  url: string;
  file?: File;
};

function createEmptyProductEditor(defaultStatus = ""): ProductEditorForm {
  return {
    id: null,
    name: "",
    description: "",
    price: 0,
    status: defaultStatus,
    tagIds: [],
  };
}

function createEmptyVariationDraft(defaultStatus = ""): VariationDraft {
  return {
    name: "",
    description: "",
    price: 0,
    status: defaultStatus,
  };
}

export default function Products() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [activeVariationId, setActiveVariationId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingVariation, setSavingVariation] = useState(false);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [form, setForm] = useState<ProductGroupForm>({
    departmentId: "",
    categoryId: "",
    productGroupName: "",
    hasVariations: false,
  });
  const [productEditor, setProductEditor] = useState<ProductEditorForm>(createEmptyProductEditor());
  const [variationDraft, setVariationDraft] = useState<VariationDraft>(createEmptyVariationDraft());

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

  const {
    data: groupProductsPage,
    isFetching: isFetchingGroupProducts,
    refetch: refetchGroupProducts,
  } = useQuery({
    queryKey: ["products-by-group", editingGroupId],
    enabled: modalOpen && editingGroupId != null,
    queryFn: () =>
      getProductsPage({
        productGroupId: editingGroupId ?? undefined,
        page: 1,
        limit: 200,
      }),
  });

  const selectableStatusOptions = useMemo(
    () => statusOptions.filter((item) => item.allowSelect),
    [statusOptions],
  );

  const defaultStatus = selectableStatusOptions[0]?.id?.toString() ?? "";

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

  const enrichedGroupProducts = useMemo(() => {
    const groupProducts = groupProductsPage?.data ?? [];
    return buildProductCollections({
      products: groupProducts,
      productGroups,
      categories,
      departments,
      tags,
      productTags,
      images: imagesCatalog,
      productImages,
    }).enrichedProducts;
  }, [categories, departments, groupProductsPage?.data, imagesCatalog, productGroups, productImages, productTags, tags]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        form.departmentId ? category.departmentId === Number(form.departmentId) : true,
      ),
    [categories, form.departmentId],
  );

  function applyProductToEditor(product?: any) {
    if (!product) {
      setActiveVariationId(null);
      setProductEditor(createEmptyProductEditor(defaultStatus));
      setImages([]);
      return;
    }

    setActiveVariationId(product.id);
    setProductEditor({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: product.price,
      status: String(product.status),
      tagIds: product.tags.map((tag: any) => tag.id),
    });
    setImages(
      product.images.map((item: any) => ({
        imageId: item.imageId,
        associationId: item.associationId,
        name: item.image.name,
        url: buildPublicImageUrl(item.image.url),
      })),
    );
  }

  function resetForm() {
    setEditingGroupId(null);
    setActiveVariationId(null);
    setForm({
      departmentId: departments[0]?.id.toString() ?? "",
      categoryId: "",
      productGroupName: "",
      hasVariations: false,
    });
    setProductEditor(createEmptyProductEditor(defaultStatus));
    setVariationDraft(createEmptyVariationDraft(defaultStatus));
    setImages([]);
  }

  function openModal(product?: any) {
    if (product) {
      setEditingGroupId(product.productGroup?.id ?? product.productGroupId);
      setForm({
        departmentId: product.department?.id.toString() ?? "",
        categoryId: product.category?.id.toString() ?? "",
        productGroupName: product.productGroup?.name ?? "",
        hasVariations: product.productGroup?.hasVariations ?? false,
      });
      setVariationDraft(createEmptyVariationDraft(String(product.status ?? defaultStatus)));
      applyProductToEditor(product.productGroup?.hasVariations ? product : product);
    } else {
      resetForm();
    }

    setModalOpen(true);
  }

  useEffect(() => {
    if (!modalOpen) return;

    setVariationDraft((current) =>
      current.status ? current : { ...current, status: defaultStatus },
    );

    setProductEditor((current) =>
      current.status ? current : { ...current, status: defaultStatus },
    );
  }, [defaultStatus, modalOpen]);

  useEffect(() => {
    if (!modalOpen || form.hasVariations || productEditor.id || enrichedGroupProducts.length === 0) {
      return;
    }

    applyProductToEditor(enrichedGroupProducts[0]);
  }, [enrichedGroupProducts, form.hasVariations, modalOpen, productEditor.id]);

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

  async function invalidateProductQueries(groupId?: number | null) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products-page"] }),
      queryClient.invalidateQueries({ queryKey: ["product-groups-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["product-tags-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["product-images-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["images-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["products-by-group", groupId ?? editingGroupId] }),
    ]);
  }

  async function persistGroup() {
    if (!form.categoryId || !form.productGroupName.trim()) {
      throw new Error("Preencha categoria e nome do produto pai.");
    }

    if (editingGroupId) {
      await updateProductGroup({
        id: editingGroupId,
        categoryId: Number(form.categoryId),
        name: form.productGroupName,
        hasVariations: form.hasVariations,
      });
      return editingGroupId;
    }

    const createdGroupId = await createProductGroup({
      categoryId: Number(form.categoryId),
      name: form.productGroupName,
      hasVariations: form.hasVariations,
    });
    setEditingGroupId(createdGroupId);
    return createdGroupId;
  }

  async function persistProductAssociations(productId: number, tagIds: number[]) {
    const currentTagAssociations = productTags.filter((item) => item.productId === productId);
    await syncProductTags({
      productId,
      currentAssociations: currentTagAssociations,
      nextTagIds: tagIds,
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
      .map((image, index) => ({
        imageId: image.imageId as number,
        displayOrder: index,
      }));

    await syncProductImages({
      productId,
      currentAssociations: productImages.filter((item) => item.productId === productId),
      nextImages: allImages,
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setSaving(true);
    try {
      const groupId = await persistGroup();

      if (!form.hasVariations) {
        if (!productEditor.name.trim() || !productEditor.status) {
          throw new Error("Preencha nome, status e os dados do produto simples.");
        }

        const productId = await upsertProduct({
          id: productEditor.id,
          productGroupId: groupId,
          name: productEditor.name,
          description: productEditor.description,
          price: productEditor.price,
          status: Number(productEditor.status),
        });

        await persistProductAssociations(productId, productEditor.tagIds);
      }

      await invalidateProductQueries(groupId);

      if (form.hasVariations && editingGroupId) {
        await refetchGroupProducts();
      }

      toast({
        title: form.hasVariations ? "Grupo salvo." : editingGroupId ? "Produto atualizado." : "Produto criado.",
      });

      if (!form.hasVariations) {
        setModalOpen(false);
        resetForm();
      }
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

  async function handleSaveVariationEditor() {
    if (!editingGroupId) {
      toast({
        title: "Salve o produto pai antes de editar uma variação.",
        variant: "destructive",
      });
      return;
    }

    if (!productEditor.id || !productEditor.name.trim() || !productEditor.status) {
      toast({
        title: "Selecione uma variação existente e preencha nome e status.",
        variant: "destructive",
      });
      return;
    }

    setSavingVariation(true);
    try {
      const productId = await upsertProduct({
        id: productEditor.id,
        productGroupId: editingGroupId,
        name: productEditor.name,
        description: productEditor.description,
        price: productEditor.price,
        status: Number(productEditor.status),
      });

      await persistProductAssociations(productId, productEditor.tagIds);
      await invalidateProductQueries(editingGroupId);
      await refetchGroupProducts();

      toast({ title: "Variação atualizada." });
    } catch (error) {
      toast({
        title: "Erro ao salvar variação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingVariation(false);
    }
  }

  async function handleCreateVariation() {
    setSavingVariation(true);
    try {
      if (!variationDraft.name.trim() || !variationDraft.status) {
        throw new Error("Preencha nome e status da nova variação.");
      }

      const groupId = await persistGroup();
      const productId = await upsertProduct({
        productGroupId: groupId,
        name: variationDraft.name,
        description: variationDraft.description,
        price: variationDraft.price,
        status: Number(variationDraft.status),
      });

      await invalidateProductQueries(groupId);
      const result = await refetchGroupProducts();
      const createdVariation = result.data?.data.find((item) => item.id === productId);

      setVariationDraft(createEmptyVariationDraft(defaultStatus));
      if (createdVariation) {
        const enriched = buildProductCollections({
          products: [createdVariation],
          productGroups,
          categories,
          departments,
          tags,
          productTags,
          images: imagesCatalog,
          productImages,
        }).enrichedProducts[0];
        applyProductToEditor(enriched);
      }

      toast({ title: "Variação criada." });
    } catch (error) {
      toast({
        title: "Erro ao criar variação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingVariation(false);
    }
  }

  async function handleDelete(productId: number) {
    try {
      await deleteProduct(productId);
      await invalidateProductQueries(editingGroupId);
      if (editingGroupId) {
        await refetchGroupProducts();
      }

      if (activeVariationId === productId) {
        applyProductToEditor(undefined);
      }

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
                  <th className="px-6 py-4">Tipo</th>
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
                    <td colSpan={11} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : (
                  enrichedProducts.map((product) => {
                    const mainImage = product.images[0]?.image;
                    const deleteDisabled = !product.canDelete;

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
                        <td className="px-6 py-4">
                          <Badge variant={product.productGroup?.hasVariations ? "outline" : "default"}>
                            {product.productGroup?.hasVariations ? "Variação" : "Simples"}
                          </Badge>
                        </td>
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
                              disabled={deleteDisabled}
                              title={deleteDisabled ? "Este produto não pode ser excluído agora." : "Excluir produto"}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate disabled:cursor-not-allowed disabled:opacity-40"
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

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border/50 bg-card sm:max-w-[960px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingGroupId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="space-y-3 rounded-2xl border border-border/50 bg-background/40 p-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produto pai</h2>
                <p className="text-sm text-muted-foreground">O cadastro principal da modal edita o `ProductGroup`.</p>
              </div>

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

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Nome do Produto Pai</label>
                  <Input value={form.productGroupName} onChange={(event) => setForm((current) => ({ ...current, productGroupName: event.target.value }))} className="bg-background" placeholder="Ex: Copo térmico 500ml" />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm">
                <Checkbox
                  checked={form.hasVariations}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      hasVariations: checked === true,
                    }))
                  }
                />
                <div>
                  <p className="font-medium">Este produto possui variações</p>
                  <p className="text-muted-foreground">Quando ativo, o grupo organiza vários `Products`; quando desligado, mantém apenas um item vendável.</p>
                </div>
              </label>
            </div>

            {!form.hasVariations ? (
              <div className="space-y-5 rounded-2xl border border-border/50 bg-background/40 p-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produto simples</h2>
                  <p className="text-sm text-muted-foreground">Com `hasVariations = false`, o grupo mantém apenas um `Product` vinculado.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome do Produto</label>
                    <Input value={productEditor.name} onChange={(event) => setProductEditor((current) => ({ ...current, name: event.target.value }))} className="bg-background" placeholder="Ex: Copo térmico 500ml azul" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preço de Venda (R$)</label>
                    <Input type="number" step="0.01" min="0" value={productEditor.price} onChange={(event) => setProductEditor((current) => ({ ...current, price: Number(event.target.value) }))} className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                    <Input value={productEditor.description} onChange={(event) => setProductEditor((current) => ({ ...current, description: event.target.value }))} className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={productEditor.status} onValueChange={(value) => setProductEditor((current) => ({ ...current, status: value }))}>
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
                          checked={productEditor.tagIds.includes(tag.id)}
                          onCheckedChange={(checked) =>
                            setProductEditor((current) => ({
                              ...current,
                              tagIds: checked === true
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
              </div>
            ) : (
              <div className="space-y-5 rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Variações</h2>
                    <p className="text-sm text-muted-foreground">A listagem abaixo é carregada por `GET /Products?productGroupId={editingGroupId}`.</p>
                  </div>
                  {isFetchingGroupProducts && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                {editingGroupId == null ? (
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-sm text-muted-foreground">
                    Salve o produto pai para começar a cadastrar as variações.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Nome</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3">Preço</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50 bg-primary/5">
                          <td className="px-4 py-3">
                            <Input value={variationDraft.name} onChange={(event) => setVariationDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Nova variação" className="bg-background" />
                          </td>
                          <td className="px-4 py-3">
                            <Input value={variationDraft.description} onChange={(event) => setVariationDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Descrição opcional" className="bg-background" />
                          </td>
                          <td className="px-4 py-3">
                            <Input type="number" step="0.01" min="0" value={variationDraft.price} onChange={(event) => setVariationDraft((current) => ({ ...current, price: Number(event.target.value) }))} className="bg-background" />
                          </td>
                          <td className="px-4 py-3">
                            <Select value={variationDraft.status} onValueChange={(value) => setVariationDraft((current) => ({ ...current, status: value }))}>
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
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button type="button" size="sm" disabled={savingVariation} onClick={() => void handleCreateVariation()}>
                              {savingVariation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </td>
                        </tr>

                        {enrichedGroupProducts.map((product) => (
                          <tr key={product.id} className="border-b border-border/50 last:border-b-0">
                            <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{product.description || "-"}</td>
                            <td className="px-4 py-3 text-primary">{formatCurrency(product.price)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={product.status === 2 ? "default" : "outline"}>
                                {statusOptions.find((option) => option.id === product.status)?.name ?? product.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button type="button" size="icon" variant="ghost" onClick={() => applyProductToEditor(product)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={!product.canDelete}
                                  title={!product.canDelete ? "Esta variação não pode ser excluída agora." : "Excluir variação"}
                                  className="disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => {
                                    if (confirm("Remover esta variação?")) {
                                      void handleDelete(product.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {productEditor.id ? (
                  <div className="space-y-5 rounded-2xl border border-border/50 bg-card/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Editar variação</h3>
                        <p className="text-sm text-muted-foreground">Cada `Product` continua sendo o item final vendável.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => applyProductToEditor(undefined)}>
                        Limpar seleção
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome da variação</label>
                        <Input value={productEditor.name} onChange={(event) => setProductEditor((current) => ({ ...current, name: event.target.value }))} className="bg-background" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Preço de Venda (R$)</label>
                        <Input type="number" step="0.01" min="0" value={productEditor.price} onChange={(event) => setProductEditor((current) => ({ ...current, price: Number(event.target.value) }))} className="bg-background" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Descrição</label>
                        <Input value={productEditor.description} onChange={(event) => setProductEditor((current) => ({ ...current, description: event.target.value }))} className="bg-background" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select value={productEditor.status} onValueChange={(value) => setProductEditor((current) => ({ ...current, status: value }))}>
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
                              checked={productEditor.tagIds.includes(tag.id)}
                              onCheckedChange={(checked) =>
                                setProductEditor((current) => ({
                                  ...current,
                                  tagIds: checked === true
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
                        <label className="text-sm font-medium">Imagens da Variação</label>
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

                    <div className="flex justify-end">
                      <Button type="button" disabled={savingVariation} className="bg-primary text-primary-foreground hover-elevate" onClick={() => void handleSaveVariationEditor()}>
                        {savingVariation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar variação
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-sm text-muted-foreground">
                    Selecione uma variação existente para editar etiquetas e imagens.
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover-elevate">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.hasVariations ? "Salvar grupo" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
