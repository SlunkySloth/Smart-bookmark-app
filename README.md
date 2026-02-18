# Smart Bookmarks 🔖

A simple bookmark manager I built using **Next.js**, **Supabase**, and **Tailwind CSS**. You sign in with Google, save your bookmarks, and they sync in real time across browser tabs.

## Live Demo

🔗 [smart-bookmark-app-sooty-six.vercel.app](https://smart-bookmark-app-sooty-six.vercel.app/)

## What it does

1. **Google OAuth** — you sign in with your Google account, no email/password needed
2. **Add Bookmarks** — save any URL with a title
3. **Real time Sync** — open two tabs, add a bookmark in one and it pops up in the other
4. **Private Bookmarks** — each user only sees their own bookmarks
5. **Delete Bookmarks** — remove bookmarks you dont need anymore

## Tech Stack

| Technology           | Purpose                  |
| -------------------- | ------------------------ |
| Next.js (App Router) | Frontend framework       |
| Supabase             | Auth, Database, Realtime |
| Tailwind CSS         | Styling                  |
| Vercel               | Deployment               |

## How It Works

**Authentication**: When you click "Sign in with Google", it triggers Supabase's OAuth flow. Google authenticates you, then Supabase creates a session and redirects back to the app through `/auth/callback`.

**Bookmarks Storage**: Bookmarks are stored in a Supabase `bookmarks` table. I set up Row Level Security (RLS) policies so that each user can only read and write their own bookmarks.

**Real time Updates**: The app subscribes to Supabase's Realtime feature, which uses PostgreSQL's built in replication. When a bookmark is inserted or deleted, all connected clients for that user get notified instantly. I also added a fallback that refetches bookmarks when you switch tabs, just to be safe.

## Project Structure

```
├── app/
│   ├── layout.js              # root layout with AuthProvider
│   ├── page.js                # main bookmarks dashboard
│   ├── login/page.js          # login page with Google OAuth
│   └── auth/callback/route.js # OAuth callback handler
├── components/
│   ├── AuthProvider.js        # auth context (session management)
│   └── Navbar.js              # navigation bar
├── lib/
│   └── supabase.js            # Supabase client instance
└── .env.local                 # environment variables (not committed)
```

## Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/SlunkySloth/Smart-bookmark-app.git
cd Smart-bookmark-app
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Then run this SQL in the SQL Editor:

```sql
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  url text not null,
  created_at timestamptz default now()
);

alter table bookmarks enable row level security;

create policy "Users can view own bookmarks" on bookmarks for select using (auth.uid() = user_id);
create policy "Users can insert own bookmarks" on bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can delete own bookmarks" on bookmarks for delete using (auth.uid() = user_id);
```

Then enable Realtime on the bookmarks table by running:

```sql
alter publication supabase_realtime add table bookmarks;
```

### 3. Set up Google OAuth

Go to [Google Cloud Console](https://console.cloud.google.com/) and create OAuth credentials. Add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as a redirect URI. Then go to Supabase → Authentication → Providers → Google, toggle it on, and paste in the Client ID and Client Secret.

### 4. Configure environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Problems I Ran Into and How I Solved Them

### 1. Google OAuth redirect_uri_mismatch error

I kept getting a `redirect_uri_mismatch` error when trying to sign in with Google. Turns out I had a small typo in the redirect URI I added in Google Cloud Console. The Supabase project URL and the redirect URI have to match exactly, even one wrong character will break it. Had to double check the URL in Google Cloud → Credentials → my OAuth Client → Authorized redirect URIs and make sure it was `https://my-project.supabase.co/auth/v1/callback` with no typos.

### 2. Needed an /auth/callback route

After Google sign in, the app redirected back but I wasn't actually logged in. The URL had a `code` parameter but nothing was happening with it. I realized I needed to create an API route at `/auth/callback` that takes the code from the URL and exchanges it for a session using `supabase.auth.exchangeCodeForSession(code)`. Without this route, the OAuth code just sits in the URL doing nothing.

### 3. "Could not find table" error

When I tried to add my first bookmark, I got `Could not find the table 'public.bookmarks' in the schema cache`. I had written all the frontend code but forgot to actually create the table in Supabase. Had to go to the SQL Editor and run the CREATE TABLE query. Felt dumb but it was an easy fix.

### 4. Row Level Security blocking everything

After creating the table with RLS enabled, I got "permission denied" when trying to insert bookmarks. Turns out enabling RLS without any policies means nobody can do anything at all. I had to create specific policies for `select`, `insert`, and `delete`, with each one checking that `auth.uid() = user_id`. Once I did that, everything worked and each user could only see their own data.

### 5. Real time sync not working across tabs

This one took me a while. Adding a bookmark in one tab wasnt showing up in the other tab. Two things were wrong. First, I hadnt enabled Realtime replication on the bookmarks table (you have to run `alter publication supabase_realtime add table bookmarks;` in the SQL Editor). Second, I was using a `filter` parameter in the realtime subscription which turned out to be unreliable. I switched to subscribing to all events on the table and filtering by `user_id` on the client side instead. I also added a `visibilitychange` listener as a backup so it refetches bookmarks whenever you switch back to the tab.

### 6. Duplicate bookmarks appearing

When adding a bookmark, it would show up twice in the list. Once from the local state update right after inserting, and again from the Realtime event. Fixed it by adding a duplicate check: `if (prev.some((b) => b.id === payload.new.id)) return prev` so it skips the realtime event if the bookmark is already there.

## Deployment

The app is deployed on [Vercel](https://smart-bookmark-app-sooty-six.vercel.app/). The environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are configured in the Vercel dashboard.

When deploying, you also need to update these in Supabase → Authentication → URL Configuration:

1. **Site URL**: set it to your Vercel URL
2. **Redirect URLs**: add `https://your-vercel-url.vercel.app/auth/callback`

## License

MIT
