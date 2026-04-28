import {
  apiDelete,
  apiPost,
  apiPut,
  fetchAllPages,
  type ImageDto,
  type ProductImageDto,
} from "@workspace/api-client-react";
import { getPaged, fileToDataUrl } from "./core";

export async function getAllImages() {
  return fetchAllPages<ImageDto>("/Images");
}

export async function getAllProductImages() {
  return fetchAllPages<ProductImageDto>("/ProductImages");
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
