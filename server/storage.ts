import { 
  type User, 
  type InsertUser, 
  type Server, 
  type InsertServer,
  type Channel,
  type InsertChannel,
  type Message,
  type InsertMessage,
  type DirectMessage,
  type InsertDirectMessage,
  type ServerMember,
  type Friendship,
  type MessageWithAuthor,
  type DirectMessageWithUsers,
  type ServerWithChannels
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<void>;

  // Servers
  getServer(id: string): Promise<Server | undefined>;
  getServerWithChannels(id: string): Promise<ServerWithChannels | undefined>;
  createServer(server: InsertServer): Promise<Server>;
  getUserServers(userId: string): Promise<Server[]>;
  getServerByInviteCode(inviteCode: string): Promise<Server | undefined>;
  joinServer(userId: string, serverId: string): Promise<void>;
  getServerMembers(serverId: string): Promise<(ServerMember & { user: User })[]>;

  // Channels
  getChannel(id: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  getServerChannels(serverId: string): Promise<Channel[]>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getChannelMessages(channelId: string, limit?: number): Promise<MessageWithAuthor[]>;

  // Direct Messages
  createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage>;
  getDirectMessages(userId1: string, userId2: string, limit?: number): Promise<DirectMessageWithUsers[]>;
  getUserDirectMessages(userId: string): Promise<DirectMessageWithUsers[]>;

  // Friends
  getFriends(userId: string): Promise<User[]>;
  addFriend(userId1: string, userId2: string): Promise<void>;
  acceptFriend(userId1: string, userId2: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private servers: Map<string, Server>;
  private channels: Map<string, Channel>;
  private messages: Map<string, Message>;
  private directMessages: Map<string, DirectMessage>;
  private serverMembers: Map<string, ServerMember>;
  private friendships: Map<string, Friendship>;

  constructor() {
    this.users = new Map();
    this.servers = new Map();
    this.channels = new Map();
    this.messages = new Map();
    this.directMessages = new Map();
    this.serverMembers = new Map();
    this.friendships = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      avatar: insertUser.avatar ?? null,
      status: insertUser.status ?? "online",
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.status = status;
      this.users.set(id, user);
    }
  }

  async getServer(id: string): Promise<Server | undefined> {
    return this.servers.get(id);
  }

  async getServerWithChannels(id: string): Promise<ServerWithChannels | undefined> {
    const server = this.servers.get(id);
    if (!server) return undefined;

    const channels = Array.from(this.channels.values()).filter(c => c.serverId === id);
    const serverMemberEntries = Array.from(this.serverMembers.values()).filter(sm => sm.serverId === id);
    const members = await Promise.all(
      serverMemberEntries.map(async (sm) => {
        const user = await this.getUser(sm.userId);
        return { ...sm, user: user! };
      })
    );

    return { ...server, channels, members };
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const id = randomUUID();
    const inviteCode = randomUUID().substring(0, 8);
    const server: Server = { 
      ...insertServer, 
      id, 
      description: insertServer.description ?? null,
      icon: insertServer.icon ?? null,
      inviteCode,
      createdAt: new Date()
    };
    this.servers.set(id, server);
    console.log(`[Storage] Server created:`, { id, name: server.name, ownerId: server.ownerId });

    // Add owner as member
    const membershipId = randomUUID();
    const membership: ServerMember = {
      id: membershipId,
      userId: insertServer.ownerId,
      serverId: id,
      role: "owner",
      joinedAt: new Date()
    };
    this.serverMembers.set(membershipId, membership);
    console.log(`[Storage] Owner membership created:`, { membershipId, userId: insertServer.ownerId, serverId: id, role: "owner" });

    // Create default channels
    await this.createChannel({
      name: "general",
      type: "text",
      serverId: id,
      position: 0
    });

    await this.createChannel({
      name: "General Voice",
      type: "voice",
      serverId: id,
      position: 1
    });

    return server;
  }

  async getUserServers(userId: string): Promise<Server[]> {
    console.log(`[Storage] Getting servers for userId: ${userId}`);
    const allMemberships = Array.from(this.serverMembers.values());
    console.log(`[Storage] Total memberships in storage: ${allMemberships.length}`, allMemberships.map(m => ({ id: m.id, userId: m.userId, serverId: m.serverId, role: m.role })));
    
    const userMemberships = allMemberships.filter(sm => sm.userId === userId);
    console.log(`[Storage] User memberships found: ${userMemberships.length}`, userMemberships.map(m => ({ id: m.id, serverId: m.serverId, role: m.role })));
    
    const servers = await Promise.all(
      userMemberships.map(sm => this.getServer(sm.serverId))
    );
    const filteredServers = servers.filter(Boolean) as Server[];
    console.log(`[Storage] Returning ${filteredServers.length} servers:`, filteredServers.map(s => ({ id: s.id, name: s.name, ownerId: s.ownerId })));
    return filteredServers;
  }

  async getServerByInviteCode(inviteCode: string): Promise<Server | undefined> {
    return Array.from(this.servers.values()).find(server => server.inviteCode === inviteCode);
  }

  async joinServer(userId: string, serverId: string): Promise<void> {
    const membershipId = randomUUID();
    const membership: ServerMember = {
      id: membershipId,
      userId,
      serverId,
      role: "member",
      joinedAt: new Date()
    };
    this.serverMembers.set(membershipId, membership);
  }

  async getServerMembers(serverId: string): Promise<(ServerMember & { user: User })[]> {
    const serverMemberEntries = Array.from(this.serverMembers.values()).filter(sm => sm.serverId === serverId);
    const members = await Promise.all(
      serverMemberEntries.map(async (sm) => {
        const user = await this.getUser(sm.userId);
        return { ...sm, user: user! };
      })
    );
    return members;
  }

  async getChannel(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = { 
      ...insertChannel, 
      id, 
      description: insertChannel.description ?? null,
      position: insertChannel.position ?? 0,
      createdAt: new Date()
    };
    this.channels.set(id, channel);
    return channel;
  }

  async getServerChannels(serverId: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(c => c.serverId === serverId);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id, 
      type: insertMessage.type ?? "text",
      attachments: insertMessage.attachments ?? null,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getChannelMessages(channelId: string, limit = 50): Promise<MessageWithAuthor[]> {
    const messages = Array.from(this.messages.values())
      .filter(m => m.channelId === channelId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime())
      .slice(-limit);

    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const author = await this.getUser(message.authorId);
        return { ...message, author: author! };
      })
    );

    return messagesWithAuthors;
  }

  async createDirectMessage(insertMessage: InsertDirectMessage): Promise<DirectMessage> {
    const id = randomUUID();
    const message: DirectMessage = { 
      ...insertMessage, 
      id, 
      type: insertMessage.type ?? "text",
      attachments: insertMessage.attachments ?? null,
      createdAt: new Date()
    };
    this.directMessages.set(id, message);
    return message;
  }

  async getDirectMessages(userId1: string, userId2: string, limit = 50): Promise<DirectMessageWithUsers[]> {
    const messages = Array.from(this.directMessages.values())
      .filter(m => 
        (m.senderId === userId1 && m.recipientId === userId2) ||
        (m.senderId === userId2 && m.recipientId === userId1)
      )
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime())
      .slice(-limit);

    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const sender = await this.getUser(message.senderId);
        const recipient = await this.getUser(message.recipientId);
        return { ...message, sender: sender!, recipient: recipient! };
      })
    );

    return messagesWithUsers;
  }

  async getUserDirectMessages(userId: string): Promise<DirectMessageWithUsers[]> {
    const messages = Array.from(this.directMessages.values())
      .filter(m => m.senderId === userId || m.recipientId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());

    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const sender = await this.getUser(message.senderId);
        const recipient = await this.getUser(message.recipientId);
        return { ...message, sender: sender!, recipient: recipient! };
      })
    );

    return messagesWithUsers;
  }

  async getFriends(userId: string): Promise<User[]> {
    const friendships = Array.from(this.friendships.values())
      .filter(f => 
        (f.userId1 === userId || f.userId2 === userId) && 
        f.status === 'accepted'
      );

    const friends = await Promise.all(
      friendships.map(async (friendship) => {
        const friendId = friendship.userId1 === userId ? friendship.userId2 : friendship.userId1;
        return this.getUser(friendId);
      })
    );

    return friends.filter(Boolean) as User[];
  }

  async addFriend(userId1: string, userId2: string): Promise<void> {
    const id = randomUUID();
    const friendship: Friendship = {
      id,
      userId1,
      userId2,
      status: "pending",
      createdAt: new Date()
    };
    this.friendships.set(id, friendship);
  }

  async acceptFriend(userId1: string, userId2: string): Promise<void> {
    const friendship = Array.from(this.friendships.values())
      .find(f => 
        ((f.userId1 === userId1 && f.userId2 === userId2) ||
         (f.userId1 === userId2 && f.userId2 === userId1)) &&
        f.status === 'pending'
      );

    if (friendship) {
      friendship.status = 'accepted';
      this.friendships.set(friendship.id, friendship);
    }
  }
}

export const storage = new MemStorage();
