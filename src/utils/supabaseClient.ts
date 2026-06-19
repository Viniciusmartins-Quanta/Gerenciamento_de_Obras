import { createClient } from "@supabase/supabase-js";

const SUPABASE_DEFAULT_URL = "https://dkiajaexrjlzlluaxnhy.supabase.co";
const SUPABASE_DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraWFqYWV4cmpsemxsdWF4bmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODAzMDksImV4cCI6MjA5NzQ1NjMwOX0.L7DW-tYZFiBCbEpHiXb1goTc4nhYEpdaE2Dv-l8lPyU";

export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL;
export const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || SUPABASE_DEFAULT_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
