import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("technician"), // 'technician' or 'admin'
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  ticketNumber: integer("ticket_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sector: text("sector").notNull(),
  problemType: text("problem_type").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  requesterName: text("requester_name").notNull(),
  userEmail: text("user_email").notNull(),
  assignedToId: text("assigned_to_id").references(() => users.id),
  acceptedAt: text("accepted_at"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  attachments: text("attachments").default("[]"),
}, (table) => ({
  ticketNumberIdx: index("ticket_number_idx").on(table.ticketNumber),
  statusIdx: index("status_idx").on(table.status),
  priorityIdx: index("priority_idx").on(table.priority),
  assignedToIdIdx: index("assigned_to_id_idx").on(table.assignedToId),
}));

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  ticketId: text("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  authorType: text("author_type").notNull(), // 'user', 'technician'
  attachments: text("attachments").default("[]"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  sector: z.string().min(1, "Setor é obrigatório"),
  problemType: z.string().min(1, "Tipo de problema é obrigatório"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["waiting", "open", "in_progress", "resolved"]).default("waiting"),
  requesterName: z.string().min(1, "Nome do solicitante é obrigatório"),
  userEmail: z.string().email("Email inválido"),
  attachments: z.array(z.string()).optional(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
}).extend({
  authorType: z.enum(['user', 'technician']),
  content: z.string().min(1, "Comment content is required"),
  authorName: z.string().min(1, "Author name is required"),
  attachments: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().transform((val) => {
    if (Array.isArray(val)) {
      return JSON.stringify(val);
    }
    return val || "[]";
  }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type TicketWithDetails = Ticket & {
  assignedTo?: User;
  comments: Comment[];
};