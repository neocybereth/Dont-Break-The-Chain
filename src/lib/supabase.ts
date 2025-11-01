import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables are not set. Using placeholder values for build."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://qfhdpkzxaucvgiwmgkwg.supabase.co",
  supabaseAnonKey ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmaGRwa3p4YXVjdmdpd21na3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjY2MTEsImV4cCI6MjA3NzQ0MjYxMX0.bV1X4N_giS9-uc635W2yN-_E9QxdqDe-vz0hT1VC9xI"
);

export interface StreakData {
  id: string;
  name: string;
  completed_dates: string[];
  frequency: "daily" | "weekly";
  created_at: string;
  updated_at: string;
}
