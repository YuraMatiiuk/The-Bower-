This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.




# 🧭 The Bower – Donation & Collection Platform

A full-stack Next.js 15 + SQLite application for managing community donations and collections.  
Built for **The Bower** initiative — connecting donors, drivers, caseworkers, and administrators
to streamline item collection and redistribution.

---

## 🚀 Features

### 👤 Donor Portal
- Register and maintain donor profiles.
- Create new donation items with categories, conditions, and images.
- Book collection dates for approved items.
- Track item statuses (Pending → Approved → Collected → Delivered).

### 🚚 Driver Dashboard
- View scheduled pickups by date via an interactive calendar.
- Mark pickups as *collected* or *rejected* with optional notes.
- Add extra collected items manually on-site.

### 🧑‍💼 Admin Dashboard
- Manage users and system settings.
- Set **blackout days** or adjust **collection slot capacities**.
- View and cancel booked collections.
- Approve or reject orders submitted by caseworkers.

### 🏪 Marketplace (Caseworker Portal)
- Browse all items marked as **collected** by drivers.
- Add items to a cart and submit a delivery order request.
- Orders route to admin for approval and fulfillment.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS + modular CSS (`.module.css`) |
| **Backend** | Next.js API Routes |
| **Database** | SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) |
| **Auth** | JWT cookies |
| **Email (optional)** | Mailtrap SMTP for testing |
| **Scheduling** | Simple date-slot logic (no external service) |

---

## ⚙️ Setup & Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/the-bower.git
   cd the-bower/frontend



   frontend/
├─ app/
│  ├─ layout.tsx            # Root layout with globals.css import
│  ├─ globals.css           # Global dark theme & base styles
│  ├─ page.tsx              # Landing / home page
│  ├─ donor/                # Donor dashboard & components
│  ├─ driver/               # Driver dashboard & calendar
│  ├─ admin/                # Admin dashboard pages
│  ├─ marketplace/          # Marketplace & checkout pages
│
├─ pages/
│  └─ api/                  # Next.js API routes
│     ├─ auth/              # Login, logout, me
│     ├─ donor/
│     ├─ driver/
│     ├─ admin/
│     └─ ...
│
├─ styles/                  # CSS modules per page
│  ├─ DonorDashboard.module.css
│  └─ ...
│
├─ lib/
│  └─ auth.js               # JWT + cookie parsing helpers
│
├─ db/
│  └─ database.sqlite
│
└─ next.config.js