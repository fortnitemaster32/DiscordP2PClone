import type { WebRTCSignal } from "@shared/schema";

export class WebRTCManager {
  private userId: string;
  private socket: WebSocket;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private localStream: MediaStream | null = null;
  private isVoiceEnabled = false;
  private isVideoEnabled = false;

  public onPeerConnected?: (peerId: string) => void;
  public onPeerDisconnected?: (peerId: string) => void;
  public onMessageReceived?: (from: string, message: string) => void;

  constructor(userId: string, socket: WebSocket) {
    this.userId = userId;
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.addEventListener('message', (event) => {
      try {
        const signal: WebRTCSignal = JSON.parse(event.data);
        this.handleSignal(signal);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
  }

  private async handleSignal(signal: WebRTCSignal) {
    switch (signal.type) {
      case 'peer-joined':
        await this.connectToPeer(signal.from);
        break;
      case 'peer-left':
        this.disconnectFromPeer(signal.from);
        break;
      case 'offer':
        await this.handleOffer(signal);
        break;
      case 'answer':
        await this.handleAnswer(signal);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(signal);
        break;
    }
  }

  private async connectToPeer(peerId: string) {
    const peerConnection = this.createPeerConnection(peerId);
    
    // Create data channel for text messaging
    const dataChannel = peerConnection.createDataChannel('messages');
    this.setupDataChannel(dataChannel, peerId);
    
    // Add local media streams if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    this.socket.send(JSON.stringify({
      type: 'offer',
      from: this.userId,
      to: peerId,
      data: offer
    } as WebRTCSignal));
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(config);
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.send(JSON.stringify({
          type: 'ice-candidate',
          from: this.userId,
          to: peerId,
          data: event.candidate
        } as WebRTCSignal));
      }
    };

    peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
    };

    peerConnection.ontrack = (event) => {
      // Handle incoming media stream
      const [stream] = event.streams;
      this.handleRemoteStream(peerId, stream);
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        this.onPeerConnected?.(peerId);
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        this.disconnectFromPeer(peerId);
      }
    };

    this.peers.set(peerId, peerConnection);
    return peerConnection;
  }

  private setupDataChannel(dataChannel: RTCDataChannel, peerId: string) {
    this.dataChannels.set(peerId, dataChannel);
    
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
    };
    
    dataChannel.onmessage = (event) => {
      this.onMessageReceived?.(peerId, event.data);
    };
    
    dataChannel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.dataChannels.delete(peerId);
    };
  }

  private async handleOffer(signal: WebRTCSignal) {
    const peerConnection = this.createPeerConnection(signal.from);
    
    await peerConnection.setRemoteDescription(signal.data);
    
    // Add local media streams if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    this.socket.send(JSON.stringify({
      type: 'answer',
      from: this.userId,
      to: signal.from,
      data: answer
    } as WebRTCSignal));
  }

  private async handleAnswer(signal: WebRTCSignal) {
    const peerConnection = this.peers.get(signal.from);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(signal.data);
    }
  }

  private async handleIceCandidate(signal: WebRTCSignal) {
    const peerConnection = this.peers.get(signal.from);
    if (peerConnection) {
      await peerConnection.addIceCandidate(signal.data);
    }
  }

  private disconnectFromPeer(peerId: string) {
    const peerConnection = this.peers.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.peers.delete(peerId);
    }
    
    this.dataChannels.delete(peerId);
    this.onPeerDisconnected?.(peerId);
  }

  private handleRemoteStream(peerId: string, stream: MediaStream) {
    // Create audio/video elements for remote streams
    const mediaContainer = document.getElementById('remote-media-container');
    if (mediaContainer) {
      const existingElement = document.getElementById(`remote-${peerId}`);
      if (existingElement) {
        existingElement.remove();
      }

      const mediaElement = document.createElement(stream.getVideoTracks().length > 0 ? 'video' : 'audio') as HTMLVideoElement | HTMLAudioElement;
      mediaElement.id = `remote-${peerId}`;
      mediaElement.srcObject = stream;
      mediaElement.autoplay = true;
      if (mediaElement instanceof HTMLVideoElement) {
        mediaElement.playsInline = true;
        mediaElement.muted = false;
      }
      
      mediaContainer.appendChild(mediaElement);
    }
  }

  public sendMessage(content: string) {
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(content);
      }
    });
  }

  public async startVoiceCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      this.isVoiceEnabled = true;
      
      // Add audio track to all existing peer connections
      this.peers.forEach((peerConnection) => {
        this.localStream!.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      });
    } catch (error) {
      console.error('Error starting voice call:', error);
    }
  }

  public async startVideoCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      this.isVideoEnabled = true;
      
      // Add video track to all existing peer connections
      this.peers.forEach((peerConnection) => {
        this.localStream!.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      });
      
      // Show local video
      const localVideo = document.getElementById('local-video') as HTMLVideoElement;
      if (localVideo) {
        localVideo.srcObject = this.localStream;
      }
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  }

  public async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Replace video track in all peer connections
      this.peers.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0]);
        } else {
          peerConnection.addTrack(screenStream.getVideoTracks()[0], screenStream);
        }
      });
      
      // Update local stream
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          this.localStream.removeTrack(videoTrack);
        }
        screenStream.getTracks().forEach(track => {
          this.localStream!.addTrack(track);
        });
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  }

  public cleanup() {
    this.peers.forEach((peerConnection) => {
      peerConnection.close();
    });
    this.peers.clear();
    this.dataChannels.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.isVoiceEnabled = false;
    this.isVideoEnabled = false;
  }
}
