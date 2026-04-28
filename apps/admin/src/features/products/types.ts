export type ProductGroupForm = {
  departmentId: string;
  categoryId: string;
  productGroupName: string;
  hasVariations: boolean;
};

export type ProductEditorForm = {
  id: number | null;
  name: string;
  description: string;
  price: number;
  status: string;
  tagIds: number[];
};

export type LocalImage = {
  imageId?: number;
  associationId?: number;
  name: string;
  url: string;
  file?: File;
};

export type VariationDraft = ProductEditorForm & {
  key: string;
  images: LocalImage[];
  canDelete: boolean;
};
