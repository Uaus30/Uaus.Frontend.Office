import {
  apiDelete,
  apiPost,
  apiPut,
  fetchAllPages,
  type SupplierDto,
} from "@workspace/api-client-react";
import { getPaged } from "./core";

export async function getAllSuppliers() {
  return fetchAllPages<SupplierDto>("/Suppliers");
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
