# Supabase Setup Instructions

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project created

## Step 1: Create the Database Table

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (in the left sidebar)
3. Run the following SQL to create the `streaks` table with authentication:

```sql
-- Create the streaks table with user authentication
CREATE TABLE streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completed_dates TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to access only their own streaks
CREATE POLICY "Users can view their own streaks" ON streaks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" ON streaks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" ON streaks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks" ON streaks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX streaks_user_id_idx ON streaks(user_id);
CREATE INDEX streaks_created_at_idx ON streaks(user_id, created_at DESC);
```

## Step 2: Configure Authentication Providers

### Email Authentication

1. In your Supabase project dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (it should be enabled by default)
3. Configure email templates if needed (optional)

#### For Development (Optional):

If you want to test without confirming emails:

1. Go to **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. Disable "Enable email confirmations" (for development only!)

### OAuth Providers (Google, GitHub, Apple)

The app supports Google, GitHub, and Apple sign-in. Follow these instructions to enable them:

#### 🔵 Google OAuth Setup

1. **Create Google OAuth Credentials:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Select **Web application**
   - Add authorized redirect URIs:
     - `https://qfhdpkzxaucvgiwmgkwg.supabase.co/auth/v1/callback`
   - Save and copy your **Client ID** and **Client Secret**

2. **Configure in Supabase:**
   - Go to **Authentication** → **Providers** in your Supabase dashboard
   - Find **Google** and enable it
   - Paste your **Client ID** and **Client Secret**
   - Click **Save**

#### ⚫ GitHub OAuth Setup

1. **Create GitHub OAuth App:**

   - Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
   - Click **New OAuth App**
   - Fill in the details:
     - **Application name**: Don't Break the Chain
     - **Homepage URL**: `http://localhost:3000` (for development)
     - **Authorization callback URL**: `https://qfhdpkzxaucvgiwmgkwg.supabase.co/auth/v1/callback`
   - Click **Register application**
   - Copy your **Client ID**
   - Click **Generate a new client secret** and copy it

2. **Configure in Supabase:**
   - Go to **Authentication** → **Providers** in your Supabase dashboard
   - Find **GitHub** and enable it
   - Paste your **Client ID** and **Client Secret**
   - Click **Save**

#### 🍎 Apple OAuth Setup

Apple OAuth is more complex and requires an Apple Developer account ($99/year).

1. **Prerequisites:**

   - An Apple Developer account
   - A verified domain

2. **Create Apple Service ID:**

   - Go to [Apple Developer Portal](https://developer.apple.com/account)
   - Navigate to **Certificates, Identifiers & Profiles**
   - Click **Identifiers** → **+** (Add button)
   - Select **Services IDs** and continue
   - Register a Service ID (e.g., `com.yourapp.services`)
   - Enable **Sign In with Apple**
   - Configure domains and redirect URLs:
     - **Domains**: `qfhdpkzxaucvgiwmgkwg.supabase.co`
     - **Return URLs**: `https://qfhdpkzxaucvgiwmgkwg.supabase.co/auth/v1/callback`

3. **Create a Key:**

   - In **Certificates, Identifiers & Profiles**
   - Click **Keys** → **+**
   - Enable **Sign In with Apple**
   - Configure the key with your Service ID
   - Download the `.p8` key file (you can only download it once!)
   - Note the Key ID

4. **Configure in Supabase:**
   - Go to **Authentication** → **Providers** in your Supabase dashboard
   - Find **Apple** and enable it
   - Fill in:
     - **Service ID** (e.g., `com.yourapp.services`)
     - **Team ID** (found in your Apple Developer account)
     - **Key ID** (from step 3)
     - **Private Key** (contents of the .p8 file)
   - Click **Save**

### Quick Start (Skip OAuth for Now)

If you want to test the app immediately without setting up OAuth:

- The email/password authentication will work out of the box
- OAuth buttons will show but won't work until configured
- You can enable OAuth providers later when ready

## Step 3: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

⚠️ **IMPORTANT**: Use the **anon (public)** key, NOT the service_role key!

## Step 4: Configure Environment Variables

Create a `.env.local` file in the root of your project:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qfhdpkzxaucvgiwmgkwg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Replace `your-anon-public-key-here` with the anon key from Step 3.

**Note**: The OAuth providers are configured entirely in Supabase, so no additional environment variables are needed for Google, GitHub, or Apple sign-in.

## Step 5: Restart the Development Server

After adding the environment variables, restart your development server:

```bash
yarn dev
```

## Database Schema

The `streaks` table has the following structure:

| Column            | Type      | Description                                     |
| ----------------- | --------- | ----------------------------------------------- |
| `id`              | UUID      | Primary key, auto-generated                     |
| `user_id`         | UUID      | Foreign key to auth.users, identifies the owner |
| `name`            | TEXT      | Name of the habit/streak                        |
| `completed_dates` | TEXT[]    | Array of ISO date strings (YYYY-MM-DD)          |
| `created_at`      | TIMESTAMP | When the streak was created                     |
| `updated_at`      | TIMESTAMP | When the streak was last updated                |

## How Authentication Works

### Row Level Security (RLS)

The app uses Supabase's Row Level Security to ensure users can only access their own streaks:

- **SELECT**: Users can only see streaks where `user_id` matches their auth ID
- **INSERT**: Users can only create streaks with their own `user_id`
- **UPDATE**: Users can only update their own streaks
- **DELETE**: Users can only delete their own streaks

### Authentication Flow

1. **Unauthenticated users** are automatically redirected to `/login`
2. **Sign up/Sign in** is handled by Supabase Auth UI at `/login`
3. **Authenticated users** can access the main page and see their streaks
4. **Sign out** clears the session and redirects to `/login`

## Testing Your Setup

1. Start your dev server: `yarn dev`
2. Visit `http://localhost:3000`
3. You should be redirected to `/login`
4. Create a new account with email and password
5. After signing in, you'll be redirected to the main page
6. Create some streaks and mark days complete!

## Troubleshooting

### "relation 'streaks' does not exist"

- Make sure you ran the SQL from Step 1 in your Supabase SQL Editor

### "JWT expired" or authentication errors

- Check that your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Make sure you're using the **anon** key, not the service_role key

### Can't sign in after sign up

- Check if "Enable email confirmations" is on
- For development, you can disable it (see Step 2)
- Check your Supabase logs in the Dashboard

### Streaks not saving/loading

- Check browser console for errors
- Verify RLS policies are created (Step 1)
- Make sure you're signed in

## Security Notes

✅ **This setup is production-ready** because:

- User data is isolated using Row Level Security
- Only the anon key is exposed to the client
- The anon key respects all RLS policies
- Each user can only access their own streaks

🔒 **Additional Security Tips**:

- Never commit `.env.local` to git (it's already in `.gitignore`)
- Enable email confirmations in production
- Consider adding rate limiting
- Monitor your Supabase logs for suspicious activity
