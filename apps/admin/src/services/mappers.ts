import type {
  CategoryDto,
  CustomerDto,
  DepartmentDto,
  ImageDto,
  ProductDto,
  ProductGroupDto,
  ProductImageDto,
  ProductTagDto,
  SaleDto,
  SaleItemDto,
  TagDto,
  UserDto,
  UserListDto,
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
