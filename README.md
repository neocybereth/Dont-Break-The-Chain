# Don't Break the Chain 🔥

A beautiful habit tracker inspired by Jerry Seinfeld's productivity method. Build consistent habits, track your streaks, and celebrate your progress!

## ✨ Features

- 🎯 **Simple Habit Tracking** - Add habits and mark them complete each day
- 🔥 **Streak Counter** - See your current streak with a fire emoji
- 🎉 **Confetti Celebrations** - Get rewarded with confetti when you mark a day complete
- 📅 **7-Day View** - See the last week at a glance
- 🔐 **Secure Authentication** - Email/password login with Supabase Auth
- 💾 **Auto-Save** - All your data syncs automatically to Supabase
- 👤 **User Isolation** - Everyone sees only their own streaks

## 🚀 Quick Start (5 Minutes)

### 1. Set up your Supabase database
Run the SQL from `QUICK_START.md` in your Supabase SQL Editor

### 2. Add your Supabase credentials
Update `.env.local` with your anon key

### 3. Start the app
```bash
yarn dev
```

Visit `http://localhost:3000` and start building habits!

**👉 See [QUICK_START.md](QUICK_START.md) for detailed instructions**

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get up and running in 5 minutes
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Detailed Supabase configuration
- **Social Login** - Google, GitHub, and Apple sign-in ready to enable (see SUPABASE_SETUP.md)

## 🛠 Tech Stack

- **Next.js 16** - React framework
- **Supabase** - Database & authentication
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety
- **Canvas Confetti** - Celebration animations

## 🎨 What It Looks Like

- Clean, minimal interface focused on your habits
- Beautiful gradient background (amber to red)
- Large, clickable boxes for today's tasks
- Smaller, disabled boxes for past days
- Red X marker when you complete a day
- Streak counter badge with fire emoji

## 🔒 Security

- Row Level Security (RLS) ensures users only see their own data
- Secure authentication with Supabase Auth
- Environment variables for sensitive credentials
- Production-ready security policies

## 📝 License

Built with ❤️ for building better habits
