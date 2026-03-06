import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./codeBlock";
import { useState } from "react";
import { Logo } from "./logo";

export const ChatArea = ({
  messages,
  isLoading,
  chatEndRef,
  darkMode,
  onCopy,
  copiedMessageId,
  onRetry,
}) => {
  const [feedbackState, setFeedbackState] = useState({});

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

    // 1. Look for complete <think>...</think> blocks (case-insensitive, handles multiple)
    const completeRegex = /<think>([\s\S]*?)<\/think>/gi;
    let thinkText = "";
    let match;

    // Extract all completed thought blocks
    while ((match = completeRegex.exec(text)) !== null) {
      thinkText += match[1].trim() + "\n\n";
    }

    if (thinkText) {
      return {
        thinkText: thinkText.trim(),
        // Strip all complete think blocks from the main response
        responseText: text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
      };
    }

    // 2. FALLBACK: Look for an unclosed <think> tag (happens if the AI hits a token limit)
    const unclosedRegex = /<think>([\s\S]*)$/i;
    const unclosedMatch = text.match(unclosedRegex);

    if (unclosedMatch) {
      return {
        thinkText: unclosedMatch[1].trim() + " ... (Thinking was cut off)",
        // Strip everything from <think> to the end of the text
        responseText: text.replace(unclosedRegex, "").trim(),
      };
    }

    // 3. No thinking blocks found at all
    return { thinkText: null, responseText: text };
  };

  return (
    <div className="w-full flex-1 overflow-y-auto pt-24 pb-40 flex flex-col items-center">
      <div className="w-full max-w-3xl px-4 space-y-10">
        {messages.map((msg, idx) => {
          // --- ADD THESE TWO LINES ---
          const isLastMessage = idx === messages.length - 1;
          const messageId = `msg-${idx}`;

          return (
            <div key={idx} className="flex flex-col w-full group/message">
              {msg.role === "user" ? (
                <div className="self-center md:self-end bg-user-bubble text-user-bubble-text px-4 py-3 rounded-2xl max-w-[90%] md:max-w-[85%] text-[15px] leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="self-center w-full max-w-175 text-outputmassage font-serif text-[16px] tracking-[0.01em] leading-[1.7] mt-2">
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
                          components={{
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
                                className="list-disc pl-5 mb-3 space-y-1 marker:text-outputmassage/40"
                                {...props}
                              />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol
                                className="list-decimal pl-5 mb-3 space-y-1 marker:text-outputmassage/40"
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
                                className="border-l-[3px] border-blockquote-border pl-4 py-0.5 my-4 text-outputmassage/60 italic"
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
                                className="text-accentmassage hover:underline underline-offset-2"
                                {...props}
                              />
                            ),
                            code: ({ children, className, node, ...rest }) => (
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
                                feedbackState[idx] === "up" ? "fill-accent" : ""
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
        })}
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
