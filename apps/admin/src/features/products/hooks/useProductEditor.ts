import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { TagDto } from "@workspace/api-client-react";
import { getEnumOptions, buildPublicImageUrl } from "@/services/core";
import { buildProductCollections } from "@/services/mappers";
import { getAllCategories, getAllDepartments } from "@/services/categories.service";
import { getAllImages, createImageFromFile } from "@/services/images.service";
import {
  getAllProductGroups,
  getAllProductImages,
  getAllProductTags,
  getProductsPage,
  createProductGroup,
  updateProductGroup,
  upsertProduct,
  deleteProduct,
  syncProductTags,
  syncProductImages,
} from "@/services/products.service";
import { getAllTags } from "@/services/tags.service";
import type { ProductGroupForm, ProductEditorForm, LocalImage, VariationDraft } from "../types";

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

export function useProductEditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  return {
    modalOpen,
    setModalOpen,
    form,
    setForm,
    productEditor,
    setProductEditor,
    variationDrafts,
    activeVariationKey,
    setActiveVariationKey,
    activeVariation,
    images,
    setImages,
    saving,
    departments,
    categories,
    filteredCategories,
    tags,
    statusOptions,
    selectableStatusOptions,
    isFetchingGroupProducts,
    editingGroupId,
    openModal,
    resetForm,
    registerTag,
    updateVariationDraft,
    moveProductImage,
    moveVariationImage,
    handleSimpleFileSelection,
    handleVariationFileSelection,
    addVariationDraft,
    handleDeleteVariation,
    handleSubmit,
    toLocalImages
  };
}
