import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useGetUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, UserCog, ShieldCheck, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";

type Role = "admin" | "manager" | "seller";

const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  manager: "Gerente",
  seller: "Vendedor",
};

const roleColors: Record<Role, string> = {
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  seller: "bg-green-500/10 text-green-400 border-green-500/20",
};

const roleIcons: Record<Role, React.ElementType> = {
  admin: ShieldCheck,
  manager: Shield,
  seller: User,
};

const emptyForm = { name: "", email: "", password: "", role: "seller" as Role, active: true };

export default function Users() {
  const { toast } = useToast();
  const [page] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useGetUsers({ page, limit: 50 });

  const { mutate: createUser, isPending: creating } = useCreateUser({
    mutation: {
      onSuccess: () => { toast({ title: "Usuário criado com sucesso!" }); setDialogOpen(false); refetch(); },
      onError: (err: any) => toast({ title: "Erro ao criar usuário", description: err?.message, variant: "destructive" }),
    }
  });

  const { mutate: updateUser, isPending: updating } = useUpdateUser({
    mutation: {
      onSuccess: () => { toast({ title: "Usuário atualizado com sucesso!" }); setDialogOpen(false); refetch(); },
      onError: (err: any) => toast({ title: "Erro ao atualizar", description: err?.message, variant: "destructive" }),
    }
  });

  const { mutate: deleteUser, isPending: deleting } = useDeleteUser({
    mutation: {
      onSuccess: () => { toast({ title: "Usuário removido!" }); setDeleteId(null); refetch(); },
      onError: (err: any) => toast({ title: "Erro ao remover", description: err?.message, variant: "destructive" }),
    }
  });

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (user: any) => {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, active: user.active });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const data: any = { name: form.name, email: form.email, role: form.role, active: form.active };
      if (form.password) data.password = form.password;
      updateUser({ id: editingId, data });
    } else {
      createUser({ data: { name: form.name, email: form.email, password: form.password, role: form.role } });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Usuários</h1>
            <p className="text-muted-foreground mt-1">Gerencie os usuários do sistema.</p>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Novo Usuário
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><UserCog className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Nenhum usuário encontrado</p></TableCell></TableRow>
              ) : data?.data?.map((user) => {
                const Icon = roleIcons[user.role as Role] ?? User;
                return (
                  <TableRow key={user.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleColors[user.role as Role] ?? ""}`}>
                        <Icon className="w-3 h-3" />
                        {roleLabels[user.role as Role] ?? user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"} className={user.active ? "bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/20" : ""}>
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(user.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do usuário" required className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" required className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label>{editingId ? "Nova senha (deixe em branco para manter)" : "Senha"}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editingId ? "••••••••" : "Mínimo 6 caracteres"} required={!editingId} minLength={editingId ? 0 : 6} className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as Role }))}>
                <SelectTrigger className="bg-background border-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingId && (
              <div className="flex items-center gap-3">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
                <Label htmlFor="active">Usuário ativo</Label>
              </div>
            )}
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={creating || updating} className="bg-primary hover:bg-primary/90">
                {(creating || updating) ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Salvar" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleting} onClick={() => deleteId && deleteUser({ id: deleteId })}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
