import { useState, useEffect, useRef } from "react";

import ReactMarkdown from "react-markdown";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

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
import { darcula } from "react-syntax-highlighter/dist/esm/styles/hljs";

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

      const chat = model.startChat({
        history,
        systemInstruction: {
          parts: [
            {
              text: `You are Lumina, a smart and elegant AI assistant. You are helpful, direct, and thoughtful.
      
      PERSONALITY:
      - Warm but not sycophantic. Never start a response with "Great question!" or "Absolutely!"
      - Confident and clear. Get to the point without unnecessary filler.
      - Honest. If you don't know something, say so plainly.
      - Conversational when the user is casual. Structured when the user needs depth.
      
      FORMATTING:
      - Use markdown formatting always — it will be rendered properly.
      - For long answers, use ## headings to break sections.
      - Use bullet points only when listing genuinely list-like things. Never bullet point an explanation that flows better as prose.
      - Use bold for key terms or important phrases, not for decoration.
      - Use code blocks with the correct language tag for ALL code. Never write code inline in a sentence.
      - Keep paragraphs short — 2 to 4 lines max. White space is your friend.
      - Never write walls of text.
      
      TONE:
      - Match the user's energy. Casual question = casual answer. Technical question = precise answer.
      - Never be preachy or add unsolicited warnings.
      - Don't over-explain. Trust the user is smart.
      - End answers cleanly. No "I hope this helps!" or "Let me know if you need anything!"`,
            },
          ],
        },
      });
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
        className={`${sidebarOpen ? "w-72" : "w-12"} border-r border-sidebar-border bg-card flex flex-col transition-all duration-300 shrink-0 overflow-hidden z-20`}
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
            className={`mt-auto pt-3 ${sidebarOpen ? "border-t border-sidebar-border w-full" : "border-t border-transparent w-full"} `}
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
                    <div className="self-center md:self-end bg-user-bubble text-user-bubble-text px-4 py-3 rounded-2xl max-w-[90%] md:max-w-[85%] text-[15px] leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    // AI MESSAGE: Rendered with React Markdown
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
                <h1
                  className="text-4xl md:text-[40px] font-normal text-card-text tracking-tight"
                  style={{ fontFamily: "Copernicus, Georgia, serif" }}
                >
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
                className={`w-full bg-transparent resize-none outline-none px-2 pt-2 text-[16px] font-sans leading-normal text-outputmassage placeholder-placeholder max-h-100 ${
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

const getLuminaTheme = (isDark) => {
  //const dark = document.documentElement.classList.contains("dark");

  const c = isDark
    ? {
        base: "#9be963",
        tag: "#ec7882",
        string: "#9be963",
        keyword: "#cc7bf4",
        number: "#5de7e7",
        comment: "#6e6e68",
        function: "#7ec8e3",
        operator: "#e6e4df",
        punctuation: "#d3d7de",
        property: "#f47b85",
        constant: "#5de7e7",
        builtin: "#cc7bf4",
        attr: "#ec7882",
      }
    : {
        base: "#2d2b29",
        tag: "#c0404a",
        string: "#5a8a2e",
        keyword: "#8b4dbf",
        number: "#2a9d9d",
        comment: "#888880",
        function: "#2a7a9d",
        operator: "#2d2b29",
        punctuation: "#666660",
        property: "#bb1421",
        constant: "#2a9d9d",
        builtin: "#8b4dbf",
        attr: "#c0404a",
      };

  return {
    'code[class*="language-"]': { color: c.base, background: "transparent" },
    'pre[class*="language-"]': { color: c.base, background: "transparent" },
    comment: { color: c.comment, fontStyle: "italic" },
    prolog: { color: c.comment },
    doctype: { color: c.comment },
    cdata: { color: c.comment },
    punctuation: { color: c.punctuation },
    property: { color: c.property },
    tag: { color: c.tag },
    boolean: { color: c.number },
    number: { color: c.number },
    constant: { color: c.constant },
    symbol: { color: c.number },
    selector: { color: c.keyword },
    "attr-name": { color: c.attr },
    string: { color: c.string },
    char: { color: c.string },
    builtin: { color: c.builtin },
    operator: { color: c.operator },
    entity: { color: c.property },
    url: { color: c.string },
    keyword: { color: c.keyword },
    regex: { color: c.string },
    important: { color: c.keyword, fontWeight: "bold" },
    variable: { color: c.base },
    function: { color: c.function },
    "class-name": { color: c.function },
    "attr-value": { color: c.string },
    atrule: { color: c.keyword },
    inserted: { color: c.string },
    deleted: { color: c.tag },
  };
};

const CodeBlock = ({ children, className, darkMode }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (match || String(children).includes("\n")) {
    return (
      <div className="my-4 rounded-[8px] overflow-hidden bg-codeblock-bg border border-codeblockborder font-sans group">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[12px] text-placeholder font-medium lowercase">
            {match ? match[1] : "code"}
          </span>
          <button
            onClick={handleCopy}
            className="text-placeholder hover:text-[#e6e4df] transition-colors opacity-0 group-hover:opacity-100 text-[12px]"
          >
            {copied ? "copied!" : "copy"}
          </button>
        </div>
        <div className="px-4 pb-4 overflow-x-auto font-mono">
          <SyntaxHighlighter
            style={getLuminaTheme(darkMode)}
            language={match ? match[1] : "text"}
            PreTag="div"
            customStyle={{
              background: "transparent",
              padding: 0,
              margin: 0,
              fontSize: "14px",
              lineHeight: "1.6",
              fontFamily: "'Roboto Mono', ui-monospace, monospace",
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  return (
    <code
      className="bg-inlinebg text-inlinetext px-[5px] py-[2px] rounded-[6px] text-[13px] border border-inlineborder"
      style={{ fontFamily: "'Roboto Mono', ui-monospace, monospace" }}
    >
      {children}
    </code>
  );
};

export default App;
