import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertServerSchema, insertChannelSchema, insertMessageSchema, insertDirectMessageSchema, type WebRTCSignal } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser(userData);
      res.json({ user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, status: user.status } });
    } catch (error) {
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update user status to online
      await storage.updateUserStatus(user.id, "online");
      
      res.json({ user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, status: user.status } });
    } catch (error) {
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Users
  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ id: user.id, username: user.username, email: user.email, avatar: user.avatar, status: user.status });
  });

  app.post("/api/users/:id/status", async (req, res) => {
    try {
      const { status } = z.object({ status: z.string() }).parse(req.body);
      await storage.updateUserStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Invalid status data" });
    }
  });

  // Servers
  app.get("/api/servers", async (req, res) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: "User ID required" });
    }
    
    console.log(`[GET /api/servers] Getting servers for userId: ${userId}`);
    const servers = await storage.getUserServers(userId);
    console.log(`[GET /api/servers] Found ${servers.length} servers:`, servers.map(s => ({ id: s.id, name: s.name, ownerId: s.ownerId })));
    res.json(servers);
  });

  app.post("/api/servers", async (req, res) => {
    try {
      const serverData = insertServerSchema.parse(req.body);
      console.log(`[POST /api/servers] Creating server:`, { name: serverData.name, ownerId: serverData.ownerId });
      const server = await storage.createServer(serverData);
      console.log(`[POST /api/servers] Server created:`, { id: server.id, name: server.name, ownerId: server.ownerId, inviteCode: server.inviteCode });
      res.json(server);
    } catch (error) {
      console.error(`[POST /api/servers] Error:`, error);
      res.status(400).json({ message: "Invalid server data" });
    }
  });

  app.get("/api/servers/:id", async (req, res) => {
    const server = await storage.getServerWithChannels(req.params.id);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }
    res.json(server);
  });

  app.post("/api/servers/join", async (req, res) => {
    try {
      const { inviteCode, userId } = z.object({
        inviteCode: z.string(),
        userId: z.string()
      }).parse(req.body);
      
      const server = await storage.getServerByInviteCode(inviteCode);
      if (!server) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      await storage.joinServer(userId, server.id);
      res.json(server);
    } catch (error) {
      res.status(400).json({ message: "Invalid join data" });
    }
  });

  app.get("/api/servers/:id/members", async (req, res) => {
    const members = await storage.getServerMembers(req.params.id);
    res.json(members);
  });

  // Channels
  app.post("/api/channels", async (req, res) => {
    try {
      const channelData = insertChannelSchema.parse(req.body);
      const channel = await storage.createChannel(channelData);
      res.json(channel);
    } catch (error) {
      res.status(400).json({ message: "Invalid channel data" });
    }
  });

  app.get("/api/channels/:id/messages", async (req, res) => {
    const messages = await storage.getChannelMessages(req.params.id);
    res.json(messages);
  });

  // Messages
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      const messageWithAuthor = {
        ...message,
        author: await storage.getUser(message.authorId)
      };
      res.json(messageWithAuthor);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Direct Messages
  app.post("/api/direct-messages", async (req, res) => {
    try {
      const messageData = insertDirectMessageSchema.parse(req.body);
      const message = await storage.createDirectMessage(messageData);
      const messageWithUsers = {
        ...message,
        sender: await storage.getUser(message.senderId),
        recipient: await storage.getUser(message.recipientId)
      };
      res.json(messageWithUsers);
    } catch (error) {
      res.status(400).json({ message: "Invalid direct message data" });
    }
  });

  app.get("/api/direct-messages", async (req, res) => {
    const { userId1, userId2 } = req.query;
    if (!userId1 || !userId2 || typeof userId1 !== 'string' || typeof userId2 !== 'string') {
      return res.status(400).json({ message: "Both user IDs required" });
    }
    
    const messages = await storage.getDirectMessages(userId1, userId2);
    res.json(messages);
  });

  // Friends
  app.get("/api/friends/:userId", async (req, res) => {
    const friends = await storage.getFriends(req.params.userId);
    res.json(friends);
  });

  app.post("/api/friends", async (req, res) => {
    try {
      const { userId1, userId2 } = z.object({
        userId1: z.string(),
        userId2: z.string()
      }).parse(req.body);
      
      await storage.addFriend(userId1, userId2);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Invalid friend request data" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for WebRTC signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedUsers = new Map<string, { ws: WebSocket, userId: string }>();
  const channelPeers = new Map<string, Set<string>>(); // channelId -> Set of userIds

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebRTCSignal & { userId?: string };
        
        if (message.type === 'join-channel') {
          // User joining a channel for P2P connections
          const { userId, channelId } = message;
          if (userId && channelId) {
            connectedUsers.set(ws as any, { ws, userId });
            
            if (!channelPeers.has(channelId)) {
              channelPeers.set(channelId, new Set());
            }
            channelPeers.get(channelId)!.add(userId);
            
            // Notify other peers in the channel
            const peers = channelPeers.get(channelId)!;
            peers.forEach(peerId => {
              if (peerId !== userId) {
                const peerConnection = Array.from(connectedUsers.values()).find(conn => conn.userId === peerId);
                if (peerConnection && peerConnection.ws.readyState === WebSocket.OPEN) {
                  peerConnection.ws.send(JSON.stringify({
                    type: 'peer-joined',
                    from: userId,
                    channelId
                  }));
                }
              }
            });
          }
        } else if (message.type === 'leave-channel') {
          // User leaving a channel
          const { userId, channelId } = message;
          if (userId && channelId && channelPeers.has(channelId)) {
            channelPeers.get(channelId)!.delete(userId);
            
            // Notify other peers
            const peers = channelPeers.get(channelId)!;
            peers.forEach(peerId => {
              const peerConnection = Array.from(connectedUsers.values()).find(conn => conn.userId === peerId);
              if (peerConnection && peerConnection.ws.readyState === WebSocket.OPEN) {
                peerConnection.ws.send(JSON.stringify({
                  type: 'peer-left',
                  from: userId,
                  channelId
                }));
              }
            });
          }
        } else if (message.to) {
          // Direct WebRTC signaling between peers
          const targetConnection = Array.from(connectedUsers.values()).find(conn => conn.userId === message.to);
          if (targetConnection && targetConnection.ws.readyState === WebSocket.OPEN) {
            targetConnection.ws.send(JSON.stringify(message));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Clean up user from all channels
      const userConnection = connectedUsers.get(ws as any);
      if (userConnection) {
        const userId = userConnection.userId;
        channelPeers.forEach((peers, channelId) => {
          if (peers.has(userId)) {
            peers.delete(userId);
            // Notify other peers
            peers.forEach(peerId => {
              const peerConnection = Array.from(connectedUsers.values()).find(conn => conn.userId === peerId);
              if (peerConnection && peerConnection.ws.readyState === WebSocket.OPEN) {
                peerConnection.ws.send(JSON.stringify({
                  type: 'peer-left',
                  from: userId,
                  channelId
                }));
              }
            });
          }
        });
        connectedUsers.delete(ws as any);
      }
    });
  });

  return httpServer;
}
