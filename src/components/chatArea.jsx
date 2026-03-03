import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./codeBlock";

export const ChatArea = ({ messages, isLoading, chatEndRef, darkMode }) => {
  if (messages.length === 0) return null;

  return (
    <div className="w-full flex-1 overflow-y-auto pt-24 pb-40 flex flex-col items-center">
      <div className="w-full max-w-3xl px-4 space-y-10">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col w-full">
            {msg.role === "user" ? (
              <div className="self-center md:self-end bg-user-bubble text-user-bubble-text px-4 py-3 rounded-2xl max-w-[90%] md:max-w-[85%] text-[15px] leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div className="self-center w-full max-w-175 text-outputmassage font-serif text-[16px] tracking-[0.01em] leading-[1.7] mt-2">
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
                      <CodeBlock className={className} darkMode={darkMode}>
                        {children}
                      </CodeBlock>
                    ),
                    pre: ({ node, children, ...props }) => <>{children}</>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1.5 mt-2 opacity-50">
            <span className="w-1.5 h-1.5 bg-outputmassage rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-outputmassage rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-outputmassage rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};
