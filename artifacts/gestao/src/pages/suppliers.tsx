import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Trash2, Loader2, Shuffle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#3b82f6", "#0ea5e9", "#84cc16",
  "#d946ef", "#e11d48", "#059669", "#0284c7", "#7c3aed",
];

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ativo:    { label: "Ativo",    cls: "bg-emerald-500/20 text-emerald-400 border-0" },
  inativo:  { label: "Inativo",  cls: "bg-zinc-500/20 text-zinc-400 border-0" },
  pendente: { label: "Pendente", cls: "bg-amber-500/20 text-amber-400 border-0" },
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function SupplierAvatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-16 h-16 text-2xl" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none`}
      style={{ backgroundColor: `${color}25`, color, border: `2px solid ${color}40` }}
    >
      {getInitials(name || "?")}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

async function apiGet(path: string, params?: Record<string, any>) {
  const url = new URL(`${window.location.origin}${BASE}/api${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
  const r = await fetch(url.toString(), { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiMutate(method: string, path: string, body?: any) {
  const r = await fetch(`${window.location.origin}${BASE}/api${path}`, {
    method, credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  razaoSocial: z.string().optional(),
  cpfCnpj: z.string().optional(),
  vendedor: z.string().min(1, "Vendedor é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  minPurchaseValue: z.coerce.number().min(0),
  status: z.enum(["ativo", "inativo", "pendente"]),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().min(2, "UF é obrigatória"),
  avatarColor: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Suppliers() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const params = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page, limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => apiGet("/suppliers", params),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", razaoSocial: "", cpfCnpj: "", vendedor: "",
      telefone: "", email: "", minPurchaseValue: 0,
      status: "ativo", cidade: "", uf: "", avatarColor: randomColor(),
    },
  });

  const watchedName = form.watch("name");
  const watchedColor = form.watch("avatarColor");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiMutate("POST", "/suppliers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor cadastrado." });
      handleClose();
    },
    onError: (err: any) => toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiMutate("PUT", `/suppliers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor atualizado." });
      handleClose();
    },
    onError: (err: any) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiMutate("DELETE", `/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor removido." });
    },
  });

  const handleOpen = (supplier?: any) => {
    if (supplier) {
      setEditingId(supplier.id);
      form.reset({
        name: supplier.name,
        razaoSocial: supplier.razaoSocial || "",
        cpfCnpj: supplier.cpfCnpj || "",
        vendedor: supplier.vendedor,
        telefone: supplier.telefone,
        email: supplier.email || "",
        minPurchaseValue: Number(supplier.minPurchaseValue),
        status: supplier.status,
        cidade: supplier.cidade,
        uf: supplier.uf,
        avatarColor: supplier.avatarColor,
      });
    } else {
      setEditingId(null);
      form.reset({
        name: "", razaoSocial: "", cpfCnpj: "", vendedor: "",
        telefone: "", email: "", minPurchaseValue: 0,
        status: "ativo", cidade: "", uf: "", avatarColor: randomColor(),
      });
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingId(null);
    form.reset();
  };

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, email: values.email || null, razaoSocial: values.razaoSocial || null, cpfCnpj: values.cpfCnpj || null };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload });
    else createMutation.mutate(payload);
  };

  const whatsappUrl = (telefone: string) => {
    const digits = telefone.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${number}`;
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / limit));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Fornecedores</h1>
            <p className="text-muted-foreground mt-1">Gerencie seus fornecedores e contatos comerciais.</p>
          </div>
          <Button onClick={() => handleOpen()} className="hover-elevate bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
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
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4">Fornecedor</th>
                  <th className="px-6 py-4">Vendedor</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Mín. Compra</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                ) : !data?.data?.length ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum fornecedor encontrado.</td></tr>
                ) : data.data.map((s: any) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <SupplierAvatar name={s.name} color={s.avatarColor} size="sm" />
                        <div>
                          <p className="font-medium text-foreground leading-tight">{s.name}</p>
                          {s.razaoSocial && <p className="text-xs text-muted-foreground mt-0.5">{s.razaoSocial}</p>}
                          {s.cpfCnpj && <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">{s.cpfCnpj}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{s.vendedor}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{s.telefone}</span>
                          <a
                            href={whatsappUrl(s.telefone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir conversa no WhatsApp"
                            className="text-[#25d366] hover:text-[#128c7e] transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                        </div>
                        {s.email && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{s.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{s.cidade}/{s.uf}</td>
                    <td className="px-6 py-4 font-medium text-primary">{formatCurrency(s.minPurchaseValue)}</td>
                    <td className="px-6 py-4">
                      <Badge className={STATUS_LABELS[s.status]?.cls}>
                        {STATUS_LABELS[s.status]?.label || s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate" onClick={() => handleOpen(s)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate" onClick={() => {
                          if (confirm(`Remover o fornecedor "${s.name}"?`)) deleteMutation.mutate(s.id);
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-xs px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={open => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">

            {/* Avatar preview */}
            <div className="flex items-center gap-4 p-4 bg-background/50 border border-border/30 rounded-xl">
              <SupplierAvatar name={watchedName || "?"} color={watchedColor} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{watchedName || "Nome do fornecedor"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ícone gerado pelas iniciais do nome</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 flex-shrink-0"
                onClick={() => form.setValue("avatarColor", randomColor())}
                title="Sortear nova cor"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Sortear cor
              </Button>
            </div>

            {/* Campos em grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input {...form.register("name")} className="bg-background" placeholder="Nome do fornecedor" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Razão Social</Label>
                <Input {...form.register("razaoSocial")} className="bg-background" placeholder="Razão social (opcional)" />
              </div>

              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input {...form.register("cpfCnpj")} className="bg-background font-mono" placeholder="000.000.000-00 ou 00.000.000/0000-00" />
              </div>

              <div className="space-y-1.5">
                <Label>Vendedor <span className="text-destructive">*</span></Label>
                <Input {...form.register("vendedor")} className="bg-background" placeholder="Nome do vendedor/contato" />
                {form.formState.errors.vendedor && <p className="text-xs text-destructive">{form.formState.errors.vendedor.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefone <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input {...form.register("telefone")} className="bg-background pr-10" placeholder="(11) 99999-9999" />
                  {form.watch("telefone") && (
                    <a
                      href={whatsappUrl(form.watch("telefone"))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#25d366] hover:text-[#128c7e] transition-colors"
                      title="Abrir no WhatsApp"
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </a>
                  )}
                </div>
                {form.formState.errors.telefone && <p className="text-xs text-destructive">{form.formState.errors.telefone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input {...form.register("email")} type="email" className="bg-background" placeholder="contato@fornecedor.com.br" />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Valor Mínimo de Compra (R$) <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01" min="0" {...form.register("minPurchaseValue")} className="bg-background" placeholder="0,00" />
              </div>

              <div className="space-y-1.5">
                <Label>Status <span className="text-destructive">*</span></Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Cidade <span className="text-destructive">*</span></Label>
                <Input {...form.register("cidade")} className="bg-background" placeholder="Nome da cidade" />
                {form.formState.errors.cidade && <p className="text-xs text-destructive">{form.formState.errors.cidade.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>UF <span className="text-destructive">*</span></Label>
                <Controller
                  control={form.control}
                  name="uf"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.uf && <p className="text-xs text-destructive">{form.formState.errors.uf.message}</p>}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover-elevate">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
