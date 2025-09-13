import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import UserAvatar from "./user-avatar";
import { Hash, Phone, Video, Monitor, Pin, Users, Search, Plus, Smile, Gift, StickyNote } from "lucide-react";
import type { Channel, MessageWithAuthor, User } from "@shared/schema";

interface ChatAreaProps {
  channel: Channel | null;
  messages: MessageWithAuthor[];
  isLoading: boolean;
  user: User;
  onToggleMembersList: () => void;
  showMembersList: boolean;
  connectedPeers: Set<string>;
  onSendMessage: (content: string) => void;
}

export default function ChatArea({
  channel,
  messages,
  isLoading,
  user,
  onToggleMembersList,
  showMembersList,
  connectedPeers,
  onSendMessage
}: ChatAreaProps) {
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; authorId: string; channelId: string }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channel?.id, "messages"] });
      setMessageContent("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim() && channel) {
      // Send via P2P first
      onSendMessage(messageContent.trim());
      
      // Also save to server for persistence
      sendMessageMutation.mutate({
        content: messageContent.trim(),
        authorId: user.id,
        channelId: channel.id,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Select a channel to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" data-testid="chat-area">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <Hash className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-foreground" data-testid="text-channel-name">
            {channel.name}
          </span>
          <div className="w-px h-6 bg-border" />
          <span className="text-sm text-muted-foreground">
            {channel.description || "No description available"}
          </span>
          <div className="flex items-center space-x-1 ml-4">
            <div className="w-2 h-2 bg-accent rounded-full p2p-indicator" />
            <span className="text-xs text-muted-foreground" data-testid="text-peer-count">
              P2P: {connectedPeers.size} peers connected
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" data-testid="button-voice-call">
                <Phone className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start Voice Chat</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" data-testid="button-video-call">
                <Video className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start Video Call</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" data-testid="button-screen-share">
                <Monitor className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Screen Share</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" data-testid="button-pinned">
                <Pin className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pinned Messages</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={onToggleMembersList}
                data-testid="button-members"
              >
                <Users className={`w-4 h-4 ${showMembersList ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Member List</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" data-testid="button-search">
                <Search className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Welcome to #{channel.name}!
              </h3>
              <p className="text-muted-foreground">
                This is the beginning of the #{channel.name} channel.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-start space-x-3 message-hover p-2 rounded"
              data-testid={`message-${message.id}`}
            >
              <UserAvatar user={message.author} size="lg" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-foreground" data-testid="text-message-author">
                    {message.author.username}
                  </span>
                  <span className="text-xs text-muted-foreground" data-testid="text-message-time">
                    {new Date(message.createdAt!).toLocaleTimeString()}
                  </span>
                  <div className="w-1 h-1 bg-accent rounded-full" title="P2P Message" />
                </div>
                <p className="text-foreground" data-testid="text-message-content">
                  {message.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Media Container for Voice/Video */}
      <div id="remote-media-container" className="hidden" />
      <video id="local-video" className="hidden" autoPlay muted playsInline />

      {/* Message Input */}
      <div className="p-4">
        <form onSubmit={handleSendMessage}>
          <div className="bg-secondary rounded-lg flex items-center space-x-3 px-4 py-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-attach"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload File via P2P</p>
              </TooltipContent>
            </Tooltip>

            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message #${channel.name}`}
              className="flex-1 bg-transparent border-none outline-none focus-visible:ring-0 text-foreground placeholder-muted-foreground"
              data-testid="input-message"
            />

            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Emoji</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-gif"
                  >
                    <Gift className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>GIF</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-sticker"
                  >
                    <StickyNote className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sticker</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* P2P Status Indicator */}
            <div className="flex items-center space-x-1 px-2 py-1 bg-accent/20 rounded">
              <div className="w-2 h-2 bg-accent rounded-full p2p-indicator" />
              <span className="text-xs text-accent">P2P</span>
            </div>
          </div>
        </form>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
          <div className="flex items-center space-x-2">
            <span data-testid="text-connected-peers">{connectedPeers.size} peers connected</span>
            <div className="w-1 h-1 bg-accent rounded-full p2p-indicator" />
          </div>
        </div>
      </div>
    </div>
  );
}
