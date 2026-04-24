import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, ExternalLink, ImageIcon, Loader2, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  buildPublicImageUrl,
  createImageFromFile,
  deleteImage,
  getEnumOptions,
  getImagesPage,
  updateImageRecord,
} from "@/lib/backend";

export default function Images() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameImage, setRenameImage] = useState<any | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: imageTypes = [] } = useQuery({
    queryKey: ["image-type-options"],
    queryFn: () => getEnumOptions("/Images/enums/image-type"),
  });

  const selectableTypes = useMemo(() => imageTypes.filter((item) => item.allowSelect), [imageTypes]);

  const { data: imagePage, isLoading } = useQuery({
    queryKey: ["images-page", { search, page, limit }],
    queryFn: () => getImagesPage({ search, page, limit }),
  });

  const filteredImages = useMemo(() => {
    const base = imagePage?.data ?? [];
    if (typeFilter === "all") return base;
    return base.filter((item) => String(item.type) === typeFilter);
  }, [imagePage?.data, typeFilter]);

  function resetUploadForm() {
    setFormName("");
    setFormType(selectableTypes[0]?.id.toString() ?? "");
    setFile(null);
    setPreview(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    if (!formName) {
      setFormName(selected.name.replace(/\.[^/.]+$/, ""));
    }
    setPreview(URL.createObjectURL(selected));
  }

  async function handleUpload() {
    if (!file || !formName || !formType) return;

    setUploading(true);
    try {
      await createImageFromFile({
        file,
        name: formName.trim(),
        type: Number(formType),
      });

      queryClient.invalidateQueries({ queryKey: ["images-page"] });
      toast({ title: "Imagem salva com sucesso." });
      setUploadOpen(false);
      resetUploadForm();
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  function handleRenameOpen(image: any) {
    setRenameImage(image);
    setRenameName(image.name);
    setRenameOpen(true);
  }

  async function handleRename() {
    if (!renameImage || !renameName.trim()) return;

    setRenaming(true);
    try {
      await updateImageRecord({
        id: renameImage.id,
        name: renameName.trim(),
        type: renameImage.type,
      });

      queryClient.invalidateQueries({ queryKey: ["images-page"] });
      toast({ title: "Nome atualizado." });
      setRenameOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao renomear",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteImage(id);
      queryClient.invalidateQueries({ queryKey: ["images-page"] });
      toast({ title: "Imagem removida." });
    } catch (error) {
      toast({
        title: "Erro ao remover imagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  function copyUrl(id: number, url: string) {
    navigator.clipboard.writeText(buildPublicImageUrl(url));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalPages = Math.max(1, Math.ceil((imagePage?.total || 0) / limit));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Imagens</h1>
            <p className="mt-1 text-muted-foreground">Gerencie imagens e obtenha URLs públicas para uso no sistema.</p>
          </div>
          <Button onClick={() => {
            resetUploadForm();
            setUploadOpen(true);
          }} className="bg-primary text-primary-foreground hover-elevate">
            <Plus className="mr-2 h-4 w-4" /> Nova Imagem
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg shadow-black/5">
          <div className="flex flex-col gap-3 border-b border-border/50 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="bg-background pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-52 bg-background">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {selectableTypes.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <ImageIcon className="h-12 w-12 opacity-30" />
              <p>Nenhuma imagem encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredImages.map((image) => (
                <div key={image.id} className="group relative overflow-hidden rounded-xl border border-border/50 bg-background transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted/30">
                    <img src={buildPublicImageUrl(image.url)} alt={image.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs font-medium" title={image.name}>
                      {image.name}
                    </p>
                    <Badge className="mt-1 border-0 bg-emerald-500/20 text-[10px] text-emerald-400">
                      {imageTypes.find((type) => type.id === image.type)?.name ?? image.type}
                    </Badge>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(image.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => copyUrl(image.id, image.url)}
                      className="rounded-lg border border-border/50 bg-card/90 p-1.5 backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
                      title="Copiar URL"
                    >
                      {copiedId === image.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <a
                      href={buildPublicImageUrl(image.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-border/50 bg-card/90 p-1.5 backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
                      title="Abrir imagem"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => handleRenameOpen(image)}
                      className="rounded-lg border border-border/50 bg-card/90 p-1.5 backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
                      title="Renomear"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Remover esta imagem?")) {
                          void handleDelete(image.id);
                        }
                      }}
                      className="rounded-lg border border-border/50 bg-card/90 p-1.5 backdrop-blur-sm transition-colors hover:border-destructive/50 hover:bg-destructive/20 hover:text-destructive"
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/50 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-2">Total: {imagePage?.total || 0}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </Button>
              <span className="px-2 py-1 text-xs">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => {
        setUploadOpen(open);
        if (!open) resetUploadForm();
      }}>
        <DialogContent className="border-border/50 bg-card sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Nova Imagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className="cursor-pointer rounded-xl border-2 border-dashed border-border/50 p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" className="mx-auto max-h-40 rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8 opacity-50" />
                  <p className="text-sm">Clique para selecionar uma imagem</p>
                  <p className="text-xs">JPG, PNG, GIF, WebP</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="space-y-1.5">
              <Label>Nome da imagem</Label>
              <Input value={formName} onChange={(event) => setFormName(event.target.value)} className="bg-background" />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectableTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!file || !formName || !formType || uploading} className="hover-elevate">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? "Enviando..." : "Salvar Imagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="border-border/50 bg-card sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Renomear Imagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {renameImage && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                <img src={buildPublicImageUrl(renameImage.url)} alt={renameImage.name} className="h-12 w-12 flex-shrink-0 rounded-lg border border-border/50 object-cover" />
                <div>
                  <p className="text-xs text-muted-foreground">Arquivo atual</p>
                  <p className="max-w-[220px] truncate text-sm font-medium">{renameImage.name}</p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Novo nome</Label>
              <Input
                value={renameName}
                onChange={(event) => setRenameName(event.target.value)}
                className="bg-background"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleRename();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Apenas o nome é alterado. Para mudar o arquivo, exclua e faça um novo upload.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || renaming} className="hover-elevate">
              {renaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
