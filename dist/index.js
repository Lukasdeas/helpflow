var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  comments: () => comments,
  commentsRelations: () => commentsRelations,
  insertCommentSchema: () => insertCommentSchema,
  insertTicketSchema: () => insertTicketSchema,
  insertUserSchema: () => insertUserSchema,
  tickets: () => tickets,
  ticketsRelations: () => ticketsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, uuid, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("technician"),
  // 'technician' or 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: serial("ticket_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sector: text("sector").notNull(),
  problemType: text("problem_type").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  requesterName: text("requester_name").notNull(),
  userEmail: text("user_email").notNull(),
  assignedToId: uuid("assigned_to_id").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  attachments: text("attachments").array().default(sql`'{}'`)
});
var comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  authorType: text("author_type").notNull(),
  // 'user', 'technician'
  attachments: jsonb("attachments").$type().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var ticketsRelations = relations(tickets, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id]
  }),
  comments: many(comments)
}));
var commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id]
  })
}));
var usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets)
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertTicketSchema = z.object({
  title: z.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  description: z.string().min(1, "Descri\xE7\xE3o \xE9 obrigat\xF3ria"),
  sector: z.string().min(1, "Setor \xE9 obrigat\xF3rio"),
  problemType: z.string().min(1, "Tipo de problema \xE9 obrigat\xF3rio"),
  priority: z.enum(["waiting", "low", "medium", "high"]).default("waiting"),
  status: z.enum(["waiting", "open", "in_progress", "resolved"]).default("waiting"),
  requesterName: z.string().min(1, "Nome do solicitante \xE9 obrigat\xF3rio"),
  userEmail: z.string().email("Email inv\xE1lido"),
  attachments: z.array(z.string()).optional()
});
var insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, asc, sql as sql2 } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getAllTechnicians() {
    return await db.select().from(users).orderBy(asc(users.name));
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  async createTicket(ticketData) {
    const [ticket] = await db.insert(tickets).values({
      ...ticketData,
      attachments: ticketData.attachments || [],
      ticketNumber: sql2`nextval('ticket_number_seq')`,
      updatedAt: sql2`NOW()`
    }).returning();
    return ticket;
  }
  async getTicket(id) {
    const [ticket] = await db.select({
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
      assignedTo: users
    }).from(tickets).leftJoin(users, eq(tickets.assignedToId, users.id)).where(eq(tickets.id, id));
    if (!ticket) return void 0;
    const ticketComments = await this.getTicketComments(id);
    return {
      ...ticket,
      assignedTo: ticket.assignedTo || void 0,
      comments: ticketComments
    };
  }
  async getAllTickets() {
    const ticketsData = await db.select({
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
      assignedTo: users
    }).from(tickets).leftJoin(users, eq(tickets.assignedToId, users.id)).orderBy(
      sql2`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
      desc(tickets.createdAt)
    );
    const allComments = await db.select().from(comments).orderBy(asc(comments.createdAt));
    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {});
    return ticketsData.map((ticket) => ({
      ...ticket,
      assignedTo: ticket.assignedTo || void 0,
      comments: commentsByTicket[ticket.id] || []
    }));
  }
  async getTicketsByStatus(status) {
    const ticketsData = await db.select({
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
      assignedTo: users
    }).from(tickets).leftJoin(users, eq(tickets.assignedToId, users.id)).where(eq(tickets.status, status)).orderBy(
      sql2`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
      desc(tickets.createdAt)
    );
    const allComments = await db.select().from(comments).orderBy(asc(comments.createdAt));
    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {});
    return ticketsData.map((ticket) => ({
      ...ticket,
      assignedTo: ticket.assignedTo || void 0,
      comments: commentsByTicket[ticket.id] || []
    }));
  }
  async getTicketsForTechnician(technicianId) {
    const ticketsData = await db.select({
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
      assignedTo: users
    }).from(tickets).leftJoin(users, eq(tickets.assignedToId, users.id)).where(
      sql2`${tickets.assignedToId} = ${technicianId} OR ${tickets.assignedToId} IS NULL`
    ).orderBy(
      sql2`CASE
          WHEN ${tickets.priority} = 'high' THEN 1
          WHEN ${tickets.priority} = 'medium' THEN 2
          WHEN ${tickets.priority} = 'low' THEN 3
          END`,
      desc(tickets.createdAt)
    );
    const allComments = await db.select().from(comments).orderBy(asc(comments.createdAt));
    const commentsByTicket = allComments.reduce((acc, comment) => {
      if (!acc[comment.ticketId]) {
        acc[comment.ticketId] = [];
      }
      acc[comment.ticketId].push(comment);
      return acc;
    }, {});
    return ticketsData.map((ticket) => ({
      ...ticket,
      assignedTo: ticket.assignedTo || void 0,
      comments: commentsByTicket[ticket.id] || []
    }));
  }
  async updateTicketPriority(id, priority) {
    await db.update(tickets).set({ priority, updatedAt: sql2`NOW()` }).where(eq(tickets.id, id));
  }
  async updateTicketStatus(ticketId, status) {
    const updateData = {
      status,
      updatedAt: sql2`NOW()`
    };
    if (status === "resolved") {
      updateData.resolvedAt = sql2`NOW()`;
    }
    const [ticket] = await db.update(tickets).set(updateData).where(eq(tickets.id, ticketId)).returning();
    return ticket;
  }
  async assignTicket(id, technicianId) {
    await db.update(tickets).set({
      assignedToId: technicianId,
      status: "in_progress",
      acceptedAt: sql2`NOW()`,
      updatedAt: sql2`NOW()`
    }).where(eq(tickets.id, id));
  }
  async addComment(comment) {
    const [newComment] = await db.insert(comments).values({
      ...comment,
      attachments: comment.attachments || []
    }).returning();
    return newComment;
  }
  async getTicketComments(ticketId) {
    return await db.select().from(comments).where(eq(comments.ticketId, ticketId)).orderBy(asc(comments.createdAt));
  }
  async getTicketStats() {
    const result = await db.select({
      total: sql2`count(*)`,
      open: sql2`count(case when status = 'open' then 1 end)`,
      inProgress: sql2`count(case when status = 'in_progress' then 1 end)`,
      resolved: sql2`count(case when status = 'resolved' then 1 end)`,
      highPriority: sql2`count(case when priority = 'high' then 1 end)`,
      mediumPriority: sql2`count(case when priority = 'medium' then 1 end)`,
      lowPriority: sql2`count(case when priority = 'low' then 1 end)`,
      avgResolutionTimeMinutes: sql2`
          COALESCE(
            ROUND(
              AVG(
                EXTRACT(EPOCH FROM (resolved_at - accepted_at)) / 60
              )::numeric, 1
            ), 0
          )
        `,
      avgWaitingTimeMinutes: sql2`
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN accepted_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60
                  ELSE NULL
                END
              )::numeric, 1
            ), 0
          )
        `,
      totalResolutionTimeMinutes: sql2`
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN resolved_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
                  ELSE NULL
                END
              )::numeric, 1
            ), 0
          )
        `
    }).from(tickets);
    return result[0];
  }
  async getTechnicianPerformance() {
    const result = await db.select({
      technicianId: tickets.assignedToId,
      technicianName: users.name,
      totalTickets: sql2`count(*)`,
      resolvedTickets: sql2`count(case when ${tickets.status} = 'resolved' then 1 end)`,
      avgResolutionTimeMinutes: sql2`
          COALESCE(
            ROUND(
              AVG(
                CASE
                  WHEN ${tickets.resolvedAt} IS NOT NULL AND ${tickets.acceptedAt} IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (${tickets.resolvedAt} - ${tickets.acceptedAt})) / 60
                  ELSE NULL
                END
              )::numeric, 1
            ), 0
          )
        `
    }).from(tickets).leftJoin(users, eq(tickets.assignedToId, users.id)).where(sql2`${tickets.assignedToId} IS NOT NULL`).groupBy(tickets.assignedToId, users.name);
    return result;
  }
};
var storage = new DatabaseStorage();

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

