import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Loader2, ImageIcon, Upload, Copy, Check, ExternalLink, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const IMAGE_TYPES = [
  { value: "banner", label: "Banner" },
  { value: "institucional", label: "Institucional" },
  { value: "produtos", label: "Produtos" },
  { value: "carrossel", label: "Carrossel" },
];

const TYPE_COLORS: Record<string, string> = {
  banner: "bg-blue-500/20 text-blue-400",
  institucional: "bg-violet-500/20 text-violet-400",
  produtos: "bg-emerald-500/20 text-emerald-400",
  carrossel: "bg-orange-500/20 text-orange-400",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string, params?: Record<string, any>) {
  const url = new URL(`${window.location.origin}${BASE}/api${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
  const r = await fetch(url.toString(), { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiPost(path: string, body: any) {
  const r = await fetch(`${window.location.origin}${BASE}/api${path}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiPatch(path: string, body: any) {
  const r = await fetch(`${window.location.origin}${BASE}/api${path}`, {
    method: "PATCH", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiDelete(path: string) {
  const r = await fetch(`${window.location.origin}${BASE}/api${path}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function Images() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("produtos");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameImage, setRenameImage] = useState<any | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const params = {
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    page, limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["images", params],
    queryFn: () => apiGet("/images", params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/images/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Imagem removida" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!formName) setFormName(f.name.replace(/\.[^/.]+$/, ""));
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !formName) return;
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await apiPost("/images/upload-url", {
        name: file.name, size: file.size, contentType: file.type,
      });
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await apiPost("/images", { name: formName, type: formType, objectPath });
      qc.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Imagem salva com sucesso" });
      setUploadOpen(false);
      setFormName(""); setFormType("produtos"); setFile(null); setPreview(null);
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRenameOpen = (img: any) => {
    setRenameImage(img);
    setRenameName(img.name);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!renameImage || !renameName.trim()) return;
    setRenaming(true);
    try {
      await apiPatch(`/images/${renameImage.id}`, { name: renameName.trim() });
      qc.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Nome atualizado" });
      setRenameOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao renomear", description: err.message, variant: "destructive" });
    } finally {
      setRenaming(false);
    }
  };

  const copyUrl = (id: number, url: string) => {
    const full = `${window.location.origin}${BASE}${url}`;
    navigator.clipboard.writeText(full);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / limit));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Imagens</h1>
            <p className="text-muted-foreground mt-1">Gerencie imagens e obtenha URLs públicas para uso no sistema.</p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="hover-elevate bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Nova Imagem
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-lg shadow-black/5 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44 bg-background"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {IMAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !data?.data?.length ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <ImageIcon className="w-12 h-12 opacity-30" />
              <p>Nenhuma imagem encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
              {data.data.map((img: any) => (
                <div key={img.id} className="group relative bg-background rounded-xl border border-border/50 overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
                  <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                    <img
                      src={`${BASE}${img.url}`}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate" title={img.name}>{img.name}</p>
                    <Badge className={`mt-1 text-[10px] px-1.5 py-0.5 ${TYPE_COLORS[img.type] || ""} border-0`}>
                      {IMAGE_TYPES.find(t => t.value === img.type)?.label || img.type}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(img.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyUrl(img.id, img.url)}
                      className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                      title="Copiar URL"
                    >
                      {copiedId === img.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href={`${BASE}${img.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                      title="Abrir imagem"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => handleRenameOpen(img)}
                      className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                      title="Renomear"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Remover esta imagem? A exclusão é lógica e mantém o registro para auditoria."))
                          deleteMutation.mutate(img.id);
                      }}
                      className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 hover:bg-destructive/20 hover:border-destructive/50 hover:text-destructive transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <Select value={String(limit)} onValueChange={v => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-20 bg-background text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-2">Total: {data?.total || 0}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="px-2 py-1 text-xs">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload modal */}
      <Dialog open={uploadOpen} onOpenChange={v => {
        setUploadOpen(v);
        if (!v) { setFormName(""); setFormType("produtos"); setFile(null); setPreview(null); }
      }}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Nova Imagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8 opacity-50" />
                  <p className="text-sm">Clique para selecionar uma imagem</p>
                  <p className="text-xs">JPG, PNG, GIF, WebP</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nome da imagem</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Banner principal" className="bg-background" />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!file || !formName || uploading} className="hover-elevate">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? "Enviando..." : "Salvar Imagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename modal */}
      <Dialog open={renameOpen} onOpenChange={v => { setRenameOpen(v); }}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Renomear Imagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {renameImage && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <img
                  src={`${BASE}${renameImage.url}`}
                  alt={renameImage.name}
                  className="w-12 h-12 rounded-lg object-cover border border-border/50 flex-shrink-0"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Arquivo atual</p>
                  <p className="text-sm font-medium truncate max-w-[220px]">{renameImage.name}</p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Novo nome</Label>
              <Input
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                placeholder="Nome da imagem"
                className="bg-background"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleRename(); } }}
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
              {renaming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
