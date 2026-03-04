import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatArea } from "../components/chatArea";
import { InputArea } from "../components/inputArea";
import { AuthModal } from "../components/authModal";
import { OnboardingModal } from "../components/onboardingModal";

// 1. master fallback key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const ChatPage = ({ darkMode, session }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [guestPromptCount, setGuestPromptCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const textAreaRef = useRef(null);
  const chatEndRef = useRef(null);

  const [activeModel, setActiveModel] = useState({
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
  });

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
  else if (hour >= 0 && hour < 5) greeting = "Moonlit chat?";

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

    if (!session && guestPromptCount >= 3) {
      setShowAuthModal(true);
      return;
    }

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsLoading(true);

    try {
      if (!session) {
        setGuestPromptCount((prev) => prev + 1);
      }

      const model = genAI.getGenerativeModel({ model: activeModel.id });

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
    <>
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
        activeModel={activeModel}
        setActiveModel={setActiveModel}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <OnboardingModal
        isOpen={session && needsOnboarding && !hasCompletedOnboarding}
        onClose={() => setHasCompletedOnboarding(true)}
        onSaveKey={(key) => {
          console.log("Key to save later:", key);
          setHasCompletedOnboarding(true);
        }}
      />
    </>
  );
};
