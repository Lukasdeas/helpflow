import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional(),
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["technician", "admin"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanelModal({ isOpen, onClose }: AdminPanelModalProps) {
  const { toast } = useToast();

  const { data: technicians = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/technicians"],
  });

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      role: "technician",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      form.reset();
      // Invalidate users data to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/users/technicians"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Técnico removido com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/technicians"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover técnico",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const handleAssignTicket = async (ticketId: string, technicianId: string) => {
    try {
      // Handle unassigned case
      if (technicianId === "unassigned") {
        await fetch(`/api/tickets/${ticketId}/unassign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await fetch(`/api/tickets/${ticketId}/assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ technicianId }),
        });
      }

      toast({
        title: "Sucesso",
        description: technicianId === "unassigned" ? "Atribuição removida com sucesso!" : "Técnico atribuído com sucesso!",
      });

      // Invalidate and refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir técnico",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="admin-panel-description">
        <DialogHeader>
          <DialogTitle>Painel Administrativo</DialogTitle>
          <div id="admin-panel-description" className="sr-only">
            Gerencie usuários, técnicos e configurações do sistema.
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Technician */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Cadastrar Novo Técnico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Nome completo"
                    data-testid="input-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="email@empresa.com"
                    data-testid="input-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    {...form.register("username")}
                    placeholder="usuario"
                    data-testid="input-username-create"
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                    placeholder="senha"
                    data-testid="input-password-create"
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Usuário</Label>
                  <Select onValueChange={(value: "technician" | "admin") => form.setValue("role", value)}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Técnico</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createUserMutation.isPending}
                  data-testid="button-create-user"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {createUserMutation.isPending ? "Cadastrando..." : "Cadastrar Técnico"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Technicians */}
          <Card>
            <CardHeader>
              <CardTitle>Técnicos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : technicians.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum técnico cadastrado
                </p>
              ) : (
                <div className="space-y-3">
                  {technicians.map((tech) => (
                    <Card key={tech.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium" data-testid={`text-tech-name-${tech.id}`}>
                            {tech.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tech.email || tech.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={tech.role === "admin" ? "default" : "secondary"}>
                            {tech.role === "admin" ? "Admin" : "Técnico"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUserMutation.mutate(tech.id)}
                            disabled={deleteUserMutation.isPending}
                            data-testid={`button-delete-${tech.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}