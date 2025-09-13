# Overview

This is a Discord-like chat application built with React, Express, and WebSockets. The application features real-time messaging, server/channel organization, user authentication, voice chat capabilities with WebRTC, and a modern UI using shadcn/ui components. Users can create or join servers, communicate in text and voice channels, and manage their online presence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React and TypeScript using Vite as the build tool. The application follows a component-based architecture with:

- **Routing**: Uses Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state management and React Context for authentication
- **UI Components**: shadcn/ui component library with Radix UI primitives and Tailwind CSS styling
- **Real-time Communication**: Custom WebSocket hooks for real-time messaging and WebRTC integration for voice chat

## Backend Architecture
The server is built with Express.js and follows a RESTful API design:

- **Server Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM for type-safe database operations
- **Real-time Features**: WebSocket server for live messaging and WebRTC signaling
- **Storage Interface**: Abstract storage layer for data operations supporting users, servers, channels, messages, and direct messages

## Database Design
Uses PostgreSQL with Drizzle ORM and the following main entities:

- **Users**: Authentication, profiles, and online status
- **Servers**: Discord-like server containers with invite codes
- **Channels**: Text and voice channels within servers
- **Messages**: Channel messages with author relationships
- **Server Members**: User-server relationships with roles
- **Direct Messages**: Private messaging between users
- **Friendships**: User relationship management

## Authentication & Authorization
Simple username/password authentication system with:

- User registration and login endpoints
- Session-based authentication
- Role-based permissions (owner, admin, moderator, member)
- Online status tracking

## Real-time Features
Comprehensive real-time functionality:

- **WebSocket Integration**: Live message delivery and user presence
- **WebRTC Voice Chat**: Peer-to-peer voice communication with signaling server
- **Channel Management**: Real-time channel joining/leaving
- **User Presence**: Live status updates and connection tracking

# External Dependencies

## Core Framework Dependencies
- **React**: Frontend UI framework with React Query for server state
- **Express.js**: Backend web framework with WebSocket support
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Neon Database**: PostgreSQL database service via @neondatabase/serverless

## UI & Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

## Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time messaging
- **WebRTC**: Browser-native peer-to-peer voice communication
- **Custom signaling**: WebSocket-based WebRTC signaling server

## Development Tools
- **Vite**: Fast development build tool with React plugin
- **TypeScript**: Type safety across the full stack
- **Replit Integration**: Development environment plugins and error handling