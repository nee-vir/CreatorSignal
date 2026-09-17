# Creator Signal • YouTube Intelligence & AI Packaging Studio

**Creator Signal** is a modern, algorithm-informed intelligence studio built for YouTube creators. It identifies high-performing outlier topics, simulates real-time SERP thumbnail clickability, tracks view velocity (VPH), uncovers perennial evergreen search gaps, and generates viral psychological hook angles using Google Gemini AI.

---

## 🚀 Key Features

1. **Universal YouTube Intelligence & Outlier Audit:**
   * Paste any YouTube video URL, channel handle, or ID.
   * Auto-detects single videos (10 credits) for an instant baseline check, multiplier calculation, and AI clickability rating (1–100).
   * Audits entire channels (35 credits) across recent uploads to calculate 10-video median baselines, spot viral outliers (>=3x), and provide a 7-part AI deconstruction with 3 concrete, swipeable title formulas.

2. **Viral Topic Finder (Outlier Engine):**
   * Computes exact view multipliers against the channel's recent median.
   * Synthesizes why the video outperformed its baseline and extracts audience resonance drivers.

3. **SERP Competitor Injector & Contrast Simulator:**
   * Live YouTube search rank preview for any target keyword.
   * Inject your draft thumbnail side-by-side against top 5 ranking competitors.
   * Toggle desktop and mobile viewports with grayscale and blur contrast tests.
   * AI-generated competitive landscape analysis, visual feed themes, and stand-out advice.

4. **Evergreen Ideas Finder:**
   * Scans competitor catalogs for videos older than 180 days that still pull >20 views/hour.
   * Gemini AI synthesizes the underlying search intent and generates a 2026 remake playbook.

5. **Angle Pivot AI Hook Generator:**
   * Deconstructs any winning video title into 3 distinct psychological angles: *Contrarian*, *Resource*, and *Mistake*.
   * Generates high-retention 30-second opening script frameworks with 1-click clipboard copying.

6. **Real-Time View Velocity Speedometer (VPH):**
   * Enrolls videos into 48-hour background velocity polling.
   * Tracks views per hour and detects viral breakout spikes or sudden plateaus.
   * Pro subscribers can export full telemetry reports to CSV.

7. **Credit System & Pre-Submission Cost Confirmation:**
   * Real-time wallet tracking with Free (20/day), Creator ₹199 (25/day • 750/mo), and Pro ₹299 (50/day • 1,500/mo) tiers.
   * Interactive **Query Cost Confirmation Modal** showing exact credit costs, balance math, and deliverables before running any query.
   * Automatic daily allowances refreshed at midnight via PostgreSQL stored procedures.

8. **Dedicated Profile Page & Account Control:**
   * Full profile dashboard with plan details, credit telemetry, password changes, and Danger Zone permanent account deletion.

---

## 🛠️ Technology Stack

* **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security & Triggers)
* **AI Engine:** [Google Gemini](https://ai.google.dev/) (`gemini-flash-latest`)
* **Data Provider:** [YouTube Data API v3](https://developers.google.com/youtube/v3)
* **Payments:** [Razorpay](https://razorpay.com/) (Recurring Subscriptions & Webhook validation)
* **Icons:** [Lucide React](https://lucide.dev/)

---

## 📦 Getting Started

### 1. Prerequisites
* Node.js 18+ or 20+
* A Supabase project
* A Google Cloud API Key with YouTube Data API v3 enabled
* A Google AI Studio API Key (Gemini)

### 2. Clone & Install
```bash
git clone https://github.com/your-username/creator-signal.git
cd creator-signal
npm install
```

### 3. Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your credentials:
* `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`
* `YOUTUBE_API_KEY`
* `GEMINI_API_KEY`
* `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### 4. Database Setup
Run the SQL migration script in your Supabase SQL Editor:
* [`supabase/schema.sql`](supabase/schema.sql)
This creates all 6 core tables (`profiles`, `subscriptions`, `credits`, `credit_transactions`, `cached_youtube_api`, `monitored_videos`), RLS security policies, and the daily midnight reset stored procedure.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the studio.

---

## 🔒 Security & Best Practices

* **Zero Secret Leakage:** `.env.local` is strictly excluded from version control via `.gitignore`.
* **Row Level Security (RLS):** Enabled on all Supabase tables ensuring users can only read and modify their own records.
* **Service Role Isolation:** Admin operations (credit deduction, account deletion, cache pruning) run strictly in server-side API routes.
* **Quota Shielding:** 6-hour Redis/Supabase cache protects Google YouTube API daily quota limits.

---

## 📄 License
MIT License. Built for YouTube creators and growth strategists.
