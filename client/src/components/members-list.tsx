import UserAvatar from "./user-avatar";
import type { ServerMember, User } from "@shared/schema";

interface MembersListProps {
  members: (ServerMember & { user: User })[];
  connectedPeers: Set<string>;
}

export default function MembersList({ members, connectedPeers }: MembersListProps) {
  const onlineMembers = members.filter(m => m.user.status !== "offline");
  const offlineMembers = members.filter(m => m.user.status === "offline");

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return "👑";
      case "admin":
        return "🛡️";
      case "moderator":
        return "🔧";
      default:
        return null;
    }
  };

  const getMemberActivity = (member: ServerMember & { user: User }) => {
    if (connectedPeers.has(member.user.id)) {
      return "In Voice Channel";
    }
    return member.user.status;
  };

  return (
    <div className="w-60 bg-card flex flex-col border-l border-border" data-testid="members-list">
      {/* Members Header */}
      <div className="h-12 px-4 flex items-center border-b border-border">
        <span className="font-semibold text-foreground" data-testid="text-members-count">
          Members — {members.length}
        </span>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Online Members */}
        {onlineMembers.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Online — {onlineMembers.length}
            </div>

            {onlineMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-3 px-2 py-1 hover:bg-secondary rounded cursor-pointer"
                data-testid={`member-${member.user.username}`}
              >
                <UserAvatar user={member.user} size="md" />
                <div className="flex-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-foreground">
                      {member.user.username}
                    </span>
                    {getRoleIcon(member.role) && (
                      <span title={member.role} data-testid={`role-${member.role}`}>
                        {getRoleIcon(member.role)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>{getMemberActivity(member)}</span>
                    {connectedPeers.has(member.user.id) && (
                      <div className="w-1 h-1 bg-accent rounded-full p2p-indicator" title="P2P Connected" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Offline — {offlineMembers.length}
            </div>

            {offlineMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-3 px-2 py-1 hover:bg-secondary rounded cursor-pointer opacity-60"
                data-testid={`member-offline-${member.user.username}`}
              >
                <UserAvatar user={member.user} size="md" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {member.user.username}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    Last seen recently
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* P2P Network Status */}
      <div className="p-3 border-t border-border bg-muted/50">
        <div className="text-xs text-muted-foreground mb-2">P2P Network Status</div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Connected Peers</span>
            <span className="text-xs text-accent font-medium" data-testid="text-connected-count">
              {connectedPeers.size}/{members.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Network Latency</span>
            <span className="text-xs text-accent font-medium">12ms</span>
          </div>
          <div className="w-full bg-border h-1 rounded-full mt-2">
            <div 
              className="bg-accent h-1 rounded-full p2p-indicator transition-all duration-300"
              style={{ width: `${Math.min((connectedPeers.size / Math.max(members.length, 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
