# LiveKit Voice Interview System - التوثيق

## نظرة عامة

نظام مقابلة صوتية مباشرة باستخدام WebRTC (LiveKit) مع دعم:

- **Speech-to-Text**: استخدام OpenAI Whisper API
- **Text-to-Speech**: استخدام OpenAI TTS API مع اختيار نوع الصوت (ذكر/أنثى/محايد)
- **LLM Interview Flow**: استخدام نفس نظام LLM الموجود للمقابلات النصية
- **MongoDB Storage**: حفظ النتائج في نفس قاعدة البيانات

## المعمارية

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ├─── WebSocket (Socket.io) ────► Text-based Interview
       │
       └─── WebRTC (LiveKit) ──────────► Voice Interview
                    │
                    ├─── Audio Input ──► Whisper API (STT)
                    │
                    └─── Audio Output ◄── OpenAI TTS API
```

## التثبيت والإعداد

### 1. تثبيت الحزم

```bash
npm install livekit-server-sdk @livekit/protocol openai
```

### 2. متغيرات البيئة

أضف هذه المتغيرات إلى ملف `.env`:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server
LIVEKIT_API_KEY=xxxx
LIVEKIT_SECRET=xxxx

# OpenAI (موجود مسبقاً)
OPENAI_API_KEY=xxxxx
MONGO_URL=mongodb://localhost:27017/interviews
```

### 3. إعداد LiveKit Server

يجب تشغيل LiveKit Server بشكل منفصل:

- **Docker**: `docker run -p 7880:7880 livekit/livekit-server`
- **Cloud**: استخدام LiveKit Cloud

## API Endpoints

### 1. إنشاء Token للوصول

**POST** `/api/v1/interview/livekit/token`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "roomName": "interview-123",
  "participantName": "User Name"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "roomName": "interview-123",
    "participantIdentity": "userId",
    "participantName": "User Name"
  }
}
```

### 2. بدء مقابلة صوتية

**POST** `/api/v1/interview/livekit/start`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "voiceGender": "male"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "sessionId": "6956a5547e5b3dc33fbe28a2",
    "roomName": "interview-6956a5547e5b3dc33fbe28a2",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "voiceGender": "male",
    "status": "active",
    "initialGreeting": {
      "text": "Hello! Welcome to your interview..."
    }
  }
}
```

### 3. معالجة الصوت

**POST** `/api/v1/interview/livekit/process-audio`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "sessionId": "6956a5547e5b3dc33fbe28a2",
  "audioData": "base64_encoded_audio_data"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "userTranscript": "I have 5 years of experience...",
    "aiResponse": "That's great! Can you tell me more about...",
    "audioResponse": "base64_encoded_audio_response"
  }
}
```

### 4. إنهاء المقابلة

**POST** `/api/v1/interview/livekit/end`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "sessionId": "6956a5547e5b3dc33fbe28a2"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "sessionId": "6956a5547e5b3dc33fbe28a2",
    "status": "completed",
    "summary": "Interview summary...",
    "message": "Voice interview session ended successfully"
  }
}
```

### 5. إنشاء رد من نص (بديل)

