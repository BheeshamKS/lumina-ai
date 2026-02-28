import { useState, useEffect, useRef } from "react";
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

  // THE REAL API CALL
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    // 1. Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsLoading(true);

    try {
      // 2. Select the model (Flash is the fastest for chat)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 3. Format previous messages so the AI remembers the conversation context
      const history = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      // 4. Start the chat session and send the new message
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userText);
      const responseText = result.response.text();

      // 5. Add AI response to UI
      setMessages((prev) => [...prev, { role: "ai", content: responseText }]);
    } catch (error) {
      console.error("Error communicating with Gemini:", error);
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

        {/* Chat Area (Only renders if messages exist) */}
        {messages.length > 0 && (
          <div className="w-full max-w-3xl flex-1 overflow-y-auto pt-24 pb-32 px-4 space-y-8 no-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex gap-4 text-primary w-full">
                <div className="shrink-0 mt-1">
                  {msg.role === "user" ? (
                    <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#e6e4dfa7] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[16px] font-semibold">
                      BK
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-transparent rounded-xl flex items-center justify-center">
                      <Zap size={22} className="text-accent fill-accent/20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 leading-relaxed text-[17px] mt-1.5 whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 text-primary w-full opacity-50">
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center animate-pulse">
                    <Zap size={22} className="text-accent fill-accent/20" />
                  </div>
                </div>
                <div className="flex-1 text-[17px] mt-1.5">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Input Wrapper (Dynamically switches from Center to Bottom) */}
        <div
          className={
            messages.length === 0
              ? "w-full max-w-176.75 flex-1 flex flex-col justify-center px-4"
              : "w-full max-w-197.5 absolute bottom-6 left-1/2 -translate-x-1/2 px-4"
          }
        >
          {/* Main Relative Container for the Home Screen Layout */}
          <div className="relative w-full">
            {/* Greeting - Absolutely positioned ABOVE the input box so it doesn't push it down */}
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

            {/* TRUE CENTERED INPUT BOX - The only element taking up structural space */}
            <div className="relative bg-inputcard rounded-[22px] px-3 py-2 border border-border-main hover:border-border-hover focus-within:border-border-hover focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.2)] transition-all duration-200 shadow-sm z-10">
              <textarea
                ref={textAreaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
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

                  {/* Submit button dynamically appears when you type */}
                  {input.trim() ? (
                    <button
                      onClick={handleSend}
                      className="p-1.5 bg-accent rounded-lg text-white hover:opacity-90 transition-opacity"
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

            {/* Chips - Absolutely positioned BELOW the input box */}
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

// Sub-components
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
