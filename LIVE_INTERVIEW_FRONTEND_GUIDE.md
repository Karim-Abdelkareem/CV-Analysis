# Live Interview Session - Frontend Integration Guide

This guide outlines the tasks and features for integrating the live interview feature in a React frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Features](#features)
4. [Implementation Tasks](#implementation-tasks)
5. [Event Reference](#event-reference)
6. [REST API Endpoints](#rest-api-endpoints)
7. [Troubleshooting](#troubleshooting)

## Overview

The live interview feature uses WebSocket (Socket.io) for real-time bidirectional communication between the frontend and backend. The AI interviewer streams responses token-by-token for a smooth user experience.

## Installation

**Required Dependencies:**

- `socket.io-client` - WebSocket client library
- `axios` - HTTP client for REST API calls

**Installation Command:**

```bash
npm install socket.io-client axios
```

**Note**: Speech-to-Text and Text-to-Speech use the Web Speech API (built into browsers) and require no additional packages. See [Speech Features Guide](./SPEECH_FEATURES_GUIDE.md) for voice feature implementation.

## Features

### Core Features

- Real-time streaming AI responses (token-by-token)
- JWT authentication for secure WebSocket connections
- Session management and persistence
- Automatic reconnection handling
- Error handling and recovery
- Interview session history
- Session transcript viewing

### Voice Features (Optional)

- **Speech-to-Text** - Voice input for answers
- **Text-to-Speech** - AI responses spoken aloud
- See [Speech Features Guide](./SPEECH_FEATURES_GUIDE.md) for details

## Implementation Tasks

### Task 1: Create Socket Service

**File**: `services/socketService.js`

**Features to implement:**

- Create Socket.io client connection
- Handle JWT token authentication
- Manage connection state
- Handle connection/disconnection events
- Handle connection errors
- Provide reconnection logic
- Expose connection status

**Configuration:**

- Server URL: `http://localhost:3000` (or your backend URL)
- Authentication: Pass JWT token in `auth.token`
- Transports: WebSocket and polling fallback
- Reconnection: Automatic with configurable attempts

### Task 2: Create useInterview Hook

**File**: `hooks/useInterview.js`

**Features to implement:**

- Initialize Socket.io connection with token
- Manage interview session state
- Handle WebSocket events
- Stream AI responses token-by-token
- Manage message history
- Handle errors and disconnections
- Provide interview control functions

**State to manage:**

- `isConnected` - WebSocket connection status
- `sessionId` - Current interview session ID
- `messages` - Array of chat messages
- `isLoading` - Loading state
- `error` - Error messages
- `isStreaming` - AI response streaming status
- `currentAiMessage` - Currently streaming message
- `sessionStatus` - Session state (idle/active/completed)

**Functions to provide:**

- `startInterview()` - Start new interview session
- `sendMessage(message)` - Send user message
- `endInterview()` - End current session
- `disconnect()` - Disconnect from server

**WebSocket Events to handle:**

- `connect` - Connection established
- `disconnect` - Connection lost
- `connect_error` - Connection errors
- `session-started` - Interview session started
- `ai-message` - AI response (token or complete)
- `user-message-received` - User message acknowledged
- `session-ended` - Interview completed
- `error` - Error occurred

### Task 3: Create InterviewChat Component

**File**: `components/InterviewChat.jsx`

**Features to implement:**

- Display connection status
- Show interview messages (user and AI)
- Display streaming AI responses
- Input field for user messages
- Start interview button
- End interview button
- Error message display
- Loading states
- Auto-scroll to latest messages

**UI States:**

- Idle: Show start interview button
- Active: Show message input and end button
- Completed: Show completion message and restart option

**Optional Voice Features:**

- Microphone button for voice input
- Voice indicator when listening
- Stop voice button when AI is speaking

### Task 4: Create Session History Component

**File**: `components/InterviewHistory.jsx`

**Features to implement:**

- List all user interview sessions
- Display session metadata (date, status, duration)
- View session transcript
- Delete sessions
- Show session summary (if available)

### Task 5: Create API Service

**File**: `services/interviewApi.js`

**Features to implement:**

- Configure axios instance with base URL
- Add JWT token to all requests
- Get all interview sessions
- Get specific session by ID
- Delete session
- Generate interview questions (optional)

**Base URL**: `http://localhost:3000/api/v1/interview`

### Task 6: Add CSS Styling

**File**: `components/InterviewChat.css`

**Styles to implement:**

- Chat container layout
- Header with status indicator
- Message bubbles (user and AI)
- Input form styling
- Button styles
- Loading indicators
- Error message styling
- Voice feature styling (if implemented)

## Event Reference

### Client → Server Events

| Event             | Description                   | Payload                           |
| ----------------- | ----------------------------- | --------------------------------- |
| `start-interview` | Start a new interview session | None                              |
| `user-message`    | Send user response            | `string` or `{ message: string }` |
| `end-interview`   | End the current interview     | None                              |

### Server → Client Events

| Event                   | Description               | Payload                                                                    |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------- |
| `session-started`       | Session initialized       | `{ sessionId: string, status: string, message: string }`                   |
| `ai-message`            | AI response (streaming)   | `{ type: 'token' \| 'complete', content: string }`                         |
| `user-message-received` | User message acknowledged | `{ message: string }`                                                      |
| `session-ended`         | Session completed         | `{ sessionId: string, status: string, summary?: string, message: string }` |
| `error`                 | Error occurred            | `{ message: string }`                                                      |

## REST API Endpoints

### Get All Sessions

- **Endpoint**: `GET /api/v1/interview/sessions`
- **Auth**: Required (Bearer token)
- **Response**: List of user's interview sessions

### Get Session by ID

- **Endpoint**: `GET /api/v1/interview/sessions/:sessionId`
- **Auth**: Required (Bearer token)
- **Response**: Full session details with transcript

### Delete Session

- **Endpoint**: `DELETE /api/v1/interview/sessions/:sessionId`
- **Auth**: Required (Bearer token)
- **Response**: Success message

### Generate Questions (Optional)

- **Endpoint**: `POST /api/v1/interview/questions`
- **Auth**: Required (Bearer token)
- **Response**: Array of interview questions

## Authentication

### WebSocket Authentication

- Pass JWT token in `auth.token` when connecting
- Token is validated on connection
- Connection rejected if token is invalid

### REST API Authentication

- Include JWT token in `Authorization` header
- Format: `Bearer <token>`
- Token validated on each request

## Troubleshooting

### Connection Issues

- Verify server is running
- Check token is valid and not expired
- Ensure token is passed correctly in `auth.token`
- Check CORS settings
- Verify network connectivity

### Streaming Issues

- Check backend has streaming enabled
- Verify handling both `token` and `complete` message types
- Check for network interruptions

### Authentication Errors

- Verify token format (no "Bearer" prefix for WebSocket)
- Check token expiration
- Ensure user account is active
- Verify JWT_SECRET matches between client and server

## Best Practices

1. **Token Management**: Store JWT tokens securely
2. **Error Handling**: Always handle connection errors gracefully
3. **Reconnection**: Let Socket.io handle automatic reconnection
4. **Loading States**: Show appropriate loading indicators
5. **User Feedback**: Provide clear feedback for all actions
6. **Cleanup**: Clean up event listeners on component unmount
7. **Security**: Always use HTTPS in production

## Testing Checklist

- [ ] WebSocket connection establishes successfully
- [ ] Authentication works with valid token
- [ ] Interview session starts correctly
- [ ] User messages are sent and received
- [ ] AI responses stream token-by-token
- [ ] Session ends properly
- [ ] Error handling works correctly
- [ ] Reconnection works after disconnect
- [ ] Session history loads correctly
- [ ] Transcript viewing works
- [ ] Session deletion works
- [ ] Works on different browsers
- [ ] Works on HTTPS (production)

---

For detailed implementation code, refer to the example files or see [Speech Features Guide](./SPEECH_FEATURES_GUIDE.md) for voice features.
