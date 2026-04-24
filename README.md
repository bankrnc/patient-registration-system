# Patient Registration System

A responsive, real-time patient input form and staff monitoring dashboard built with Next.js and Pusher Channels.

| Interface | URL |
|-----------|-----|
| Patient Form | [https://patient-registration-system-zeta.vercel.app](https://patient-registration-system-zeta.vercel.app) |
| Staff Dashboard | [https://patient-registration-system-zeta.vercel.app/staff](https://patient-registration-system-zeta.vercel.app/staff) |

---

## Features

- **Patient Form** — collects personal details with client-side validation and real-time sync
- **Staff Dashboard** — monitors all active patient sessions with live field-by-field updates
- **Status Indicators** — each session shows `Filling in`, `Inactive` (30s timeout), or `Submitted`
- **Responsive Design** — works on mobile and desktop for both interfaces

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | TailwindCSS |
| Real-Time | Pusher Channels (WebSocket) |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Pusher](https://pusher.com) account with a **Channels** app (free Sandbox plan works)

### Installation

```bash
git clone https://github.com/bankrnc/patient-registration-system.git
cd patient-registration-system
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Pusher credentials:

```bash
cp .env.example .env.local
```

```env
PUSHER_APP_ID=your_pusher_app_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

> Get these from your Pusher dashboard → App Keys

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the patient form and [http://localhost:3000/staff](http://localhost:3000/staff) for the staff dashboard.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Patient Form (/)
│   ├── layout.tsx            # Root layout with metadata
│   ├── staff/
│   │   └── page.tsx          # Staff Dashboard (/staff)
│   └── api/
│       └── pusher/
│           └── route.ts      # API route — triggers Pusher events
├── lib/
│   ├── pusher-server.ts      # Pusher server instance (API routes only)
│   └── pusher-client.ts      # Pusher client factory (browser only, lazy init)
└── types/
    └── patient.ts            # Shared TypeScript types and constants
```

The server and client Pusher instances are intentionally separated into different files. This prevents Next.js from loading the Node.js build of `pusher-js` during SSR, which would cause a runtime error.

---

## Design

### Responsive Layout

| Breakpoint | Patient Form | Staff Dashboard |
|------------|-------------|-----------------|
| Mobile (`< md`) | Single-column stacked fields | Single-column session cards |
| Desktop (`≥ md`) | 2–3 column grid per section | 2–3 column card grid |

### Patient Form

- Grouped into logical sections (Personal Info, Contact, Background, Emergency Contact) to reduce cognitive load
- Required fields marked with a red asterisk
- Error messages appear inline beneath each field immediately on blur (not only on submit)
- Gradient background (`indigo-50 → blue-100`) distinguishes the form from clinical white

### Staff Dashboard

- Sticky header with live session counters (Filling / Submitted / Total)
- Each session rendered as a card color-coded by status:
  - **Blue** — actively filling
  - **Green** — submitted
  - **Gray** — inactive (no input for 30 seconds)
- A progress bar shows form completion percentage per session
- Empty state shown when no patients have opened the form yet

---

## Component Architecture

### `app/page.tsx` — Patient Form

| Responsibility | Implementation |
|---------------|---------------|
| Form state | `useState<PatientFormData>` |
| Real-time sync | `triggerPusher()` called on every field change via `handleChange` |
| Inactivity detection | `useRef` timer reset on each keystroke; fires `status-change: inactive` after 30s |
| Field validation | `validate()` on submit + `validateField()` on blur for phone/email |
| Session identity | `sessionStorage` UUID — persists across re-renders, unique per browser tab |

### `app/staff/page.tsx` — Staff Dashboard

| Responsibility | Implementation |
|---------------|---------------|
| Session registry | `useState<Record<sessionId, PatientSession>>` |
| Real-time updates | Pusher channel subscription in `useEffect` |
| `SessionCard` | Renders one patient's data, status badge, progress bar, and field list |
| `StatBadge` | Header counters for Filling / Submitted / Total |
| `EmptyState` | Shown when `sessions` map is empty |

### `app/api/pusher/route.ts` — Event Trigger

A single `POST` handler that receives `{ event, data }` from the patient form and forwards it to Pusher server-side. Keeps Pusher secret off the client.

---

## Real-Time Synchronization Flow

```
Patient Browser                 Next.js API              Pusher Channels         Staff Browser
──────────────                 ───────────              ───────────────         ─────────────
User types in field
      │
      ▼
handleChange()
  POST /api/pusher ──────────► route.ts
  { event: "form-update",         │
    data: { sessionId, fields } }  │
                            pusherServer.trigger()
                                   │
                                   ▼
                            Pusher Cloud ──────────────► channel.bind("form-update")
                                                               │
                                                               ▼
                                                         setSessions(prev => ...update)
                                                         → card re-renders with new value
```

**Two event types are used:**

| Event | Payload | Purpose |
|-------|---------|---------|
| `form-update` | `{ sessionId, data, lastUpdated }` | Syncs all field values |
| `status-change` | `{ sessionId, status }` | Updates the session status badge |

**Inactivity:** A 30-second `setTimeout` in the patient form fires a `status-change: inactive` event if the user stops typing. The timer resets on every keystroke.

**Session identity:** Each browser tab generates a UUID stored in `sessionStorage`. This allows the staff dashboard to track multiple patients simultaneously without collisions.
