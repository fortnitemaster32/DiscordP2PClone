import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { useSocket } from "@/hooks/use-socket";
import { useWebRTC } from "@/hooks/use-webrtc";
import ServerSidebar from "@/components/server-sidebar";
import ChannelSidebar from "@/components/channel-sidebar";
import ChatArea from "@/components/chat-area";
import MembersList from "@/components/members-list";
import type { Server, Channel, ServerWithChannels, MessageWithAuthor, ServerMember, User } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showMembersList, setShowMembersList] = useState(true);

  const { socket } = useSocket();
  const webrtc = useWebRTC(socket, user?.id || "");

  const { data: servers = [], isLoading: serversLoading } = useQuery<Server[]>({
    queryKey: ["/api/servers", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User ID required");
      const response = await fetch(`/api/servers?userId=${user.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: serverData, isLoading: serverLoading } = useQuery<ServerWithChannels>({
    queryKey: ["/api/servers", selectedServer?.id],
    queryFn: async () => {
      if (!selectedServer?.id) throw new Error("Server ID required");
      const response = await fetch(`/api/servers/${selectedServer.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    enabled: !!selectedServer?.id,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithAuthor[]>({
    queryKey: ["/api/channels", selectedChannel?.id, "messages"],
    queryFn: async () => {
      if (!selectedChannel?.id) throw new Error("Channel ID required");
      const response = await fetch(`/api/channels/${selectedChannel.id}/messages`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    enabled: !!selectedChannel?.id,
  });

  const { data: members = [] } = useQuery<(ServerMember & { user: User })[]>({
    queryKey: ["/api/servers", selectedServer?.id, "members"],
    queryFn: async () => {
      if (!selectedServer?.id) throw new Error("Server ID required");
      const response = await fetch(`/api/servers/${selectedServer.id}/members`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    enabled: !!selectedServer?.id,
  });

  // Select first server and channel by default
  useEffect(() => {
    if (servers.length > 0 && !selectedServer) {
      setSelectedServer(servers[0]);
    }
  }, [servers, selectedServer]);

  useEffect(() => {
    if (serverData?.channels && serverData.channels.length > 0 && !selectedChannel) {
      const textChannels = serverData.channels.filter(c => c.type === "text");
      if (textChannels.length > 0) {
        setSelectedChannel(textChannels[0]);
      }
    }
  }, [serverData, selectedChannel]);

  // Join WebRTC channel when channel is selected
  useEffect(() => {
    if (selectedChannel && user) {
      webrtc.joinChannel(selectedChannel.id);
      return () => {
        webrtc.leaveChannel(selectedChannel.id);
      };
    }
  }, [selectedChannel, user, webrtc]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden" data-testid="app-layout">
      <ServerSidebar
        servers={servers}
        selectedServer={selectedServer}
        onServerSelect={setSelectedServer}
        isLoading={serversLoading}
        user={user}
        data-testid="server-sidebar"
      />
      
      <ChannelSidebar
        server={serverData}
        selectedChannel={selectedChannel}
        onChannelSelect={setSelectedChannel}
        isLoading={serverLoading}
        user={user}
        connectedPeers={webrtc.connectedPeers}
        data-testid="channel-sidebar"
      />
      
      <ChatArea
        channel={selectedChannel}
        messages={messages}
        isLoading={messagesLoading}
        user={user}
        onToggleMembersList={() => setShowMembersList(!showMembersList)}
        showMembersList={showMembersList}
        connectedPeers={webrtc.connectedPeers}
        onSendMessage={(content: string) => {
          if (selectedChannel) {
            webrtc.sendMessage(selectedChannel.id, content);
          }
        }}
        data-testid="chat-area"
      />
      
      {showMembersList && (
        <MembersList
          members={members}
          connectedPeers={webrtc.connectedPeers}
          data-testid="members-list"
        />
      )}
    </div>
  );
}
