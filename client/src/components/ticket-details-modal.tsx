import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle, Paperclip, Clock, UserCheck, X, MessageSquare } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RealTimeTimer, formatToBrazilTime } from "@/components/real-time-timer";
import { FileUpload } from "@/components/file-upload";
import type { TicketWithDetails } from "@shared/schema";

interface TicketDetailsModalProps {
  ticket: TicketWithDetails;
  isOpen: boolean;
  onClose: () => void;
  userRole: "user" | "technician" | "admin";
  currentUserId?: string;
}

export function TicketDetailsModal({
  ticket,
  isOpen,
  onClose,
  userRole = "user",
  currentUserId
}: TicketDetailsModalProps) {
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [commentFiles, setCommentFiles] = useState<any[]>([]);
  const [pendingPriority, setPendingPriority] = useState<string>("");
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Fetch latest ticket data when modal is open
  const { data: latestTicket } = useQuery<TicketWithDetails>({
    queryKey: ["/api/tickets", ticket.id],
    enabled: isOpen, // Only fetch when modal is open
    refetchInterval: 20000, // Refetch every 20 seconds when modal is open - otimizado
  });

  // Fetch ticket attachments
  const { data: ticketAttachments = [] } = useQuery({
    queryKey: ["/api/tickets", ticket.ticketNumber, "attachments"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/tickets/${ticket.ticketNumber}/attachments`);
      return response.json();
    },
    enabled: isOpen,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Use latest ticket data if available, fallback to prop
  const currentTicket = latestTicket || ticket;

  // Update pending values when ticket data changes
  useEffect(() => {
    if (currentTicket) {
      setPendingPriority(currentTicket.priority);
      setPendingStatus(currentTicket.status);
      setHasChanges(false);
    }
  }, [currentTicket]);

  // Clear form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setNewComment("");
      setAttachments([]);
      setCommentFiles([]);
      setHasChanges(false);
    }
  }, [isOpen]);

  // Fetch technicians for assignment
  const { data: technicians } = useQuery({
    queryKey: ["/api/technicians"],
    enabled: userRole !== "user",
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData: any) => {
      const response = await apiRequest("POST", "/api/comments", commentData);
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      setAttachments([]);
      setCommentFiles([]);
      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso!",
      });
      // Invalidate and refetch tickets data to update comments immediately
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticket.ticketNumber, "attachments"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive",
      });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority: string) => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/priority`, { priority });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Prioridade atualizada com sucesso!",
      });
      // Invalidate and refetch tickets data
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar prioridade",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });
      // Invalidate and refetch tickets data
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (technicianId: string) => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/assign`, { technicianId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Chamado atribuído com sucesso!",
      });
      // Invalidate and refetch tickets data
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atribuir chamado",
        variant: "destructive",
      });
    },
  });

  const resolveTicketMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticket.id}/status`, { status: "resolved" });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Chamado marcado como resolvido!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", currentUserId] });
      }
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao marcar chamado como resolvido",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      // Recuperar dados do técnico logado do localStorage
      const technicianData = localStorage.getItem("technician");
      let technicianName = "Técnico";
      
      if (technicianData) {
        try {
          const parsed = JSON.parse(technicianData);
          technicianName = parsed.name || "Técnico";
        } catch (e) {
          console.error("Erro ao parsear dados do técnico:", e);
        }
      }

      const authorName = userRole === "user" ? (currentTicket.userEmail || "Usuário") :
                       userRole === "technician" ? technicianName : "Administrador";

      addCommentMutation.mutate({
        ticketId: ticket.id,
        content: newComment,
        authorName,
        authorType: userRole,
        attachments: commentFiles.map(file => file.url)
      });
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive",
      });
    }
  };


  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500 text-white">Alta</Badge>;
      case "medium":
        return <Badge className="bg-orange-500 text-white">Média</Badge>;
      case "low":
        return <Badge className="bg-yellow-500 text-white">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge className="bg-gray-500 text-white">Aguardando</Badge>;
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

  const handlePriorityChange = (priority: string) => {
    setPendingPriority(priority);
    setHasChanges(priority !== currentTicket.priority || pendingStatus !== currentTicket.status);
  };

  const handleStatusChange = (status: string) => {
    setPendingStatus(status);
    setHasChanges(status !== currentTicket.status || pendingPriority !== currentTicket.priority);
  };

  const handleApplyChanges = () => {
    if (pendingPriority !== currentTicket.priority) {
      updatePriorityMutation.mutate(pendingPriority);
    }
    if (pendingStatus !== currentTicket.status) {
      updateStatusMutation.mutate(pendingStatus);
    }
    setHasChanges(false);
  };

  const handleAssignChange = (technicianId: string) => {
    const actualTechnicianId = technicianId === "unassigned" ? "" : technicianId;
    assignMutation.mutate(actualTechnicianId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Chamado #{currentTicket.ticketNumber} - {currentTicket.title}
          </DialogTitle>
          <div id="ticket-details-description" className="sr-only">
            Visualize e gerencie os detalhes do chamado, incluindo status, prioridade e comentários.
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Ticket Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Chamado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-2">
                    {getStatusBadge(currentTicket.status)}
                    {getPriorityBadge(currentTicket.priority)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setor:</span>
                  <span>{currentTicket.sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{currentTicket.problemType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Solicitante:</span>
                  <span>{currentTicket.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{currentTicket.userEmail || "Não informado"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsável:</span>
                  <span>{currentTicket.assignedTo?.name || "Não atribuído"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aberto em:</span>
                  <span>{formatToBrazilTime(currentTicket.createdAt.toString())}</span>
                </div>

                {/* Timing Information */}
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Status do Atendimento</span>
                  </div>

                  {/* Status timing information */}
                  <div className="text-sm text-muted-foreground">
                    Aberto em: {formatToBrazilTime(currentTicket.createdAt.toString())}
                  </div>
                  
                  {currentTicket.acceptedAt && (
                    <div className="text-sm text-blue-600">
                      Assumido em: {formatToBrazilTime(currentTicket.acceptedAt.toString())}
                    </div>
                  )}

                  {currentTicket.resolvedAt && (
                    <div className="text-sm text-green-600">
                      Resolvido em: {formatToBrazilTime(currentTicket.resolvedAt.toString())}
                    </div>
                  )}

                  {/* Final resolution time */}
                  {currentTicket.resolvedAt && (
                    <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200">📊 Métricas de Resolução</div>
                      
                      {/* Tempo total de resolução */}
                      <div className="text-sm">
                        <span className="font-medium">Tempo total:</span>{" "}
                        <span className="text-green-600">
                          {(() => {
                            const diffMs = new Date(currentTicket.resolvedAt).getTime() - new Date(currentTicket.createdAt).getTime();
                            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            
                            let timeStr = "";
                            if (days > 0) timeStr += `${days}d `;
                            if (hours > 0) timeStr += `${hours}h `;
                            timeStr += `${minutes}m`;
                            
                            return timeStr;
                          })()}
                        </span>
                      </div>

                      {/* Tempo até atribuição (se aplicável) */}
                      {currentTicket.acceptedAt && (
                        <div className="text-sm">
                          <span className="font-medium">Tempo até atribuição:</span>{" "}
                          <span className="text-blue-600">
                            {(() => {
                              const diffMs = new Date(currentTicket.acceptedAt).getTime() - new Date(currentTicket.createdAt).getTime();
                              const hours = Math.floor(diffMs / (1000 * 60 * 60));
                              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                              return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                            })()}
                          </span>
                        </div>
                      )}

                      {/* Tempo de trabalho efetivo */}
                      {currentTicket.acceptedAt && (
                        <div className="text-sm">
                          <span className="font-medium">Tempo de trabalho:</span>{" "}
                          <span className="text-purple-600">
                            {(() => {
                              const diffMs = new Date(currentTicket.resolvedAt).getTime() - new Date(currentTicket.acceptedAt).getTime();
                              const hours = Math.floor(diffMs / (1000 * 60 * 60));
                              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                              return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                            })()}
                          </span>
                        </div>
                      )}

                      <div className="text-xs text-green-700 dark:text-green-300 mt-2">
                        <span className="font-medium">Finalizado em:</span> {formatToBrazilTime(currentTicket.resolvedAt.toString())}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions Section - Only for technicians and admins with restrictions */}
            {userRole !== "user" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Only allow changes if ticket is not resolved, or if user is admin */}
                    {(currentTicket.status !== 'resolved' || userRole === 'admin') && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Prioridade</label>
                          <Select
                            value={pendingPriority}
                            onValueChange={handlePriorityChange}
                            disabled={updatePriorityMutation.isPending || (currentTicket.status === 'resolved' && userRole !== 'admin')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <Select
                            value={pendingStatus}
                            onValueChange={handleStatusChange}
                            disabled={updateStatusMutation.isPending || (currentTicket.status === 'resolved' && userRole !== 'admin')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="waiting">Aguardando</SelectItem>
                              <SelectItem value="open">Aberto</SelectItem>
                              <SelectItem value="in_progress">Em Andamento</SelectItem>
                              <SelectItem value="resolved">Resolvido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Apply Changes Button */}
                    {hasChanges && (
                      <Button
                        onClick={handleApplyChanges}
                        disabled={updatePriorityMutation.isPending || updateStatusMutation.isPending}
                        className="w-full"
                      >
                        {(updatePriorityMutation.isPending || updateStatusMutation.isPending) ? "Aplicando..." : "Aplicar Alterações"}
                      </Button>
                    )}

                    {/* Assumir Chamado button - works for any non-resolved ticket without assignment */}
                    {currentTicket.status !== 'resolved' && !currentTicket.assignedTo?.id && (
                      <Button
                        onClick={() => assignMutation.mutate(currentUserId!)}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={assignMutation.isPending}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {assignMutation.isPending ? "Assumindo..." : "Assumir Chamado"}
                      </Button>
                    )}
                    
                    {/* Show assigned technician info */}
                    {currentTicket.assignedTo?.id && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Atribuído para:</strong> {currentTicket.assignedTo.name}
                          {currentTicket.assignedTo.id === currentUserId && " (Você)"}
                        </p>
                      </div>
                    )}


                    {/* Show info message for resolved tickets */}
                    {currentTicket.status === 'resolved' && userRole !== 'admin' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          Este chamado foi resolvido e não pode mais ser modificado. Apenas administradores podem fazer alterações.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição do Problema</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentTicket.description}
                </p>

                {/* Show ticket attachments from creation */}
                {currentTicket.attachments && JSON.parse(currentTicket.attachments || '[]').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Arquivos anexados na abertura do chamado:</p>
                    <div className="space-y-2">
                      {JSON.parse(currentTicket.attachments || '[]').map((attachmentUrl: string, index: number) => {
                        const filename = attachmentUrl.split('/').pop() || `anexo-${index + 1}`;
                        const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';
                        
                        const getFileIcon = (ext: string) => {
                          switch (ext) {
                            case 'pdf':
                              return '📄';
                            case 'jpg':
                            case 'jpeg':
                            case 'png':
                            case 'gif':
                            case 'bmp':
                            case 'webp':
                              return '🖼️';
                            case 'doc':
                            case 'docx':
                              return '📝';
                            case 'xls':
                            case 'xlsx':
                              return '📊';
                            case 'zip':
                            case 'rar':
                            case '7z':
                              return '🗜️';
                            case 'mp4':
                            case 'avi':
                            case 'mov':
                              return '🎥';
                            case 'mp3':
                            case 'wav':
                              return '🎵';
                            default:
                              return '📎';
                          }
                        };

                        const canDownload = userRole === 'technician' || userRole === 'admin';
                        
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-muted rounded-md border"
                          >
                            <span className="text-lg">{getFileIcon(extension || '')}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" title={filename}>
                                {filename}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Anexado na criação do chamado
                              </p>
                            </div>
                            {canDownload ? (
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Make request with proper headers for authentication
                                  fetch(attachmentUrl, {
                                    headers: {
                                      'X-User-Role': userRole
                                    }
                                  }).then(response => {
                                    if (response.ok) {
                                      return response.blob();
                                    }
                                    throw new Error('Download failed');
                                  }).then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  }).catch(error => {
                                    console.error('Download error:', error);
                                    toast({
                                      title: "Erro",
                                      description: "Erro ao baixar arquivo",
                                      variant: "destructive",
                                    });
                                  });
                                }}
                              >
                                Baixar
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Acesso restrito
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show ticket attachments from file system */}
                {ticketAttachments && ticketAttachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Outros anexos do chamado #{currentTicket.ticketNumber}:</p>
                    {ticketAttachments.map((attachment: any, index: number) => {
                      const canDownload = userRole === 'technician' || userRole === 'admin';

                      if (canDownload) {
                        const handleDownload = async () => {
                          try {
                            const response = await fetch(attachment.url, {
                              headers: {
                                'x-user-role': userRole
                              }
                            });

                            if (!response.ok) {
                              throw new Error('Erro no download');
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = attachment.originalName || `anexo-chamado-${index + 1}`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            toast({
                              title: 'Erro',
                              description: 'Erro ao fazer download do arquivo',
                              variant: 'destructive'
                            });
                          }
                        };

                        return (
                          <button
                            key={index}
                            onClick={handleDownload}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                            data-testid={`button-download-ticket-attachment-${index}`}
                          >
                            <Paperclip className="h-3 w-3" />
                            {attachment.originalName || `Anexo ${index + 1}`}
                            <span className="text-xs text-gray-500">
                              ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                          </button>
                        );
                      } else {
                        return (
                          <span key={index} className="text-sm text-gray-600 flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {attachment.originalName || `Anexo ${index + 1}`} (Disponível para técnicos)
                          </span>
                        );
                      }
                    })}
                  </div>
                )}

                {/* Show legacy attachments if any */}
                {currentTicket.attachments && Array.isArray(currentTicket.attachments) && currentTicket.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Anexos legados:</p>
                    {currentTicket.attachments.map((attachment, index) => {
                      // Verificar se é um URL do novo sistema (/api/files/...)
                      const isNewSystem = attachment.startsWith('/api/files/');
                      const canDownload = userRole === 'technician' || userRole === 'admin';

                      if (isNewSystem && canDownload) {
                        const handleDownload = async () => {
                          try {
                            const response = await fetch(attachment, {
                              headers: {
                                'x-user-role': userRole
                              }
                            });

                            if (!response.ok) {
                              throw new Error('Erro no download');
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `anexo-legado-${index + 1}`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            toast({
                              title: 'Erro',
                              description: 'Erro ao fazer download do arquivo',
                              variant: 'destructive'
                            });
                          }
                        };

                        return (
                          <button
                            key={index}
                            onClick={handleDownload}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                            data-testid={`button-download-ticket-attachment-${index}`}
                          >
                            <Paperclip className="h-3 w-3" />
                            Download Anexo Legado {index + 1}
                          </button>
                        );
                      } else if (isNewSystem) {
                        return (
                          <span key={index} className="text-sm text-gray-600 flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            Anexo Legado {index + 1} (Disponível para técnicos)
                          </span>
                        );
                      } else {
                        // Sistema antigo - manter compatibilidade
                        return (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Paperclip className="h-3 w-3" />
                            Anexo Legado {index + 1}
                          </a>
                        );
                      }
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Comentários e Atualizações</h3>

          {currentTicket.comments && currentTicket.comments.length > 0 ? (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {currentTicket.comments.map((comment) => (
                <Card
                  key={comment.id}
                  className={comment.authorType === "user" ? "comment-card-user" : "comment-card-tech"}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatToBrazilTime(comment.createdAt.toString())}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    {(() => {
                      let attachments;
                      try {
                        // Parse attachments if it's a string
                        attachments = typeof comment.attachments === 'string' 
                          ? JSON.parse(comment.attachments) 
                          : comment.attachments;
                      } catch {
                        attachments = Array.isArray(comment.attachments) ? comment.attachments : [];
                      }
                      
                      return attachments && Array.isArray(attachments) && attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Anexos:</p>
                          {attachments.map((attachment, index) => {
                            // Verificar se é um URL do novo sistema (/api/files/...)
                            const isNewSystem = attachment.startsWith('/api/files/');
                            const canDownload = userRole === 'technician' || userRole === 'admin';

                          // Extrair informações do arquivo do nome
                          const getFileInfoFromUrl = (url: string) => {
                            const filename = url.split('/').pop() || '';
                            // Função para extrair extensão sem usar módulo path do Node.js
                            const getFileExtension = (filename: string) => {
                              const lastDot = filename.lastIndexOf('.');
                              return lastDot > 0 ? filename.substring(lastDot) : '';
                            };
                            const extension = getFileExtension(filename);
                            const getFileType = (ext: string) => {
                              const e = ext.toLowerCase();
                              if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(e)) return 'image';
                              if (['.pdf'].includes(e)) return 'pdf';
                              if (['.doc', '.docx'].includes(e)) return 'document';
                              if (['.txt'].includes(e)) return 'text';
                              if (['.zip', '.rar', '.7z'].includes(e)) return 'archive';
                              return 'unknown';
                            };

                            const getFileIcon = (type: string) => {
                              switch (type) {
                                case 'image': return '🖼️';
                                case 'pdf': return '📄';
                                case 'document': return '📝';
                                case 'text': return '📄';
                                case 'archive': return '🗜️';
                                default: return '📎';
                              }
                            };

                            return {
                              extension,
                              fileType: getFileType(extension),
                              icon: getFileIcon(getFileType(extension)),
                              filename
                            };
                          };

                          if (isNewSystem) {
                            const fileInfo = getFileInfoFromUrl(attachment);

                            const handleDownload = async () => {
                              try {
                                const response = await fetch(attachment, {
                                  headers: {
                                    'x-user-role': userRole
                                  }
                                });

                                if (!response.ok) {
                                  throw new Error('Erro no download');
                                }

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = fileInfo.filename || `anexo-comentario-${index + 1}${fileInfo.extension}`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Download error:', error);
                                toast({
                                  title: 'Erro',
                                  description: 'Erro ao fazer download do arquivo',
                                  variant: 'destructive'
                                });
                              }
                            };

                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-muted rounded-md border"
                              >
                                <span className="text-lg">{fileInfo.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate" title={fileInfo.filename}>
                                    {fileInfo.filename || `Anexo ${index + 1}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Anexado no comentário por {comment.authorName}
                                  </p>
                                </div>
                                {canDownload ? (
                                  <button
                                    onClick={handleDownload}
                                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                                    data-testid={`button-download-comment-attachment-${index}`}
                                  >
                                    Baixar
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    Acesso restrito
                                  </span>
                                )}
                              </div>
                            );
                          } else if (canDownload) {
                            // Sistema antigo - manter compatibilidade apenas para técnicos/admins
                            return (
                              <a
                                key={index}
                                href={attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <Paperclip className="h-3 w-3" />
                                Anexo Legado {index + 1}
                              </a>
                            );
                          } else {
                            // Mostrar que anexo existe mas não está disponível para usuários
                            return (
                              <div key={index} className="text-sm text-gray-600 flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                <span>Anexo {index + 1} (Disponível para técnicos)</span>
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nenhum comentário ainda
            </p>
          )}

          {/* Add Comment */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Adicionar Comentário</h4>
            {(() => {
              // User can comment only if ticket is not assigned to any technician yet
              const canUserComment = userRole === "user" && 
                (currentTicket.status === 'waiting' || currentTicket.status === 'open') && 
                !currentTicket.assignedToId;
              
              // Technicians and admins can comment unless ticket is resolved (only admin can comment on resolved)
              const canTechComment = userRole !== "user" && (currentTicket.status !== 'resolved' || userRole === 'admin');
              const canComment = userRole === "user" ? canUserComment : canTechComment;

              if (!canComment) {
                return (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-600">
                      {userRole === "user"
                        ? currentTicket.assignedToId 
                          ? "Você não pode mais adicionar comentários após o chamado ser atribuído a um técnico."
                          : currentTicket.status === 'resolved'
                          ? "Este chamado foi resolvido e não aceita mais comentários."
                          : "Você não pode comentar neste chamado."
                        : "Este chamado foi resolvido e não aceita mais comentários. Apenas administradores podem comentar em chamados resolvidos."
                      }
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Digite seu comentário..."
                    className="min-h-20"
                    data-testid="textarea-new-comment"
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Anexar Arquivos (Opcional)</label>
                    <FileUpload
                      onFilesChange={setCommentFiles}
                      maxFiles={2}
                      disabled={addCommentMutation.isPending}
                    />
                  </div>

                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {addCommentMutation.isPending ? "Enviando..." : "Enviar Comentário"}
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}