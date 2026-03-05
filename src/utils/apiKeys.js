import { supabase } from "./supabase";

// 1. Add a new key
export const addApiKey = async (provider, apiKey, keyName = "Default Key") => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  // Check if they already have an active key for this provider
  const { data: existing } = await supabase
    .from('user_keys')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('provider', provider)
    .eq('is_active', true);

  // If they have NO active keys for this provider, make this new one active automatically
  const isFirstKey = existing.length === 0;

  const { error } = await supabase
    .from('user_keys')
    .insert({
      user_id: session.user.id,
      provider: provider,
      key_name: keyName,
      api_key: apiKey,
      is_active: isFirstKey
    });

  if (error) throw error;
  return true;
};

// 2. Fetch the single ACTIVE key (Used by ChatPage to make API calls)
export const getActiveApiKey = async (provider) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('user_keys')
    .select('api_key')
    .eq('user_id', session.user.id)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data.api_key;
};

// 3. Fetch ALL keys (Used by SettingsPage to list them out)
export const getAllUserKeys = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('user_keys')
    .select('id, provider, key_name, is_active') // Notice we DO NOT fetch the actual api_key string for the UI!
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

// 4. Toggle the active key
export const setActiveKey = async (provider, newActiveKeyId) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Step A: Turn ALL keys for this provider to inactive
  await supabase
    .from('user_keys')
    .update({ is_active: false })
    .eq('user_id', session.user.id)
    .eq('provider', provider);

  // Step B: Turn the selected key to active
  const { error } = await supabase
    .from('user_keys')
    .update({ is_active: true })
    .eq('user_id', session.user.id)
    .eq('id', newActiveKeyId);

  if (error) throw error;
  return true;
};

// 5. Check which providers the user has set up (Used by ChatPage for the BYOK Modal)
export const getUserConfiguredProviders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('user_keys')
    .select('provider')
    .eq('user_id', session.user.id);

  if (error || !data) return [];
  
  // Use a Set to remove duplicates (e.g., if they have 3 Google keys, "Google" only appears once)
  return [...new Set(data.map(row => row.provider))];
};

// Helper to get the active key for a specific provider
export const getActiveKeyForProvider = async (provider) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from('user_keys')
    .select('api_key')
    .eq('user_id', session.user.id)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  return data?.api_key || null;
};