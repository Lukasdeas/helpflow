import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Headset, LogOut, PlusCircle, Eye, Send, Search, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TicketDetailsModal } from "@/components/ticket-details-modal";
import { RealTimeTimer, formatToBrazilTime } from "@/components/real-time-timer";
import { FileUpload } from "@/components/file-upload";
import type { TicketWithDetails } from "@shared/schema";



const createTicketSchema = z.object({
  title: z.string().min(5, "Título deve ter pelo menos 5 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  sector: z.string().min(1, "Selecione um setor"),
  problemType: z.string().min(1, "Selecione o tipo de problema"),
  requesterName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  userEmail: z.string().email("Email inválido").optional(),
});

type CreateTicketForm = z.infer<typeof createTicketSchema>;

export default function UserDashboard() {
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { toast } = useToast();
  const { data: allTickets = [], isLoading, refetch } = useQuery<TicketWithDetails[]>({
    queryKey: ["/api/tickets"],
    refetchInterval: 10000, // Refetch every 10 seconds - otimizado para usuários
  });

  // Filter out resolved tickets - users only see open and in-progress tickets
  const tickets = allTickets.filter(ticket => ticket.status !== 'resolved');

  // Filter tickets based on search term
  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      ticket.ticketNumber.toString().includes(searchLower) ||
      ticket.requesterName.toLowerCase().includes(searchLower) ||
      ticket.title.toLowerCase().includes(searchLower)
    );
  });

  const form = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      sector: "",
      problemType: "",
      requesterName: "",
      userEmail: "",
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: CreateTicketForm) => {
      // Create the ticket data with attachments
      const ticketWithAttachments = {
        ...ticketData,
        attachments: uploadedFiles.map(file => file.url)
      };
      const response = await apiRequest("POST", "/api/tickets", ticketWithAttachments);
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      setUploadedFiles([]);
      refetch();
      toast({
        title: "Sucesso",
        description: "Chamado criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar chamado",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTicketForm) => {
    createTicketMutation.mutate(data);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500 text-white">Alta</Badge>;
      case "medium":
        return <Badge className="bg-orange-500 text-white">Média</Badge>;
      case "low":
        return <Badge className="bg-yellow-500 text-white">Baixa</Badge>;
      case "waiting":
        return <Badge className="bg-gray-500 text-white">Aguardando</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge className="bg-amber-500 text-white">Aguardando</Badge>;
      case "open":
        return <Badge variant="outline">Aberto</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 text-white">Em Andamento</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 text-white">Resolvido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Headset className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Helpdesk - Portal do Usuário</h1>
            </div>
            <Link href="/">
              <Button variant="ghost" data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-stretch">
          {/* Left Column - New Ticket Form */}
          <div className="lg:col-span-1 flex">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Abrir Novo Chamado
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do Chamado</Label>
                    <Input
                      id="title"
                      {...form.register("title")}
                      placeholder="Resumo do problema"
                      data-testid="input-ticket-title"
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sector">Setor/Local</Label>
                    <Select onValueChange={(value) => form.setValue("sector", value)}>
                      <SelectTrigger data-testid="select-sector">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="odontologia">Odontologia</SelectItem>
                        <SelectItem value="npj">NPJ</SelectItem>
                        <SelectItem value="biblioteca">Biblioteca</SelectItem>
                        <SelectItem value="clinica_veterinaria">Clínica Veterinária</SelectItem>
                        <SelectItem value="secretaria">Secretaria</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="diretoria">Diretoria</SelectItem>
                        <SelectItem value="rh">RH</SelectItem>
                        <SelectItem value="decom">Decom</SelectItem>
                        <SelectItem value="coordenacao">Coordenação</SelectItem>
                        <SelectItem value="sala_dos_professores">Sala dos Professores</SelectItem>
                        <SelectItem value="contas_a_pagar">Contas a Pagar</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.sector && (
                      <p className="text-sm text-destructive">{form.formState.errors.sector.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="problemType">Tipo de Problema</Label>
                    <Select onValueChange={(value) => form.setValue("problemType", value)}>
                      <SelectTrigger data-testid="select-problem-type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hardware">Hardware</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="rede">Rede/Internet</SelectItem>
                        <SelectItem value="impressora">Impressora</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sistema">Sistema</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.problemType && (
                      <p className="text-sm text-destructive">{form.formState.errors.problemType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requesterName">Seu Nome</Label>
                    <Input
                      id="requesterName"
                      {...form.register("requesterName")}
                      placeholder="Seu nome completo"
                      data-testid="input-requester-name"
                    />
                    {form.formState.errors.requesterName && (
                      <p className="text-sm text-destructive">{form.formState.errors.requesterName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Seu Email (Opcional)</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      {...form.register("userEmail")}
                      placeholder="seu@email.com"
                      data-testid="input-user-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição do Problema</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      className="h-24"
                      placeholder="Descreva detalhadamente o problema..."
                      data-testid="textarea-description"
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Anexar Arquivos (Opcional)</Label>
                    <FileUpload
                      onFilesChange={setUploadedFiles}
                      maxFiles={3}
                      disabled={createTicketMutation.isPending}
                    />
                  </div>

                  <div className="flex-1"></div>
                  <Button
                    type="submit"
                    className="w-full mt-auto"
                    disabled={createTicketMutation.isPending}
                    data-testid="button-submit-ticket"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {createTicketMutation.isPending ? "Enviando..." : "Enviar Chamado"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - My Tickets */}
          <div className="lg:col-span-1 flex">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Meus Chamados
                </CardTitle>
                <div className="flex items-center gap-2 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Pesquisar por número, nome ou título..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="search-tickets"
                    />
                  </div>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      data-testid="clear-search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum chamado encontrado</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Crie seu primeiro chamado usando o formulário ao lado
                    </p>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum chamado encontrado para "{searchTerm}"</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Tente pesquisar por número do chamado, nome ou título
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {filteredTickets.map((ticket) => (
                      <Card
                        key={ticket.id}
                        className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
                        onClick={() => setSelectedTicket(ticket)}
                        data-testid={`card-ticket-${ticket.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium">#{ticket.ticketNumber} - {ticket.title}</h3>
                              <p className="text-sm text-muted-foreground">Solicitante: {ticket.requesterName}</p>
                            </div>
                            <div className="flex gap-2">
                              {getPriorityBadge(ticket.priority)}
                              {getStatusBadge(ticket.status)}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="space-y-1 mb-3">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Setor: {ticket.sector}</span>
                              <span>Aberto: {formatToBrazilTime(ticket.createdAt.toString())}</span>
                            </div>
                            {ticket.acceptedAt && (
                              <div className="text-xs">
                                <span className="text-blue-600">
                                  Assumido: {formatToBrazilTime(ticket.acceptedAt.toString())}
                                </span>
                              </div>
                            )}
                            {ticket.assignedTo && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Técnico responsável:</span> {ticket.assignedTo.name}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          userRole="user"
        />
      )}
    </div>
  );
}