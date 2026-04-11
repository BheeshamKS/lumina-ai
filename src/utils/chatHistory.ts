import { supabase } from "./supabase";
import type { Message, Conversation } from "../types";

export const getOrCreateGuestId = (): string => {
  let guestId = localStorage.getItem("lumina_guest_id");
  if (!guestId) {
    guestId = `guest_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("lumina_guest_id", guestId);
  }
  return guestId;
};

export const convertGuestToUser = async (realUserId: string): Promise<void> => {
  const guestId = localStorage.getItem("lumina_guest_id");
  if (!guestId) return;

  try {
    await supabase.from("conversations").update({ user_id: realUserId }).eq("user_id", guestId);
    await supabase.from("messages").update({ user_id: realUserId }).eq("user_id", guestId);
    localStorage.removeItem("lumina_guest_id");
    console.log("Successfully migrated guest chat to user!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

export const createConversation = async (chatId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId();

  await supabase.from('conversations').insert({
    id: chatId,
    user_id: currentUserId,
    title: "New Chat",
  });
};

export const saveMessage = async (chatId: string, role: string, content: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId();

  await supabase.from('messages').insert({
    conversation_id: chatId,
    user_id: currentUserId,
    role,
    content,
  });
};

export const updateConversationTitle = async (chatId: string, title: string): Promise<void> => {
  await supabase.from('conversations').update({ title }).eq('id', chatId);
};

export const getConversations = async (page = 0, limit = 15): Promise<Conversation[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId();

  const from = page * limit;
  const to = from + limit - 1;

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', currentUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .range(from, to);

  return (data as Conversation[]) || [];
};

export const archiveConversation = async (chatId: string): Promise<void> => {
  await supabase.from('conversations').update({ is_archived: true }).eq('id', chatId);
};

export const getChatMessages = async (chatId: string, page = 0, limit = 50): Promise<Message[]> => {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', chatId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) console.error("Error fetching messages:", error);

  const rows = (data as Message[]) || [];
  return rows.reverse();
};

export const getConversationTitle = async (chatId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', chatId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching title:", error);
    return "Current Conversation";
  }
  return (data as { title?: string } | null)?.title || "New Chat";
};

export const deleteMessagesAfterTimestamp = async (chatId: string, timestamp: string): Promise<void> => {
  if (!timestamp) return;

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', chatId)
    .gte('created_at', timestamp);

  if (error) {
    console.error("Error deleting orphaned messages:", error);
  }
};

export const searchConversations = async (searchQuery = ""): Promise<Conversation[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId();

  let query = supabase
    .from('conversations')
    .select('*')
    .eq('user_id', currentUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .range(0, 29);

  if (searchQuery && searchQuery.trim().length > 0) {
    query = query.ilike('title', `%${searchQuery.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Search DB error:", error.message);
    return [];
  }

  return (data as Conversation[]) || [];
};
