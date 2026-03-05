import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useNavigate, useParams } from "react-router-dom";
import { getUserConfiguredProviders, getActiveApiKey } from "../utils/apiKeys";
import { MODEL_REGISTRY, getEnabledModels } from "../utils/models";
import { LUMINA_SYSTEM_PROMPT } from "../utils/prompts";

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

    // 1. IMMEDIATELY update UI so the user sees their message right away
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsLoading(true);

    try {
      let currentChatId = chatId;
      const isFirstMessage = messages.length === 0 && !chatId;

      // Create ID and Navigate if it's the first message
      if (isFirstMessage) {
        currentChatId = Math.random().toString(36).substring(2, 11);
        if (session) await createConversation(currentChatId);
        navigate(`/chat/${currentChatId}`, { replace: true });
      }

      // Save user message to DB
      if (session && currentChatId)
        saveMessage(currentChatId, "user", userText);

      // Format history for Gemini SDK
      const formattedHistory = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      const currentProvider = activeModel.provider;
      const userApiKey = await getActiveApiKey(currentProvider);

      // Use user's key, or fallback to your master key ONLY for Google/Gemini
      const finalKey =
        userApiKey ||
        (currentProvider === "Google"
          ? import.meta.env.VITE_GEMINI_API_KEY
          : null);

      if (!finalKey) {
        throw new Error(
          `No API key found for ${currentProvider}. Please add one in Settings.`,
        );
      }

      let responseText = "";
      let titleModelInstance = null; // Fix: Scope this outside the if-blocks

      if (currentProvider === "Google") {
        // --- GOOGLE SDK LOGIC ---
        const genAIInstance = new GoogleGenerativeAI(finalKey);
        const model = genAIInstance.getGenerativeModel({
          model: activeModel.id,
          systemInstruction: LUMINA_SYSTEM_PROMPT,
        });

        titleModelInstance = model; // Store it here to pass to the title generator later

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(userText);
        responseText = result.response.text();
      } else if (currentProvider === "Groq") {
        // --- GROQ FETCH LOGIC ---
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${finalKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: activeModel.id,
              messages: [
                { role: "system", content: LUMINA_SYSTEM_PROMPT },
                ...messages.map((m) => ({
                  role: m.role === "user" ? "user" : "assistant",
                  content: m.content,
                })),
                { role: "user", content: userText },
              ],
            }),
          },
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        responseText = data.choices[0].message.content;
      }

      setMessages((prev) => [...prev, { role: "ai", content: responseText }]);

      // 6. Final DB Saves
      if (session && currentChatId) {
        saveMessage(currentChatId, "ai", responseText);

        if (isFirstMessage) {
          // Fix: Use the Google model if we made one, otherwise use the master fallback key for the title
          const titleGenModel =
            titleModelInstance ||
            genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          generateBackgroundTitle(titleGenModel, currentChatId, userText);
        }
      }

      if (!session) {
        setGuestPromptCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error:", error);

      // Check if it's a Rate Limit (429) error
      const isQuotaExceeded =
        error.message?.includes("429") || error.message?.includes("quota");

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: isQuotaExceeded
            ? "⚠️ **Quota Exceeded:** You've hit the free limit for this API key. Please wait a while or **switch to a different key** in Settings."
            : "Sorry, I encountered an error. Please check your connection.",
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
