import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Home, Plus, Compass, Gamepad2, Briefcase, Users } from "lucide-react";
import type { Server, User } from "@shared/schema";

interface ServerSidebarProps {
  servers: Server[];
  selectedServer: Server | null;
  onServerSelect: (server: Server) => void;
  isLoading: boolean;
  user: User;
}

export default function ServerSidebar({ 
  servers, 
  selectedServer, 
  onServerSelect, 
  isLoading,
  user 
}: ServerSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverDescription, setServerDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createServerMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; ownerId: string }) => {
      const response = await apiRequest("POST", "/api/servers", data);
      return response.json();
    },
    onSuccess: (newServer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", user.id] });
      onServerSelect(newServer);
      setShowCreateDialog(false);
      setServerName("");
      setServerDescription("");
      toast({
        title: "Server created!",
        description: `${newServer.name} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinServerMutation = useMutation({
    mutationFn: async (data: { inviteCode: string; userId: string }) => {
      const response = await apiRequest("POST", "/api/servers/join", data);
      return response.json();
    },
    onSuccess: (server) => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", user.id] });
      onServerSelect(server);
      setShowJoinDialog(false);
      setInviteCode("");
      toast({
        title: "Joined server!",
        description: `You've joined ${server.name}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateServer = () => {
    if (serverName.trim()) {
      createServerMutation.mutate({
        name: serverName.trim(),
        description: serverDescription.trim() || undefined,
        ownerId: user.id,
      });
    }
  };

  const handleJoinServer = () => {
    if (inviteCode.trim()) {
      joinServerMutation.mutate({
        inviteCode: inviteCode.trim(),
        userId: user.id,
      });
    }
  };

  const getServerIcon = (server: Server) => {
    const name = server.name.toLowerCase();
    if (name.includes("gaming") || name.includes("game")) {
      return <Gamepad2 className="w-6 h-6" />;
    }
    if (name.includes("work") || name.includes("business")) {
      return <Briefcase className="w-6 h-6" />;
    }
    if (name.includes("friend") || name.includes("social")) {
      return <Users className="w-6 h-6" />;
    }
    return <Home className="w-6 h-6" />;
  };

  return (
    <div className="w-18 bg-muted flex flex-col items-center py-3 space-y-2" data-testid="server-sidebar">
      {/* Home/Direct Messages */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={`w-12 h-12 rounded-full server-icon ${!selectedServer ? 'active bg-primary text-primary-foreground' : 'bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground'}`}
              onClick={() => onServerSelect(null as any)}
              data-testid="button-home"
            >
              <Home className="w-6 h-6" />
            </Button>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full p2p-indicator" title="P2P Connected" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Direct Messages</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-8 h-0.5 bg-border rounded" />

      {/* Server List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-12 h-12 bg-card rounded-full animate-pulse" />
          ))}
        </div>
      ) : (
        servers.map((server) => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`w-12 h-12 rounded-full server-icon ${
                  selectedServer?.id === server.id 
                    ? 'active bg-primary text-primary-foreground' 
                    : 'bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground'
                }`}
                onClick={() => onServerSelect(server)}
                data-testid={`button-server-${server.id}`}
              >
                {getServerIcon(server)}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{server.name}</p>
            </TooltipContent>
          </Tooltip>
        ))
      )}

      {/* Create Server */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 rounded-full server-icon bg-card text-accent hover:bg-accent hover:text-accent-foreground"
                data-testid="button-create-server"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add a Server</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Your Server</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="server-name">Server Name</Label>
              <Input
                id="server-name"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="My Awesome Server"
                data-testid="input-server-name"
              />
            </div>
            <div>
              <Label htmlFor="server-description">Description (Optional)</Label>
              <Input
                id="server-description"
                value={serverDescription}
                onChange={(e) => setServerDescription(e.target.value)}
                placeholder="A place for awesome people"
                data-testid="input-server-description"
              />
            </div>
            <Button
              onClick={handleCreateServer}
              disabled={!serverName.trim() || createServerMutation.isPending}
              className="w-full"
              data-testid="button-create-server-submit"
            >
              {createServerMutation.isPending ? "Creating..." : "Create Server"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Server */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 rounded-full server-icon bg-card text-accent hover:bg-accent hover:text-accent-foreground"
                data-testid="button-join-server"
              >
                <Compass className="w-6 h-6" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Explore Public Servers</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Server</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                data-testid="input-invite-code"
              />
            </div>
            <Button
              onClick={handleJoinServer}
              disabled={!inviteCode.trim() || joinServerMutation.isPending}
              className="w-full"
              data-testid="button-join-server-submit"
            >
              {joinServerMutation.isPending ? "Joining..." : "Join Server"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
