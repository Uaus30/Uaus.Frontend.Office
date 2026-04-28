import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getGetUsersQueryKey,
  useCreateUser,
  useDeleteUser,
  useGetUsers,
  useUpdateUser,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Pencil, Plus, ShieldCheck, Trash2, User, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getEnumOptions } from "@/services/core";
import { getDisplayName, splitFullName, usernameFromEmail } from "@/services/mappers";

type UserForm = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: string;
  status: string;
};

const emptyForm: UserForm = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  role: "",
  status: "",
};

function roleIcon(roleId: number) {
  return roleId === 1 ? ShieldCheck : User;
}

export default function Users() {
  const { toast } = useToast();
  const [page] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const { data, isLoading, refetch } = useGetUsers({ page, limit: 50 });

  const { data: roleOptions = [] } = useQuery({
    queryKey: ["user-role-options"],
    queryFn: () => getEnumOptions("/Users/enums/user-role"),
  });

  const { data: statusOptions = [] } = useQuery({
    queryKey: ["user-status-options"],
    queryFn: () => getEnumOptions("/Users/enums/user-status"),
  });

  const selectableRoleOptions = useMemo(
    () => roleOptions.filter((item) => item.allowSelect),
    [roleOptions],
  );
  const selectableStatusOptions = useMemo(
    () => statusOptions.filter((item) => item.allowSelect),
    [statusOptions],
  );

  const roleLabels = useMemo(
    () => Object.fromEntries(roleOptions.map((item) => [item.id, item.name])),
    [roleOptions],
  );
  const statusLabels = useMemo(
    () => Object.fromEntries(statusOptions.map((item) => [item.id, item.name])),
    [statusOptions],
  );

  const { mutate: createUser, isPending: creating } = useCreateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Usuário criado com sucesso." });
        setDialogOpen(false);
        refetch();
      },
      onError: (error) =>
        toast({
          title: "Erro ao criar usuário",
          description: error.message,
          variant: "destructive",
        }),
    },
  });

  const { mutate: updateUser, isPending: updating } = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Usuário atualizado com sucesso." });
        setDialogOpen(false);
        refetch();
      },
      onError: (error) =>
        toast({
          title: "Erro ao atualizar usuário",
          description: error.message,
          variant: "destructive",
        }),
    },
  });

  const { mutate: deleteUser, isPending: deleting } = useDeleteUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Usuário removido." });
        setDeleteId(null);
        refetch();
      },
      onError: (error) =>
        toast({
          title: "Erro ao remover usuário",
          description: error.message,
          variant: "destructive",
        }),
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      role: selectableRoleOptions[0]?.id.toString() ?? "",
      status: selectableStatusOptions[0]?.id.toString() ?? "",
    });
    setDialogOpen(true);
  }

  function openEdit(user: any) {
    setEditingId(user.id);
    setForm({
      fullName: getDisplayName(user),
      username: user.username,
      email: user.email,
      password: "",
      role: String(user.role),
      status: String(user.status),
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const { firstName, lastName } = splitFullName(form.fullName);

    if (!firstName || !form.username || !form.email || !form.role) {
      toast({
        title: "Preencha os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateUser({
        id: editingId,
        data: {
          firstName,
          lastName,
          username: form.username.trim(),
          email: form.email.trim(),
          role: Number(form.role),
          status: Number(form.status),
        },
      });
      return;
    }

    createUser({
      data: {
        firstName,
        lastName,
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: Number(form.role),
      },
    });
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Usuários</h1>
            <p className="mt-1 text-muted-foreground">Gerencie os acessos administrativos do sistema.</p>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo Usuário
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <UserCog className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p>Nenhum usuário encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((user) => {
                  const Icon = roleIcon(user.role);
                  return (
                    <TableRow key={user.id} className="border-border hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                            {getDisplayName(user).charAt(0).toUpperCase()}
                          </div>
                          {getDisplayName(user)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          <Icon className="h-3 w-3" />
                          {roleLabels[user.role] ?? user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 2 ? "default" : "secondary"}>
                          {statusLabels[user.status] ?? user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(user.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Nome do usuário"
                required
                className="bg-background border-input"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, username: event.target.value }))
                  }
                  placeholder="login"
                  required
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => {
                      const email = event.target.value;
                      return {
                        ...current,
                        email,
                        username: current.username || usernameFromEmail(email),
                      };
                    })
                  }
                  placeholder="email@empresa.com"
                  required
                  className="bg-background border-input"
                />
              </div>
            </div>
            {!editingId && (
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Informe a senha inicial"
                  required
                  className="bg-background border-input"
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}
                >
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableRoleOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingId && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableStatusOptions.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || updating} className="bg-primary hover:bg-primary/90">
                {creating || updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Salvar"
                ) : (
                  "Criar Usuário"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover este usuário? A exclusão é lógica no backend.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => deleteId && deleteUser({ id: deleteId })}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
