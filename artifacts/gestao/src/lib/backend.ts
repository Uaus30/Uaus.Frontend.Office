import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  API_BASE_URL,
  extractCreatedId,
  fetchAllPages,
  mapPagedResult,
  type BackendPagedResult,
  type CategoryDto,
  type CustomerDto,
  type DepartmentDto,
  type EnumOptionDto,
  type ImageDto,
  type ProductDto,
  type ProductGroupDto,
  type ProductImageDto,
  type ProductTagDto,
  type SaleDto,
  type SaleItemDto,
  type SupplierDto,
  type TagDto,
  type UiPagedResult,
  type UserDto,
  type UserListDto,
} from "@workspace/api-client-react";

export type ProductImageView = {
  associationId?: number;
  imageId: number;
  displayOrder: number;
  image: ImageDto;
};

export type EnrichedProduct = ProductDto & {
  productGroup: ProductGroupDto | null;
  category: CategoryDto | null;
  department: DepartmentDto | null;
  tags: TagDto[];
  images: ProductImageView[];
};

export type EnrichedSale = SaleDto & {
  customer: CustomerDto | null;
  items: Array<
    SaleItemDto & {
      product: EnrichedProduct | null;
    }
  >;
};

export type CustomerStats = {
  totalPurchases: number;
  purchaseCount: number;
};

export type CategoryReport = {
  category: CategoryDto;
  totalRevenue: number;
  totalSales: number;
  totalStock: number;
  products: Array<{
    id: number;
    name: string;
    price: number;
    stock: number;
    totalSales: number;
    totalRevenue: number;
  }>;
};

export type TagReport = {
  tag: TagDto;
  totalRevenue: number;
  totalSales: number;
  totalStock: number;
  products: Array<{
    id: number;
    name: string;
    stock: number;
    totalSales: number;
    totalRevenue: number;
  }>;
};

export type DashboardMetrics = {
  totalRevenue: number;
  revenueGrowth: number;
  totalSales: number;
  salesGrowth: number;
  averageTicket: number;
  ticketGrowth: number;
  totalProfit: number;
  profitGrowth: number;
};

export type DashboardChartPoint = {
  date: string;
  revenue: number;
  profit: number;
};

export type DashboardCategorySlice = {
  categoryName: string;
  totalRevenue: number;
};

export type TopProduct = {
  id: number;
  name: string;
  stock: number;
  totalSales: number;
  totalRevenue: number;
};

