import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TagDto } from "@workspace/api-client-react";
import { TagMultiSelect } from "@/components/tag-multi-select";
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

type LocalImage = {
  imageId?: number;
  associationId?: number;
  name: string;
  url: string;
  file?: File;
};

type VariationDraft = ProductEditorForm & {
  key: string;
  images: LocalImage[];
  canDelete: boolean;
};

function createDraftKey() {
  return `draft-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyProductEditor(defaultStatus = "", baseName = ""): ProductEditorForm {
  return {
    id: null,
    name: baseName,
    description: "",
    price: 0,
    status: defaultStatus,
    tagIds: [],
  };
}

function createVariationDraft(defaultStatus = "", baseName = ""): VariationDraft {
  return {
    key: createDraftKey(),
    id: null,
    name: baseName,
    description: "",
    price: 0,
    status: defaultStatus,
    tagIds: [],
    images: [],
    canDelete: true,
  };
}

function reorderItems<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;

  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}

export default function Products() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [activeVariationKey, setActiveVariationKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [form, setForm] = useState<ProductGroupForm>({
    departmentId: "",
    categoryId: "",
    productGroupName: "",
    hasVariations: false,
  });
  const [productEditor, setProductEditor] = useState<ProductEditorForm>(createEmptyProductEditor());
  const [variationDrafts, setVariationDrafts] = useState<VariationDraft[]>([]);

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
    enabled: modalOpen && editingGroupId != null && form.hasVariations,
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

  const activeVariation = useMemo(
    () => variationDrafts.find((variation) => variation.key === activeVariationKey) ?? null,
    [activeVariationKey, variationDrafts],
  );

  function toLocalImages(items: any[] = []) {
    return items.map((item: any) => ({
      imageId: item.imageId,
      associationId: item.associationId,
      name: item.image.name,
      url: buildPublicImageUrl(item.image.url),
    }));
  }

  function toVariationDraft(product: any): VariationDraft {
    return {
      key: `product-${product.id}`,
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: product.price,
      status: String(product.status),
      tagIds: product.tags.map((tag: TagDto) => tag.id),
      images: toLocalImages(product.images),
      canDelete: product.canDelete,
    };
  }

  function registerTag(createdTag: TagDto) {
    queryClient.setQueryData<TagDto[] | undefined>(["tags-all-for-products"], (current) => {
      const next = current ?? [];
      if (next.some((tag) => tag.id === createdTag.id)) return next;
      return [...next, createdTag];
    });
    queryClient.invalidateQueries({ queryKey: ["tags-page"] });
  }

  function updateVariationDraft(
    key: string,
    updater: (draft: VariationDraft) => VariationDraft,
  ) {
    setVariationDrafts((current) =>
      current.map((draft) => (draft.key === key ? updater(draft) : draft)),
    );
  }

  function resetForm() {
    setEditingGroupId(null);
    setActiveVariationKey(null);
    setForm({
      departmentId: departments[0]?.id.toString() ?? "",
      categoryId: "",
      productGroupName: "",
      hasVariations: false,
    });
    setProductEditor(createEmptyProductEditor(defaultStatus));
    setVariationDrafts([]);
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

      if (product.productGroup?.hasVariations) {
        const draft = toVariationDraft(product);
        setVariationDrafts([draft]);
        setActiveVariationKey(draft.key);
        setProductEditor(createEmptyProductEditor(defaultStatus));
        setImages([]);
      } else {
        setProductEditor({
          id: product.id,
          name: product.name,
          description: product.description || "",
          price: product.price,
          status: String(product.status),
          tagIds: product.tags.map((tag: TagDto) => tag.id),
        });
        setImages(toLocalImages(product.images));
        setVariationDrafts([]);
        setActiveVariationKey(null);
      }
    } else {
      resetForm();
    }

    setModalOpen(true);
  }

  useEffect(() => {
    if (!modalOpen) return;

    setProductEditor((current) =>
      current.status ? current : { ...current, status: defaultStatus },
    );
  }, [defaultStatus, modalOpen]);

  useEffect(() => {
    if (!modalOpen || !form.hasVariations) return;

    setVariationDrafts((current) => {
      if (current.length > 0) return current;
      const draft = createVariationDraft(defaultStatus, form.productGroupName.trim());
      setActiveVariationKey(draft.key);
      return [draft];
    });
  }, [defaultStatus, form.hasVariations, form.productGroupName, modalOpen]);

  useEffect(() => {
    if (
      !modalOpen
      || !form.hasVariations
      || !editingGroupId
      || enrichedGroupProducts.length === 0
      || variationDrafts.some((draft) => draft.id != null)
    ) {
      return;
    }

    const drafts = enrichedGroupProducts.map(toVariationDraft);
    setVariationDrafts(drafts);
    setActiveVariationKey((current) => current ?? drafts[0]?.key ?? null);
  }, [editingGroupId, enrichedGroupProducts, form.hasVariations, modalOpen, variationDrafts]);

  function moveProductImage(index: number, direction: -1 | 1) {
    setImages((current) => reorderItems(current, index, direction));
  }

  function moveVariationImage(index: number, direction: -1 | 1) {
    if (!activeVariation) return;
    updateVariationDraft(activeVariation.key, (draft) => ({
      ...draft,
      images: reorderItems(draft.images, index, direction),
    }));
  }

  function handleSimpleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(event.target.files ?? []);
    const nextImages = fileList.map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((current) => [...current, ...nextImages]);
  }

  function handleVariationFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    if (!activeVariation) return;

    const fileList = Array.from(event.target.files ?? []);
    const nextImages = fileList.map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file),
      file,
    }));

    updateVariationDraft(activeVariation.key, (draft) => ({
      ...draft,
      images: [...draft.images, ...nextImages],
    }));
  }

  async function invalidateProductQueries(groupId?: number | null) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products-page"] }),
      queryClient.invalidateQueries({ queryKey: ["product-groups-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["product-tags-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["product-images-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["images-all-for-products"] }),
      queryClient.invalidateQueries({ queryKey: ["products-by-group", groupId ?? editingGroupId] }),
      queryClient.invalidateQueries({ queryKey: ["tags-all-for-products"] }),
    ]);
  }

  async function persistGroup() {
    if (!form.categoryId || !form.productGroupName.trim()) {
      throw new Error("Preencha categoria e nome do produto pai.");
    }

    if (editingGroupId) {
      const updatedGroup = await updateProductGroup({
        id: editingGroupId,
        categoryId: Number(form.categoryId),
        name: form.productGroupName,
        hasVariations: form.hasVariations,
      });
      return updatedGroup;
    }

    const createdGroup = await createProductGroup({
      categoryId: Number(form.categoryId),
      name: form.productGroupName,
      hasVariations: form.hasVariations,
    });
    setEditingGroupId(createdGroup.id);
    return createdGroup;
  }

  async function persistProductAssociations(
    productId: number,
    tagIds: number[],
    sourceImages: LocalImage[],
  ) {
    const currentTagAssociations = productTags.filter((item) => item.productId === productId);
    await syncProductTags({
      productId,
      currentAssociations: currentTagAssociations,
      nextTagIds: tagIds,
    });

    const persistedNewImages = [];
    for (const image of sourceImages) {
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

    const normalizedImages = sourceImages
      .filter((image) => image.imageId)
      .concat(persistedNewImages);

    const nextImages = normalizedImages.map((image, index) => ({
      imageId: image.imageId as number,
      displayOrder: index,
    }));

    await syncProductImages({
      productId,
      currentAssociations: productImages.filter((item) => item.productId === productId),
      nextImages,
    });

    return normalizedImages;
  }

  function addVariationDraft() {
    const draft = createVariationDraft(defaultStatus, form.productGroupName.trim());
    setVariationDrafts((current) => [...current, draft]);
    setActiveVariationKey(draft.key);
  }

  async function handleDeleteVariation(draft: VariationDraft) {
    if (draft.id == null) {
      const nextDrafts = variationDrafts.filter((item) => item.key !== draft.key);
      setVariationDrafts(nextDrafts);
      if (activeVariationKey === draft.key) {
        setActiveVariationKey(nextDrafts[0]?.key ?? null);
      }
      return;
    }

    try {
      await deleteProduct(draft.id);
      await invalidateProductQueries(editingGroupId);
      await refetchGroupProducts();

      const nextDrafts = variationDrafts.filter((item) => item.key !== draft.key);
      setVariationDrafts(nextDrafts);
      if (activeVariationKey === draft.key) {
        setActiveVariationKey(nextDrafts[0]?.key ?? null);
      }

      toast({ title: "Variação removida." });
    } catch (error) {
      toast({
        title: "Erro ao remover variação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setSaving(true);
    try {
      const group = await persistGroup();

      if (!form.hasVariations) {
        if (!productEditor.name.trim() || !productEditor.status) {
          throw new Error("Preencha nome, status e os dados do produto simples.");
        }

        const product = await upsertProduct({
          id: productEditor.id,
          productGroupId: group.id,
          name: productEditor.name,
          description: productEditor.description,
          price: productEditor.price,
          status: Number(productEditor.status),
        });

        const normalizedImages = await persistProductAssociations(
          product.id,
          productEditor.tagIds,
          images,
        );

        setProductEditor((current) => ({ ...current, id: product.id }));
        setImages(normalizedImages);
      } else {
        if (variationDrafts.length === 0) {
          throw new Error("Adicione pelo menos uma variação para salvar o grupo.");
        }

        const nextDrafts: VariationDraft[] = [];
        for (const draft of variationDrafts) {
          if (!draft.name.trim() || !draft.status) {
            throw new Error("Preencha nome e status em todas as variações.");
          }

          const product = await upsertProduct({
            id: draft.id,
            productGroupId: group.id,
            name: draft.name,
            description: draft.description,
            price: draft.price,
            status: Number(draft.status),
          });

          const normalizedImages = await persistProductAssociations(
            product.id,
            draft.tagIds,
            draft.images,
          );

          nextDrafts.push({
            ...draft,
            id: product.id,
            images: normalizedImages,
            canDelete: product.canDelete,
            key: draft.id ? draft.key : `product-${product.id}`,
          });
        }

        setVariationDrafts(nextDrafts);
        setActiveVariationKey((current) => {
          if (!current) return nextDrafts[0]?.key ?? null;
          const active = variationDrafts.find((draft) => draft.key === current);
          if (!active) return nextDrafts[0]?.key ?? null;
          const match = nextDrafts.find((draft) => draft.id === active.id || draft.name === active.name);
          return match?.key ?? nextDrafts[0]?.key ?? null;
        });
      }

      await invalidateProductQueries(group.id);
      if (form.hasVariations) {
        await refetchGroupProducts();
      }

      toast({
        title: form.hasVariations
          ? "Grupo e variações salvos."
          : editingGroupId
            ? "Produto atualizado."
            : "Produto criado.",
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
                                  void handleDeleteVariation({
                                    key: `product-${product.id}`,
                                    id: product.id,
                                    name: product.name,
                                    description: product.description || "",
                                    price: product.price,
                                    status: String(product.status),
                                    tagIds: product.tags.map((tag) => tag.id),
                                    images: toLocalImages(product.images),
                                    canDelete: product.canDelete,
                                  });
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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border/50 bg-card sm:max-w-[1080px]">
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
                  <TagMultiSelect
                    allTags={tags}
                    selectedIds={productEditor.tagIds}
                    onChange={(tagIds) => setProductEditor((current) => ({ ...current, tagIds }))}
                    onTagCreated={registerTag}
                    placeholder="Digite para buscar ou criar etiquetas"
                  />
                </div>

                <div className="space-y-3 border-t border-border/30 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Imagens do Produto</label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
                      <Upload className="h-4 w-4" />
                      Adicionar imagens
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleSimpleFileSelection} />
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
                            <button type="button" className="rounded bg-card/90 p-1" onClick={() => moveProductImage(index, -1)} disabled={index === 0}>
                              ↑
                            </button>
                            <button type="button" className="rounded bg-card/90 p-1" onClick={() => moveProductImage(index, 1)} disabled={index === images.length - 1}>
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
                    <p className="text-sm text-muted-foreground">Você pode montar todas as variações antes de salvar; o frontend cria grupo e produtos em sequência ao enviar.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFetchingGroupProducts ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
                    <Button type="button" variant="outline" size="sm" onClick={addVariationDraft}>
                      <Plus className="mr-2 h-4 w-4" /> Nova variação
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
                  <div className="space-y-3 rounded-2xl border border-border/50 bg-card/80 p-3">
                    {variationDrafts.map((variation) => {
                      const isActive = variation.key === activeVariationKey;

                      return (
                        <button
                          key={variation.key}
                          type="button"
                          onClick={() => setActiveVariationKey(variation.key)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            isActive
                              ? "border-primary bg-primary/8"
                              : "border-border/50 bg-background/60 hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {variation.name || "Nova variação"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatCurrency(variation.price)} • {statusOptions.find((option) => option.id === Number(variation.status))?.name ?? "Sem status"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={variation.id != null && !variation.canDelete}
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (variation.id != null && !variation.canDelete) return;
                                void handleDeleteVariation(variation);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {variation.tagIds.map((tagId) => {
                              const tag = tags.find((item) => item.id === tagId);
                              if (!tag) return null;
                              return (
                                <span key={tag.id} className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}>
                                  {tag.name}
                                </span>
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeVariation ? (
                    <div className="space-y-5 rounded-2xl border border-border/50 bg-card/80 p-4">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Editar variação</h3>
                        <p className="text-sm text-muted-foreground">As novas variações já começam com o nome do produto pai, mas você pode ajustar livremente.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nome da variação</label>
                          <Input value={activeVariation.name} onChange={(event) => updateVariationDraft(activeVariation.key, (draft) => ({ ...draft, name: event.target.value }))} className="bg-background" />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Preço de Venda (R$)</label>
                          <Input type="number" step="0.01" min="0" value={activeVariation.price} onChange={(event) => updateVariationDraft(activeVariation.key, (draft) => ({ ...draft, price: Number(event.target.value) }))} className="bg-background" />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Descrição</label>
                          <Input value={activeVariation.description} onChange={(event) => updateVariationDraft(activeVariation.key, (draft) => ({ ...draft, description: event.target.value }))} className="bg-background" />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <Select value={activeVariation.status} onValueChange={(value) => updateVariationDraft(activeVariation.key, (draft) => ({ ...draft, status: value }))}>
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
                        <TagMultiSelect
                          allTags={tags}
                          selectedIds={activeVariation.tagIds}
                          onChange={(tagIds) => updateVariationDraft(activeVariation.key, (draft) => ({ ...draft, tagIds }))}
                          onTagCreated={registerTag}
                          placeholder="Digite para buscar ou criar etiquetas"
                        />
                      </div>

                      <div className="space-y-3 border-t border-border/30 pt-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Imagens da Variação</label>
                          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
                            <Upload className="h-4 w-4" />
                            Adicionar imagens
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleVariationFileSelection} />
                          </label>
                        </div>

                        {activeVariation.images.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {activeVariation.images.map((image, index) => (
                              <div key={`${image.name}-${index}`} className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50">
                                <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                                <div className="p-2">
                                  <p className="truncate text-xs font-medium">{image.name}</p>
                                  {index === 0 && <p className="mt-1 text-[10px] text-primary">Imagem principal</p>}
                                </div>
                                <div className="absolute right-2 top-2 flex gap-1">
                                  <button type="button" className="rounded bg-card/90 p-1" onClick={() => moveVariationImage(index, -1)} disabled={index === 0}>
                                    ↑
                                  </button>
                                  <button type="button" className="rounded bg-card/90 p-1" onClick={() => moveVariationImage(index, 1)} disabled={index === activeVariation.images.length - 1}>
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded bg-card/90 p-1 text-destructive"
                                    onClick={() => updateVariationDraft(activeVariation.key, (draft) => ({ ...draft, images: draft.images.filter((_, currentIndex) => currentIndex !== index) }))}
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
                    <div className="rounded-xl border border-dashed border-border/50 p-6 text-sm text-muted-foreground">
                      Selecione uma variação para editar os detalhes.
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover-elevate">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
