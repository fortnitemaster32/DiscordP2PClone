import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, MicOff, Headphones, HeadphonesIcon, Settings } from "lucide-react";

interface VoiceControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  onMuteToggle: () => void;
  onDeafenToggle: () => void;
}

export default function VoiceControls({
  isMuted,
  isDeafened,
  onMuteToggle,
  onDeafenToggle
}: VoiceControlsProps) {
  return (
    <div className="flex items-center space-x-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:bg-card rounded"
            onClick={onMuteToggle}
            data-testid="button-mute"
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 text-destructive" />
            ) : (
              <Mic className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isMuted ? "Unmute" : "Mute"}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:bg-card rounded"
            onClick={onDeafenToggle}
            data-testid="button-deafen"
          >
            {isDeafened ? (
              <HeadphonesIcon className="w-4 h-4 text-destructive" />
            ) : (
              <Headphones className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isDeafened ? "Undeafen" : "Deafen"}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:bg-card rounded"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>User Settings</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
