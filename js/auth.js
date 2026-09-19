// auth.js — thin wrapper around Supabase Auth for a single-owner login.
// If no backend is connected yet, every call here is a no-op / throws a
// clear error rather than silently pretending to succeed.

import { supabaseClient } from "./db.js";

export async function signIn(email, password) {
  if (!supabaseClient) throw new Error("No backend connected yet — see the setup notes.");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
}

export async function getSession() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

export function onAuthChange(fn) {
  if (!supabaseClient) return () => {};
  const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => fn(session));
  return () => data.subscription.unsubscribe();
}
