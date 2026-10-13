function requiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Configure ${name} antes de criar o cliente Supabase.`);
  }

  return value;
}

const supabaseUrl = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const supabasePublishableKey = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export { supabasePublishableKey, supabaseUrl };
