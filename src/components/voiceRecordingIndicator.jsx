import { useEffect, useState } from "react";
import { Square } from "lucide-react";

export const VoiceRecordingIndicator = ({
  isRecording,
  isTranscribing,
  onStop,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isRecording && !isTranscribing) return null;

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-end justify-center pb-32 md:pb-28">
      <div
        className="pointer-events-auto flex items-center gap-3 bg-inputcard border border-border-main rounded-2xl px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        style={{
          boxShadow:
            "0 0 0 1px var(--color-border-main), 0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {isTranscribing ? (
          <>
            {/* Transcribing state */}
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-[13px] font-medium text-card-text">
              Transcribing…
            </span>
          </>
        ) : (
          <>
            {/* Recording state */}
            <div className="relative flex items-center justify-center w-5 h-5">
              {/* Pulse rings */}
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-20 animate-ping" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-accent" />
            </div>

            {/* Waveform bars */}
            <div className="flex items-center gap-[3px] h-5">
              {[3, 6, 9, 6, 11, 8, 4, 10, 7, 5].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-accent"
                  style={{
                    height: `${h}px`,
                    animation: `voiceBar 0.8s ease-in-out ${i * 0.08}s infinite alternate`,
                  }}
                />
              ))}
            </div>

            <span className="text-[13px] font-mono text-card-text tabular-nums">
              {minutes}:{seconds}
            </span>

            <div className="w-px h-4 bg-border-main mx-1" />

            <button
              onClick={onStop}
              className="flex items-center gap-1.5 text-[12px] font-medium text-card-text hover:text-card-text-hover transition-colors group"
            >
              <div className="w-6 h-6 rounded-lg bg-card-hover group-hover:bg-[#FE8181]/20 flex items-center justify-center transition-colors">
                <Square
                  size={10}
                  className="fill-current text-placeholder group-hover:text-[#FE8181] transition-colors"
                />
              </div>
              Stop
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};
