import {
  Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, PenLine,
  Menu, SquarePen, Volume2, VolumeX, Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./codeBlock";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect, memo } from "react";
import { Logo } from "./logo";
import type { Message } from "../types";

interface ChatAreaBaseProps {
  messages: Message[];
  isLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  darkMode: boolean;
  onCopy?: (text: string, id: string) => void;
  copiedMessageId: string | null;
  onRetry: () => void;
  chatTitle?: string;
  loadOlderMessages: () => void;
  hasMoreMessages: boolean;
  isLoadingOlder: boolean;
  onEdit: (idx: number, text: string) => void;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  onSpeak?: ((text: string, id: string) => void) | null;
  speakingMessageId: string | null;
  isSpeakingLoading: string | null;
}

interface EditMessageInputProps {
  initialValue: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

type FeedbackMap = Record<number, 'up' | 'down'>;

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
  onSpeak,
  speakingMessageId,
  isSpeakingLoading,
}: ChatAreaBaseProps) => {
  const [feedbackState, setFeedbackState] = useState<FeedbackMap>({});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const startEdit = (idx: number) => setEditingIdx(idx);

  const EditMessageInput = ({ initialValue, onSave, onCancel }: EditMessageInputProps) => {
    const [text, setText] = useState(initialValue);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
        textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px";
      }
    }, [text]);

    const isChanged = text.trim() !== initialValue.trim() && text.trim().length > 0;

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

  const handleFeedback = (idx: number, type: 'up' | 'down') => {
    setFeedbackState((prev) => ({ ...prev, [idx]: type }));
  };

  const parseThinking = (text: string): { thinkText: string | null; responseText: string } => {
    if (!text) return { thinkText: null, responseText: "" };

    const completeRegex = /<think>([\s\S]*?)<\/think>/gi;
    let thinkText = "";
    let match;

    while ((match = completeRegex.exec(text)) !== null) {
      thinkText += match[1].trim() + "\n\n";
    }

    if (thinkText) {
      return { thinkText: thinkText.trim(), responseText: text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() };
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

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return "Just now";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const stripMarkdown = (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/`[^`]+`/g, "")
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  return (
    <div
      className={`w-full flex flex-col items-center relative ${
        messages.length > 0 ? "flex-1 overflow-y-auto pb-40" : "shrink-0 z-30"
      }`}
      onScroll={(e) => {
        const { scrollTop } = e.currentTarget;
        if (scrollTop < 50 && hasMoreMessages) loadOlderMessages();
      }}
      style={{ overflowAnchor: "auto" }}
    >
      <div className="sticky top-0 z-30 w-full flex items-center justify-between bg-gradient-to-b from-app from-[60%] to-transparent pt-4 pb-8 px-5 md:pt-6 md:pb-10 md:px-8 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button onClick={onOpenSidebar} className="md:hidden text-placeholder hover:text-card-text p-2 -ml-2 transition-colors">
            <Menu size={24} />
          </button>
          <h3 className="hidden md:block text-[14px] font-medium text-card-text min-h-[20px]">
            {messages.length > 0 ? chatTitle || "Untitled" : ""}
          </h3>
        </div>

        {messages.length > 0 && (
          <div className="pointer-events-auto md:hidden">
            <button onClick={onNewChat} className="text-placeholder hover:text-card-text p-2 -ml-2 transition-colors flex items-center">
              <SquarePen size={24} />
            </button>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="w-full max-w-[750px] px-4 space-y-2 md:space-y-10">
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
              const isSpeaking = speakingMessageId === messageId;
              const isSpeakLoading = isSpeakingLoading === messageId;

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
                          onSave={(newText) => { onEdit(idx, newText); setEditingIdx(null); }}
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
                              <button onClick={onRetry} title="Retry prompt" className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors">
                                <RotateCcw size={13} />
                              </button>
                            )}
                            {isLastUserMessage && (
                              <button onClick={() => startEdit(idx)} title="Edit message" className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors">
                                <PenLine size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => onCopy && onCopy(msg.content, messageId)}
                              title="Copy message"
                              className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
                            >
                              {copiedMessageId === messageId ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-full md:max-w-3xl mx-auto text-outputmessage font-serif text-[16px] tracking-[0.01em] leading-[1.7] mt-2">
                      {(() => {
                        const { thinkText, responseText } = parseThinking(msg.content);

                        return (
                          <>
                            {thinkText && (
                              <details className="mb-6 group/think rounded-xl border border-border-main bg-card overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                <summary className="cursor-pointer text-[12px] font-medium text-placeholder px-4 py-2.5 flex items-center gap-2 hover:bg-card-hover transition-colors select-none">
                                  <span className="text-accent group-open/think:rotate-90 transition-transform duration-200">▶</span>
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
                                table: ({ node: _node, ...props }) => (
                                  <div className="overflow-x-auto my-6">
                                    <table className="w-full text-left border-collapse text-[14px] md:text-[15px]" {...props as React.TableHTMLAttributes<HTMLTableElement>} />
                                  </div>
                                ),
                                thead: ({ node: _node, ...props }) => <thead className="border-b border-outputmessage/30" {...props as React.HTMLAttributes<HTMLTableSectionElement>} />,
                                tr: ({ node: _node, ...props }) => <tr className="border-b border-outputmessage/15" {...props as React.HTMLAttributes<HTMLTableRowElement>} />,
                                th: ({ node: _node, ...props }) => <th className="px-1 py-1 font-semibold text-outputmessage" {...props as React.ThHTMLAttributes<HTMLTableHeaderCellElement>} />,
                                td: ({ node: _node, ...props }) => <td className="px-1 py-1 text-outputmessage/90" {...props as React.TdHTMLAttributes<HTMLTableDataCellElement>} />,
                                p: ({ node: _node, ...props }) => <p className="mb-3 last:mb-0" {...props as React.HTMLAttributes<HTMLParagraphElement>} />,
                                h1: ({ node: _node, ...props }) => <h1 className="text-[22px] font-bold mb-3 mt-6 leading-snug font-serif" {...props as React.HTMLAttributes<HTMLHeadingElement>} />,
                                h2: ({ node: _node, ...props }) => <h2 className="text-[18px] font-bold mb-3 mt-6 leading-snug font-serif" {...props as React.HTMLAttributes<HTMLHeadingElement>} />,
                                h3: ({ node: _node, ...props }) => <h3 className="text-[15px] font-bold mb-2 mt-4 leading-snug font-serif" {...props as React.HTMLAttributes<HTMLHeadingElement>} />,
                                ul: ({ node: _node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1 marker:text-outputmessage/40" {...props as React.HTMLAttributes<HTMLUListElement>} />,
                                ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1 marker:text-outputmessage/40" {...props as React.HTMLAttributes<HTMLOListElement>} />,
                                li: ({ node: _node, ...props }) => <li className="pl-1" {...props as React.LiHTMLAttributes<HTMLLIElement>} />,
                                strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props as React.HTMLAttributes<HTMLElement>} />,
                                blockquote: ({ node: _node, ...props }) => <blockquote className="border-l-[3px] border-blockquote-border pl-4 py-0.5 my-4 text-outputmessage/60 italic" {...props as React.BlockquoteHTMLAttributes<HTMLQuoteElement>} />,
                                hr: ({ node: _node, ...props }) => <hr className="border-t border-border-main my-6" {...props as React.HTMLAttributes<HTMLHRElement>} />,
                                a: ({ node: _node, ...props }) => <a className="text-accentmessage hover:underline underline-offset-2" {...props as React.AnchorHTMLAttributes<HTMLAnchorElement>} />,
                                code: ({ node: _node, children, className: cls }) => (
                                  <CodeBlock className={cls} darkMode={darkMode}>
                                    {children}
                                  </CodeBlock>
                                ),
                                pre: ({ node: _node, children }) => <>{children}</>,
                              } as React.ComponentProps<typeof ReactMarkdown>['components']}
                            >
                              {responseText}
                            </ReactMarkdown>

                            <div
                              className={`mt-4 flex items-center gap-2 transition-opacity duration-200 ${
                                isLastMessage ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"
                              }`}
                            >
                              <button
                                onClick={() => onCopy && onCopy(msg.content, messageId)}
                                title="Copy message"
                                className="p-1.5 rounded-md text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
                              >
                                {copiedMessageId === messageId ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                              </button>

                              <button
                                onClick={() => handleFeedback(idx, "up")}
                                title="Good response"
                                className={`p-1.5 rounded-md transition-colors ${feedbackState[idx] === "up" ? "text-accent bg-accent/10" : "text-placeholder hover:text-card-text hover:bg-card-hover"}`}
                              >
                                <ThumbsUp size={15} className={feedbackState[idx] === "up" ? "fill-accent" : ""} />
                              </button>

                              <button
                                onClick={() => handleFeedback(idx, "down")}
                                title="Bad response"
                                className={`p-1.5 rounded-md transition-colors ${feedbackState[idx] === "down" ? "text-red-500 bg-red-500/10" : "text-placeholder hover:text-card-text hover:bg-card-hover"}`}
                              >
                                <ThumbsDown size={15} className={feedbackState[idx] === "down" ? "fill-red-500" : ""} />
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

                              {onSpeak && (
                                <button
                                  onClick={() => onSpeak(stripMarkdown(responseText), messageId)}
                                  title={isSpeaking ? "Stop speaking" : "Read aloud"}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    isSpeaking ? "text-accent bg-accent/10" : isSpeakLoading ? "text-placeholder" : "text-placeholder hover:text-card-text hover:bg-card-hover"
                                  }`}
                                >
                                  {isSpeakLoading ? <Loader2 size={15} className="animate-spin" /> : isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
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
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.speakingMessageId === nextProps.speakingMessageId &&
    prevProps.isSpeakingLoading === nextProps.isSpeakingLoading
  );
});
