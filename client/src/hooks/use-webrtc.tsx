import { useEffect, useRef, useState, useCallback } from "react";
import { WebRTCManager } from "@/lib/webrtc";
import type { WebRTCSignal } from "@shared/schema";

export function useWebRTC(socket: WebSocket | null, userId: string) {
  const webrtcManagerRef = useRef<WebRTCManager>();
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);

  useEffect(() => {
    if (socket && userId) {
      webrtcManagerRef.current = new WebRTCManager(userId, socket);
      
      // Listen for peer connection events
      webrtcManagerRef.current.onPeerConnected = (peerId: string) => {
        setConnectedPeers(prev => new Set(Array.from(prev).concat(peerId)));
      };
      
      webrtcManagerRef.current.onPeerDisconnected = (peerId: string) => {
        setConnectedPeers(prev => {
          const newSet = new Set(prev);
          newSet.delete(peerId);
          return newSet;
        });
      };
    }
    
    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanup();
      }
    };
  }, [socket, userId]);

  const joinChannel = useCallback((channelId: string) => {
    if (webrtcManagerRef.current && socket) {
      setCurrentChannel(channelId);
      socket.send(JSON.stringify({
        type: 'join-channel',
        userId,
        channelId
      } as WebRTCSignal));
    }
  }, [socket, userId]);

  const leaveChannel = useCallback((channelId: string) => {
    if (webrtcManagerRef.current && socket) {
      setCurrentChannel(null);
      socket.send(JSON.stringify({
        type: 'leave-channel',
        userId,
        channelId
      } as WebRTCSignal));
      webrtcManagerRef.current.cleanup();
      setConnectedPeers(new Set());
    }
  }, [socket, userId]);

  const sendMessage = useCallback((channelId: string, content: string) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.sendMessage(content);
    }
  }, []);

  const startVoiceCall = useCallback(() => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.startVoiceCall();
    }
  }, []);

  const startVideoCall = useCallback(() => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.startVideoCall();
    }
  }, []);

  const startScreenShare = useCallback(() => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.startScreenShare();
    }
  }, []);

  return {
    connectedPeers,
    currentChannel,
    joinChannel,
    leaveChannel,
    sendMessage,
    startVoiceCall,
    startVideoCall,
    startScreenShare
  };
}
