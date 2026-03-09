import { supabase } from "./supabase";

// --- GUEST ID GENERATOR ---
export const getOrCreateGuestId = () => {
  let guestId = localStorage.getItem("lumina_guest_id");
  if (!guestId) {
    guestId = `guest_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("lumina_guest_id", guestId);
  }
  return guestId;
};

// --- MIGRATION FUNCTION ---
export const convertGuestToUser = async (realUserId) => {
  const guestId = localStorage.getItem("lumina_guest_id");
  if (!guestId) return;

  if (window.isMigratingChat) return;
  window.isMigratingChat = true;

  try {
    await supabase.from("conversations").update({ user_id: realUserId }).eq("user_id", guestId);
    await supabase.from("messages").update({ user_id: realUserId }).eq("user_id", guestId);

    localStorage.removeItem("lumina_guest_id");
    console.log("Successfully migrated guest chat to user!");
    
    // 🚨 THE FIX: Turn off the lock BEFORE dispatching the event!
    window.isMigratingChat = false;
    
    // Now ChatPage will see the lock is off when it hears this signal
    window.dispatchEvent(new Event("migrationComplete"));
  } catch (error) {
    console.error("Migration failed:", error);
    // Make sure to unlock even if it fails
    window.isMigratingChat = false; 
  }
};

// --- UPDATED DB FUNCTIONS ---
export const createConversation = async (chatId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId(); // Use Guest ID if logged out

  await supabase.from('conversations').insert({
    id: chatId,
    user_id: currentUserId,
    title: "New Chat" 
  });
};

export const saveMessage = async (chatId, role, content) => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId();

  await supabase.from('messages').insert({
    conversation_id: chatId,
    user_id: currentUserId,
    role: role,
    content: content
  });
};

export const updateConversationTitle = async (chatId, title) => {
  await supabase.from('conversations').update({ title }).eq('id', chatId);
};

export const getConversations = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId();

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', currentUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  return data || [];
};

export const archiveConversation = async (chatId) => {
  await supabase.from('conversations').update({ is_archived: true }).eq('id', chatId);
};

export const getChatMessages = async (chatId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', chatId)
    .order('created_at', { ascending: true });

  if (error) console.error("Error fetching messages:", error);
  return data || [];
};

export const getConversationTitle = async (chatId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', chatId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching title:", error);
    return "Current Conversation";
  }
  return data?.title || "New Chat";
};

