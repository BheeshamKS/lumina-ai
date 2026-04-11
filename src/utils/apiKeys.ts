import { supabase } from "./supabase";
import type { ApiKeyRecord } from "../types";

export const getAllUserKeys = async (): Promise<ApiKeyRecord[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase.rpc('get_secure_keys');
  if (error) {
    console.error("Error fetching secure keys:", error);
    return [];
  }
  return (data as ApiKeyRecord[]) || [];
};

export const addApiKey = async (
  provider: string,
  keyValue: string,
  keyName: string
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const { error } = await supabase.rpc('add_secure_key', {
    p_provider: provider,
    p_key: keyValue,
    p_name: keyName,
  });

  if (error) throw error;

  const keys = await getAllUserKeys();
  const providerKeys = keys.filter((k) => k.provider === provider);
  if (providerKeys.length === 1) {
    await setActiveKey(provider, providerKeys[0].id);
  }
};

export const updateApiKey = async (keyId: string, newKeyValue: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const { error } = await supabase.rpc('update_secure_key', {
    p_key_id: keyId,
    p_new_key: newKeyValue,
  });

  if (error) throw error;
};

export const deleteApiKey = async (keyId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const { error } = await supabase
    .from('user_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', session.user.id);

  if (error) throw error;
};

export const setActiveKey = async (provider: string, keyId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  await supabase
    .from('user_keys')
    .update({ is_active: false })
    .eq('provider', provider)
    .eq('user_id', session.user.id);

  const { error } = await supabase
    .from('user_keys')
    .update({ is_active: true })
    .eq('id', keyId)
    .eq('user_id', session.user.id);

  if (error) throw error;
};

export const getActiveApiKey = async (provider: string): Promise<string | null> => {
  const keys = await getAllUserKeys();
  const activeKey = keys.find((k) => k.provider === provider && k.is_active);
  return activeKey ? activeKey.api_key : null;
};

export const getUserConfiguredProviders = async (): Promise<string[]> => {
  const keys = await getAllUserKeys();
  return [...new Set(keys.map((k) => k.provider))];
};
