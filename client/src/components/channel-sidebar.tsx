import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import UserAvatar from "./user-avatar";
import VoiceControls from "@/components/voice-controls";
import { Hash, Volume2, Plus, ChevronDown, Mic, MicOff, Headphones, Settings } from "lucide-react";
import type { ServerWithChannels, Channel, User } from "@shared/schema";

interface ChannelSidebarProps {
  server: ServerWithChannels | null;
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  isLoading: boolean;
  user: User;
  connectedPeers: Set<string>;
}

export default function ChannelSidebar({
  server,
  selectedChannel,
  onChannelSelect,
  isLoading,
  user,
  connectedPeers
}: ChannelSidebarProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"text" | "voice">("text");
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createChannelMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; serverId: string }) => {
      const response = await apiRequest("POST", "/api/channels", data);
      return response.json();
    },
    onSuccess: (newChannel) => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", server?.id] });
      onChannelSelect(newChannel);
      setShowCreateChannel(false);
      setChannelName("");
      toast({
        title: "Channel created!",
        description: `#${newChannel.name} has been created.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create channel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateChannel = () => {
    if (channelName.trim() && server) {
      createChannelMutation.mutate({
        name: channelName.trim(),
        type: channelType,
        serverId: server.id,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-60 bg-card flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-border">
          <div className="h-4 bg-muted rounded animate-pulse flex-1" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="w-60 bg-card flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-border">
          <h2 className="font-semibold text-foreground">Direct Messages</h2>
        </div>
        <div className="flex-1 p-2">
          <p className="text-muted-foreground text-sm">Select a server to view channels</p>
        </div>
      </div>
    );
  }

  const textChannels = server.channels?.filter(c => c.type === "text") || [];
  const voiceChannels = server.channels?.filter(c => c.type === "voice") || [];

  return (
    <div className="w-60 bg-card flex flex-col" data-testid="channel-sidebar">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border cursor-pointer hover:bg-secondary">
        <h2 className="font-semibold text-foreground" data-testid="text-server-name">
          {server.name}
        </h2>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Text Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Text Channels</span>
            <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-4 h-4 hover:text-foreground"
                  data-testid="button-add-text-channel"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="channel-name">Channel Name</Label>
                    <Input
                      id="channel-name"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="general"
                      data-testid="input-channel-name"
                    />
                  </div>
                  <div>
                    <Label>Channel Type</Label>
                    <Select value={channelType} onValueChange={(value: "text" | "voice") => setChannelType(value)}>
                      <SelectTrigger data-testid="select-channel-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Channel</SelectItem>
                        <SelectItem value="voice">Voice Channel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateChannel}
                    disabled={!channelName.trim() || createChannelMutation.isPending}
                    className="w-full"
                    data-testid="button-create-channel-submit"
                  >
                    {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {textChannels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item flex items-center px-2 py-1 rounded cursor-pointer ${
                selectedChannel?.id === channel.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onChannelSelect(channel)}
              data-testid={`channel-${channel.name}`}
            >
              <Hash className="w-4 h-4 mr-2" />
              <span className="text-sm">{channel.name}</span>
              {connectedPeers.size > 0 && selectedChannel?.id === channel.id && (
                <div className="ml-auto flex items-center space-x-1">
                  <div className="w-2 h-2 bg-accent rounded-full p2p-indicator" title="P2P Connected" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Voice Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Voice Channels</span>
            <Button
              variant="ghost"
              size="icon"
              className="w-4 h-4 hover:text-foreground"
              onClick={() => {
                setChannelType("voice");
                setShowCreateChannel(true);
              }}
              data-testid="button-add-voice-channel"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {voiceChannels.map((channel) => (
            <div key={channel.id}>
              <div
                className={`channel-item flex items-center px-2 py-1 rounded cursor-pointer ${
                  selectedChannel?.id === channel.id
                    ? "bg-secondary text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onChannelSelect(channel)}
                data-testid={`voice-channel-${channel.name}`}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                <span className="text-sm">{channel.name}</span>
                <div className="ml-auto flex items-center space-x-1">
                  {connectedPeers.size > 0 && selectedChannel?.id === channel.id && (
                    <div className="voice-indicator w-2 h-2 rounded-full" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {connectedPeers.size}/10
                  </span>
                </div>
              </div>

              {/* Connected Users in Voice */}
              {selectedChannel?.id === channel.id && connectedPeers.size > 0 && (
                <div className="ml-6 space-y-1">
                  {Array.from(connectedPeers).map((peerId) => {
                    // Find member by peerId - this is simplified
                    const member = server.members?.find(m => m.user.id === peerId);
                    if (!member) return null;

                    return (
                      <div
                        key={peerId}
                        className="flex items-center space-x-2 px-2 py-1 text-sm text-foreground"
                        data-testid={`voice-user-${member.user.username}`}
                      >
                        <UserAvatar user={member.user} size="sm" />
                        <span>{member.user.username}</span>
                        {!isMuted ? (
                          <Mic className="w-3 h-3 text-accent" />
                        ) : (
                          <MicOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Panel */}
      <div className="h-14 bg-muted px-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserAvatar user={user} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground" data-testid="text-username">
              {user.username}
            </span>
            <span className="text-xs text-muted-foreground">
              {connectedPeers.size > 0 ? "P2P Connected" : "Offline"}
            </span>
          </div>
        </div>

        <VoiceControls
          isMuted={isMuted}
          isDeafened={isDeafened}
          onMuteToggle={() => setIsMuted(!isMuted)}
          onDeafenToggle={() => setIsDeafened(!isDeafened)}
        />
      </div>
    </div>
  );
}
