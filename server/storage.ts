import {
  users,
  tickets,
  comments,
  type User,
  type InsertUser,
  type Ticket,
  type InsertTicket,
  type Comment,
  type InsertComment,
  type TicketWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql } from "drizzle-orm";
import { getBrazilTimestamp } from "./utils/timezone";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllTechnicians(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Ticket operations
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicket(id: string): Promise<TicketWithDetails | undefined>;
  getAllTickets(): Promise<TicketWithDetails[]>;
  getTicketsByStatus(status: string): Promise<TicketWithDetails[]>;
  updateTicketPriority(id: string, priority: string): Promise<void>;
  updateTicketStatus(id: string, status: string): Promise<void>;
  assignTicket(id: string, technicianId: string): Promise<void>;

  // Comment operations
  addComment(comment: InsertComment): Promise<Comment>;
  getTicketComments(ticketId: string): Promise<Comment[]>;

  // Statistics
  getTicketStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    avgResolutionTimeMinutes: number;
    avgWaitingTimeMinutes: number;
    totalResolutionTimeMinutes: number;
  }>;
  getTechnicianPerformance(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllTechnicians(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(asc(users.name));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createTicket(ticketData: InsertTicket): Promise<Ticket> {
    const ticketNumber = Date.now();
    const brazilTime = getBrazilTimestamp();
    const [ticket] = await db.insert(tickets).values({
      ...ticketData,
      ticketNumber,
      attachments: JSON.stringify(ticketData.attachments || []),
      createdAt: brazilTime,
      updatedAt: brazilTime,
    }).returning();
    return ticket;
  }

  async getTicket(id: string): Promise<TicketWithDetails | undefined> {
    const ticketData = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        attachments: tickets.attachments,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(eq(tickets.id, id))
      .limit(1);

    if (ticketData.length === 0) {
      return undefined;
    }

    const ticketComments = await db
      .select()
      .from(comments)
      .where(eq(comments.ticketId, id))
      .orderBy(asc(comments.createdAt));

    return {
      ...ticketData[0],
      assignedTo: ticketData[0].assignedTo || undefined,
      comments: ticketComments,
    };
  }

  async getAllTickets(): Promise<TicketWithDetails[]> {
    const ticketsData = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        attachments: tickets.attachments,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .orderBy(
        sql`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
        desc(tickets.createdAt)
      );

    // Get comments for all tickets
    const allComments = await db
      .select()
      .from(comments)
      .orderBy(asc(comments.createdAt));

    // Group comments by ticket ID
    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {} as Record<string, Comment[]>);

    return ticketsData.map(ticket => ({
      ...ticket,
      assignedTo: ticket.assignedTo || undefined,
      comments: commentsByTicket[ticket.id] || [],
    }));
  }

  async getTicketsByStatus(status: string): Promise<TicketWithDetails[]> {
    const ticketsData = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        attachments: tickets.attachments,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(eq(tickets.status, status))
      .orderBy(
        sql`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
        desc(tickets.createdAt)
      );

    const allComments = await db
      .select()
      .from(comments)
      .orderBy(asc(comments.createdAt));

    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {} as Record<string, Comment[]>);

    return ticketsData.map(ticket => ({
      ...ticket,
      assignedTo: ticket.assignedTo || undefined,
      comments: commentsByTicket[ticket.id] || [],
    }));
  }

  async getTicketsForTechnician(technicianId: string): Promise<TicketWithDetails[]> {
    const ticketsData = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        sector: tickets.sector,
        problemType: tickets.problemType,
        priority: tickets.priority,
        status: tickets.status,
        requesterName: tickets.requesterName,
        userEmail: tickets.userEmail,
        assignedToId: tickets.assignedToId,
        acceptedAt: tickets.acceptedAt,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        attachments: tickets.attachments,
        assignedTo: users,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(
        sql`${tickets.assignedToId} = ${technicianId} OR ${tickets.assignedToId} IS NULL`
      )
      .orderBy(
        sql`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
        desc(tickets.createdAt)
      );

    const allComments = await db
      .select()
      .from(comments)
      .orderBy(asc(comments.createdAt));

    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {} as Record<string, Comment[]>);

    return ticketsData.map(ticket => ({
      ...ticket,
      assignedTo: ticket.assignedTo || undefined,
      comments: commentsByTicket[ticket.id] || [],
    }));
  }

  async updateTicketPriority(id: string, priority: string): Promise<void> {
    await db
      .update(tickets)
      .set({ priority, updatedAt: getBrazilTimestamp() })
      .where(eq(tickets.id, id));
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: getBrazilTimestamp()
    };

    if (status === 'resolved') {
      updateData.resolvedAt = getBrazilTimestamp();
    }

    await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId));
  }

  async assignTicket(id: string, technicianId: string): Promise<void> {
    const brazilTime = getBrazilTimestamp();
    await db
      .update(tickets)
      .set({
        assignedToId: technicianId,
        status: 'in_progress',
        acceptedAt: brazilTime,
        updatedAt: brazilTime
      })
      .where(eq(tickets.id, id));
  }

  async addComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getTicketComments(ticketId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.ticketId, ticketId))
      .orderBy(asc(comments.createdAt));
  }

  async getTicketStats() {
    // Implementação simplificada para SQLite
    const allTickets = await db.select().from(tickets);

    const total = allTickets.length;
    const open = allTickets.filter(t => t.status === 'open').length;
    const inProgress = allTickets.filter(t => t.status === 'in_progress').length;
    const resolved = allTickets.filter(t => t.status === 'resolved').length;
    const highPriority = allTickets.filter(t => t.priority === 'high').length;
    const mediumPriority = allTickets.filter(t => t.priority === 'medium').length;
    const lowPriority = allTickets.filter(t => t.priority === 'low').length;

    // Calcular tempos médios (simplificado para agora)
    const resolvedTickets = allTickets.filter(t => t.resolvedAt && t.acceptedAt);
    const avgResolutionTimeMinutes = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const resolution = new Date(t.resolvedAt!).getTime() - new Date(t.acceptedAt!).getTime();
          return sum + (resolution / (1000 * 60));
        }, 0) / resolvedTickets.length
      : 0;

    const acceptedTickets = allTickets.filter(t => t.acceptedAt);
    const avgWaitingTimeMinutes = acceptedTickets.length > 0
      ? acceptedTickets.reduce((sum, t) => {
          const waiting = new Date(t.acceptedAt!).getTime() - new Date(t.createdAt).getTime();
          return sum + (waiting / (1000 * 60));
        }, 0) / acceptedTickets.length
      : 0;

    const totalResolvedTickets = allTickets.filter(t => t.resolvedAt);
    const totalResolutionTimeMinutes = totalResolvedTickets.length > 0
      ? totalResolvedTickets.reduce((sum, t) => {
          const total = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
          return sum + (total / (1000 * 60));
        }, 0) / totalResolvedTickets.length
      : 0;

    return {
      total,
      open,
      inProgress,
      resolved,
      highPriority,
      mediumPriority,
      lowPriority,
      avgResolutionTimeMinutes: Math.round(avgResolutionTimeMinutes * 10) / 10,
      avgWaitingTimeMinutes: Math.round(avgWaitingTimeMinutes * 10) / 10,
      totalResolutionTimeMinutes: Math.round(totalResolutionTimeMinutes * 10) / 10
    };
  }

  async getTechnicianPerformance() {
    const result = await db
      .select({
        technicianId: tickets.assignedToId,
        technicianName: users.name,
        totalTickets: sql<number>`count(*)`,
        resolvedTickets: sql<number>`count(case when ${tickets.status} = 'resolved' then 1 end)`,
        avgResolutionTimeMinutes: sql<number>`
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN ${tickets.resolvedAt} IS NOT NULL AND ${tickets.acceptedAt} IS NOT NULL THEN
                    (julianday(${tickets.resolvedAt}) - julianday(${tickets.acceptedAt})) * 24 * 60
                  ELSE NULL
                END
              ), 1
            ), 0
          )
        `
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(sql`${tickets.assignedToId} IS NOT NULL`)
      .groupBy(tickets.assignedToId, users.name);

    return result;
  }
}

export const storage = new DatabaseStorage();