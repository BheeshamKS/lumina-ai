import { supabase } from "./supabase";

// 1. Create a new empty conversation
export const createConversation = async (chatId) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('conversations').insert({
    id: chatId,
    user_id: session.user.id,
    title: "New Chat" // Default title until the AI renames it
  });
};

// 2. Save a single message
export const saveMessage = async (chatId, role, content) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('messages').insert({
    conversation_id: chatId,
    user_id: session.user.id,
    role: role,
    content: content
  });
};

// 3. Update the conversation title (used by the AI in the background)
export const updateConversationTitle = async (chatId, title) => {
  await supabase.from('conversations').update({ title }).eq('id', chatId);
};

// Update this to only fetch active chats
export const getConversations = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_archived', false) // Only show non-archived chats
    .order('created_at', { ascending: false });

  return data || [];
};

export const archiveConversation = async (chatId) => {
  await supabase.from('conversations').update({ is_archived: true }).eq('id', chatId);
};

// 5. Fetch all messages when a user clicks a chat in the sidebar
export const getChatMessages = async (chatId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', chatId)
    .order('created_at', { ascending: true });

  if (error) console.error("Error fetching messages:", error);
  return data || [];
};

// 6. Fetch a single conversation's title
export const getConversationTitle = async (chatId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', chatId)
    .single();

  if (error) {
    console.error("Error fetching title:", error);
    return "Current Conversation";
  }
  return data?.title || "New Chat";
};