**POST** `/api/v1/interview/livekit/generate-response`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "sessionId": "6956a5547e5b3dc33fbe28a2",
  "userText": "I have experience in React and Node.js"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "aiResponse": "That's excellent! Can you describe...",
    "audioResponse": "base64_encoded_audio_response"
  }
}
```

### 6. Webhook (LiveKit Events)

**POST** `/api/v1/interview/livekit/webhook`

**Headers:**

```
Authorization: <LIVEKIT_WEBHOOK_SIGNATURE>
```

يتم استدعاء هذا الـ endpoint تلقائياً من LiveKit Server عند حدوث أحداث مثل:

- `room_started` - بدء الغرفة
- `room_finished` - انتهاء الغرفة
- `participant_connected` - اتصال مشارك
- `track_published` - نشر مسار صوتي

## اختيار نوع الصوت (Voice Gender)

النظام يدعم ثلاثة أنواع من الأصوات:

### Male (ذكر)

- **Voices**: `alloy`, `echo`
- **Use case**: مقابلات تقنية، أصوات احترافية

### Female (أنثى)

- **Voices**: `nova`, `shimmer`
- **Use case**: مقابلات ودودة، أصوات واضحة

### Neutral (محايد)

- **Voices**: `onyx`, `fable`
- **Use case**: مقابلات عامة (افتراضي)

## تدفق البيانات (Data Flow)

### 1. بدء المقابلة

```
User Request → Backend → Create LiveKit Room → Generate Token → Return to Client
```

### 2. معالجة الصوت

```
User Audio → LiveKit → Backend → Whisper API → Text
Text → LLM Service → AI Response
AI Response → OpenAI TTS → Audio → LiveKit → User
```

### 3. إنهاء المقابلة

```
User Request → Backend → Finalize Session → Delete Room → Save to MongoDB
```

## الملفات المُنشأة

### Services

- `src/modules/interview/livekit.service.js` - إدارة LiveKit rooms و tokens
- `src/modules/interview/whisper.service.js` - Speech-to-Text باستخدام Whisper
- `src/modules/interview/tts.service.js` - Text-to-Speech مع اختيار الصوت
- `src/modules/interview/livekit-interview.service.js` - تنسيق المقابلة الصوتية

### Routes & Webhooks

- `src/modules/interview/livekit.routes.js` - API endpoints
- `src/modules/interview/livekit.webhook.js` - معالجة LiveKit events

### Models

- تم تحديث `interview-session.model.js` بإضافة:
  - `interviewType`: "text" | "voice"
  - `voiceGender`: "male" | "female" | "neutral"
  - `livekitRoomName`: اسم الغرفة

## مثال على الاستخدام (Frontend)

```javascript
// 1. بدء المقابلة
const response = await fetch("/api/v1/interview/livekit/start", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    voiceGender: "male",
  }),
});

const { sessionId, roomName, token: livekitToken } = await response.json();

// 2. الاتصال بـ LiveKit Room
import { Room, RoomEvent } from "livekit-client";

const room = new Room();
await room.connect("wss://your-livekit-server", livekitToken);

// 3. إرسال الصوت
room.localParticipant.publishAudioTrack(audioTrack);

// 4. استقبال رد AI
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === "audio" && participant.identity === "AI-Interviewer") {
    // تشغيل الصوت
    track.attach(audioElement);
  }
});
```

## الأخطاء الشائعة وحلولها

### 1. خطأ: "LiveKit API key and secret must be configured"

**الحل**: تأكد من إضافة `LIVEKIT_API_KEY` و `LIVEKIT_SECRET` في `.env`

### 2. خطأ: "Cannot connect to LiveKit server"

**الحل**: تأكد من تشغيل LiveKit Server وأن `LIVEKIT_URL` صحيح

### 3. خطأ: "Invalid OpenAI API key"

**الحل**: تأكد من صحة `OPENAI_API_KEY` في `.env`

### 4. خطأ: "Audio file too large"

**الحل**: Whisper API يقبل ملفات حتى 25MB. قم بتقسيم الصوت الطويل

## الاختبار

### Checklist

- [ ] LiveKit server يعمل
- [ ] Token generation يعمل
- [ ] User يمكنه الاتصال بالغرفة
- [ ] Audio input يتم استقباله
- [ ] Whisper API يعمل بشكل صحيح
- [ ] LLM يولد الردود
- [ ] TTS يولد الصوت بالصوت المختار
- [ ] Audio output يُرسل للعميل
- [ ] Transcript يُحفظ في MongoDB
- [ ] Voice gender selection يعمل

## ملاحظات مهمة

1. **LiveKit Server**: يجب تشغيله بشكل منفصل (Docker أو Cloud)
2. **OpenAI API**: مطلوب للـ Whisper و TTS
3. **Voice Selection**: يتم اختياره عند بدء المقابلة (per session)
4. **Parallel Operation**: يمكن تشغيل المقابلات النصية والصوتية معاً
5. **MongoDB**: يتم حفظ كلا النوعين في نفس الـ collection

## الدعم

للمزيد من المعلومات:

- [LiveKit Documentation](https://docs.livekit.io/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI TTS API](https://platform.openai.com/docs/guides/text-to-speech)

