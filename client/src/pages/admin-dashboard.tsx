import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headset, LogOut, Settings, BarChart3, TriangleAlert, Clock, CheckCircle, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TicketDetailsModal } from "@/components/ticket-details-modal";
import { AdminPanelModal } from "@/components/admin-panel-modal";
import { ReportsPanelModal } from "@/components/reports-panel-modal";
import { RealTimeTimer, formatToBrazilTime } from "@/components/real-time-timer";
import type { TicketWithDetails } from "@shared/schema";

export default function AdminDashboard() {
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("technician");
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const { data: tickets = [], isLoading } = useQuery<TicketWithDetails[]>({
    queryKey: ["/api/tickets"],
    refetchInterval: 10000, // Refetch every 10 seconds - otimizado
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 10000, // Refetch stats every 10 seconds - otimizado
  });

  const handleLogout = () => {
    localStorage.removeItem("technician");
    window.location.href = "/";
  };

  const handleAssignTicket = async (ticketId: string) => {
    if (!currentUser) return;

    try {
      await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: currentUser.id }),
      });

      // Invalidate and refetch data instead of full page reload
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      // Invalidate technician-specific queries too
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUser.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    } catch (error) {
      console.error("Error assigning ticket:", error);
    }
  };

  // Separate active and resolved tickets
  const activeTickets = tickets.filter(ticket => ticket.status !== 'resolved');
  const resolvedTickets = tickets.filter(ticket => ticket.status === 'resolved');

  // Group active tickets by priority
  const waitingTickets = activeTickets.filter(ticket => ticket.priority === 'waiting');
  const highPriorityTickets = activeTickets.filter(ticket => ticket.priority === 'high');
  const mediumPriorityTickets = activeTickets.filter(ticket => ticket.priority === 'medium');
  const lowPriorityTickets = activeTickets.filter(ticket => ticket.priority === 'low');

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="badge-high">Alta</Badge>;
      case "medium":
        return <Badge className="badge-medium">Média</Badge>;
      case "low":
        return <Badge className="badge-low">Baixa</Badge>;
      case "waiting":
        return <Badge className="badge-waiting">Aguardando</Badge>;
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
        return <Badge className="bg-blue-100 text-blue-800">Em Andamento</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">Resolvido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const TicketCard = ({ ticket }: { ticket: TicketWithDetails }) => (
    <Card
      className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
        ticket.priority === 'high' ? 'priority-high border-l-red-500' :
        ticket.priority === 'medium' ? 'priority-medium border-l-orange-500' :
        ticket.priority === 'low' ? 'priority-low border-l-yellow-500' :
        'priority-waiting border-l-gray-500'
      }`}
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
        <p className="text-sm text-muted-foreground mb-2">Setor: {ticket.sector}</p>
        <p className="text-sm mb-3 line-clamp-2">{ticket.description}</p>
        <div className="space-y-1 mb-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Usuário: {ticket.userEmail || 'Anônimo'}</span>
            <span>Responsável: {ticket.assignedTo?.name || 'Não atribuído'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              Aberto: {formatToBrazilTime(ticket.createdAt.toString())}
            </span>
            {ticket.acceptedAt && (
              <span className="text-blue-600">
                Assumido: {formatToBrazilTime(ticket.acceptedAt.toString())}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!ticket.assignedToId && (ticket.status === 'waiting' || ticket.status === 'open') ? (
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAssignTicket(ticket.id)}
              data-testid={`button-assign-${ticket.id}`}
            >
              Assumir Chamado
            </Button>
          ) : ticket.assignedToId ? (
            <div className="flex-1 text-center text-sm py-2">
              <Badge className="bg-blue-100 text-blue-800">
                {ticket.assignedTo?.name === currentUser?.name ? 'Seu chamado' : `Atribuído: ${ticket.assignedTo?.name}`}
              </Badge>
            </div>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => setSelectedTicket(ticket)}
            data-testid={`button-details-${ticket.id}`}
          >
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const ResolvedTicketCard = ({ ticket }: { ticket: TicketWithDetails }) => (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20"
      data-testid={`card-resolved-ticket-${ticket.id}`}
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
        <p className="text-sm text-muted-foreground mb-2">Setor: {ticket.sector}</p>
        <p className="text-sm mb-3 line-clamp-2">{ticket.description}</p>
        <div className="space-y-1 mb-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Usuário: {ticket.userEmail || 'Anônimo'}</span>
            <span>Resolvido por: {ticket.assignedTo?.name || 'Sistema'}</span>
          </div>
          <div className="space-y-1 text-xs">
            {ticket.resolvedAt && (
              <div className="text-green-600">
                <span className="font-medium">Resolvido em:</span> {formatToBrazilTime(ticket.resolvedAt.toString())}
              </div>
            )}
            {ticket.acceptedAt && (
              <div className="text-blue-600">
                <span className="font-medium">Tempo até aceitação:</span>{" "}
                <RealTimeTimer
                  startTime={ticket.createdAt.toString()}
                  endTime={ticket.acceptedAt.toString()}
                  showCalculated={true}
                />
              </div>
            )}
            {ticket.acceptedAt && ticket.resolvedAt && (
              <div className="text-purple-600">
                <span className="font-medium">Tempo de resolução:</span>{" "}
                <RealTimeTimer
                  startTime={ticket.acceptedAt.toString()}
                  endTime={ticket.resolvedAt.toString()}
                  showCalculated={true}
                />
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="text-orange-600">
                <span className="font-medium">Tempo total:</span>{" "}
                <RealTimeTimer
                  startTime={ticket.createdAt.toString()}
                  endTime={ticket.resolvedAt.toString()}
                  showCalculated={true}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setSelectedTicket(ticket)}
            data-testid={`button-details-resolved-${ticket.id}`}
          >
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Headset className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Help Doctum - Painel Administrador</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setShowAdminPanel(true)}
                data-testid="button-admin-panel"
              >
                <Settings className="mr-2 h-4 w-4" />
                Administração
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowReports(true)}
                data-testid="button-reports"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Relatórios
              </Button>
              <Button
                variant={showResolved ? "default" : "ghost"}
                onClick={() => setShowResolved(!showResolved)}
                data-testid="button-toggle-resolved"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {showResolved ? "Chamados Ativos" : "Chamados Resolvidos"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total de Chamados</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
                <Ticket className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Alta Prioridade</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.highPriority || 0}</p>
                </div>
                <TriangleAlert className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Em Andamento</p>
                  <p className="text-2xl font-bold text-blue-600">{stats?.inProgress || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Resolvidos</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Toggle between Active and Resolved */}
        <div className="space-y-6">
          {!showResolved ? (
            // Active Tickets Section
            <>
              {/* Waiting Tickets */}
              {waitingTickets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-5 w-5" />
                      Chamados Aguardando Atribuição ({waitingTickets.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {waitingTickets
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((ticket) => (
                        <div key={ticket.id} className="flex-shrink-0 w-80">
                          <TicketCard ticket={ticket} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* High Priority Tickets */}
              {highPriorityTickets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <TriangleAlert className="h-5 w-5" />
                      Chamados de Alta Prioridade ({highPriorityTickets.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {highPriorityTickets
                        .sort((a, b) => {
                          // For tickets in progress, sort by acceptance time (oldest accepted first)
                          if (a.status === 'in_progress' && b.status === 'in_progress') {
                            const aTime = a.acceptedAt ? new Date(a.acceptedAt).getTime() : new Date(a.createdAt).getTime();
                            const bTime = b.acceptedAt ? new Date(b.acceptedAt).getTime() : new Date(b.createdAt).getTime();
                            return aTime - bTime;
                          }
                          // For open tickets, sort by creation time
                          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        })
                        .map((ticket) => (
                        <div key={ticket.id} className="flex-shrink-0 w-80">
                          <TicketCard ticket={ticket} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Medium Priority Tickets */}
              {(highPriorityTickets.length === 0 || mediumPriorityTickets.length > 0) && mediumPriorityTickets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Clock className="h-5 w-5" />
                      Chamados de Média Prioridade ({mediumPriorityTickets.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {mediumPriorityTickets
                        .sort((a, b) => {
                          // For tickets in progress, sort by acceptance time (oldest accepted first)
                          if (a.status === 'in_progress' && b.status === 'in_progress') {
                            const aTime = a.acceptedAt ? new Date(a.acceptedAt).getTime() : new Date(a.createdAt).getTime();
                            const bTime = b.acceptedAt ? new Date(b.acceptedAt).getTime() : new Date(b.createdAt).getTime();
                            return aTime - bTime;
                          }
                          // For open tickets, sort by creation time
                          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        })
                        .map((ticket) => (
                        <div key={ticket.id} className="flex-shrink-0 w-80">
                          <TicketCard ticket={ticket} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Low Priority Tickets */}
              {(highPriorityTickets.length === 0 && mediumPriorityTickets.length === 0) || lowPriorityTickets.length > 0 ? (
                lowPriorityTickets.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-600">
                        <Ticket className="h-5 w-5" />
                        Chamados de Baixa Prioridade ({lowPriorityTickets.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {lowPriorityTickets
                          .sort((a, b) => {
                            // For tickets in progress, sort by acceptance time (oldest accepted first)
                            if (a.status === 'in_progress' && b.status === 'in_progress') {
                              const aTime = a.acceptedAt ? new Date(a.acceptedAt).getTime() : new Date(a.createdAt).getTime();
                              const bTime = b.acceptedAt ? new Date(b.acceptedAt).getTime() : new Date(b.createdAt).getTime();
                              return aTime - bTime;
                            }
                            // For open tickets, sort by creation time
                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                          })
                          .map((ticket) => (
                          <div key={ticket.id} className="flex-shrink-0 w-80">
                            <TicketCard ticket={ticket} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : null}

              {/* No Active Tickets Message */}
              {activeTickets.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Todos os chamados foram resolvidos!</h3>
                    <p className="text-muted-foreground">Não há chamados pendentes no momento.</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            // Resolved Tickets Section
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Chamados Resolvidos ({resolvedTickets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resolvedTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum chamado resolvido encontrado.</p>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {resolvedTickets
                      .sort((a, b) => new Date(b.resolvedAt || b.updatedAt).getTime() - new Date(a.resolvedAt || a.updatedAt).getTime())
                      .map((ticket) => (
                      <div key={ticket.id} className="flex-shrink-0 w-80">
                        <ResolvedTicketCard ticket={ticket} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          userRole="admin"
          currentUserId={currentUser?.id}
        />
      )}

      {showAdminPanel && (
        <AdminPanelModal
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {showReports && (
        <ReportsPanelModal
          isOpen={showReports}
          onClose={() => setShowReports(false)}
        />
      )}
    </div>
  );
}