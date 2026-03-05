import { supabase } from "./supabase";

// 1. Fetch keys securely (DB decrypts before sending)
export const getAllUserKeys = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase.rpc('get_secure_keys');
  if (error) {
    console.error("Error fetching secure keys:", error);
    return [];
  }
  return data || [];
};

// 2. Add a new key securely (DB encrypts before saving)
export const addApiKey = async (provider, keyValue, keyName) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const { error } = await supabase.rpc('add_secure_key', {
    p_provider: provider,
    p_key: keyValue,
    p_name: keyName
  });

  if (error) throw error;
};

// 3. Update an existing key securely (DB encrypts the new value)
export const updateApiKey = async (keyId, newKeyValue) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const { error } = await supabase.rpc('update_secure_key', {
    p_key_id: keyId,
    p_new_key: newKeyValue
  });

  if (error) throw error;
};

// 4. Delete a key (Standard delete works fine since it doesn't touch the encrypted column)
export const deleteApiKey = async (keyId) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const { error } = await supabase
    .from('user_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', session.user.id);

  if (error) throw error;
};

// 5. Set Active Key (Standard update works fine since it only updates the boolean)
export const setActiveKey = async (provider, keyId) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  // Deactivate all keys for this provider
  await supabase
    .from('user_keys')
    .update({ is_active: false })
    .eq('provider', provider)
    .eq('user_id', session.user.id);

  // Activate the selected key
  const { error } = await supabase
    .from('user_keys')
    .update({ is_active: true })
    .eq('id', keyId)
    .eq('user_id', session.user.id);

  if (error) throw error;
};

// Helper function used by the chat page to grab the plaintext key for inference
export const getActiveApiKey = async (provider) => {
  const keys = await getAllUserKeys();
  const activeKey = keys.find((k) => k.provider === provider && k.is_active);
  return activeKey ? activeKey.api_key : null;
};

// Helper function used by the Chat page to check if the user needs Onboarding
export const getUserConfiguredProviders = async () => {
  const keys = await getAllUserKeys();
  // Returns a unique list of providers the user has set up (e.g., ["Google", "Groq"])
  return [...new Set(keys.map((k) => k.provider))];
};