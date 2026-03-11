import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUserConfiguredProviders } from "../utils/apiKeys";
import {
  MODEL_REGISTRY,
  GUEST_DEFAULT_MODEL,
  getEnabledModels,
} from "../utils/models";
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
  getConversationTitle,
} from "../utils/chatHistory";

export const ChatPage = ({ darkMode, session }) => {
  const [availableModels, setAvailableModels] = useState([]);
  const [activeModel, setActiveModel] = useState(null);
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  const navigate = useNavigate();
  const { chatId } = useParams();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState("");
  const [isLoading, setIsLoading] = useState(!!chatId);

  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);

  const [guestPromptCount, setGuestPromptCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const textAreaRef = useRef(null);
  const prevSessionRef = useRef(session);
  const chatEndRef = useRef(null);
  const isCreatingChat = useRef(false);

  const hour = new Date().getHours();
  const firstName =
    session?.user?.user_metadata?.["Display name"]?.split(" ")[0] ||
    session?.user?.user_metadata?.full_name?.split(" ")[0] ||
    session?.user?.user_metadata?.name?.split(" ")[0] ||
    null;

  let timeGreeting;
  if (hour >= 5 && hour < 12) timeGreeting = "Good morning";
  else if (hour >= 12 && hour < 18) timeGreeting = "Good afternoon";
  else if (hour >= 18 && hour < 22) timeGreeting = "Good evening";
  else timeGreeting = "Moonlit chat?";

  const greeting = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const [messagePage, setMessagePage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const MESSAGES_PER_PAGE = 50;

  // ── FEATURE 1 & 3: Key Check + Filtered Model Loading ──
  // Runs whenever session changes (login/logout) or chatId changes.
  // Builds the available model list by checking which providers have keys.
  useEffect(() => {
    const loadEnabledModels = async () => {
      setIsModelsLoading(true);
      try {
        // Step 1: Get which providers the user has keys for
        let configuredProviders = [];
        if (session) {
          configuredProviders = await getUserConfiguredProviders();
        }

        // Step 2: Get the full list of model IDs the user has enabled
        const enabledIds = await getEnabledModels();
        const guestModel = MODEL_REGISTRY.find((m) => m.isGuestModel);

        // Guest sees only the one free model — nothing else
        if (!session) {
          setAvailableModels([guestModel]);
          setActiveModel(guestModel);
          setIsModelsLoading(false);
          return;
        }

        const finalList = MODEL_REGISTRY.filter((m) => {
          if (m.isGuestModel) return false; // 1. Never show the guest model
          if (!enabledIds.includes(m.id)) return false; // 2. Must be enabled
          return configuredProviders.includes(m.provider); // 3. Must have an API key configured
        });

        setAvailableModels(finalList);

        setActiveModel((prev) => {
          const stillAvailable =
            prev && finalList.some((m) => m.id === prev.id);
          if (stillAvailable) return prev;

          // If their previous model is gone, default to the first one they actually have a key for
          return finalList.length > 0 ? finalList[0] : null;
        });
      } catch (error) {
        console.error("Error loading models:", error);
        // Fail-safe: always give the user at least the free model
        setAvailableModels([GUEST_DEFAULT_MODEL]);
        setActiveModel(GUEST_DEFAULT_MODEL);
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
      const minHeight = messages.length === 0 ? 60 : 44; // px — adjust these
      textAreaRef.current.style.height = "auto";
      const newHeight = Math.max(textAreaRef.current.scrollHeight, minHeight);
      textAreaRef.current.style.height = newHeight + "px";
    }
  }, [input, messages.length]);

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
        if (window.isMigratingChat) {
          setIsLoading(true);
          return;
        }

        if (isCreatingChat.current) {
          isCreatingChat.current = false;
          setIsLoading(false);
          return;
        }

        // Fresh load: reset pagination!
        setMessagePage(0);
        const history = await getChatMessages(chatId, 0, MESSAGES_PER_PAGE);
        const fetchedTitle = await getConversationTitle(chatId);

        setHasMoreMessages(history.length === MESSAGES_PER_PAGE);
        setMessages(history);
        setChatTitle(fetchedTitle);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };

    loadChat();
    window.addEventListener("migrationComplete", loadChat);
    return () => window.removeEventListener("migrationComplete", loadChat);
  }, [chatId]);

  // 🚨 THE NEW UPWARD SCROLL FUNCTION
  const loadOlderMessages = async () => {
    if (isLoadingOlder || !hasMoreMessages || !chatId) return;

    setIsLoadingOlder(true);
    const nextPage = messagePage + 1;
    const olderMessages = await getChatMessages(
      chatId,
      nextPage,
      MESSAGES_PER_PAGE,
    );

    if (olderMessages.length > 0) {
      // Save scroll position before prepending
      const container = document.querySelector(".overflow-y-auto");
      const scrollHeightBefore = container?.scrollHeight || 0;

      setMessages((prev) => [...olderMessages, ...prev]);
      setMessagePage(nextPage);

      // After render, restore scroll position so user doesn't jump
      requestAnimationFrame(() => {
        if (container) {
          const scrollHeightAfter = container.scrollHeight;
          container.scrollTop = scrollHeightAfter - scrollHeightBefore;
        }
      });
    }

    if (olderMessages.length < MESSAGES_PER_PAGE) {
      setHasMoreMessages(false); // Hit the beginning of time
    }

    setIsLoadingOlder(false);
  };

  // --- LOGIN/LOGOUT TRANSITION WATCHER ---

  useEffect(() => {
    const wasLoggedIn = !!prevSessionRef.current;
    const isNowLoggedIn = !!session;

    if (wasLoggedIn && !isNowLoggedIn) {
      navigate("/", { replace: true });
      setMessages([]);
      setChatTitle("");
    }

    prevSessionRef.current = session;
  }, [session]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!session && guestPromptCount >= 2) {
      setShowAuthModal(true);
      return;
    }

    const userText = input.trim();
    setInput("");

    const newMessages = [
      ...messages,
      { role: "user", content: userText, created_at: new Date().toISOString() },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let currentChatId = chatId;
      const isFirstMessage = messages.length === 0 && !chatId;

      if (isFirstMessage) {
        isCreatingChat.current = true;
        currentChatId = Math.random().toString(36).substring(2, 11);
        await createConversation(currentChatId);
        navigate(`/chat/${currentChatId}`, { replace: true });
      }

      if (currentChatId) {
        saveMessage(currentChatId, "user", userText);
      }

      const MAX_CONTEXT = 20;
      const recentMessages = newMessages.slice(-MAX_CONTEXT);

      const messagesForRouter = recentMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));

      const responseText = await sendMessageToLLM(
        messagesForRouter,
        activeModel.id,
        isWebSearchEnabled,
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: responseText,
          created_at: new Date().toISOString(),
        },
      ]);

      if (currentChatId) {
        saveMessage(currentChatId, "ai", responseText);
        if (isFirstMessage) {
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
      const MAX_CONTEXT = 10;
      const recentPreviousMessages = previousMessages.slice(-(MAX_CONTEXT - 1));

      const messagesForRouter = recentPreviousMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));
      messagesForRouter.push({ role: "user", content: lastUserMessage });

      const responseText = await sendMessageToLLM(
        messagesForRouter,
        activeModel.id,
        isWebSearchEnabled,
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

  const handleEditSubmit = async (index, newText) => {
    if (isLoading || !newText.trim()) return;

    // 1. Capture the timestamp of the message we are about to overwrite!
    const editedMessageTimestamp = messages[index].created_at;

    // 2. Time Travel: Slice off everything AFTER the edited message for the UI
    const previousMessages = messages.slice(0, index);

    // 3. Append the newly edited user text (with a fresh timestamp)
    const updatedMessages = [
      ...previousMessages,
      {
        role: "user",
        content: newText.trim(),
        created_at: new Date().toISOString(),
      },
    ];

    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // 🚨 PHASE 2: DATABASE TIME TRAVEL
      if (session && chatId && editedMessageTimestamp) {
        // A. Delete the old timeline from Supabase
        await import("../utils/chatHistory").then((m) =>
          m.deleteMessagesAfterTimestamp(chatId, editedMessageTimestamp),
        );

        // B. Save the newly edited user message to the database
        await saveMessage(chatId, "user", newText.trim());
      }

      // Format for the LLM Router
      const MAX_CONTEXT = 20;
      const recentMessages = updatedMessages.slice(-MAX_CONTEXT);
      const messagesForRouter = recentMessages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));

      // Send the alternate timeline to the AI!
      const responseText = await sendMessageToLLM(
        messagesForRouter,
        activeModel.id,
        isWebSearchEnabled,
      );

      // Update UI with AI response
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: responseText,
          created_at: new Date().toISOString(),
        },
      ]);

      // 🚨 Save the new AI response to the database
      if (session && chatId) {
        await saveMessage(chatId, "ai", responseText);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `⚠️ **Edit Failed:** ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if ((isModelsLoading || isCheckingKeys) && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sidebar-ring"></div>
      </div>
    );
  }

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
        loadOlderMessages={loadOlderMessages}
        hasMoreMessages={hasMoreMessages}
        isLoadingOlder={isLoadingOlder}
        onEdit={handleEditSubmit}
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
        session={session}
        onOpenAuth={() => setShowAuthModal(true)}
        isWebSearchEnabled={isWebSearchEnabled}
        setIsWebSearchEnabled={setIsWebSearchEnabled}
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

// --- TITLE GENERATOR ---
const generateBackgroundTitle = async (chatId, firstMessage) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const guestKey = import.meta.env.VITE_GUEST_API_KEY;
    if (!guestKey) return;

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
          model: "openrouter/auto",
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
