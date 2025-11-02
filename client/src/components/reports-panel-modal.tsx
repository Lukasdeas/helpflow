import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FileText, FileSpreadsheet, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { TicketWithDetails } from "@shared/schema";

interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  totalTickets: number;
  resolvedTickets: number;
  avgResolutionTimeMinutes: number;
}

interface StatsData {
  total: number;
  resolved: number;
  inProgress: number;
  open: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  avgResolutionTimeMinutes: number;
  avgWaitingTimeMinutes: number;
  totalResolutionTimeMinutes: number;
}

interface ReportsPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportsPanelModal({ isOpen, onClose }: ReportsPanelModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const { data: tickets = [] } = useQuery<TicketWithDetails[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: stats } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const { data: performanceData = [] } = useQuery<TechnicianPerformance[]>({
    queryKey: ["/api/technician-performance"],
  });

  // Filter tickets based on selected criteria
  const filteredTickets = useMemo(() => {
    if (!filtersApplied && !startDate && !endDate && selectedSector === "all") {
      return tickets;
    }

    return tickets.filter((ticket) => {
      // Date filter - usando fuso horário do Brasil
      if (startDate) {
        const ticketDate = new Date(ticket.createdAt).toLocaleDateString('en-CA', {
          timeZone: 'America/Sao_Paulo'
        });
        if (ticketDate < startDate) return false;
      }

      if (endDate) {
        const ticketDate = new Date(ticket.createdAt).toLocaleDateString('en-CA', {
          timeZone: 'America/Sao_Paulo'
        });
        if (ticketDate > endDate) return false;
      }

      // Sector filter
      if (selectedSector !== "all" && selectedSector !== "") {
        if (ticket.sector.toLowerCase() !== selectedSector.toLowerCase()) return false;
      }

      return true;
    });
  }, [tickets, startDate, endDate, selectedSector, filtersApplied]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const total = filteredTickets.length;
    const resolved = filteredTickets.filter(t => t.status === 'resolved').length;
    const inProgress = filteredTickets.filter(t => t.status === 'in_progress').length;
    const open = filteredTickets.filter(t => t.status === 'open').length;
    const highPriority = filteredTickets.filter(t => t.priority === 'high').length;
    const mediumPriority = filteredTickets.filter(t => t.priority === 'medium').length;
    const lowPriority = filteredTickets.filter(t => t.priority === 'low').length;

    // Calculate average resolution time for resolved tickets in the filtered set
    const resolvedTicketsWithTimes = filteredTickets.filter(t => 
      t.status === 'resolved' && t.acceptedAt && t.resolvedAt
    );

    let avgResolutionTimeMinutes = 0;
    let avgWaitingTimeMinutes = 0;
    let totalResolutionTimeMinutes = 0;

    if (resolvedTicketsWithTimes.length > 0) {
      const totalResolutionMs = resolvedTicketsWithTimes.reduce((acc, ticket) => {
        const resolutionMs = new Date(ticket.resolvedAt!).getTime() - new Date(ticket.acceptedAt!).getTime();
        return acc + resolutionMs;
      }, 0);
      avgResolutionTimeMinutes = totalResolutionMs / (resolvedTicketsWithTimes.length * 60 * 1000);

      const totalWaitingMs = resolvedTicketsWithTimes.reduce((acc, ticket) => {
        const waitingMs = new Date(ticket.acceptedAt!).getTime() - new Date(ticket.createdAt).getTime();
        return acc + waitingMs;
      }, 0);
      avgWaitingTimeMinutes = totalWaitingMs / (resolvedTicketsWithTimes.length * 60 * 1000);

      const totalTimeMs = resolvedTicketsWithTimes.reduce((acc, ticket) => {
        const totalMs = new Date(ticket.resolvedAt!).getTime() - new Date(ticket.createdAt).getTime();
        return acc + totalMs;
      }, 0);
      totalResolutionTimeMinutes = totalTimeMs / (resolvedTicketsWithTimes.length * 60 * 1000);
    }

    return {
      total,
      resolved,
      inProgress,
      open,
      highPriority,
      mediumPriority,
      lowPriority,
      avgResolutionTimeMinutes,
      avgWaitingTimeMinutes,
      totalResolutionTimeMinutes
    };
  }, [filteredTickets]);

  // Calculate filtered performance data
  const filteredPerformanceData = useMemo(() => {
    const technicianMap = new Map();

    filteredTickets.forEach(ticket => {
      if (!ticket.assignedToId) return;

      const techId = ticket.assignedToId;
      const techName = ticket.assignedTo?.name || 'Técnico';

      if (!technicianMap.has(techId)) {
        technicianMap.set(techId, {
          technicianId: techId,
          technicianName: techName,
          totalTickets: 0,
          resolvedTickets: 0,
          totalResolutionTime: 0,
          resolvedCount: 0
        });
      }

      const tech = technicianMap.get(techId);
      tech.totalTickets++;

      if (ticket.status === 'resolved') {
        tech.resolvedTickets++;
        if (ticket.acceptedAt && ticket.resolvedAt) {
          const resolutionTime = new Date(ticket.resolvedAt).getTime() - new Date(ticket.acceptedAt).getTime();
          tech.totalResolutionTime += resolutionTime;
          tech.resolvedCount++;
        }
      }
    });

    return Array.from(technicianMap.values()).map(tech => ({
      technicianId: tech.technicianId,
      technicianName: tech.technicianName,
      totalTickets: tech.totalTickets,
      resolvedTickets: tech.resolvedTickets,
      avgResolutionTimeMinutes: tech.resolvedCount > 0 
        ? tech.totalResolutionTime / (tech.resolvedCount * 60 * 1000)
        : 0
    }));
  }, [filteredTickets]);

  const applyFilters = () => {
    setFiltersApplied(true);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedSector("all");
    setFiltersApplied(false);
  };

  const defaultStats: StatsData = {
    total: 0,
    resolved: 0,
    inProgress: 0,
    open: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    avgResolutionTimeMinutes: 0,
    avgWaitingTimeMinutes: 0,
    totalResolutionTimeMinutes: 0
  };

  const currentStats = filtersApplied ? filteredStats : (stats || defaultStats);
  const currentPerformanceData = filtersApplied ? filteredPerformanceData : performanceData;

  const priorityPercentages = {
    high: currentStats.total ? Math.round((currentStats.highPriority / currentStats.total) * 100) || 0 : 0,
    medium: currentStats.total ? Math.round((currentStats.mediumPriority / currentStats.total) * 100) || 0 : 0,
    low: currentStats.total ? Math.round((currentStats.lowPriority / currentStats.total) * 100) || 0 : 0,
  };

  // Format time from minutes to readable format
  const formatTime = (minutes: number) => {
    if (minutes === 0) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const XLSX = await import('xlsx');

      // Dados dos chamados
      const ticketsData = filteredTickets.map(ticket => ({
        'Número': ticket.ticketNumber,
        'Título': ticket.title,
        'Solicitante': ticket.requesterName,
        'Email': ticket.userEmail || 'N/A',
        'Setor': ticket.sector,
        'Prioridade': ticket.priority === 'high' ? 'Alta' : 
                     ticket.priority === 'medium' ? 'Média' : 
                     ticket.priority === 'low' ? 'Baixa' : 'Aguardando',
        'Status': ticket.status === 'open' ? 'Aberto' : 
                 ticket.status === 'in_progress' ? 'Em Andamento' : 'Resolvido',
        'Técnico': ticket.assignedTo?.name || 'Não atribuído',
        'Criado em': new Date(ticket.createdAt).toLocaleString('pt-BR'),
        'Aceito em': ticket.acceptedAt ? new Date(ticket.acceptedAt).toLocaleString('pt-BR') : 'N/A',
        'Resolvido em': ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('pt-BR') : 'N/A',
        'Descrição': ticket.description
      }));

      // Dados de estatísticas
      const statsData = [
        ['Métrica', 'Valor'],
        ['Total de Chamados', currentStats.total || 0],
        ['Chamados Resolvidos', currentStats.resolved || 0],
        ['Chamados em Andamento', currentStats.inProgress || 0],
        ['Chamados Abertos', currentStats.open || 0],
        ['Alta Prioridade', currentStats.highPriority || 0],
        ['Média Prioridade', currentStats.mediumPriority || 0],
        ['Baixa Prioridade', currentStats.lowPriority || 0],
        ['Tempo Médio de Resolução', formatTime(currentStats.avgResolutionTimeMinutes || 0)],
        ['Tempo Médio de Espera', formatTime(currentStats.avgWaitingTimeMinutes || 0)],
        ['Tempo Total Médio', formatTime(currentStats.totalResolutionTimeMinutes || 0)]
      ];

      // Dados de performance dos técnicos
      const performanceDataArray = currentPerformanceData.map(perf => ({
        'Técnico': perf.technicianName,
        'Total de Chamados': perf.totalTickets,
        'Chamados Resolvidos': perf.resolvedTickets,
        'Taxa de Resolução (%)': perf.totalTickets > 0 ? Math.round((perf.resolvedTickets / perf.totalTickets) * 100) : 0,
        'Tempo Médio de Resolução': formatTime(perf.avgResolutionTimeMinutes)
      }));

      // Criar workbook
      const workbook = XLSX.utils.book_new();

      // Aba de chamados
      const ticketsWorksheet = XLSX.utils.json_to_sheet(ticketsData);
      XLSX.utils.book_append_sheet(workbook, ticketsWorksheet, 'Chamados');

      // Aba de estatísticas
      const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Estatísticas');

      // Aba de performance
      if (performanceDataArray.length > 0) {
        const performanceWorksheet = XLSX.utils.json_to_sheet(performanceDataArray);
        XLSX.utils.book_append_sheet(workbook, performanceWorksheet, 'Performance Técnicos');
      }

      // Gerar nome do arquivo
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const filename = `relatorio-help-doctum-${dateStr}.xlsx`;

      // Exportar
      XLSX.writeFile(workbook, filename);
      setIsExportingExcel(false);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Configurações
      const pageWidth = doc.internal.pageSize.width;
      const margin = 14;

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório Help Doctum', pageWidth / 2, 20, { align: 'center' });

      // Data do relatório
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const reportDate = new Date().toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Gerado em: ${reportDate}`, pageWidth / 2, 28, { align: 'center' });

      let yPosition = 40;

      // Estatísticas gerais
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Estatísticas Gerais', margin, yPosition);
      yPosition += 10;

      const statsTableData = [
        ['Métrica', 'Valor'],
        ['Total de Chamados', (currentStats.total || 0).toString()],
        ['Chamados Resolvidos', (currentStats.resolved || 0).toString()],
        ['Chamados em Andamento', (currentStats.inProgress || 0).toString()],
        ['Chamados Abertos', (currentStats.open || 0).toString()],
        ['Alta Prioridade', (currentStats.highPriority || 0).toString()],
        ['Média Prioridade', (currentStats.mediumPriority || 0).toString()],
        ['Baixa Prioridade', (currentStats.lowPriority || 0).toString()],
        ['Tempo Médio de Resolução', formatTime(currentStats.avgResolutionTimeMinutes || 0)],
        ['Tempo Médio de Espera', formatTime(currentStats.avgWaitingTimeMinutes || 0)]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: statsTableData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Performance dos técnicos
      if (currentPerformanceData.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Performance dos Técnicos', margin, yPosition);
        yPosition += 10;

        const performanceTableData = currentPerformanceData.map(perf => [
          perf.technicianName,
          perf.totalTickets.toString(),
          perf.resolvedTickets.toString(),
          perf.totalTickets > 0 ? `${Math.round((perf.resolvedTickets / perf.totalTickets) * 100)}%` : '0%',
          formatTime(perf.avgResolutionTimeMinutes)
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Técnico', 'Total', 'Resolvidos', 'Taxa (%)', 'Tempo Médio']],
          body: performanceTableData,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Nova página para a lista de chamados
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Chamados', margin, yPosition);
      yPosition += 10;

      // Preparar dados dos chamados para a tabela
      const ticketsTableData = filteredTickets.slice(0, 50).map(ticket => [
        ticket.ticketNumber.toString(),
        ticket.title.length > 25 ? ticket.title.substring(0, 25) + '...' : ticket.title,
        ticket.requesterName.length > 20 ? ticket.requesterName.substring(0, 20) + '...' : ticket.requesterName,
        ticket.priority === 'high' ? 'Alta' : 
        ticket.priority === 'medium' ? 'Média' : 
        ticket.priority === 'low' ? 'Baixa' : 'Aguardando',
        ticket.status === 'open' ? 'Aberto' : 
        ticket.status === 'in_progress' ? 'Em Andamento' : 'Resolvido',
        new Date(ticket.createdAt).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Nº', 'Título', 'Solicitante', 'Prioridade', 'Status', 'Criado']],
        body: ticketsTableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Gerar nome do arquivo
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const filename = `relatorio-help-doctum-${dateStr}.pdf`;

      // Salvar
      doc.save(filename);
      setIsExportingPDF(false);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      setIsExportingPDF(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="reports-description">
        <DialogHeader>
          <DialogTitle>Relatórios e Analytics</DialogTitle>
          <div id="reports-description" className="sr-only">
            Visualize estatísticas e gere relatórios do Help Doctum.
          </div>
        </DialogHeader>

        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
              {filtersApplied && (
                <span className="text-sm text-muted-foreground">
                  (Filtros aplicados - {filteredTickets.length} de {tickets.length} chamados)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Data início"
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data fim</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Data fim"
                  data-testid="input-end-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Setor</label>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger data-testid="select-sector-filter">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button onClick={applyFilters} data-testid="button-apply-filters">
                  <Filter className="mr-2 h-4 w-4" />
                  Aplicar
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <h4 className="font-semibold text-2xl text-primary" data-testid="stat-total">
                {currentStats.total || 0}
              </h4>
              <p className="text-muted-foreground text-sm">Total de Chamados</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <h4 className="font-semibold text-2xl text-green-600" data-testid="stat-resolved">
                {currentStats.resolved || 0}
              </h4>
              <p className="text-muted-foreground text-sm">Resolvidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <h4 className="font-semibold text-2xl text-blue-600" data-testid="stat-in-progress">
                {currentStats.inProgress || 0}
              </h4>
              <p className="text-muted-foreground text-sm">Em Andamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <h4 className="font-semibold text-2xl text-orange-600" data-testid="stat-avg-time">
                {formatTime(currentStats.avgResolutionTimeMinutes || 0)}
              </h4>
              <p className="text-muted-foreground text-sm">Tempo Médio de Resolução</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Time Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <h4 className="font-semibold text-2xl text-purple-600" data-testid="stat-waiting-time">
                {formatTime(currentStats.avgWaitingTimeMinutes || 0)}
              </h4>
              <p className="text-muted-foreground text-sm">Tempo Médio de Espera</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <h4 className="font-semibold text-2xl text-indigo-600" data-testid="stat-total-time">
                {formatTime(currentStats.totalResolutionTimeMinutes || 0)}
              </h4>
              <p className="text-muted-foreground text-sm">Tempo Total Médio</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tickets by Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Chamados por Prioridade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Alta Prioridade</span>
                <div className="flex items-center gap-2 w-32">
                  <Progress value={priorityPercentages.high} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-10 text-right">
                    {priorityPercentages.high}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Média Prioridade</span>
                <div className="flex items-center gap-2 w-32">
                  <Progress value={priorityPercentages.medium} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-10 text-right">
                    {priorityPercentages.medium}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Baixa Prioridade</span>
                <div className="flex items-center gap-2 w-32">
                  <Progress value={priorityPercentages.low} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-10 text-right">
                    {priorityPercentages.low}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance by Technician */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Técnico</CardTitle>
            </CardHeader>
            <CardContent>
              {currentPerformanceData.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum técnico com chamados atribuídos
                </p>
              ) : (
                <div className="space-y-4">
                  {currentPerformanceData.map((metric, index) => {
                    const resolutionRate = metric.totalTickets > 0 
                      ? Math.round((metric.resolvedTickets / metric.totalTickets) * 100)
                      : 0;

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{metric.technicianName || 'Técnico'}</span>
                          <span className="text-xs text-muted-foreground">
                            {resolutionRate}% resolvidos
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-green-600">
                            {metric.resolvedTickets}/{metric.totalTickets} chamados
                          </span>
                          <span className="text-orange-600">
                            {formatTime(metric.avgResolutionTimeMinutes)} média
                          </span>
                        </div>
                        <Progress value={resolutionRate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <div className="flex justify-center gap-4">
          <Button 
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExportingExcel ? 'Exportando...' : 'Exportar Excel'}
          </Button>
          <Button 
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            data-testid="button-export-pdf"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExportingPDF ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}