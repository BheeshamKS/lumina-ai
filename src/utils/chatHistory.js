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

  try {
    await supabase.from("conversations").update({ user_id: realUserId }).eq("user_id", guestId);
    await supabase.from("messages").update({ user_id: realUserId }).eq("user_id", guestId);

    localStorage.removeItem("lumina_guest_id");
    console.log("Successfully migrated guest chat to user!");
  } catch (error) {
    console.error("Migration failed:", error);
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

export const getConversations = async (page = 0, limit = 15) => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session ? session.user.id : getOrCreateGuestId();

  // Calculate the Supabase row ranges
  const from = page * limit;
  const to = from + limit - 1;

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', currentUserId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .range(from, to); // 🚨 THE FIX: Only fetch the specific chunk

  return data || [];
};

export const archiveConversation = async (chatId) => {
  await supabase.from('conversations').update({ is_archived: true }).eq('id', chatId);
};

export const getChatMessages = async (chatId, page = 0, limit = 50) => {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', chatId)
    // 🚨 THE TRICK: Fetch the newest messages first so pagination works backwards
    .order('created_at', { ascending: false }) 
    .range(from, to);

  if (error) console.error("Error fetching messages:", error);
  
  // Flip the array back around so they show up chronologically on screen!
  return data ? data.reverse() : [];
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

