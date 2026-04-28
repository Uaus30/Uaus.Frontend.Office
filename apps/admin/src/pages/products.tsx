import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useProductTable } from "@/features/products/hooks/useProductTable";
import { useProductEditor } from "@/features/products/hooks/useProductEditor";
import { ProductTable } from "@/features/products/components/ProductTable";
import { ProductEditorModal } from "@/features/products/components/ProductEditorModal";

export default function Products() {
  const table = useProductTable();
  const editor = useProductEditor();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Produtos</h1>
            <p className="mt-1 text-muted-foreground">Gerencie o catálogo real da loja no modelo departamento, categoria, grupo e produto.</p>
          </div>
          <Button onClick={() => editor.openModal()} className="bg-primary text-primary-foreground hover-elevate">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
          </Button>
        </div>

        <ProductTable
          isLoading={table.isLoading}
          search={table.search}
          setSearch={table.setSearch}
          page={table.page}
          setPage={table.setPage}
          limit={table.limit}
          setLimit={table.setLimit}
          totalPages={table.totalPages}
          productPageTotal={table.productPage?.total || 0}
          enrichedProducts={table.enrichedProducts}
          statusOptions={table.statusOptions}
          onEdit={editor.openModal}
          onDelete={(product) => {
            void editor.handleDeleteVariation({
              key: `product-${product.id}`,
              id: product.id,
              name: product.name,
              description: product.description || "",
              price: product.price,
              status: String(product.status),
              tagIds: product.tags.map((tag) => tag.id),
              images: editor.toLocalImages(product.images),
              canDelete: product.canDelete,
            });
          }}
        />
      </div>

      <ProductEditorModal editor={editor} />
    </AppLayout>
  );
}
