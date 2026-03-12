import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  PenLine,
  Menu,
  SquarePen,
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
  onOpenSidebar,
  onNewChat,
}) => {
  const [feedbackState, setFeedbackState] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);

  const startEdit = (idx) => {
    setEditingIdx(idx);
  };

  const EditMessageInput = ({ initialValue, onSave, onCancel }) => {
    const [text, setText] = useState(initialValue);
    const textAreaRef = useRef(null);

    useEffect(() => {
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
        textAreaRef.current.style.height =
          textAreaRef.current.scrollHeight + "px";
      }
    }, [text]);

    const isChanged =
      text.trim() !== initialValue.trim() && text.trim().length > 0;

    return (
      <div className="w-full bg-[#141413] border border-border-main rounded-[16px] p-2 flex flex-col animate-in fade-in duration-200 mt-2 shadow-sm">
        <div className="w-full bg-[#30302e] rounded-[12px] px-4 py-3 border border-transparent focus-within:border-border-hover transition-colors duration-200">
          <textarea
            ref={textAreaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-transparent resize-none outline-none text-[15px] md:text-[16px] font-sans leading-relaxed text-[#E6E4DD] placeholder-placeholder/50 overflow-hidden min-h-[44px]"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 pr-1">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#E6E4DD] hover:bg-black border border-border-main hover:border-transparent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => isChanged && onSave(text)}
            disabled={!isChanged}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              isChanged
                ? "bg-[#E6E4DD] text-[#1a1a19] hover:opacity-90 cursor-pointer"
                : "bg-[#30302e] text-[#E6E4DD]/40 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  const handleFeedback = (idx, type) => {
    setFeedbackState((prev) => ({
      ...prev,
      [idx]: type,
    }));
  };

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
      className={`w-full flex flex-col items-center relative ${
        messages.length > 0 ? "flex-1 overflow-y-auto pb-40" : "shrink-0 z-30"
      }`}
      onScroll={(e) => {
        const { scrollTop } = e.currentTarget;
        if (scrollTop < 50 && hasMoreMessages) {
          loadOlderMessages();
        }
      }}
      style={{ overflowAnchor: "auto" }}
    >
      {/* HEADER - ALWAYS RENDERED */}
      <div className="sticky top-0 z-30 w-full flex items-center justify-between bg-gradient-to-b from-app from-[60%] to-transparent pt-4 pb-8 px-5 md:pt-6 md:pb-10 md:px-8 pointer-events-none">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onOpenSidebar}
            className="md:hidden text-placeholder hover:text-card-text transition-colors"
          >
            <Menu size={24} />
          </button>

          {/* Chat Title is hidden on mobile */}
          <h3 className="hidden md:block text-[14px] font-medium text-card-text truncate max-w-[60%] min-h-[20px]">
            {messages.length > 0 ? chatTitle || "Untitled" : ""}
          </h3>
        </div>

        {/* RIGHT SIDE (Mobile only New Chat Button - Only show if in a chat) */}
        {messages.length > 0 && (
          <div className="pointer-events-auto md:hidden">
            <button
              onClick={onNewChat}
              className="text-placeholder hover:text-card-text transition-colors flex items-center"
            >
              <SquarePen size={24} />
            </button>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="w-full max-w-[750px] px-4 space-y-10">
          {isLoadingOlder && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-sidebar-ring"></div>
            </div>
          )}
          {(() => {
            const lastUserIndex = messages
              .map((m) => m.role)
              .lastIndexOf("user");

            return messages.map((msg, idx) => {
              const isLastMessage = idx === messages.length - 1;
              const isLastUserMessage = idx === lastUserIndex;
              const messageId = `msg-${idx}`;

              return (
                <div key={idx} className="flex flex-col w-full group/message">
                  {msg.role === "user" ? (
                    <div
                      className={`w-full flex flex-col group/message transition-all duration-200 ${
                        editingIdx === idx
                          ? "max-w-full md:max-w-3xl self-center items-stretch"
                          : "max-w-[90%] md:max-w-[85%] self-center md:self-end items-end"
                      }`}
                    >
                      {editingIdx === idx ? (
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
                    <div className="w-full max-w-full md:max-w-3xl mx-auto text-outputmessage font-serif text-[16px] tracking-[0.01em] leading-[1.7] mt-2">
                      {(() => {
                        const { thinkText, responseText } = parseThinking(
                          msg.content,
                        );

                        return (
                          <>
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
                                thead: ({ node, ...props }) => (
                                  <thead
                                    className="border-b border-outputmessage/30"
                                    {...props}
                                  />
                                ),
                                tr: ({ node, ...props }) => (
                                  <tr
                                    className="border-b border-outputmessage/15"
                                    {...props}
                                  />
                                ),
                                th: ({ node, ...props }) => (
                                  <th
                                    className="px-1 py-1 font-semibold text-outputmessage"
                                    {...props}
                                  />
                                ),
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
                                  <strong
                                    className="font-semibold"
                                    {...props}
                                  />
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

                            <div
                              className={`mt-4 flex items-center gap-2 transition-opacity duration-200 ${isLastMessage ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"}`}
                            >
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
      )}
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
