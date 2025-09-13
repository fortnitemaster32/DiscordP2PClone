import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@shared/schema";

interface UserAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}

export default function UserAvatar({ 
  user, 
  size = "md", 
  showStatus = true, 
  className = "" 
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };

  const statusClasses = {
    online: "user-status-online",
    away: "user-status-away", 
    busy: "user-status-busy",
    offline: "user-status-offline"
  };

  const statusSizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  return (
    <div className={`relative ${className}`}>
      <Avatar className={sizeClasses[size]} data-testid={`avatar-${user.username}`}>
        <AvatarImage src={user.avatar || undefined} alt={user.username} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {user.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <div 
          className={`absolute -bottom-1 -right-1 ${statusSizes[size]} ${statusClasses[user.status as keyof typeof statusClasses]} rounded-full border-2 border-card`}
          data-testid={`status-${user.status}`}
        />
      )}
    </div>
  );
}