// server/objectAcl.ts
var ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    // Implement the case for each type of access group to instantiate.
    //
    // For example:
    // case "USER_LIST":
    //   return new UserListAccessGroup(group.id);
    // case "EMAIL_DOMAIN":
    //   return new EmailDomainAccessGroup(group.id);
    // case "GROUP_MEMBER":
    //   return new GroupMemberAccessGroup(group.id);
    // case "SUBSCRIBER":
    //   return new SubscriberAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}

// server/objectStorage.ts
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  // Gets the public object search paths.
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path4) => path4.trim()).filter((path4) => path4.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }
  // Gets the private object directory.
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }
  // Search for a public object from the search paths.
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  // Downloads an object to the response.
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }
  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission
  }) {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? "read" /* READ */
    });
  }
};
function parseObjectPath(path4) {
  if (!path4.startsWith("/")) {
    path4 = `/${path4}`;
  }
  const pathParts = path4.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// server/routes.ts
import { eq as eq2, sql as sql3 } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID as randomUUID2 } from "crypto";
async function registerRoutes(app2) {
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/tickets", async (req, res) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      const ticketWithDefaults = {
        ...ticketData,
        status: "waiting",
        priority: "waiting",
        attachments: []
      };
      const ticket = await storage.createTicket(ticketWithDefaults);
      res.json(ticket);
    } catch (error) {
      console.error("Create ticket error:", error);
      res.status(400).json({ error: "Invalid ticket data" });
    }
  });
  app2.get("/api/tickets", async (req, res) => {
    try {
      const { status, technicianId } = req.query;
      let tickets2;
      if (technicianId && typeof technicianId === "string") {
        tickets2 = await storage.getTicketsForTechnician(technicianId);
      } else if (status && typeof status === "string") {
        tickets2 = await storage.getTicketsByStatus(status);
      } else {
        tickets2 = await storage.getAllTickets();
      }
      res.json(tickets2);
    } catch (error) {
      console.error("Get tickets error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Get ticket error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/tickets/:id/priority", async (req, res) => {
    try {
      const { priority } = req.body;
      if (!["waiting", "low", "medium", "high"].includes(priority)) {
        return res.status(400).json({ error: "Invalid priority" });
      }
      await storage.updateTicketPriority(req.params.id, priority);
      res.json({ success: true });
    } catch (error) {
      console.error("Update priority error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/tickets/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!["waiting", "open", "in_progress", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      await storage.updateTicketStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/tickets/:id/assign", async (req, res) => {
    try {
      const { technicianId } = req.body;
      if (!technicianId) {
        return res.status(400).json({ error: "Technician ID is required" });
      }
      await storage.assignTicket(req.params.id, technicianId);
      res.json({ success: true });
    } catch (error) {
      console.error("Assign ticket error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/tickets/:id/unassign", async (req, res) => {
    try {
      await db.update(tickets).set({
        assignedToId: null,
        status: "open",
        acceptedAt: null,
        updatedAt: sql3`NOW()`
      }).where(eq2(tickets.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Unassign ticket error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.addComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(400).json({ error: "Invalid comment data" });
    }
  });
  app2.get("/api/users/technicians", async (req, res) => {
    try {
      const technicians = await storage.getAllTechnicians();
      res.json(technicians);
    } catch (error) {
      console.error("Get technicians error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getTicketStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/technician-performance", async (req, res) => {
    try {
      const performance = await storage.getTechnicianPerformance();
      res.json(performance);
    } catch (error) {
      console.error("Get technician performance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "uploads/";
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `ticket_${randomUUID2()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });
  const upload = multer({
    storage: storage_config,
    limits: {
      fileSize: 10 * 1024 * 1024
      // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|7z|xls|xlsx|ppt|pptx|csv|mp4|avi|mov|mp3|wav|bmp|webp|tiff/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp",
        "image/tiff",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
        "video/mp4",
        "video/avi",
        "video/quicktime",
        "audio/mpeg",
        "audio/wav",
        "audio/mp3"
      ];
      const mimetype = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith("image/") || file.mimetype.startsWith("text/");
      if (extname || mimetype) {
        return cb(null, true);
      } else {
        cb(new Error("Tipo de arquivo n\xE3o permitido"));
      }
    }
  });
  app2.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      const fileExtension = path.extname(req.file.originalname);
      const getFileType = (mimeType, extension) => {
        const ext = extension.toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext)) return "image";
        if ([".pdf"].includes(ext)) return "pdf";
        if ([".doc", ".docx"].includes(ext)) return "document";
        if ([".txt"].includes(ext)) return "text";
        if ([".zip", ".rar", ".7z"].includes(ext)) return "archive";
        if ([".mp4", ".avi", ".mov", ".wmv"].includes(ext)) return "video";
        if ([".mp3", ".wav", ".ogg"].includes(ext)) return "audio";
        return "unknown";
      };
      res.json({
        url: `/api/files/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        fileType: getFileType(req.file.mimetype, fileExtension),
        extension: fileExtension
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post("/api/upload/:ticketNumber", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      const ticketNumber = req.params.ticketNumber;
      const fileExtension = path.extname(req.file.originalname);
      const newFilename = `ticket_${ticketNumber}_${randomUUID2()}${fileExtension}`;
      if (!fs.existsSync(req.file.path)) {
        return res.status(500).json({ error: "Erro ao salvar arquivo" });
      }
      try {
        const oldPath = req.file.path;
        const newPath = path.join("uploads", newFilename);
        fs.copyFileSync(oldPath, newPath);
        if (fs.existsSync(newPath) && fs.statSync(newPath).size > 0) {
          fs.unlinkSync(oldPath);
        } else {
          throw new Error("Falha ao copiar arquivo");
        }
      } catch (moveError) {
        console.error("Erro ao mover anexos:", moveError);
        return res.status(500).json({ error: "Erro ao mover anexos" });
      }
      const getFileType = (mimeType, extension) => {
        const ext = extension.toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext)) return "image";
        if ([".pdf"].includes(ext)) return "pdf";
        if ([".doc", ".docx"].includes(ext)) return "document";
        if ([".txt"].includes(ext)) return "text";
        if ([".zip", ".rar", ".7z"].includes(ext)) return "archive";
        if ([".mp4", ".avi", ".mov", ".wmv"].includes(ext)) return "video";
        if ([".mp3", ".wav", ".ogg"].includes(ext)) return "audio";
        return "unknown";
      };
      res.json({
        url: `/api/files/${newFilename}`,
        filename: newFilename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        fileType: getFileType(req.file.mimetype, fileExtension),
        extension: fileExtension,
        ticketNumber
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/tickets/:ticketNumber/attachments", async (req, res) => {
    try {
      const ticketNumber = req.params.ticketNumber;
      const uploadDir = "uploads/";
      if (!fs.existsSync(uploadDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(uploadDir);
      const ticketFiles = files.filter(
        (file) => file.startsWith(`ticket_${ticketNumber}_`)
      );
      const getFileType = (filename) => {
        const ext = path.extname(filename).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext)) return "image";
        if ([".pdf"].includes(ext)) return "pdf";
        if ([".doc", ".docx"].includes(ext)) return "document";
        if ([".txt"].includes(ext)) return "text";
        if ([".zip", ".rar", ".7z"].includes(ext)) return "archive";
        if ([".mp4", ".avi", ".mov", ".wmv"].includes(ext)) return "video";
        if ([".mp3", ".wav", ".ogg"].includes(ext)) return "audio";
        return "unknown";
      };
      const attachments = ticketFiles.map((filename) => {
        const filepath = path.join(uploadDir, filename);
        const stats = fs.statSync(filepath);
        const extension = path.extname(filename);
        const baseNameWithoutPrefix = filename.replace(new RegExp(`^ticket_${ticketNumber}_[a-f0-9-]+`), "");
        const originalName = baseNameWithoutPrefix || `arquivo${extension}`;
        return {
          filename,
          url: `/api/files/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime,
          originalName,
          extension,
          fileType: getFileType(filename),
          mimeType: getMimeTypeFromExtension(extension)
        };
      });
      res.json(attachments);
    } catch (error) {
      console.error("Erro ao buscar anexos:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  const getMimeTypeFromExtension = (extension) => {
    const ext = extension.toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
      ".7z": "application/x-7z-compressed"
    };
    return mimeTypes[ext] || "application/octet-stream";
  };
  app2.get("/api/files/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filepath = path.join("uploads", filename);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "Arquivo n\xE3o encontrado" });
      }
      const stats = fs.statSync(filepath);
      if (stats.size === 0) {
        return res.status(404).json({ error: "Arquivo vazio" });
      }
      const userRole = req.headers["x-user-role"];
      if (!userRole || !["technician", "admin"].includes(userRole)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      const extension = path.extname(filename);
      const ticketNumberMatch = filename.match(/^ticket_(\d+)_/);
      const ticketNumber = ticketNumberMatch ? ticketNumberMatch[1] : "";
      let originalName = filename.replace(new RegExp(`^ticket_${ticketNumber}_[a-f0-9-]+`), "");
      if (!originalName || originalName === extension) {
        originalName = `anexo-chamado-${ticketNumber}${extension}`;
      }
      const getMimeType = (ext) => {
        const mimeTypes = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".bmp": "image/bmp",
          ".webp": "image/webp",
          ".tiff": "image/tiff",
          ".pdf": "application/pdf",
          ".doc": "application/msword",
          ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ".xls": "application/vnd.ms-excel",
          ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".ppt": "application/vnd.ms-powerpoint",
          ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          ".txt": "text/plain",
          ".csv": "text/csv",
          ".zip": "application/zip",
          ".rar": "application/x-rar-compressed",
          ".7z": "application/x-7z-compressed",
          ".mp4": "video/mp4",
          ".avi": "video/x-msvideo",
          ".mov": "video/quicktime",
          ".mp3": "audio/mpeg",
          ".wav": "audio/wav"
        };
        return mimeTypes[ext.toLowerCase()] || "application/octet-stream";
      };
      const mimeType = getMimeType(extension);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(originalName)}"`);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", stats.size.toString());
      res.setHeader("Accept-Ranges", "bytes");
      const readStream = fs.createReadStream(filepath);
      readStream.on("error", (streamError) => {
        console.error("Erro ao ler arquivo:", streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: "Erro ao ler arquivo" });
        }
      });
      readStream.pipe(res);
    } catch (error) {
      console.error("Erro no download:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  });
  app2.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
