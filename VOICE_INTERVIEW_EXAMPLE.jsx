/**
 * Complete Voice-Enabled Interview Chat Component
 *
 * This is a complete example showing how to integrate
 * speech-to-text and text-to-speech into the interview chat.
 *
 * Copy the hooks from SPEECH_FEATURES_GUIDE.md and use this component.
 */

import React, { useState, useRef, useEffect } from "react";
import { useInterview } from "../hooks/useInterview";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import "./InterviewChat.css";

const VoiceInterviewChat = ({ token }) => {
  const {
    isConnected,
    messages,
    isLoading,
    error,
    isStreaming,
    currentAiMessage,
    sessionStatus,
    startInterview,
    sendMessage,
    endInterview,
  } = useInterview(token);

  const [inputMessage, setInputMessage] = useState("");
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Text-to-Speech for AI responses
  const {
    speak,
    stop: stopSpeaking,
    isSpeaking: isSpeakingAI,
  } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    lang: "en-US",
  });

  // Speech Recognition for user input
  const {
    isListening,
    transcript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition(
    // onResult - called when final transcript is ready
    (finalTranscript) => {
      if (finalTranscript && sessionStatus === "active") {
        setInputMessage(finalTranscript);
        // Auto-send option (uncomment to enable)
        // sendMessage(finalTranscript);
        // clearTranscript();
      }
    },
    // onError
    (error) => {
      console.error("Speech recognition error:", error);
      if (error === "not-allowed") {
        alert(
          "Microphone permission denied. Please enable microphone access in your browser settings."
        );
        setVoiceInputEnabled(false);
      }
    }
  );

  // Update input with interim transcript while listening
  useEffect(() => {
    if (isListening && transcript) {
      setInputMessage(transcript);
    }
  }, [transcript, isListening]);

  // Auto-speak AI responses when complete
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && !isStreaming) {
        // Speak the last AI message
        speak(lastMessage.content);
      }
    }
  }, [messages, isStreaming, speak]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAiMessage]);

  // Focus input when session becomes active
  useEffect(() => {
    if (sessionStatus === "active" && inputRef.current && !isListening) {
      inputRef.current.focus();
    }
  }, [sessionStatus, isListening]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading && sessionStatus === "active") {
      sendMessage(inputMessage);
      setInputMessage("");
      clearTranscript();
      if (isListening) {
        stopListening();
        setVoiceInputEnabled(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
      setVoiceInputEnabled(false);
      clearTranscript();
    } else {
      startListening();
      setVoiceInputEnabled(true);
    }
  };

  return (
    <div className="interview-chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <h2>Live Interview Session</h2>
          <div className="header-controls">
            <div className="status-indicator">
              <span
                className={`status-dot ${
                  isConnected ? "connected" : "disconnected"
                }`}
              />
              <span className="status-text">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            {/* Text-to-Speech Control */}
            {isSpeakingAI && (
              <button
                onClick={stopSpeaking}
                className="btn btn-icon"
                title="Stop AI voice"
              >
                🔇 Stop Voice
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Voice Input Indicator */}
      {isListening && (
        <div className="voice-indicator listening">
          <span className="voice-icon">🎤</span>
          <span>Listening... Speak your answer</span>
        </div>
      )}

      {/* Messages Area */}
      <div className="chat-messages">
        {sessionStatus === "idle" && messages.length === 0 && (
          <div className="welcome-message">
            <h3>Welcome to Your Interview!</h3>
            <p>Click "Start Interview" to begin your live interview session.</p>
            <p>
              The AI interviewer will ask questions based on your CV and
              experience.
            </p>
            {isSpeechSupported && (
              <p className="voice-info">
                🎤 Voice input and 🔊 text-to-speech are available!
              </p>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${
              message.role === "user" ? "user-message" : "ai-message"
            }`}
          >
            <div className="message-avatar">
              {message.role === "user" ? "👤" : "🤖"}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <span className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Streaming AI Message */}
        {isStreaming && currentAiMessage && (
          <div className="message ai-message streaming">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-text">
                {currentAiMessage}
                <span className="streaming-cursor">▊</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="chat-controls">
        {sessionStatus === "idle" && (
          <div className="start-section">
            <button
              onClick={startInterview}
              disabled={!isConnected || isLoading}
              className="btn btn-primary btn-large"
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Starting Interview...
                </>
              ) : (
                "🚀 Start Interview"
              )}
            </button>
            {!isConnected && (
              <p className="connection-warning">
                Please wait for connection to server...
              </p>
            )}
          </div>
        )}

        {sessionStatus === "active" && (
          <>
            <form onSubmit={handleSendMessage} className="message-form">
              <div className="input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isListening
                      ? "🎤 Listening... Speak your answer"
                      : "Type your answer here..."
                  }
                  disabled={isLoading}
                  className={`message-input ${isListening ? "listening" : ""}`}
                />
                {/* Voice Input Button */}
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`btn btn-voice ${isListening ? "active" : ""}`}
                    title={
                      isListening
                        ? "Stop voice input"
                        : "Start voice input (speak your answer)"
                    }
                    disabled={isLoading}
                  >
                    {isListening ? "⏹️" : "🎤"}
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="btn btn-send"
              >
                {isLoading ? "⏳" : "📤"}
              </button>
            </form>
            <div className="control-actions">
              <button
                onClick={endInterview}
                disabled={isLoading}
                className="btn btn-danger btn-end"
              >
                End Interview
              </button>
            </div>
          </>
        )}

        {sessionStatus === "completed" && (
          <div className="session-completed">
            <div className="completion-message">
              <h3>✅ Interview Completed!</h3>
              <p>Your interview session has been saved.</p>
            </div>
            <button onClick={startInterview} className="btn btn-primary">
              Start New Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceInterviewChat;

