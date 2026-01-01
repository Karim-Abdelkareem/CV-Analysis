# WebSocket Connection Troubleshooting Guide

## Error: "WebSocket is closed before the connection is established"

This error typically occurs when the Socket.io authentication middleware rejects the connection before it's fully established.

## Quick Checklist

### 1. Verify Server is Running

```bash
# Check if server is running on port 3000
curl http://localhost:3000

# Check server logs for errors
# Look for authentication errors in your server console
```

### 2. Check Token is Being Passed

**Frontend (Client Side):**

```javascript
// ✅ CORRECT - Token in auth object
const socket = io("http://localhost:3000", {
  auth: {
    token: yourJWTToken, // Just the token string, no "Bearer" prefix
  },
});

// ❌ WRONG - No token
const socket = io("http://localhost:3000");

// ❌ WRONG - Token with Bearer prefix
const socket = io("http://localhost:3000", {
  auth: {
    token: `Bearer ${token}`, // Don't include "Bearer"
  },
});
```

### 3. Verify Token is Valid

Add this debug code to check your token:

```javascript
// Debug token before connecting
const token = localStorage.getItem("token"); // or wherever you store it

console.log("Token exists:", !!token);
console.log("Token length:", token?.length);

// Decode token to check expiration (without verification)
try {
  const parts = token.split(".");
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log("Token payload:", payload);
    console.log("Token expires:", new Date(payload.exp * 1000));
    console.log("Is expired:", payload.exp * 1000 < Date.now());
  }
} catch (e) {
  console.error("Token decode error:", e);
}
```

### 4. Check Server Logs

When you try to connect, check your server console. You should see:

```
Socket authentication attempt: { hasToken: true, ... }
Token verified for user: <userId>
Socket authenticated successfully for user: <email>
✅ User connected: <userId> (<email>)
```

If you see errors like:

- `"No token provided"` → Token not being passed from frontend
- `"Invalid or expired token"` → Token is invalid or expired
- `"User not found"` → User doesn't exist in database
- `"User account deactivated"` → User account is inactive

### 5. Test Connection with Debug Mode

Enable Socket.io debug logging:

```javascript
// In your browser console or before connecting
localStorage.debug = "socket.io-client:*";

// Then try connecting - you'll see detailed logs
```

### 6. Common Issues and Fixes

#### Issue: Token Not Found

**Symptom:** Server log shows "No token provided"

**Fix:**

```javascript
// Make sure token is retrieved before connecting
const token = getToken(); // Your function to get token
if (!token) {
  console.error("No token available. Please log in first.");
  return;
}

socketService.connect(token);
```

#### Issue: Token Expired

**Symptom:** Server log shows "Invalid or expired token"

**Fix:**

```javascript
// Implement token refresh
const refreshToken = async () => {
  // Call your refresh endpoint
  const response = await fetch("/api/refresh-token", {
    method: "POST",
    credentials: "include",
  });
  const data = await response.json();
  return data.token;
};

// Use refreshed token
const token = await refreshToken();
socketService.connect(token);
```

#### Issue: CORS Error

**Symptom:** Browser console shows CORS error

**Fix:**

- Check backend CORS configuration allows your frontend origin
- Verify credentials are set correctly

#### Issue: Connection Refused

**Symptom:** "Connection refused" or "ECONNREFUSED"

**Fix:**

- Verify server is running: `node index.js`
- Check port is correct (default: 3000)
- Check firewall settings
- Verify database connection is established

### 7. Step-by-Step Debug Process

1. **Check Frontend:**

   ```javascript
   // Add to your socket service
   console.log(
     "Attempting connection with token:",
     token ? "Present" : "Missing"
   );
   console.log("Token preview:", token?.substring(0, 20) + "...");
   ```

2. **Check Server:**

   - Look for authentication logs in server console
   - Check if database connection is working
   - Verify JWT_SECRET is set in environment

3. **Test Authentication Separately:**

   ```javascript
   // Test if token works with REST API first
   const response = await fetch(
     "http://localhost:3000/api/v1/interview/sessions",
     {
       headers: {
         Authorization: `Bearer ${token}`,
       },
     }
   );

   if (response.ok) {
     console.log("✅ Token works with REST API");
   } else {
     console.error("❌ Token invalid for REST API");
   }
   ```

4. **Try Polling Transport:**
   ```javascript
   // Force polling instead of websocket
   const socket = io("http://localhost:3000", {
     auth: { token },
     transports: ["polling"], // Try this if websocket fails
   });
   ```

### 8. Server-Side Debugging

Add this to your `src/config/socket.js` to see what's happening:

```javascript
export async function authenticateSocket(socket, next) {
  console.log("=== Socket Authentication Debug ===");
  console.log("Auth object:", socket.handshake.auth);
  console.log("Headers:", socket.handshake.headers);
  console.log("Query:", socket.handshake.query);

  // ... rest of authentication code
}
```

### 9. Verify Environment Variables

Make sure these are set in your `.env` file:

```env
JWT_SECRET=your-secret-key-here
PORT=3000
OPENAI_API_KEY=your-openai-key
```

### 10. Test with Minimal Example

Create a simple test file to isolate the issue:

```javascript
// test-connection.js
import { io } from "socket.io-client";

const token = "YOUR_TOKEN_HERE"; // Replace with actual token

const socket = io("http://localhost:3000", {
  auth: { token },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("✅ Connected!", socket.id);
  socket.disconnect();
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

Run with: `node test-connection.js`

## Still Having Issues?

1. Check server logs for detailed error messages
2. Verify database connection is working
3. Ensure all environment variables are set
4. Test with a fresh token from login endpoint
5. Check browser console for additional errors
6. Verify Socket.io versions match (client and server)

## Expected Behavior

**Successful Connection:**

```
Frontend: ✅ Connected to interview server
Server: ✅ User connected: <userId> (<email>)
```

**Failed Connection:**

```
Frontend: 🔴 Connection error: Authentication error: <reason>
Server: Authentication error logged in console
```

