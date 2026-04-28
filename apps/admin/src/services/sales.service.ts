import {
  apiPost,
  apiDelete,
  extractCreatedId,
  fetchAllPages,
  type SaleDto,
  type SaleItemDto,
} from "@workspace/api-client-react";

export async function getAllSales() {
  return fetchAllPages<SaleDto>("/Sales");
}

export async function getAllSaleItems() {
  return fetchAllPages<SaleItemDto>("/SaleItems");
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
