import nodemailer from 'nodemailer';
import type { Ticket, User } from '@shared/schema';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'suporte@empresa.com';
    this.initializeTransporter();
  }

  // Função para escapar HTML e prevenir injeção
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private initializeTransporter() {
    try {
      // Configuração usando variáveis de ambiente
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      };

      // Se não tiver configuração SMTP, criar um transporter de teste
      if (!process.env.SMTP_HOST) {
        console.log('⚠️ SMTP não configurado. Emails não serão enviados (modo teste).');
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
      } else {
        console.log('✅ SMTP configurado e pronto para enviar emails.');
        this.transporter = nodemailer.createTransport(config);
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar transporter de email:', error);
      // Criar um transporter de teste em caso de erro
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Transporter de email não inicializado');
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Email enviado:', info.messageId);
        console.log('Preview:', nodemailer.getTestMessageUrl(info) || 'N/A');
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }

  // Notificação de criação de ticket
  async sendTicketCreatedNotification(ticket: Ticket): Promise<boolean> {
    const subject = `Chamado #${ticket.ticketNumber} criado com sucesso`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Chamado Criado com Sucesso</h2>
        
        <p>Olá <strong>${this.escapeHtml(ticket.requesterName)}</strong>,</p>
        
        <p>Seu chamado foi criado com sucesso! Aqui estão os detalhes:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Detalhes do Chamado</h3>
          <p><strong>Número:</strong> #${ticket.ticketNumber}</p>
          <p><strong>Título:</strong> ${this.escapeHtml(ticket.title)}</p>
          <p><strong>Descrição:</strong> ${this.escapeHtml(ticket.description)}</p>
          <p><strong>Setor:</strong> ${this.escapeHtml(ticket.sector)}</p>
          <p><strong>Tipo de Problema:</strong> ${this.escapeHtml(ticket.problemType)}</p>
          <p><strong>Prioridade:</strong> ${this.escapeHtml(ticket.priority)}</p>
          <p><strong>Status:</strong> ${this.escapeHtml(ticket.status)}</p>
        </div>
        
        <h3>Como acompanhar seu chamado:</h3>
        <ul>
          <li>Acesse a interface do sistema de tickets</li>
          <li>Vá até a aba de "Comentários" para ver atualizações</li>
          <li>Use o número do chamado <strong>#${ticket.ticketNumber}</strong> para referência</li>
        </ul>
        
        <p>Você receberá notificações por email quando:</p>
        <ul>
          <li>Um técnico assumir seu chamado</li>
          <li>Houver comentários ou atualizações no seu chamado</li>
        </ul>
        
        <p>Obrigado por utilizar nosso sistema de suporte!</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Esta é uma mensagem automática. Por favor, não responda diretamente a este email.
        </p>
      </div>
    `;
    
    return await this.sendEmail(ticket.userEmail, subject, html);
  }

  async sendTicketCreatedNotificationToTechnicians(ticket: Ticket, technicians: User[]): Promise<boolean> {
    const subject = `Novo Chamado #${ticket.ticketNumber} - ${ticket.sector}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🔔 Novo Chamado Aberto</h2>
        
        <p>Um novo chamado foi aberto no sistema e requer atenção.</p>
        
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <h3>Detalhes do Chamado</h3>
          <p><strong>Número:</strong> #${ticket.ticketNumber}</p>
          <p><strong>Título:</strong> ${this.escapeHtml(ticket.title)}</p>
          <p><strong>Descrição:</strong> ${this.escapeHtml(ticket.description)}</p>
          <p><strong>Setor:</strong> ${this.escapeHtml(ticket.sector)}</p>
          <p><strong>Tipo de Problema:</strong> ${this.escapeHtml(ticket.problemType)}</p>
          <p><strong>Prioridade:</strong> <span style="font-weight: bold; color: ${
            ticket.priority === 'high' ? '#ef4444' : 
            ticket.priority === 'medium' ? '#f59e0b' : 
            '#10b981'
          };">${
            ticket.priority === 'high' ? 'Alta' : 
            ticket.priority === 'medium' ? 'Média' : 
            'Baixa'
          }</span></p>
          <p><strong>Solicitante:</strong> ${this.escapeHtml(ticket.requesterName)}</p>
          ${ticket.userEmail ? `<p><strong>Email do Solicitante:</strong> ${this.escapeHtml(ticket.userEmail)}</p>` : ''}
        </div>
        
        <h3>Próximos passos:</h3>
        <ul>
          <li>Acesse o sistema de tickets para visualizar mais detalhes</li>
          <li>Aceite o chamado se você puder resolvê-lo</li>
          <li>Comunique-se com o solicitante através dos comentários</li>
        </ul>
        
        <p>Para aceitar e trabalhar neste chamado, acesse o painel de técnicos no sistema.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Esta é uma mensagem automática. Por favor, não responda diretamente a este email.
        </p>
      </div>
    `;

    const emailPromises = technicians
      .filter(tech => tech.email && tech.email.trim() !== '')
      .map(tech => this.sendEmail(tech.email!, subject, html));

    try {
      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Emails enviados para técnicos: ${successful} sucesso, ${failed} falhas`);
      
      return successful > 0;
    } catch (error) {
      console.error('Erro ao enviar emails para técnicos:', error);
      return false;
    }
  }

  // Notificação de atribuição de ticket
  async sendTicketAssignedNotification(ticket: Ticket, technician: User): Promise<boolean> {
    const subject = `Chamado #${ticket.ticketNumber} foi aceito por um técnico`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Chamado Aceito!</h2>
        
        <p>Olá <strong>${this.escapeHtml(ticket.requesterName)}</strong>,</p>
        
        <p>Ótimas notícias! Seu chamado foi aceito por um técnico e já está sendo trabalhado.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3>Informações do Chamado</h3>
          <p><strong>Número:</strong> #${ticket.ticketNumber}</p>
          <p><strong>Título:</strong> ${this.escapeHtml(ticket.title)}</p>
          <p><strong>Técnico Responsável:</strong> ${this.escapeHtml(technician.name)}</p>
          <p><strong>Status:</strong> Em andamento</p>
        </div>
        
        <h3>Próximos passos:</h3>
        <ul>
          <li>O técnico <strong>${this.escapeHtml(technician.name)}</strong> irá trabalhar na resolução do seu problema</li>
          <li>Você pode acompanhar o progresso na aba de "Comentários" do sistema</li>
          <li>Receberá notificações por email sobre atualizações importantes</li>
        </ul>
        
        <p>Se tiver alguma dúvida adicional, você pode adicionar comentários no sistema de tickets.</p>
        
        <p>Obrigado pela sua paciência!</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Esta é uma mensagem automática. Por favor, não responda diretamente a este email.
        </p>
      </div>
    `;
    
    return await this.sendEmail(ticket.userEmail, subject, html);
  }

  // Notificação de novo comentário
  async sendCommentAddedNotification(ticket: Ticket, authorName: string): Promise<boolean> {
    const subject = `Nova atualização no chamado #${ticket.ticketNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nova Atualização no Seu Chamado</h2>
        
        <p>Olá <strong>${this.escapeHtml(ticket.requesterName)}</strong>,</p>
        
        <p>Houve uma nova atualização no seu chamado. Confira os detalhes abaixo:</p>
        
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <h3>Chamado Atualizado</h3>
          <p><strong>Número:</strong> #${ticket.ticketNumber}</p>
          <p><strong>Título:</strong> ${this.escapeHtml(ticket.title)}</p>
          <p><strong>Atualizado por:</strong> ${this.escapeHtml(authorName)}</p>
          <p><strong>Status atual:</strong> ${this.escapeHtml(ticket.status)}</p>
        </div>
        
        <h3>Como verificar a atualização:</h3>
        <ol>
          <li>Acesse o sistema de tickets</li>
          <li>Encontre seu chamado #${ticket.ticketNumber}</li>
          <li>Vá até a aba de "Comentários"</li>
          <li>Confira a nova mensagem ou atualização</li>
        </ol>
        
        <p>É importante acompanhar as atualizações para estar sempre informado sobre o progresso da resolução do seu problema.</p>
        
        <p>Obrigado por utilizar nosso sistema de suporte!</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Esta é uma mensagem automática. Por favor, não responda diretamente a este email.
        </p>
      </div>
    `;
    
    return await this.sendEmail(ticket.userEmail, subject, html);
  }

  // Notificação de mudança de prioridade
  async sendPriorityChangedNotification(ticket: Ticket, newPriority: string, updatedBy: string): Promise<boolean> {
    const priorityLabels: Record<string, string> = {
      'low': 'Baixa',
      'medium': 'Média', 
      'high': 'Alta'
    };

    const priorityColors: Record<string, string> = {
      'low': '#10b981',
      'medium': '#f59e0b',
      'high': '#ef4444'
    };

    // Proteção contra valores desconhecidos
    const safeLabel = priorityLabels[newPriority] || 'Não definida';
    const safeColor = priorityColors[newPriority] || '#6b7280';

    const subject = `Prioridade do chamado #${ticket.ticketNumber} foi alterada`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${safeColor};">Prioridade Alterada</h2>
        
        <p>Olá <strong>${this.escapeHtml(ticket.requesterName)}</strong>,</p>
        
        <p>A prioridade do seu chamado foi alterada por nossa equipe técnica.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${safeColor};">
          <h3>Detalhes da Alteração</h3>
          <p><strong>Número do Chamado:</strong> #${ticket.ticketNumber}</p>
          <p><strong>Título:</strong> ${this.escapeHtml(ticket.title)}</p>
          <p><strong>Nova Prioridade:</strong> <span style="color: ${safeColor}; font-weight: bold;">${safeLabel}</span></p>
          <p><strong>Alterado por:</strong> ${this.escapeHtml(updatedBy)}</p>
        </div>
        
        <h3>O que isso significa:</h3>
        <ul>
          ${newPriority === 'high' ? 
            '<li style="color: #ef4444;"><strong>Alta Prioridade:</strong> Seu chamado será tratado com urgência pela nossa equipe</li>' :
            newPriority === 'medium' ?
            '<li style="color: #f59e0b;"><strong>Prioridade Média:</strong> Seu chamado será tratado dentro do prazo normal</li>' :
            newPriority === 'low' ?
            '<li style="color: #10b981;"><strong>Baixa Prioridade:</strong> Seu chamado será tratado conforme disponibilidade da equipe</li>' :
            '<li style="color: #6b7280;"><strong>Prioridade Personalizada:</strong> Seu chamado será tratado conforme definido pela equipe</li>'
          }
          <li>Você continuará recebendo atualizações sobre o progresso</li>
          <li>A mudança de prioridade não afeta a qualidade do atendimento</li>
        </ul>
        
        <p>Continue acompanhando seu chamado através da aba de comentários no sistema.</p>
        
        <p>Obrigado por utilizar nosso sistema de suporte!</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Esta é uma mensagem automática. Por favor, não responda diretamente a este email.
        </p>
      </div>
    `;
    
    return await this.sendEmail(ticket.userEmail, subject, html);
  }

  // Notificação de finalização de chamado  
  async sendTicketResolvedNotification(ticket: Ticket, resolvedBy: string): Promise<boolean> {
    const subject = `Chamado #${ticket.ticketNumber} foi finalizado`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">🎉 Chamado Finalizado!</h2>
        
        <p>Olá <strong>${this.escapeHtml(ticket.requesterName)}</strong>,</p>
        
        <p>Temos uma ótima notícia! Seu chamado foi finalizado com sucesso pela nossa equipe técnica.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3>Chamado Resolvido ✅</h3>
          <p><strong>Número:</strong> #${ticket.ticketNumber}</p>
          <p><strong>Título:</strong> ${this.escapeHtml(ticket.title)}</p>
          <p><strong>Finalizado por:</strong> ${this.escapeHtml(resolvedBy)}</p>
          <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Resolvido</span></p>
        </div>
        
        <h3>Próximos passos:</h3>
        <ul>
          <li>✅ Verifique se o problema foi totalmente solucionado</li>
          <li>📋 Acesse o sistema para ver os detalhes da resolução</li>
          <li>💬 Confira os comentários finais da equipe técnica</li>
          <li>📞 Entre em contato conosco se ainda houver algum problema</li>
        </ul>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #2563eb;">Avaliação do Atendimento</h4>
          <p>Sua opinião é muito importante para nós! Se possível, avalie nosso atendimento através do sistema.</p>
        </div>
        
        <p>Obrigado por utilizar nosso sistema de suporte. Estamos sempre aqui para ajudá-lo!</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Esta é uma mensagem automática. Por favor, não responda diretamente a este email.
        </p>
      </div>
    `;
    
    return await this.sendEmail(ticket.userEmail, subject, html);
  }

  // Verificar se o serviço de email está configurado
  isConfigured(): boolean {
    return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
  }

  // Testar conexão de email
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Erro na verificação do email:', error);
      return false;
    }
  }
}

// Instância singleton do serviço de email
export const emailService = new EmailService();