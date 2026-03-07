import { Copy, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUserConfiguredProviders } from "../utils/apiKeys";
import { MODEL_REGISTRY, getEnabledModels } from "../utils/models";
import { sendMessageToLLM } from "../utils/llmRouter";

import { ChatArea } from "../components/chatArea";
import { InputArea } from "../components/inputArea";
import { AuthModal } from "../components/authModal";
import { OnboardingModal } from "../components/onboardingModal";
import {
  createConversation,
  saveMessage,
  updateConversationTitle,
  getChatMessages,
  getConversationTitle, // <--- ADDED!
} from "../utils/chatHistory";

export const ChatPage = ({ darkMode, session }) => {
  const [availableModels, setAvailableModels] = useState([]);
  const [activeModel, setActiveModel] = useState(null);
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  const navigate = useNavigate();
  const { chatId } = useParams();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState(""); // <--- ADDED!
  const [isLoading, setIsLoading] = useState(false);

  const [guestPromptCount, setGuestPromptCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const textAreaRef = useRef(null);
  const chatEndRef = useRef(null);
  const isCreatingChat = useRef(false); // <--- ADDED (Fixes the screen wipe bug!)

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
  else if (hour >= 0 && hour < 5) greeting = "Moonlit chat?";

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const loadEnabledModels = async () => {
      setIsModelsLoading(true);
      try {
        const enabledIds = await getEnabledModels();
        const filtered = MODEL_REGISTRY.filter((m) =>
          enabledIds.includes(m.id),
        );
        setAvailableModels(filtered);

        if (filtered.length > 0 && !activeModel) {
          setActiveModel(filtered[0]);
        }
      } catch (error) {
        console.error("Error loading models:", error);
      } finally {
        setIsModelsLoading(false);
      }
    };
    loadEnabledModels();
  }, [session]);

  useEffect(() => {
    const checkKeys = async () => {
      if (session) {
        const providers = await getUserConfiguredProviders();
        setNeedsOnboarding(providers.length === 0);
      } else {
        setNeedsOnboarding(false);
      }
      setIsCheckingKeys(false);
    };
    checkKeys();
  }, [session, chatId]);

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

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setChatTitle("");
      setInput("");
    }
  }, [chatId]);

  useEffect(() => {
    const loadChat = async () => {
      if (chatId) {
        // Prevent screen wipe when we just hit send!
        if (isCreatingChat.current) {
          isCreatingChat.current = false;
          return;
        }

        setIsLoading(true);
        const history = await getChatMessages(chatId);
        const fetchedTitle = await getConversationTitle(chatId); // <--- ADDED!
        setMessages(history);
        setChatTitle(fetchedTitle);
        setIsLoading(false);
      }
    };
    loadChat();
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!session && guestPromptCount >= 2) {
      setShowAuthModal(true);
      return;
    }

    const userText = input.trim();
    setInput("");

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let currentChatId = chatId;
      const isFirstMessage = messages.length === 0 && !chatId;

      if (isFirstMessage) {
        isCreatingChat.current = true; // Flag that we are creating a chat!
        currentChatId = Math.random().toString(36).substring(2, 11);
        if (session) await createConversation(currentChatId);
        navigate(`/chat/${currentChatId}`, { replace: true });
      }

      if (session && currentChatId) {
        saveMessage(currentChatId, "user", userText);
      }

      const messagesForRouter = newMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));

      const responseText = await sendMessageToLLM(
        messagesForRouter,
        activeModel.id,
      );
      setMessages((prev) => [...prev, { role: "ai", content: responseText }]);

      if (session && currentChatId) {
        saveMessage(currentChatId, "ai", responseText);

        if (isFirstMessage) {
          // Trigger the new OpenRouter free title generator!
          generateBackgroundTitle(currentChatId, userText);
        }
      }

      if (!session) {
        setGuestPromptCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error.message || "";
      const isQuotaExceeded =
        errorMessage.includes("429") || errorMessage.includes("quota");

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: isQuotaExceeded
            ? `⚠️ **Quota Exceeded:** You've hit the limit for your ${activeModel.provider} API key. Please switch to a different key or model in Settings.`
            : `⚠️ **Error:** ${errorMessage || "I encountered an error. Please check your connection or API key."}`,
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

  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const handleCopy = (text, messageId) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleRetry = async () => {
    if (isLoading || messages.length === 0) return;
    const lastUserMsgIndex = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserMsgIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const lastUserMessage = messages[actualIndex].content;
    const previousMessages = messages.slice(0, actualIndex);

    setMessages([
      ...previousMessages,
      { role: "user", content: lastUserMessage },
    ]);
    setIsLoading(true);

    try {
      const messagesForRouter = previousMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));
      messagesForRouter.push({ role: "user", content: lastUserMessage });

      const responseText = await sendMessageToLLM(
        messagesForRouter,
        activeModel.id,
      );
      setMessages((prev) => [...prev, { role: "ai", content: responseText }]);

      if (session && chatId) {
        saveMessage(chatId, "ai", responseText);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ **Retry Failed:** ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ChatArea
        messages={messages}
        isLoading={isLoading}
        chatEndRef={chatEndRef}
        darkMode={darkMode}
        onCopy={handleCopy}
        copiedMessageId={copiedMessageId}
        onRetry={handleRetry}
        chatTitle={chatTitle}
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
        availableModels={availableModels}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      <OnboardingModal
        isOpen={
          !!session &&
          !isCheckingKeys &&
          needsOnboarding &&
          !hasCompletedOnboarding
        }
        onClose={() => setHasCompletedOnboarding(true)}
        onSaveKey={(key) => setHasCompletedOnboarding(true)}
      />
    </>
  );
};

// --- NEW 100% FREE OPENROUTER TITLE GENERATOR ---
const generateBackgroundTitle = async (chatId, firstMessage) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const guestKey = import.meta.env.VITE_GUEST_API_KEY;
    if (!guestKey) return; // Silent fail if no key is in .env

    const prompt = `Based on this user message: "${firstMessage}", create a descriptive title.
                    REQUIREMENTS: 
                    - Length: 6 to 8 words.
                    - Tone: Professional and clear.
                    - Format: Plain text only, no quotes.
                    Example: Comprehensive guide to building React components with Tailwind`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${guestKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct:free",
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );

    const data = await response.json();
    let newTitle = data.choices[0].message.content.trim().replace(/[*"']/g, "");

    await updateConversationTitle(chatId, newTitle);
  } catch (err) {
    console.error("Title generation failed:", err);
  }
};
