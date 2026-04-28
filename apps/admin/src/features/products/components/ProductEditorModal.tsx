import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { formatCurrency } from "@/lib/formatters";
import { Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { useProductEditor } from "../hooks/useProductEditor";

type ProductEditorModalProps = {
  editor: ReturnType<typeof useProductEditor>;
};

export function ProductEditorModal({ editor }: ProductEditorModalProps) {
  const {
    modalOpen,
    setModalOpen,
    resetForm,
    form,
    setForm,
    departments,
    filteredCategories,
    productEditor,
    setProductEditor,
    selectableStatusOptions,
    tags,
    registerTag,
    images,
    setImages,
    moveProductImage,
    handleSimpleFileSelection,
    isFetchingGroupProducts,
    addVariationDraft,
    variationDrafts,
    activeVariationKey,
    setActiveVariationKey,
    activeVariation,
    statusOptions,
    handleDeleteVariation,
    updateVariationDraft,
    moveVariationImage,
    handleVariationFileSelection,
    saving,
    handleSubmit,
  } = editor;

  return (
    <Dialog
      open={modalOpen}
      onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent aria-describedby={undefined} className="flex max-h-[90vh] flex-col border-border/50 bg-card sm:max-w-[900px] lg:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {form.productGroupName ? "Editar Grupo de Produtos" : "Novo Grupo de Produtos"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto py-4 pr-2">
            <div className="space-y-4 rounded-2xl border border-border/50 bg-background/40 p-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Classificação & Agrupamento</h2>
                <p className="text-sm text-muted-foreground">Defina onde os produtos vão aparecer e como se agrupam logicamente no site.</p>
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
