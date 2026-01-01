# Speech-to-Text and Text-to-Speech Integration Guide

This guide outlines the tasks and features for adding voice capabilities to the live interview feature.

## Overview

The Web Speech API provides:

- **Speech Recognition API** - Convert speech to text (speech-to-text)
- **Speech Synthesis API** - Convert text to speech (text-to-speech)

Both are built into modern browsers and require no additional dependencies.

## Browser Support

- **Speech Recognition**: Chrome, Edge, Safari (iOS 14.5+)
- **Speech Synthesis**: All modern browsers

## Features

### Speech-to-Text Features

- Real-time voice input conversion
- Continuous listening mode
- Interim and final transcript results
- Visual feedback when listening
- Microphone permission handling
- Error handling for microphone issues
- Support for multiple languages

### Text-to-Speech Features

- Automatic AI response narration
- Configurable voice settings (rate, pitch, volume)
- Voice selection (preferred voices)
- Stop/pause/resume controls
- Visual indicator when speaking
- Language support

## Implementation Tasks

### Task 1: Create Speech Recognition Hook

**File**: `hooks/useSpeechRecognition.js`

**Features to implement:**

- Check browser support for Speech Recognition API
- Initialize Speech Recognition with continuous mode
- Handle interim and final transcript results
- Manage listening state
- Handle microphone permission errors
- Provide start/stop/clear functions
- Cleanup on component unmount

**State to manage:**

- `isListening` - Current listening status
- `transcript` - Current transcript text
- `isSupported` - Browser support status

**Functions to provide:**

- `startListening()` - Start voice recognition
- `stopListening()` - Stop voice recognition
- `clearTranscript()` - Clear current transcript

### Task 2: Create Text-to-Speech Hook

**File**: `hooks/useTextToSpeech.js`

**Features to implement:**

- Check browser support for Speech Synthesis API
- Create speech utterances with configurable options
- Handle speech events (start, end, error, pause, resume)
- Select preferred voice (Google/Natural voices)
- Provide speak/stop/pause/resume functions
- Cleanup on component unmount

**State to manage:**

- `isSpeaking` - Current speaking status
- `isPaused` - Pause status
- `isSupported` - Browser support status

**Functions to provide:**

- `speak(text, options)` - Speak text with optional settings
- `stop()` - Stop current speech
- `pause()` - Pause current speech
- `resume()` - Resume paused speech

**Configurable options:**

- `rate` - Speech speed (0.1 to 10)
- `pitch` - Voice pitch (0 to 2)
- `volume` - Volume level (0 to 1)
- `lang` - Language code (e.g., 'en-US')

### Task 3: Update useInterview Hook

**File**: `hooks/useInterview.js`

**Features to add:**

- Integrate `useTextToSpeech` hook
- Automatically speak AI responses when complete
- Return speaking state and stop function
- Handle speech cleanup on disconnect

**New return values:**

- `isSpeakingAI` - Whether AI is currently speaking
- `stopSpeaking` - Function to stop AI speech

### Task 4: Update InterviewChat Component

**File**: `components/InterviewChat.jsx`

**Features to add:**

- Integrate `useSpeechRecognition` hook
- Add microphone button to input field
- Show visual feedback when listening
- Update input field with voice transcript
- Display voice indicator when active
- Add stop voice button in header when speaking
- Handle microphone permission errors

**UI Elements to add:**

- Voice input button (microphone icon)
- Voice indicator banner (when listening)
- Stop voice button (when AI is speaking)
- Listening state visual feedback

### Task 5: Update CSS Styles

**File**: `components/InterviewChat.css`

**Styles to add:**

- Voice input button styling
- Active listening state animation
- Voice indicator banner styling
- Stop voice button styling
- Input field listening state styling
- Pulse animations for voice feedback

## User Experience Features

### Voice Input Flow

1. User clicks microphone button
2. Browser requests microphone permission (if needed)
3. Visual indicator shows "Listening..." state
4. User speaks their answer
5. Real-time transcript appears in input field
6. User clicks send or stops recording
7. Message is sent to server

### Voice Output Flow

1. AI response completes streaming
2. Text-to-speech automatically starts
3. Visual indicator shows AI is speaking
4. User can stop speech with button
5. Speech completes or is stopped

## Browser Permissions

### Microphone Permission

- Browser prompts user on first use
- Permission state can be checked programmatically
- Handle denied permission gracefully
- Show user-friendly error messages

## Best Practices

1. **Request Permission Early**: Ask for microphone permission when component mounts
2. **Show Visual Feedback**: Display clear indicators when listening/speaking
3. **Handle Errors Gracefully**: Show user-friendly error messages
4. **Stop on Unmount**: Clean up speech recognition and synthesis properly
5. **Respect User Preferences**: Allow users to disable voice features
6. **Fallback to Text**: Always allow text input as fallback option
7. **Test on Multiple Browsers**: Verify compatibility across supported browsers

## Troubleshooting

### Speech Recognition Issues

- Check browser support (Chrome/Edge recommended)
- Verify microphone permission is granted
- Ensure HTTPS is used in production (localhost works for dev)
- Verify language setting matches user's speech
- Check for microphone hardware issues

### Text-to-Speech Issues

- Verify browser support (all modern browsers)
- Check available voices
- Ensure system volume is not muted
- Stop previous speech before starting new
- Verify language code is correct

## Advanced Features (Optional)

### Voice Activity Detection

- Detect when user stops speaking
- Auto-submit after silence period
- Adjust sensitivity settings

### Multiple Languages

- Support language selection
- Auto-detect language
- Switch languages during interview

### Voice Commands

- Implement voice commands (e.g., "stop interview", "repeat question")
- Parse commands from transcript
- Execute actions based on commands

### Voice Settings

- Allow users to adjust speech rate
- Provide voice selection options
- Save user preferences

## Requirements

- HTTPS required for Speech Recognition in production
- Microphone access required for speech-to-text
- No additional npm packages needed (uses Web APIs)
- Modern browser with Web Speech API support

## Testing Checklist

- [ ] Speech recognition starts/stops correctly
- [ ] Transcript appears in input field
- [ ] Microphone permission handled properly
- [ ] AI responses are spoken automatically
- [ ] Stop voice button works
- [ ] Visual indicators show correct states
- [ ] Error messages display appropriately
- [ ] Works on Chrome/Edge browsers
- [ ] Works on HTTPS (production)
- [ ] Fallback to text input works
- [ ] Cleanup on component unmount

---

**Note**: Speech Recognition API requires HTTPS in production. Use `localhost` for development or deploy with SSL certificate.
