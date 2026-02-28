import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Plus,
  Search,
  LayoutGrid,
  Code2,
  PenLine,
  GraduationCap,
  Coffee,
  Zap,
  Moon,
  Sun,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const textAreaRef = useRef(null);
  const chatEndRef = useRef(null);

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
  else if (hour >= 0 && hour < 5) greeting = "Moonlit chat?";

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height =
        textAreaRef.current.scrollHeight + "px";
    }
  }, [input]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const history = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userText);
      const responseText = result.response.text();

      setMessages((prev) => [...prev, { role: "ai", content: responseText }]);
    } catch (error) {
      console.error("Error communicating with API:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Sorry, I encountered an error. Please check your API key and connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-app font-sans antialiased">
      {/* 1. SIDEBAR */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-12"} border-r border-border-main bg-card flex flex-col transition-all duration-300 shrink-0 overflow-hidden z-20`}
      >
        <div className="py-3 flex flex-col h-full">
          <div
            className={`flex items-center mb-6 ${sidebarOpen ? "justify-between px-4" : "justify-center"}`}
          >
            {sidebarOpen && (
              <span className="font-medium font-serif text-[22px] tracking-tight text-card-text-hover">
                Lumina
              </span>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-card-hover rounded-md transition-colors"
            >
              <LayoutGrid
                size={18}
                className="text-card-text hover:text-card-text-hover transition-colors"
              />
            </button>
          </div>

          <div className="space-y-1 px-1">
            <SidebarItem
              icon={<Plus size={20} />}
              label="New chat"
              isOpen={sidebarOpen}
            />
            <SidebarItem
              icon={<Search size={20} />}
              label="Search"
              isOpen={sidebarOpen}
            />
          </div>

          {sidebarOpen && (
            <div className="mt-8 flex-1 overflow-hidden px-1">
              <p className="text-[11px] font-extralight text-placeholder tracking-wider px-3 mb-2">
                Recents
              </p>
              <div className="space-y-1">
                <RecentItem title="Lumina UI Skeleton" />
                <RecentItem title="Cool Blue Theme Logic" />
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div
            className={`mt-auto pt-3 ${sidebarOpen ? "border-t border-border-main w-full" : "border-t border-transparent w-full"} `}
          >
            <div
              className={`flex ${sidebarOpen ? "px-3" : "px-1 justify-center"}`}
            >
              <div
                className={`flex items-center ${sidebarOpen ? "justify-start px-2 py w-full" : "justify-center px-1 py-0.5"} rounded-xl cursor-pointer transition-colors group`}
              >
                <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#e6e4dfa7] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[16px] font-semibold shrink-0">
                  BK
                </div>
                {sidebarOpen && (
                  <div className="flex flex-col ml-3 overflow-hidden">
                    <span className="text-sm font-semibold text-card-text truncate group-hover:text-card-text-hover transition-colors">
                      Bheesham Kumar
                    </span>
                    <span className="text-[10px] text-placeholder group-hover:text-card-text-hover transition-colors">
                      Free plan
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN AREA */}
      <main className="flex-1 flex flex-col items-center relative bg-app overflow-hidden">
        {/* Top Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
          <div className="px-3 py-1 bg-card border border-border-main rounded-full text-[12px] text-card-text flex gap-2 shadow-sm">
            <span>Free plan</span>
            <span className="opacity-30">|</span>
            <button className="hover:text-accent transition-colors">
              Upgrade
            </button>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-card-hover rounded-full transition-all text-card-text hover:text-card-text-hover"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Chat Area */}
        {messages.length > 0 && (
          <div className="w-full flex-1 overflow-y-auto pt-24 pb-40 flex flex-col items-center">
            {/* INNER CENTERED COLUMN */}
            <div className="w-full max-w-3xl px-4 space-y-10">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex flex-col w-full">
                  {msg.role === "user" ? (
                    // USER MESSAGE
                    <div className="self-center md:self-end bg-[#2d2b29] dark:bg-[#30302e] text-[#e6e4df] px-5 py-4 rounded-2xl max-w-[90%] md:max-w-[85%] text-[16px] leading-relaxed shadow-sm">
                      {msg.content}
                    </div>
                  ) : (
                    // AI MESSAGE: Rendered with React Markdown
                    <div className="self-center w-full max-w-[90%] md:max-w-175 text-outputmassage font-serif text-[16px] tracking-[-0.05em] leading-relaxed mt-2">
                      <ReactMarkdown
                        components={{
                          // Paragraphs
                          p: ({ node, ...props }) => (
                            <p className="mb-5 last:mb-0" {...props} />
                          ),

                          // Headings
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-[26px] font-bold mb-4 mt-8 leading-snug tracking-tight"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="text-[20px] font-bold mb-4 mt-8 leading-snug tracking-tight"
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className="text-[17px] font-bold mb-3 mt-6 leading-snug tracking-tight"
                              {...props}
                            />
                          ),

                          // Lists
                          ul: ({ node, ...props }) => (
                            <ul
                              className="list-disc pl-5 mb-5 space-y-2 marker:text-outputmassage/40"
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className="list-decimal pl-5 mb-5 space-y-2 marker:text-outputmassage/40"
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="pl-1.5" {...props} />
                          ),

                          // Bold text
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold" {...props} />
                          ),

                          // Blockquotes (The vertical line on the left)
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className="border-l-[4px] border-[#41413D] pl-4 py-0.5 my-6 text-outputmassage/70 italic"
                              {...props}
                            />
                          ),

                          // Horizontal Rules (---)
                          hr: ({ node, ...props }) => (
                            <hr
                              className="border-t border-border-main my-8"
                              {...props}
                            />
                          ),

                          // Links
                          a: ({ node, ...props }) => (
                            <a
                              className="text-accent hover:underline underline-offset-2"
                              {...props}
                            />
                          ),

                          // Code Blocks & Inline Code
                          code(props) {
                            const { children, className, node, ...rest } =
                              props;
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );

                            // 1. Multi-line Code Block
                            if (match || String(children).includes("\n")) {
                              const language = match ? match[1] : "";
                              return (
                                <div className="my-6 rounded-xl overflow-hidden bg-[#1f1e1d] border border-border-main font-sans shadow-sm group">
                                  {/* Header Row (Language & Copy Button) */}
                                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                    <span className="text-[13px] text-placeholder font-medium lowercase">
                                      {language}
                                    </span>

                                    {/* Simple Copy Icon (Fades in on hover just like Claude) */}
                                    <button className="text-placeholder hover:text-[#e6e4df] transition-colors opacity-0 group-hover:opacity-100">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <rect
                                          x="9"
                                          y="9"
                                          width="13"
                                          height="13"
                                          rx="2"
                                          ry="2"
                                        ></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                      </svg>
                                    </button>
                                  </div>
                                  {/* The Code Body */}
                                  <div className="px-4 pb-4 overflow-x-auto text-[14px] leading-relaxed text-[#e6e4df] font-mono">
                                    <code className={className} {...rest}>
                                      {children}
                                    </code>
                                  </div>
                                </div>
                              );
                            }

                            // 2. Inline Code (e.g. `const x = 1` inside a paragraph)
                            return (
                              <code
                                className="bg-[#e5e3de] dark:bg-[#32312f] text-[#c25c47] dark:text-[#f28b77] px-[5px] py-[2px] rounded-[6px] font-mono text-[13.5px] border border-transparent dark:border-[#41413D]/50"
                                {...rest}
                              >
                                {children}
                              </code>
                            );
                          },

                          // Strip out the default <pre> wrapper to prevent double-backgrounds
                          pre: ({ node, children, ...props }) => (
                            <>{children}</>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="self-start w-full text-outputmassage font-serif text-[16px] tracking-[-0.015em] opacity-50 mt-2">
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* Input Wrapper */}
        <div
          className={
            messages.length === 0
              ? "w-full max-w-176.75 flex-1 flex flex-col justify-center px-4"
              : "w-full max-w-197.5 absolute bottom-0 left-1/2 -translate-x-1/2 px-4 pb-6 pt-4 bg-gradient-to-t from-app via-app to-transparent"
          }
        >
          {/* Main Relative Container */}
          <div className="relative w-full">
            {/* Greeting */}
            {messages.length === 0 && (
              <div className="absolute bottom-full left-0 w-full mb-10 text-center">
                <Zap
                  size={42}
                  className="text-accent fill-accent/20 mx-auto mb-4"
                />
                <h1 className="text-4xl md:text-[40px] font-serif font-normal text-card-text tracking-tight">
                  {greeting}, Bheesham
                </h1>
              </div>
            )}

            {/* INPUT BOX */}
            <div className="relative bg-inputcard rounded-[22px] px-3 py-2 border border-border-main hover:border-border-hover focus-within:border-border-hover focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.2)] transition-all duration-200 shadow-sm z-10">
              <textarea
                ref={textAreaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  messages.length === 0
                    ? "How can I help you today?"
                    : "Reply..."
                }
                rows="1"
                className={`w-full bg-transparent resize-none outline-none px-2 pt-2 text-[16px] leading-relaxed text-primary placeholder-placeholder max-h-100 ${
                  messages.length === 0 ? "min-h-15" : "min-h-10"
                }`}
              />

              <div className="flex justify-between items-center mt-1 pt px-1">
                <button className="p-2 hover:bg-card-hover rounded-full text-card-text hover:text-card-text-hover transition-colors">
                  <Plus size={20} />
                </button>

                <div className="flex items-center gap-3 text-card-text text-xs font-medium">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-card-text-hover transition-colors">
                    <span>Lumina 1.0</span>
                    <ChevronDown size={14} />
                  </div>
                  <div className="w-px h-3 bg-border-main" />

                  {input.trim() ? (
                    <button
                      onClick={handleSend}
                      className="p-1.5 bg-accent rounded-lg text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button className="p-1.5 bg-app hover:bg-card-hover rounded-lg text-accent transition-colors">
                      <Zap size={16} className="fill-accent/10" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Disclaimer Text - Only shows when chatting */}
            {messages.length > 0 && (
              <div className="text-center mt-2 text-[11px] text-placeholder tracking-wide">
                Lumina is AI and can make mistakes. Please double-check
                responses.
              </div>
            )}

            {/* Chips - Only show on empty state */}
            {messages.length === 0 && input.trim() === "" && (
              <div className="absolute top-full left-0 w-full flex flex-wrap justify-center gap-2.5 pt-8 animate-in fade-in duration-300">
                <Chip icon={<PenLine size={16} />} label="Write" />
                <Chip icon={<GraduationCap size={16} />} label="Learn" />
                <Chip icon={<Code2 size={16} />} label="Code" />
                <Chip icon={<Coffee size={16} />} label="Life stuff" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Sub-components remain unchanged
const SidebarItem = ({ icon, label, isOpen }) => (
  <div
    className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-2.5 hover:bg-card-hover rounded-xl cursor-pointer text-card-text hover:text-card-text-hover transition-colors`}
  >
    <div className="shrink-0">{icon}</div>
    {isOpen && <span className="text-sm font-medium ml-3">{label}</span>}
  </div>
);

const RecentItem = ({ title }) => (
  <div className="px-3 py-2 text-sm text-card-text hover:bg-card-hover rounded-lg cursor-pointer truncate hover:text-card-text-hover transition-colors">
    {title}
  </div>
);

const Chip = ({ icon, label }) => (
  <button className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-card-hover border border-border-main hover:border-card-hover rounded-[10px] text-sm font-medium text-card-text hover:text-card-text-hover transition-all">
    <span className="shrink-0">{icon}</span>
    {label}
  </button>
);

export default App;
