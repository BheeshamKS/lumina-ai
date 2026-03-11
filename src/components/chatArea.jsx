import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  PenLine,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./codeBlock";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect, memo } from "react";
import { Logo } from "./logo";

export const ChatAreaBase = ({
  messages,
  isLoading,
  chatEndRef,
  darkMode,
  onCopy,
  copiedMessageId,
  onRetry,
  chatTitle = "Current Conversation",
  loadOlderMessages,
  hasMoreMessages,
  isLoadingOlder,
  onEdit,
}) => {
  const [feedbackState, setFeedbackState] = useState({});

  const [editingIdx, setEditingIdx] = useState(null);
  const [editInput, setEditInput] = useState("");

  const startEdit = (idx) => {
    setEditingIdx(idx);
  };

  // 🚨 THE PIXEL-PERFECT CLAUDE EDIT BOX (Now with Smart Save Button!)
  const EditMessageInput = ({ initialValue, onSave, onCancel }) => {
    const [text, setText] = useState(initialValue);
    const textAreaRef = useRef(null);

    // Auto-resize magic
    useEffect(() => {
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
        textAreaRef.current.style.height =
          textAreaRef.current.scrollHeight + "px";
      }
    }, [text]);

    // 🚨 SMART CHECK: Has the text meaningfully changed? Is it not empty?
    const isChanged =
      text.trim() !== initialValue.trim() && text.trim().length > 0;

    return (
      // 1. THE OUTER BLACK TRAY
      <div className="w-full bg-[#141413] border border-border-main rounded-[16px] p-2 flex flex-col animate-in fade-in duration-200 mt-2 shadow-sm">
        {/* 2. THE INNER TEXT BOX */}
        <div className="w-full bg-[#30302e] rounded-[12px] px-4 py-3 border border-transparent focus-within:border-border-hover transition-colors duration-200">
          <textarea
            ref={textAreaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-transparent resize-none outline-none text-[15px] md:text-[16px] font-sans leading-relaxed text-[#E6E4DD] placeholder-placeholder/50 overflow-hidden min-h-[44px]"
            autoFocus
          />
        </div>

        {/* 4. THE CLAUDE BUTTONS */}
        <div className="flex justify-end gap-2 pt-2 pr-1">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#E6E4DD] hover:bg-black border border-border-main hover:border-transparent transition-colors"
          >
            Cancel
          </button>

          {/* 🚨 THE SMART SAVE BUTTON */}
          <button
            onClick={() => isChanged && onSave(text)}
            disabled={!isChanged}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              isChanged
                ? "bg-[#E6E4DD] text-[#1a1a19] hover:opacity-90 cursor-pointer" // Active State
                : "bg-[#30302e] text-[#E6E4DD]/40 cursor-not-allowed" // Disabled Gray State
            }`}
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  if (messages.length === 0) return null;

  const handleFeedback = (idx, type) => {
    setFeedbackState((prev) => ({
      ...prev,
      [idx]: type, // 'up' or 'down'
    }));
    // In the future, you could send this feedback to your database here!
  };

  // Helper to separate the <think> tags from the actual response
  const parseThinking = (text) => {
    if (!text) return { thinkText: null, responseText: "" };

    const completeRegex = /<think>([\s\S]*?)<\/think>/gi;
    let thinkText = "";
    let match;

    while ((match = completeRegex.exec(text)) !== null) {
      thinkText += match[1].trim() + "\n\n";
    }

    if (thinkText) {
      return {
        thinkText: thinkText.trim(),
        responseText: text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
      };
    }

    const unclosedRegex = /<think>([\s\S]*)$/i;
    const unclosedMatch = text.match(unclosedRegex);

    if (unclosedMatch) {
      return {
        thinkText: unclosedMatch[1].trim() + " ... (Thinking was cut off)",
        responseText: text.replace(unclosedRegex, "").trim(),
      };
    }

    // 3. No thinking blocks found at all
    return { thinkText: null, responseText: text };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="w-full flex-1 overflow-y-auto pb-40 flex flex-col items-center relative"
      onScroll={(e) => {
        const { scrollTop } = e.currentTarget;
        if (scrollTop < 50 && hasMoreMessages) {
          loadOlderMessages();
        }
      }}
      style={{ overflowAnchor: "auto" }}
    >
      {/* THE NEW TOP GRADIENT HEADER - FULL WIDTH */}
      <div className="sticky top-0 z-30 w-full flex items-center justify-between bg-gradient-to-b from-app from-[60%] to-transparent pt-6 pb-10 px-6 md:px-8 pointer-events-none">
        {/* Clean, simple title logic: If there are messages but no title yet, just say 'Untitled' */}
        <h3 className="text-[14px] font-medium text-card-text truncate max-w-[60%] pointer-events-auto min-h-[20px]">
          {messages.length > 0 ? chatTitle || "Untitled" : ""}
        </h3>

        {/* Future Action Buttons Container - Left intentionally empty for now! */}
        <div className="flex items-center gap-2 shrink-0 pointer-events-auto"></div>
      </div>
      <div className="w-full max-w-3xl px-4 space-y-10">
        {isLoadingOlder && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-sidebar-ring"></div>
          </div>
        )}
        {(() => {
          const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");

          return messages.map((msg, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const isLastUserMessage = idx === lastUserIndex;
            const messageId = `msg-${idx}`;

            return (
              <div key={idx} className="flex flex-col w-full group/message">
                {msg.role === "user" ? (
                  // 🚨 DYNAMIC WIDTH: Max width normally, but expands to full-width (max-w-3xl) when editing!
                  <div
                    className={`w-full flex flex-col group/message transition-all duration-200 ${
                      editingIdx === idx
                        ? "max-w-180 self-center items-stretch" // <-- Right here!
                        : "max-w-[90%] md:max-w-[85%] self-center md:self-end items-end"
                    }`}
                  >
                    {editingIdx === idx ? (
                      // 🚨 USE THE NEW COMPONENT
                      <EditMessageInput
                        initialValue={msg.content}
                        onCancel={() => setEditingIdx(null)}
                        onSave={(newText) => {
                          onEdit(idx, newText);
                          setEditingIdx(null);
                        }}
                      />
                    ) : (
                      <>
                        <div className="bg-user-bubble text-user-bubble-text px-4 py-3 rounded-2xl text-[16px] leading-relaxed">
                          {msg.content}
                        </div>

                        {/* THE BOTTOM-RIGHT ACTION TOOLBAR */}
                        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200 px-1">
                          <span className="text-[11px] text-placeholder/70 mr-1.5 font-medium select-none">
                            {formatTime(msg.created_at)}
                          </span>

                          {isLastUserMessage && !isLoading && (
                            <button
                              onClick={onRetry}
                              title="Retry prompt"
                              className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}

                          {isLastUserMessage && (
                            <button
                              onClick={() => startEdit(idx)}
                              title="Edit message"
                              className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
                            >
                              <PenLine size={13} />
                            </button>
                          )}

                          <button
                            onClick={() =>
                              onCopy && onCopy(msg.content, messageId)
                            }
                            title="Copy message"
                            className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
                          >
                            {copiedMessageId === messageId ? (
                              <Check size={13} className="text-green-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-180 mx-auto text-outputmessage font-serif text-[16px] tracking-[0.01em] leading-[1.7] mt-2">
                    {(() => {
                      const { thinkText, responseText } = parseThinking(
                        msg.content,
                      );

                      return (
                        <>
                          {/* THE THINKING DROPDOWN */}
                          {thinkText && (
                            <details className="mb-6 group/think rounded-xl border border-border-main bg-card overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                              <summary className="cursor-pointer text-[12px] font-medium text-placeholder px-4 py-2.5 flex items-center gap-2 hover:bg-card-hover transition-colors select-none">
                                <span className="text-accent group-open/think:rotate-90 transition-transform duration-200">
                                  ▶
                                </span>
                                Thought Process
                              </summary>
                              <div className="px-5 py-4 text-[13.5px] font-sans text-placeholder/80 border-t border-border-main bg-[#0a0a0a] whitespace-pre-wrap leading-relaxed">
                                {thinkText}
                              </div>
                            </details>
                          )}

                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-6">
                                  <table
                                    className="w-full text-left border-collapse text-[14px] md:text-[15px]"
                                    {...props}
                                  />
                                </div>
                              ),
                              // 1. Made the bottom header line bright white (at 30% opacity so it's not overpowering)
                              thead: ({ node, ...props }) => (
                                <thead
                                  className="border-b border-outputmessage/30"
                                  {...props}
                                />
                              ),
                              // 2. Made the row lines bright white (at 15% opacity for a clean, subtle divider)
                              tr: ({ node, ...props }) => (
                                <tr
                                  className="border-b border-outputmessage/15"
                                  {...props}
                                />
                              ),
                              // 3. Changed text to match the default AI response text perfectly
                              th: ({ node, ...props }) => (
                                <th
                                  className="px-1 py-1 font-semibold text-outputmessage"
                                  {...props}
                                />
                              ),
                              // 4. Changed text to match the default AI response text perfectly
                              td: ({ node, ...props }) => (
                                <td
                                  className="px-1 py-1 text-outputmessage/90"
                                  {...props}
                                />
                              ),

                              p: ({ node, ...props }) => (
                                <p className="mb-3 last:mb-0" {...props} />
                              ),
                              h1: ({ node, ...props }) => (
                                <h1
                                  className="text-[22px] font-bold mb-3 mt-6 leading-snug font-serif"
                                  {...props}
                                />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2
                                  className="text-[18px] font-bold mb-3 mt-6 leading-snug font-serif"
                                  {...props}
                                />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3
                                  className="text-[15px] font-bold mb-2 mt-4 leading-snug font-serif"
                                  {...props}
                                />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul
                                  className="list-disc pl-5 mb-3 space-y-1 marker:text-outputmessage/40"
                                  {...props}
                                />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol
                                  className="list-decimal pl-5 mb-3 space-y-1 marker:text-outputmessage/40"
                                  {...props}
                                />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="pl-1" {...props} />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong className="font-semibold" {...props} />
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote
                                  className="border-l-[3px] border-blockquote-border pl-4 py-0.5 my-4 text-outputmessage/60 italic"
                                  {...props}
                                />
                              ),
                              hr: ({ node, ...props }) => (
                                <hr
                                  className="border-t border-border-main my-6"
                                  {...props}
                                />
                              ),
                              a: ({ node, ...props }) => (
                                <a
                                  className="text-accentmessage hover:underline underline-offset-2"
                                  {...props}
                                />
                              ),
                              code: ({
                                children,
                                className,
                                node,
                                ...rest
                              }) => (
                                <CodeBlock
                                  className={className}
                                  darkMode={darkMode}
                                >
                                  {children}
                                </CodeBlock>
                              ),
                              pre: ({ node, children, ...props }) => (
                                <>{children}</>
                              ),
                            }}
                          >
                            {responseText}
                          </ReactMarkdown>

                          {/* 3. NEW: INTERACTION TOOLBAR */}
                          {/* Only shows on hover or if it's the very last message in the chat */}
                          <div
                            className={`mt-4 flex items-center gap-2 transition-opacity duration-200 ${isLastMessage ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"}`}
                          >
                            {/* Copy Button */}
                            <button
                              onClick={() =>
                                onCopy && onCopy(msg.content, messageId)
                              }
                              title="Copy message"
                              className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
                            >
                              {copiedMessageId === messageId ? (
                                <Check size={15} className="text-green-500" />
                              ) : (
                                <Copy size={15} />
                              )}
                            </button>

                            {/* Thumbs Up */}
                            <button
                              onClick={() => handleFeedback(idx, "up")}
                              title="Good response"
                              className={`p-1.5 rounded-md transition-colors ${feedbackState[idx] === "up" ? "text-accent bg-accent/10" : "text-placeholder hover:text-card-text hover:bg-card-hover"}`}
                            >
                              <ThumbsUp
                                size={15}
                                className={
                                  feedbackState[idx] === "up"
                                    ? "fill-accent"
                                    : ""
                                }
                              />
                            </button>

                            {/* Thumbs Down */}
                            <button
                              onClick={() => handleFeedback(idx, "down")}
                              title="Bad response"
                              className={`p-1.5 rounded-md transition-colors ${feedbackState[idx] === "down" ? "text-red-500 bg-red-500/10" : "text-placeholder hover:text-card-text hover:bg-card-hover"}`}
                            >
                              <ThumbsDown
                                size={15}
                                className={
                                  feedbackState[idx] === "down"
                                    ? "fill-red-500"
                                    : ""
                                }
                              />
                            </button>

                            {/* Retry Button (Only show on the very last AI message) */}
                            {isLastMessage && !isLoading && (
                              <button
                                onClick={onRetry}
                                title="Regenerate response"
                                className="p-1.5 ml-1 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors flex items-center gap-1.5 text-[12px] font-medium font-sans"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                          {isLastMessage && (
                            <div>
                              <Logo className="w-8 h-8 mt-5 mb-10" />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          });
        })()}
        {/* Thinking Animation */}
        {isLoading && (
          <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="bg-card border border-border-main rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export const ChatArea = memo(ChatAreaBase, (prevProps, nextProps) => {
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isLoadingOlder === nextProps.isLoadingOlder &&
    prevProps.copiedMessageId === nextProps.copiedMessageId &&
    prevProps.darkMode === nextProps.darkMode
  );
});
