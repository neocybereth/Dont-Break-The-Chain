# Quick Start - Get Running in 5 Minutes

## What Works Right Now ✅

- ✅ Email/password authentication (ready to use!)
- ✅ User-specific streaks
- ✅ Confetti celebrations
- ✅ Streak counters
- ✅ Auto-save to database

## What You Need To Do

### 1. Set Up Supabase Database (2 minutes)

Go to your Supabase project and run this SQL:

```sql
-- Create the streaks table
CREATE TABLE streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completed_dates TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Users can only access their own streaks
CREATE POLICY "Users can view their own streaks" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" ON streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" ON streaks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks" ON streaks
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX streaks_user_id_idx ON streaks(user_id);
CREATE INDEX streaks_created_at_idx ON streaks(user_id, created_at DESC);
```

### 2. Add Your Supabase Anon Key (1 minute)

Your `.env.local` file already has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qfhdpkzxaucvgiwmgkwg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Just replace `your-anon-public-key-here` with your actual anon key:**

1. Go to Supabase Dashboard → Settings → API
2. Copy the "anon public" key
3. Paste it in `.env.local`

### 3. Disable Email Confirmations (Optional, for testing)

For easier testing during development:

1. Supabase Dashboard → Authentication → Settings
2. Scroll to "Email Auth"
3. Toggle OFF "Enable email confirmations"

### 4. Start the App! 🚀

```bash
yarn dev
```

Visit `http://localhost:3000` and you're done! The app will:

- Redirect you to `/login`
- Let you sign up with any email/password
- Show your personal habit tracker

## Adding Social Login (Optional)

Want Google, GitHub, or Apple sign-in?

### Configuration Required:

**Step 1: Add Redirect URLs in Supabase**

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add these URLs to **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (for local development)
   - `https://yourdomain.com/auth/callback` (for production, replace with your actual domain)

**Step 2: Enable OAuth Providers**

Each provider needs setup in Supabase Dashboard → Authentication → Providers:

- **GitHub** (easiest, 5 min) - See `OAUTH_SETUP_QUICKSTART.md`
- **Google** (10 min) - See `OAUTH_SETUP_QUICKSTART.md`
- **Twitter/Spotify** (similar process)

The app is already configured to use these providers!

## That's It!

Your habit tracker is ready to use with:

- ✅ Secure authentication
- ✅ Personal data isolation
- ✅ Real-time syncing
- ✅ Beautiful UI with confetti 🎉

---

**Need help?** Check the detailed guides:

- `SUPABASE_SETUP.md` - Full setup instructions
- `OAUTH_SETUP_QUICKSTART.md` - Social login guide
