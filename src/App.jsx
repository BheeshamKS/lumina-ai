import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Moon, Sun } from "lucide-react";

// Components
import { Sidebar } from "./components/sidebar";
import { ChatArea } from "./components/chatArea";
import { InputArea } from "./components/inputArea";

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
              text: `You are Lumina, a smart and elegant AI assistant. You are helpful, direct, and thoughtful...`,
            },
          ], // Truncated for brevity, keep your full prompt here!
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
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

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

        <ChatArea
          messages={messages}
          isLoading={isLoading}
          chatEndRef={chatEndRef}
          darkMode={darkMode}
        />

        <InputArea
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleKeyDown={handleKeyDown}
          textAreaRef={textAreaRef}
          messagesLength={messages.length}
          greeting={greeting}
        />
      </main>
    </div>
  );
}

export default App;
