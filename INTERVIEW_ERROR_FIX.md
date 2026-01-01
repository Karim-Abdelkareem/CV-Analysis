# Interview Response Error - Troubleshooting Guide

## Error: "Failed to process interview response"

This error occurs when the system cannot process the AI response during an interview session.

## Common Causes & Solutions

### 1. OpenAI API Key Issues

**Check if API key is set:**
```bash
# In your .env file
OPENAI_API_KEY=sk-...
```

**Verify API key is valid:**
- Check your OpenAI account dashboard
- Ensure the key has sufficient credits
- Verify the key hasn't been revoked

### 2. Streaming Implementation Issues

The error might occur if:
- The streaming format is incorrect
- The message history format is wrong
- There's a network timeout

**Check server logs for detailed errors:**
```
Streaming error: <error details>
Error details: { message, stack, name }
```

### 3. Message History Issues

**Symptoms:**
- Error occurs after first message
- Session works initially but fails later

**Solution:**
- Check that message history is being maintained correctly
- Verify session is not expired
- Ensure session is stored in activeSessions map

### 4. Network/Timeout Issues

**Symptoms:**
- Error occurs randomly
- Takes long time before error

**Solutions:**
- Check internet connection
- Verify OpenAI API is accessible
- Check for rate limiting

## Debugging Steps

### Step 1: Check Server Logs

When the error occurs, check your server console for:
```
Error in streamInterviewResponse: <error>
Error details: { message, stack, name, sessionId }
```

### Step 2: Verify OpenAI API Key

Test the API key directly:
```javascript
// Test script
import { ChatOpenAI } from "@langchain/openai";

const testModel = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  apiKey: process.env.OPENAI_API_KEY,
});

try {
  const response = await testModel.invoke("Hello, test message");
  console.log("✅ API key works:", response.content);
} catch (error) {
  console.error("❌ API key error:", error.message);
}
```

### Step 3: Check Environment Variables

Verify all required environment variables:
```bash
# Required variables
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret
MONGODB_URI=mongodb://...
```

### Step 4: Test Streaming Directly

Create a test endpoint to verify streaming works:
```javascript
// Test streaming
const testStream = async () => {
  const chatModel = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    streaming: true,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const messages = [
    new SystemMessage("You are a helpful assistant."),
    new HumanMessage("Say hello"),
  ];

  try {
    const stream = await chatModel.stream(messages);
    for await (const chunk of stream) {
      console.log("Chunk:", chunk);
    }
    console.log("✅ Streaming works");
  } catch (error) {
    console.error("❌ Streaming error:", error);
  }
};
```

## Error Messages Reference

### "OpenAI API key is invalid or missing"
- **Cause:** API key not set or invalid
- **Fix:** Set valid OPENAI_API_KEY in .env file

### "OpenAI API rate limit exceeded"
- **Cause:** Too many requests to OpenAI API
- **Fix:** Wait and retry, or upgrade OpenAI plan

### "Received empty response from AI"
- **Cause:** AI returned empty content
- **Fix:** Check message format, try again

### "Interview session not found or expired"
- **Cause:** Session was cleared or expired
- **Fix:** Start a new interview session

### "Failed to process interview response: <specific error>"
- **Cause:** Various (see server logs for details)
- **Fix:** Check server console for full error details

## Quick Fixes

### Fix 1: Restart Server
```bash
# Stop server (Ctrl+C)
# Restart server
node index.js
```

### Fix 2: Clear Active Sessions
If sessions are stuck, restart the server to clear the activeSessions map.

### Fix 3: Check Database Connection
```javascript
// Verify MongoDB connection
import { connectDB } from "./src/config/db.js";
connectDB();
```

### Fix 4: Verify Model Availability
Ensure "gpt-3.5-turbo" is available in your OpenAI account.

## Prevention

1. **Always check server logs** when errors occur
2. **Validate API key** before starting server
3. **Monitor OpenAI usage** to avoid rate limits
4. **Handle errors gracefully** in frontend
5. **Implement retry logic** for transient errors

## Getting More Help

If the error persists:

1. **Check server console** for full error stack trace
2. **Verify environment variables** are set correctly
3. **Test OpenAI API** directly with a simple script
4. **Check OpenAI dashboard** for API status and usage
5. **Review error logs** for specific error messages

## Example Error Log Analysis

```
Error in streamInterviewResponse: Error: API key is invalid
Error details: {
  message: "API key is invalid",
  stack: "...",
  name: "Error",
  sessionId: "507f1f77bcf86cd799439011"
}
```

**Analysis:**
- Error type: API key issue
- Session ID: 507f1f77bcf86cd799439011
- **Fix:** Update OPENAI_API_KEY in .env file

---

**Note:** The improved error handling now provides more detailed error messages. Check your server console for specific error details when this error occurs.


