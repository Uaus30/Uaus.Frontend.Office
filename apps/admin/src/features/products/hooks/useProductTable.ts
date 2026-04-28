import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEnumOptions } from "@/services/core";
import { buildProductCollections } from "@/services/mappers";
import { getAllCategories, getAllDepartments } from "@/services/categories.service";
import { getAllImages } from "@/services/images.service";
import {
  getAllProductGroups,
  getAllProductImages,
  getAllProductTags,
  getProductsPage,
} from "@/services/products.service";
import { getAllTags } from "@/services/tags.service";

export function useProductTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

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
  }, [
    categories,
    departments,
    imagesCatalog,
    productGroups,
    productImages,
    productPage?.data,
    productTags,
    tags,
  ]);

  const totalPages = Math.max(1, Math.ceil((productPage?.total || 0) / limit));

  return {
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    isLoading,
    productPage,
    enrichedProducts,
    totalPages,
    statusOptions,
  };
}
