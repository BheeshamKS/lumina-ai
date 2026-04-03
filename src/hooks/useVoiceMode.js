import { useState, useRef, useCallback } from "react";
import { getActiveApiKey } from "../utils/apiKeys";

export const useVoiceMode = ({ onTranscribed, onTTSEnd }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  const getGroqKey = async () => {
    return await getActiveApiKey("Groq");
  };

  // ── Start Recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.start(100);
    setIsRecording(true);
  }, []);

  // ── Stop Recording & Transcribe ──────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        // Stop mic tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const mimeType = mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const extension = mimeType.includes("mp4") ? "mp4" : "webm";

          const groqKey = await getGroqKey();
          if (!groqKey) throw new Error("NO_GROQ_KEY");

          // Send key in header — much more reliable than multipart field parsing
          const formData = new FormData();
          formData.append("file", audioBlob, `recording.${extension}`);

          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: {
              "x-groq-key": groqKey,
            },
            body: formData,
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Transcription failed");
          }

          const data = await response.json();
          const text = data.text?.trim();
          if (text) onTranscribed(text);
          resolve(text || null);
        } catch (err) {
          reject(err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.stop();
    });
  }, [onTranscribed]);

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const speakText = useCallback(async (text) => {
    if (!text?.trim()) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const groqKey = await getGroqKey();
    if (!groqKey) throw new Error("NO_GROQ_KEY");

    setIsPlayingTTS(true);

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-groq-key": groqKey,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      setIsPlayingTTS(false);
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "TTS failed");
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      audioRef.current = null;
      setIsPlayingTTS(false);
      onTTSEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      audioRef.current = null;
      setIsPlayingTTS(false);
      onTTSEnd?.();
    };

    await audio.play();
  }, [onTTSEnd]);

  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingTTS(false);
      onTTSEnd?.();
    }
  }, [onTTSEnd]);

  return {
    isRecording,
    isTranscribing,
    isPlayingTTS,
    startRecording,
    stopRecording,
    speakText,
    stopTTS,
    getGroqKey,
  };
};