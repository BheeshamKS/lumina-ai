import { Copy, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useNavigate, useParams } from "react-router-dom";
import { getUserConfiguredProviders, getActiveApiKey } from "../utils/apiKeys";
import { MODEL_REGISTRY, getEnabledModels } from "../utils/models";
import { LUMINA_SYSTEM_PROMPT } from "../utils/prompts";
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
} from "../utils/chatHistory";

// 1. master fallback key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const ChatPage = ({ darkMode, session }) => {
  const [availableModels, setAvailableModels] = useState([]); // Dynamic list
  const [activeModel, setActiveModel] = useState(null); // The currently selected model
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  useEffect(() => {
    const loadEnabledModels = async () => {
      setIsModelsLoading(true);
      try {
        // Fetch the IDs from Supabase
        const enabledIds = await getEnabledModels();

        // Filter the master registry
        const filtered = MODEL_REGISTRY.filter((m) =>
          enabledIds.includes(m.id),
        );

        setAvailableModels(filtered);

        // Default to the first one if nothing is active yet
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
  }, [session]); // Re-run if user logs in/out

  const navigate = useNavigate();
  const { chatId } = useParams(); // Gets the ID from the URL if it exists

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [guestPromptCount, setGuestPromptCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const textAreaRef = useRef(null);
  const chatEndRef = useRef(null);

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
  else if (hour >= 0 && hour < 5) greeting = "Moonlit chat?";

  // REAL BYOK LOGIC
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Check the database for keys when the page loads or user logs in
  useEffect(() => {
    const checkKeys = async () => {
      if (session) {
        const providers = await getUserConfiguredProviders();
        // If they have 0 providers configured, they need onboarding
        setNeedsOnboarding(providers.length === 0);
      } else {
        setNeedsOnboarding(false); // Guests don't get the BYOK modal
      }
      setIsCheckingKeys(false);
    };
    checkKeys();
  }, [session, chatId]); // Re-run if they change chats

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
      setMessages([]); // Wipe the messages
      setInput(""); // Clear the input box
    }
  }, [chatId]);

  useEffect(() => {
    const loadChat = async () => {
      if (chatId) {
        setIsLoading(true);
        const history = await getChatMessages(chatId);
        setMessages(history);
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

    // 1. Immediately update UI
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let currentChatId = chatId;
      const isFirstMessage = messages.length === 0 && !chatId;

      // 2. Create ID and Navigate if it's the first message
      if (isFirstMessage) {
        currentChatId = Math.random().toString(36).substring(2, 11);
        if (session) await createConversation(currentChatId);
        navigate(`/chat/${currentChatId}`, { replace: true });
      }

      // 3. Save user message to DB
      if (session && currentChatId) {
        saveMessage(currentChatId, "user", userText);
      }

      // 4. Format history for the Universal Router
      // The router expects standard roles: 'user' and 'assistant'
      const messagesForRouter = newMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));

      // 5. THE MAGIC ROUTER CALL!
      // (No more checking providers, just pass the array and the model ID)
      const responseText = await sendMessageToLLM(
        messagesForRouter,
        activeModel.id,
      );

      // 6. Update UI with AI response
      setMessages((prev) => [...prev, { role: "ai", content: responseText }]);

      // 7. Final DB Saves
      if (session && currentChatId) {
        saveMessage(currentChatId, "ai", responseText);

        if (isFirstMessage) {
          // Pro-Tip: We use your master fallback key (genAI) for the title generation.
          // This ensures title generation is always fast and doesn't drain the user's personal paid Groq/OpenAI quota!
          const titleGenModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
          });
          generateBackgroundTitle(titleGenModel, currentChatId, userText);
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

  // Tracks the ID of the message that was just copied
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const handleCopy = (text, messageId) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);

    // Switch back to the copy icon after 2 seconds
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  // --- ADD THIS TO ChatPage.jsx ---
  const handleRetry = async () => {
    if (isLoading || messages.length === 0) return;

    // Find the last user message
    const lastUserMsgIndex = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserMsgIndex === -1) return;

    // The actual index in the original array
    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const lastUserMessage = messages[actualIndex].content;

    // Remove everything from that user message onwards, then immediately re-add the user message
    // This effectively "deletes" the bad AI response
    const previousMessages = messages.slice(0, actualIndex);

    setMessages([
      ...previousMessages,
      { role: "user", content: lastUserMessage },
    ]);
    setIsLoading(true);

    try {
      // Format history for the router (excluding the AI message we just dropped)
      const messagesForRouter = previousMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));
      // Add the user message we are retrying
      messagesForRouter.push({ role: "user", content: lastUserMessage });

      // Call your universal router
      const responseText = await sendMessageToLLM(
        messagesForRouter,
        activeModel.id,
      );

      setMessages((prev) => [...prev, { role: "ai", content: responseText }]);

      // Save to DB if needed
      if (session && chatId) {
        saveMessage(chatId, "ai", responseText);
      }
    } catch (error) {
      console.error("Retry Error:", error);
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
        onSaveKey={(key) => {
          console.log("Key to save later:", key);
          setHasCompletedOnboarding(true);
        }}
      />
    </>
  );
};

const generateBackgroundTitle = async (model, chatId, firstMessage) => {
  try {
    // Wait 1 second to ensure the conversation record is fully committed to DB
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const prompt = `Based on this user message: "${firstMessage}", create a descriptive title.
                    REQUIREMENTS: 
                    - Length: 6 to 8 words.
                    - Tone: Professional and clear.
                    - Format: Plain text only, no quotes.
                    Example: Comprehensive guide to building React components with Tailwind`;

    const titleResult = await model.generateContent(prompt);
    let newTitle = titleResult.response.text().trim().replace(/[*"']/g, "");

    await updateConversationTitle(chatId, newTitle);
  } catch (err) {
    console.error("Title generation failed:", err);
  }
};
