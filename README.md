# PhilHealth Daily Endorsement Logbook Application

Production-ready Next.js 14 web application designed for hospital encoders managing daily PhilHealth Endorsement Logbooks (**ADM / PAIN MGNT / MINOR / DENT / OECB**).

## Tech Stack
- **Framework**: Next.js 14 (App Router, React 18, TypeScript)
- **Styling & UI**: Tailwind CSS, next-themes (Dark, Light, System themes), Lucide Icons
- **Backend & Auth**: Supabase Auth & PostgreSQL Database
- **Exporting**: SheetJS (xlsx) for multi-tab Excel exporting

---

## How to Run Locally

1. Install dependencies:
   npm install

2. Run local development server:
   npm run dev
   Open http://localhost:3000 in your browser.

---

## Setting Up Supabase Database

1. Create a project at Supabase (https://supabase.com).
2. Go to the SQL Editor in your Supabase Dashboard.
3. Paste the contents of supabase/schema.sql and click Run.
4. Copy your Project URL and Anon API Key into .env.local:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

---

## Deploying to GitHub & Vercel

### 1. Push to GitHub
git init
git add .
git commit -m "Initial commit: PhilHealth Logbook Pro App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/philhealth-logbook-app.git
git push -u origin main

### 2. Deploy to Vercel
1. Import your GitHub repository at Vercel (https://vercel.com/new).
2. Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
3. Click Deploy.