export function getDisplayName(user: Pick<UserDto | UserListDto, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName ?? ""}`.trim();
}

export function splitFullName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts = normalized.split(" ");
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function usernameFromEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const [left] = trimmed.split("@");
  return left || trimmed;
}

export async function getEnumOptions(path: string) {
  return apiGet<EnumOptionDto[]>(path, undefined, { auth: false });
}

export async function getPaged<T>(path: string, params?: Record<string, unknown>) {
  const result = await apiGet<BackendPagedResult<T>>(path, params);
  return mapPagedResult(result);
}

export async function getAllDepartments() {
  return fetchAllPages<DepartmentDto>("/Departments");
}

export async function getAllCategories(params?: { departmentId?: number }) {
  return fetchAllPages<CategoryDto>("/Categories", params);
}

export async function getAllProductGroups(params?: { categoryId?: number }) {
  return fetchAllPages<ProductGroupDto>("/ProductGroups", params);
}

export async function getAllProducts(params?: { productGroupId?: number }) {
  return fetchAllPages<ProductDto>("/Products", params);
}

export async function getAllTags() {
  return fetchAllPages<TagDto>("/Tags");
}

export async function getAllProductTags() {
  return fetchAllPages<ProductTagDto>("/ProductTags");
}

export async function getAllImages() {
  return fetchAllPages<ImageDto>("/Images");
}

export async function getAllProductImages() {
  return fetchAllPages<ProductImageDto>("/ProductImages");
}

export async function getAllCustomers() {
  return fetchAllPages<CustomerDto>("/Customers");
}

export async function getAllSales() {
  return fetchAllPages<SaleDto>("/Sales");
}

export async function getAllSaleItems() {
  return fetchAllPages<SaleItemDto>("/SaleItems");
}

export async function getAllSuppliers() {
  return fetchAllPages<SupplierDto>("/Suppliers");
}

export async function getProductsPage(params?: {
  search?: string;
  productGroupId?: number;
  page?: number;
  limit?: number;
}) {
  return getPaged<ProductDto>("/Products", {
    search: params?.search,
    productGroupId: params?.productGroupId,
    page: params?.page ?? 1,
    size: params?.limit ?? 20,
  });
}

export async function getTagsPage(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return getPaged<TagDto>("/Tags", {
    search: params?.search,
    page: params?.page ?? 1,
    size: params?.limit ?? 20,
  });
}

export async function searchTags(params?: {
  search?: string;
  limit?: number;
}) {
  return getPaged<TagDto>("/Tags", {
    search: params?.search,
    page: 1,
    size: params?.limit ?? 20,
  });
}

export async function getSuppliersPage(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return getPaged<SupplierDto>("/Suppliers", {
    search: params?.search,
    page: params?.page ?? 1,
    size: params?.limit ?? 20,
  });
}

export async function getImagesPage(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return getPaged<ImageDto>("/Images", {
    search: params?.search,
    page: params?.page ?? 1,
    size: params?.limit ?? 20,
  });
}

export async function getCategoriesPage(params?: {
  search?: string;
  departmentId?: number;
  page?: number;
  limit?: number;
}) {
  return getPaged<CategoryDto>("/Categories", {
    search: params?.search,
    departmentId: params?.departmentId,
    page: params?.page ?? 1,
    size: params?.limit ?? 20,
  });
}

export async function getDepartmentsPage(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return getPaged<DepartmentDto>("/Departments", {
    search: params?.search,
    page: params?.page ?? 1,
    size: params?.limit ?? 20,
  });
}

export function buildProductCollections(input: {
  products: ProductDto[];
  productGroups: ProductGroupDto[];
  categories: CategoryDto[];
  departments: DepartmentDto[];
  tags: TagDto[];
  productTags: ProductTagDto[];
  images: ImageDto[];
  productImages: ProductImageDto[];
}) {
  const groupsById = new Map(input.productGroups.map((item) => [item.id, item]));
  const categoriesById = new Map(input.categories.map((item) => [item.id, item]));
  const departmentsById = new Map(input.departments.map((item) => [item.id, item]));
  const tagsById = new Map(input.tags.map((item) => [item.id, item]));
  const imagesById = new Map(input.images.map((item) => [item.id, item]));

  const tagsByProductId = new Map<number, TagDto[]>();
  input.productTags.forEach((item) => {
    const tag = tagsById.get(item.tagId);
    if (!tag) return;
    const current = tagsByProductId.get(item.productId) ?? [];
    current.push(tag);
    tagsByProductId.set(item.productId, current);
  });

  const imagesByProductId = new Map<number, ProductImageView[]>();
  input.productImages.forEach((item) => {
    const image = imagesById.get(item.imageId);
    if (!image) return;
    const current = imagesByProductId.get(item.productId) ?? [];
    current.push({
      associationId: item.id,
      imageId: item.imageId,
      displayOrder: item.displayOrder,
      image,
    });
    imagesByProductId.set(item.productId, current);
  });

  const enrichedProducts = input.products.map<EnrichedProduct>((product) => {
    const productGroup = groupsById.get(product.productGroupId) ?? null;
    const category = productGroup ? categoriesById.get(productGroup.categoryId) ?? null : null;
    const department = category ? departmentsById.get(category.departmentId) ?? null : null;
    const tags = (tagsByProductId.get(product.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
    const images = (imagesByProductId.get(product.id) ?? []).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );

    return {
      ...product,
      productGroup,
      category,
      department,
      tags,
      images,
    };
  });

  return {
    groupsById,
    categoriesById,
    departmentsById,
    tagsById,
    imagesById,
    enrichedProducts,
  };
}

export function buildEnrichedSales(input: {
  sales: SaleDto[];
  saleItems: SaleItemDto[];
  customers: CustomerDto[];
  enrichedProducts: EnrichedProduct[];
}) {
  const customersById = new Map(input.customers.map((item) => [item.id, item]));
  const productsById = new Map(input.enrichedProducts.map((item) => [item.id, item]));
  const itemsBySaleId = new Map<number, SaleItemDto[]>();

  input.saleItems.forEach((item) => {
    const current = itemsBySaleId.get(item.saleId) ?? [];
    current.push(item);
    itemsBySaleId.set(item.saleId, current);
  });

  return input.sales.map<EnrichedSale>((sale) => ({
    ...sale,
    customer: sale.customerId ? customersById.get(sale.customerId) ?? null : null,
    items: (itemsBySaleId.get(sale.id) ?? []).map((item) => ({
      ...item,
      product: productsById.get(item.productId) ?? null,
    })),
  }));
}

export function buildCustomerStats(sales: SaleDto[]) {
  const stats = new Map<number, CustomerStats>();

  sales.forEach((sale) => {
    if (!sale.customerId) return;

    const current = stats.get(sale.customerId) ?? {
      totalPurchases: 0,
      purchaseCount: 0,
    };

    current.totalPurchases += sale.total;
    current.purchaseCount += 1;
    stats.set(sale.customerId, current);
  });

  return stats;
}

export async function createCategory(payload: {
  departmentId: number;
  name: string;
  description?: string | null;
}) {
  return apiPost<null>("/Categories", payload);
}

export async function updateCategory(payload: {
  id: number;
  departmentId: number;
  name: string;
  description?: string | null;
}) {
  return apiPut<CategoryDto>("/Categories", payload);
}

export async function deleteCategory(id: number) {
  return apiDelete<null>(`/Categories/${id}`);
}

export async function createDepartment(payload: {
  name: string;
  description?: string | null;
}) {
  return apiPost<null>("/Departments", payload);
}

export async function updateDepartment(payload: {
  id: number;
  name: string;
  description?: string | null;
}) {
  return apiPut<DepartmentDto>("/Departments", payload);
}

export async function deleteDepartment(id: number) {
  return apiDelete<null>(`/Departments/${id}`);
}

export async function createTag(payload: {
  name: string;
  color: string;
  isPublic?: boolean;
}) {
  const response = await apiPost<TagDto>("/Tags", {
    name: payload.name.trim(),
    color: payload.color,
    isPublic: payload.isPublic ?? false,
  });

  if (!response.data) {
    throw new Error("Nao foi possivel identificar a etiqueta criada.");
  }

  return response.data;
}

export async function updateTag(payload: {
  id: number;
  name: string;
  color: string;
  isPublic: boolean;
}) {
  const response = await apiPut<TagDto>("/Tags", {
    id: payload.id,
    name: payload.name.trim(),
    color: payload.color,
    isPublic: payload.isPublic,
  });

  if (!response.data) {
    throw new Error("Nao foi possivel identificar a etiqueta atualizada.");
  }

  return response.data;
}

export async function deleteTag(id: number) {
  return apiDelete<null>(`/Tags/${id}`);
}

export async function createSupplier(payload: Omit<SupplierDto, "id" | "createdAt" | "updatedAt">) {
  return apiPost<null>("/Suppliers", payload);
}

export async function updateSupplier(
  payload: Omit<SupplierDto, "createdAt" | "updatedAt">,
) {
  return apiPut<SupplierDto>("/Suppliers", payload);
}

export async function deleteSupplier(id: number) {
  return apiDelete<null>(`/Suppliers/${id}`);
}

export function buildPublicImageUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

export async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export async function createImageFromFile(payload: {
  file: File;
  name: string;
  type: number;
}) {
  const content = await fileToDataUrl(payload.file);
  const result = await apiPost<ImageDto>("/Images", {
    name: payload.name,
    type: payload.type,
    content,
  });
  return result.data as ImageDto;
}

export async function updateImageRecord(payload: {
  id: number;
  name: string;
  type: number;
  file?: File | null;
}) {
  const content = payload.file ? await fileToDataUrl(payload.file) : undefined;
  const result = await apiPut<ImageDto>("/Images", {
    id: payload.id,
    name: payload.name,
    type: payload.type,
    content,
  });
  return result.data as ImageDto;
}

export async function deleteImage(id: number) {
  return apiDelete<null>(`/Images/${id}`);
}

export async function createOrReuseProductGroup(payload: {
  categoryId: number;
  name: string;
  description?: string | null;
  hasVariations?: boolean;
  existingGroups: ProductGroupDto[];
}) {
  const existing = payload.existingGroups.find(
    (item) =>
      item.categoryId === payload.categoryId &&
      item.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
  );

  if (existing) return existing;

  const response = await apiPost<ProductGroupDto>("/ProductGroups", {
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    hasVariations: payload.hasVariations ?? false,
  });

  if (response.data) {
    return response.data;
  }

  const createdId = extractCreatedId(response.response);
  if (!createdId) {
    throw new Error("Nao foi possivel identificar o grupo de produto criado.");
  }

  return {
    id: createdId,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    hasVariations: payload.hasVariations ?? false,
    canDelete: true,
  } satisfies ProductGroupDto;
}

export async function createProductGroup(payload: {
  categoryId: number;
  name: string;
  description?: string | null;
  hasVariations: boolean;
}) {
  const response = await apiPost<ProductGroupDto>("/ProductGroups", {
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    hasVariations: payload.hasVariations,
  });

  if (response.data) {
    return response.data;
  }

  const createdId = extractCreatedId(response.response);
  if (!createdId) {
    throw new Error("Nao foi possivel identificar o grupo de produto criado.");
  }

  return {
    id: createdId,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    hasVariations: payload.hasVariations,
    canDelete: true,
  } satisfies ProductGroupDto;
}

export async function updateProductGroup(payload: {
  id: number;
  categoryId: number;
  name: string;
  description?: string | null;
  hasVariations: boolean;
}) {
  const response = await apiPut<ProductGroupDto>("/ProductGroups", {
    id: payload.id,
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    hasVariations: payload.hasVariations,
  });

  if (!response.data) {
    throw new Error("Nao foi possivel identificar o grupo de produto atualizado.");
  }

  return response.data;
}

export async function upsertProduct(payload: {
  id?: number | null;
  productGroupId: number;
  name: string;
  description?: string | null;
  price: number;
  status: number;
}) {
  const request = {
    productGroupId: payload.productGroupId,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    price: payload.price,
    costPrice: 0,
    stock: 0,
    status: payload.status,
  };

  if (payload.id) {
    const response = await apiPut<ProductDto>("/Products", {
      id: payload.id,
      ...request,
    });

    if (!response.data) {
      throw new Error("Nao foi possivel identificar o produto atualizado.");
    }

    return response.data;
  }

  const response = await apiPost<ProductDto>("/Products", request);
  if (response.data) {
    return response.data;
  }

  const createdId = extractCreatedId(response.response);
  if (!createdId) {
    throw new Error("Nao foi possivel identificar o produto criado.");
  }

  return {
    id: createdId,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    productGroupId: payload.productGroupId,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    price: payload.price,
    costPrice: 0,
    stock: 0,
    status: payload.status,
    canDelete: true,
  } satisfies ProductDto;
}

export async function deleteProduct(id: number) {
  return apiDelete<null>(`/Products/${id}`);
}

export async function syncProductTags(payload: {
  productId: number;
  currentAssociations: ProductTagDto[];
  nextTagIds: number[];
}) {
  const currentTagIds = new Set(payload.currentAssociations.map((item) => item.tagId));
  const nextTagIds = new Set(payload.nextTagIds);

  const toCreate = payload.nextTagIds.filter((tagId) => !currentTagIds.has(tagId));
  const toDelete = payload.currentAssociations.filter((item) => !nextTagIds.has(item.tagId));

  for (const association of toDelete) {
    await apiDelete<null>(`/ProductTags/${association.id}`);
  }

  for (const tagId of toCreate) {
    await apiPost<null>("/ProductTags", {
      productId: payload.productId,
      tagId,
    });
  }
}

export async function syncProductImages(payload: {
  productId: number;
  currentAssociations: ProductImageDto[];
  nextImages: Array<{ imageId: number; displayOrder: number }>;
}) {
  const currentByImageId = new Map(
    payload.currentAssociations.map((item) => [item.imageId, item]),
  );
  const nextImageIds = new Set(payload.nextImages.map((item) => item.imageId));

  for (const association of payload.currentAssociations) {
    if (!nextImageIds.has(association.imageId)) {
      await apiDelete<null>(`/ProductImages/${association.id}`);
    }
  }

  for (const nextImage of payload.nextImages) {
    const existing = currentByImageId.get(nextImage.imageId);

    if (!existing) {
      await apiPost<null>("/ProductImages", {
        productId: payload.productId,
        imageId: nextImage.imageId,
        displayOrder: nextImage.displayOrder,
      });
      continue;
    }

    if (existing.displayOrder !== nextImage.displayOrder) {
      await apiPut<ProductImageDto>("/ProductImages", {
        id: existing.id,
        productId: existing.productId,
        imageId: existing.imageId,
        displayOrder: nextImage.displayOrder,
      });
    }
  }
}

export async function createSaleWithItems(payload: {
  customerId: number | null;
  discount: number;
  paymentMethod: number;
  paymentStatus: number;
  notes?: string | null;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}) {
  const total = payload.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  ) - payload.discount;

  const saleResponse = await apiPost<null>("/Sales", {
    customerId: payload.customerId,
    total: Math.max(0, total),
    discount: payload.discount,
    paymentMethod: payload.paymentMethod,
    paymentStatus: payload.paymentStatus,
    notes: payload.notes?.trim() || null,
  });

  const saleId = extractCreatedId(saleResponse.response);
  if (!saleId) {
    throw new Error("Não foi possível identificar a venda criada.");
  }

  for (const item of payload.items) {
    await apiPost<null>("/SaleItems", {
      saleId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
    });
  }

  return saleId;
}

export async function deleteSaleWithItems(saleId: number) {
  const saleItems = await getAllSaleItems();
  const relatedItems = saleItems.filter((item) => item.saleId === saleId);

  for (const item of relatedItems) {
    await apiDelete<null>(`/SaleItems/${item.id}`);
  }

  await apiDelete<null>(`/Sales/${saleId}`);
}

function filterSalesByDate(
  sales: EnrichedSale[],
  startDate?: string,
  endDate?: string,
) {
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

  return sales.filter((sale) => {
    const date = new Date(sale.createdAt);
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
}

function calculateGrowth(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function buildPeriodBounds(period: "7d" | "30d" | "90d" | "1y") {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      break;
  }

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    start,
    end,
    previousStart,
    previousEnd,
  };
}

function sumSaleProfit(sales: EnrichedSale[]) {
  return sales.reduce(
    (sum, sale) => sum + sale.items.reduce((saleSum, item) => saleSum + item.profit, 0),
    0,
  );
}

export function buildDashboardData(input: {
  sales: EnrichedSale[];
  period: "7d" | "30d" | "90d" | "1y";
}) {
  const bounds = buildPeriodBounds(input.period);
  const currentSales = filterSalesByDate(
    input.sales,
    bounds.start.toISOString().slice(0, 10),
    bounds.end.toISOString().slice(0, 10),
  );
  const previousSales = filterSalesByDate(
    input.sales,
    bounds.previousStart.toISOString().slice(0, 10),
    bounds.previousEnd.toISOString().slice(0, 10),
  );

  const currentRevenue = currentSales.reduce((sum, sale) => sum + sale.total, 0);
  const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.total, 0);
  const currentCount = currentSales.length;
  const previousCount = previousSales.length;
  const currentTicket = currentCount ? currentRevenue / currentCount : 0;
  const previousTicket = previousCount ? previousRevenue / previousCount : 0;
  const currentProfit = sumSaleProfit(currentSales);
  const previousProfit = sumSaleProfit(previousSales);

  const metrics: DashboardMetrics = {
    totalRevenue: currentRevenue,
    revenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
    totalSales: currentCount,
    salesGrowth: calculateGrowth(currentCount, previousCount),
    averageTicket: currentTicket,
    ticketGrowth: calculateGrowth(currentTicket, previousTicket),
    totalProfit: currentProfit,
    profitGrowth: calculateGrowth(currentProfit, previousProfit),
  };

  const chartBuckets = new Map<string, DashboardChartPoint>();

  currentSales.forEach((sale) => {
    const key = sale.createdAt.slice(0, 10);
    const current = chartBuckets.get(key) ?? {
      date: new Date(sale.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue: 0,
      profit: 0,
    };

    current.revenue += sale.total;
    current.profit += sale.items.reduce((sum, item) => sum + item.profit, 0);
    chartBuckets.set(key, current);
  });

  const chartData = Array.from(chartBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);

  const revenueByCategory = new Map<string, number>();
  const topProducts = new Map<number, TopProduct>();

  currentSales.forEach((sale) => {
    sale.items.forEach((item) => {
      const product = item.product;
      const categoryName = product?.category?.name ?? "Sem categoria";
      revenueByCategory.set(
        categoryName,
        (revenueByCategory.get(categoryName) ?? 0) + item.subtotal,
      );

      const current = topProducts.get(item.productId) ?? {
        id: item.productId,
        name: product?.name ?? `Produto #${item.productId}`,
        stock: product?.stock ?? 0,
        totalSales: 0,
        totalRevenue: 0,
      };

      current.totalSales += item.quantity;
      current.totalRevenue += item.subtotal;
      topProducts.set(item.productId, current);
    });
  });

  const categoryData: DashboardCategorySlice[] = Array.from(revenueByCategory.entries())
    .map(([categoryName, totalRevenue]) => ({
      categoryName,
      totalRevenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  const topProductsData = Array.from(topProducts.values())
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10);

  return {
    metrics,
    chartData,
    categoryData,
    topProducts: topProductsData,
  };
}

export function buildDashboardSnapshot(sales: EnrichedSale[]) {
  const currentRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const currentCount = sales.length;
  const currentTicket = currentCount ? currentRevenue / currentCount : 0;
  const currentProfit = sumSaleProfit(sales);

  const metrics: DashboardMetrics = {
    totalRevenue: currentRevenue,
    revenueGrowth: 0,
    totalSales: currentCount,
    salesGrowth: 0,
    averageTicket: currentTicket,
    ticketGrowth: 0,
    totalProfit: currentProfit,
    profitGrowth: 0,
  };

  const chartBuckets = new Map<string, DashboardChartPoint>();
  const revenueByCategory = new Map<string, number>();
  const topProducts = new Map<number, TopProduct>();

  sales.forEach((sale) => {
    const key = sale.createdAt.slice(0, 10);
    const currentBucket = chartBuckets.get(key) ?? {
      date: new Date(sale.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue: 0,
      profit: 0,
    };

    currentBucket.revenue += sale.total;
    currentBucket.profit += sale.items.reduce((sum, item) => sum + item.profit, 0);
    chartBuckets.set(key, currentBucket);

    sale.items.forEach((item) => {
      const categoryName = item.product?.category?.name ?? "Sem categoria";
      revenueByCategory.set(
        categoryName,
        (revenueByCategory.get(categoryName) ?? 0) + item.subtotal,
      );

      const currentProduct = topProducts.get(item.productId) ?? {
        id: item.productId,
        name: item.product?.name ?? `Produto #${item.productId}`,
        stock: item.product?.stock ?? 0,
        totalSales: 0,
        totalRevenue: 0,
      };

      currentProduct.totalSales += item.quantity;
      currentProduct.totalRevenue += item.subtotal;
      topProducts.set(item.productId, currentProduct);
    });
  });

  return {
    metrics,
    chartData: Array.from(chartBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value),
    categoryData: Array.from(revenueByCategory.entries())
      .map(([categoryName, totalRevenue]) => ({ categoryName, totalRevenue }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5),
    topProducts: Array.from(topProducts.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10),
  };
}

export function buildCategoryReport(category: CategoryDto, products: EnrichedProduct[], sales: EnrichedSale[]): CategoryReport {
  const categoryProducts = products.filter((product) => product.category?.id === category.id);
  const productStats = new Map<number, { totalSales: number; totalRevenue: number }>();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const product = categoryProducts.find((entry) => entry.id === item.productId);
      if (!product) return;

      const current = productStats.get(item.productId) ?? { totalSales: 0, totalRevenue: 0 };
      current.totalSales += item.quantity;
      current.totalRevenue += item.subtotal;
      productStats.set(item.productId, current);
    });
  });

  const reportProducts = categoryProducts.map((product) => {
    const stats = productStats.get(product.id) ?? { totalSales: 0, totalRevenue: 0 };
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
    };
  });

  return {
    category,
    totalRevenue: reportProducts.reduce((sum, item) => sum + item.totalRevenue, 0),
    totalSales: reportProducts.reduce((sum, item) => sum + item.totalSales, 0),
    totalStock: reportProducts.reduce((sum, item) => sum + item.stock, 0),
    products: reportProducts.sort((a, b) => b.totalRevenue - a.totalRevenue),
  };
}

export function buildTagReport(tag: TagDto, products: EnrichedProduct[], sales: EnrichedSale[]): TagReport {
  const tagProducts = products.filter((product) => product.tags.some((item) => item.id === tag.id));
  const productStats = new Map<number, { totalSales: number; totalRevenue: number }>();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const product = tagProducts.find((entry) => entry.id === item.productId);
      if (!product) return;

      const current = productStats.get(item.productId) ?? { totalSales: 0, totalRevenue: 0 };
      current.totalSales += item.quantity;
      current.totalRevenue += item.subtotal;
      productStats.set(item.productId, current);
    });
  });

  const reportProducts = tagProducts.map((product) => {
    const stats = productStats.get(product.id) ?? { totalSales: 0, totalRevenue: 0 };
    return {
      id: product.id,
      name: product.name,
      stock: product.stock,
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
    };
  });

  return {
    tag,
    totalRevenue: reportProducts.reduce((sum, item) => sum + item.totalRevenue, 0),
    totalSales: reportProducts.reduce((sum, item) => sum + item.totalSales, 0),
    totalStock: reportProducts.reduce((sum, item) => sum + item.stock, 0),
    products: reportProducts.sort((a, b) => b.totalRevenue - a.totalRevenue),
  };
}
