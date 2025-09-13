import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  status: text("status").notNull().default("online"), // online, away, busy, offline
  createdAt: timestamp("created_at").defaultNow(),
});

export const servers = pgTable("servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // text, voice
  serverId: varchar("server_id").notNull().references(() => servers.id),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serverMembers = pgTable("server_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  serverId: varchar("server_id").notNull().references(() => servers.id),
  role: text("role").notNull().default("member"), // owner, admin, moderator, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  channelId: varchar("channel_id").notNull().references(() => channels.id),
  type: text("type").notNull().default("text"), // text, file, call
  attachments: json("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId1: varchar("user_id_1").notNull().references(() => users.id),
  userId2: varchar("user_id_2").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, blocked
  createdAt: timestamp("created_at").defaultNow(),
});

export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  type: text("type").notNull().default("text"), // text, file, call
  attachments: json("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertServerSchema = createInsertSchema(servers).omit({
  id: true,
  createdAt: true,
  inviteCode: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type ServerMember = typeof serverMembers.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Login = z.infer<typeof loginSchema>;

// Additional types for client
export interface MessageWithAuthor extends Message {
  author: User;
}

export interface DirectMessageWithUsers extends DirectMessage {
  sender: User;
  recipient: User;
}

export interface ServerWithChannels extends Server {
  channels: Channel[];
  members: (ServerMember & { user: User })[];
}

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-channel' | 'leave-channel' | 'peer-joined' | 'peer-left';
  from?: string;
  to?: string;
  channelId?: string;
  userId?: string;
  data?: any;
}
