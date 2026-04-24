import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit2, Loader2, Phone, Plus, Search, Shuffle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import {
  createSupplier,
  deleteSupplier,
  getEnumOptions,
  getSuppliersPage,
  updateSupplier,
} from "@/lib/backend";

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

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function SupplierAvatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : size === "lg" ? "h-16 w-16 text-2xl" : "h-10 w-10 text-sm";

  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 select-none items-center justify-center rounded-full font-bold`}
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

type SupplierForm = {
  name: string;
  corporateName: string;
  document: string;
  salesRepresentative: string;
  phone: string;
  email: string;
  minimumPurchaseValue: number;
  status: string;
  city: string;
  state: string;
  avatarColor: string;
};

export default function Suppliers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SupplierForm>({
    name: "",
    corporateName: "",
    document: "",
    salesRepresentative: "",
    phone: "",
    email: "",
    minimumPurchaseValue: 0,
    status: "",
    city: "",
    state: "",
    avatarColor: randomColor(),
  });

  const { data: statusOptions = [] } = useQuery({
    queryKey: ["supplier-status-options"],
    queryFn: () => getEnumOptions("/Suppliers/enums/supplier-status"),
  });

  const statusLabelById = useMemo(
    () => Object.fromEntries(statusOptions.map((item) => [item.id, item.name])),
    [statusOptions],
  );

  const { data: suppliersPage, isLoading } = useQuery({
    queryKey: ["suppliers-page", { search, page, limit }],
    queryFn: () => getSuppliersPage({ search, page, limit }),
  });

  const suppliers = useMemo(() => {
    if (statusFilter === "all") return suppliersPage?.data ?? [];
    return (suppliersPage?.data ?? []).filter((item) => String(item.status) === statusFilter);
  }, [statusFilter, suppliersPage?.data]);

  function whatsappUrl(phone: string) {
    const digits = phone.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${number}`;
  }

  function openModal(supplier?: any) {
    if (supplier) {
      setEditingId(supplier.id);
      setForm({
        name: supplier.name,
        corporateName: supplier.corporateName || "",
        document: supplier.document || "",
        salesRepresentative: supplier.salesRepresentative,
        phone: supplier.phone,
        email: supplier.email || "",
        minimumPurchaseValue: supplier.minimumPurchaseValue,
        status: String(supplier.status),
        city: supplier.city,
        state: supplier.state,
        avatarColor: supplier.avatarColor,
      });
    } else {
      setEditingId(null);
      setForm({
        name: "",
        corporateName: "",
        document: "",
        salesRepresentative: "",
        phone: "",
        email: "",
        minimumPurchaseValue: 0,
        status: statusOptions.find((item) => item.allowSelect)?.id.toString() ?? "",
        city: "",
        state: "",
        avatarColor: randomColor(),
      });
    }

    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        corporateName: form.corporateName.trim() || null,
        document: form.document.trim() || null,
        salesRepresentative: form.salesRepresentative.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        minimumPurchaseValue: form.minimumPurchaseValue,
        status: Number(form.status),
        city: form.city.trim(),
        state: form.state,
        avatarColor: form.avatarColor,
      };

      if (editingId) {
        await updateSupplier({
          id: editingId,
          ...payload,
        });
        toast({ title: "Fornecedor atualizado." });
      } else {
        await createSupplier(payload);
        toast({ title: "Fornecedor cadastrado." });
      }

      queryClient.invalidateQueries({ queryKey: ["suppliers-page"] });
      setModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar fornecedor",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteSupplier(id);
      queryClient.invalidateQueries({ queryKey: ["suppliers-page"] });
      toast({ title: "Fornecedor removido." });
    } catch (error) {
      toast({
        title: "Erro ao remover fornecedor",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil((suppliersPage?.total || 0) / limit));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Fornecedores</h1>
            <p className="mt-1 text-muted-foreground">Gerencie seus fornecedores e contatos comerciais.</p>
          </div>
          <Button onClick={() => openModal()} className="bg-primary text-primary-foreground hover-elevate">
            <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOptions
                  .filter((item) => item.allowSelect)
                  .map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
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
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      Nenhum fornecedor encontrado.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <SupplierAvatar name={supplier.name} color={supplier.avatarColor} size="sm" />
                          <div>
                            <p className="leading-tight font-medium text-foreground">{supplier.name}</p>
                            {supplier.corporateName && <p className="mt-0.5 text-xs text-muted-foreground">{supplier.corporateName}</p>}
                            {supplier.document && <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">{supplier.document}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{supplier.salesRepresentative}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{supplier.phone}</span>
                            <a
                              href={whatsappUrl(supplier.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#25d366] transition-colors hover:text-[#128c7e]"
                              title="Abrir conversa no WhatsApp"
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                            </a>
                          </div>
                          {supplier.email && <span className="max-w-[180px] truncate text-xs text-muted-foreground">{supplier.email}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{supplier.city}/{supplier.state}</td>
                      <td className="px-6 py-4 font-medium text-primary">{formatCurrency(supplier.minimumPurchaseValue)}</td>
                      <td className="px-6 py-4">
                        <Badge className="border-0 bg-emerald-500/20 text-emerald-400">
                          {statusLabelById[supplier.status] ?? supplier.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(supplier.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover-elevate"
                            onClick={() => openModal(supplier)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover-elevate"
                            onClick={() => {
                              if (confirm(`Remover o fornecedor "${supplier.name}"?`)) {
                                void handleDelete(supplier.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
              <span className="ml-2">Total: {suppliersPage?.total || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </Button>
              <span className="px-2 text-xs">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border/50 bg-card sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {editingId ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="flex items-center gap-4 rounded-xl border border-border/30 bg-background/50 p-4">
              <SupplierAvatar name={form.name || "?"} color={form.avatarColor} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{form.name || "Nome do fornecedor"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Ícone gerado pelas iniciais do nome</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-shrink-0 gap-1.5 text-xs"
                onClick={() => setForm((current) => ({ ...current, avatarColor: randomColor() }))}
              >
                <Shuffle className="h-3.5 w-3.5" />
                Sortear cor
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Razão Social</Label>
                <Input value={form.corporateName} onChange={(event) => setForm((current) => ({ ...current, corporateName: event.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input value={form.document} onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))} className="bg-background font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Vendedor</Label>
                <Input value={form.salesRepresentative} onChange={(event) => setForm((current) => ({ ...current, salesRepresentative: event.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone
                </Label>
                <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Mínimo de Compra (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minimumPurchaseValue}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, minimumPurchaseValue: Number(event.target.value) }))
                  }
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions
                      .filter((item) => item.allowSelect)
                      .map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={form.state} onValueChange={(value) => setForm((current) => ({ ...current, state: value }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover-elevate">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
