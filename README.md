# FlowOps

FlowOps is an internal operations workspace for a small company. Employees work on assigned tasks and submit requests for equipment, purchases and IT support. Managers review those requests and run their team's work. Administrators manage the people who use it. Every change is recorded, and everyone sees only what their role allows.

Instead of a grid of tables, FlowOps draws work the way a transit map draws a network: each person is a line through the week, each request travels through stops from submission to completion, and a NOW line shows where the day is.

![Mission Control](screenshots/mission-control.png)

## What it does

| Area | What you can do |
| --- | --- |
| **Mission Control** (dashboard) | See what needs you as a queue of tickets, the week as one line per person with tasks as stops on their due dates, open requests as five-stop lines, 13 weeks of activity as a heatmap, and workload by status. Start, complete or reopen a task straight from the map. |
| **Task Atlas** | Work in a board, a list or a timeline of the same tasks. Drag cards between columns (mouse, touch or keyboard) or use "Move to". Filters, the view and the open task live in the URL. Tasks open in a side panel. |
| **Decision Journey** | Follow a request through its FlowMap: submitted, with the reviewer, decided, follow-up task, completed. Every stop is built from recorded data and explains who did what and when. |
| **Approval Desk** | Managers review a queue of requests, longest-waiting first, and decide in place with a preview of what approving or rejecting will do. Approving equipment and purchase requests creates a follow-up task. |
| **History** | Read everything you're allowed to see as a timeline through each day; pick a day on the pulse ribbon or filter by tasks, requests or people. |
| **Inbox** | Notifications with unread items first, filters and mark-as-read. |
| **People** | Admins add people, change roles and departments, and deactivate accounts (which signs them out everywhere at once). |
| **Command palette** | Press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> to jump to a page or search the tasks and requests you can open. |

### Roles

- **Employee:** their own tasks and requests, and history that touches them.
- **Manager:** everything above for their department, plus the Approval Desk and task assignment.
- **Admin:** everything across the company and user management. Admins don't approve requests.

The server enforces every rule. The interface only hides what the API would refuse.

## Screenshots

| | |
| --- | --- |
| **Task Atlas: board** ![Board](screenshots/task-atlas-board.png) | **Task Atlas: timeline** ![Timeline](screenshots/task-atlas-timeline.png) |
| **Decision Journey and FlowMap** ![Decision Journey](screenshots/decision-journey.png) | **Approval Desk** ![Approval Desk](screenshots/approval-desk.png) |
| **History** ![History](screenshots/history.png) | **Sign-in** ![Sign-in](screenshots/sign-in.png) |

On phones the rail becomes a tab bar, Mission Control's week becomes a vertical line and FlowMap becomes a vertical journey:

<p>
  <img src="screenshots/phone-mission-control.png" alt="Mission Control on a phone" width="260">
  <img src="screenshots/phone-flowmap.png" alt="FlowMap on a phone" width="260">
</p>

All screenshots come from the seed data in the isolated test database (`npm run screenshots`).

## Design

- **One visual language.** Lines, stops and a NOW marker are used for the week, requests, the task timeline and history, so a pattern learned once reads everywhere. Each section has a line colour (tasks blue, requests amber, approvals mint).
- **Dark-first tokens.** Colours are semantic CSS variables (`surface`, `ink`, `muted`, `accent`, `ok`, `warn`, `bad`) in `frontend/src/index.css`. A light theme only needs a second set of values.
- **Type.** Schibsted Grotesk for headings, IBM Plex Sans for text and IBM Plex Mono for codes, dates and figures. All three are self-hosted (OFL).
- **Honest data.** Nothing is invented. A stage that hasn't happened says so, a completion time that was never recorded says "time not recorded", and notifications say they are fetched when a page opens rather than pushed live.
- **Motion with a purpose.** Lines draw in to NOW, stops pulse when a task moves, panels slide in. With reduced motion turned on, all of it is instant.

## Architecture

```
frontend/                 React 19, Vite, Tailwind CSS 4, React Router 7
  src/pages/              one file per route
  src/components/shell/   icon rail, top bar, phone tab bar, command palette
  src/components/mission/ Mission Control: tickets, week map, request lines, pulse
  src/components/tasks/   Task Atlas: board (dnd-kit), timeline, task panel
  src/components/flow/    FlowMap
  src/services/           API client and pure data-shaping functions (unit tested)
  e2e/                    Playwright workflow and accessibility tests
backend/                  Node.js, Express, Prisma, PostgreSQL
  src/routes, controllers request handling and validation (Zod)
  src/services/           access rules, activity logging, sessions
  prisma/                 schema, migrations and seed data
```

- **Sessions:** cookie-based (`express-session` with the store in PostgreSQL). Passwords are hashed with bcrypt. Logging in starts a new session; changing a password signs out the user's other devices; deactivating a user ends all their sessions.
- **Protection:** every non-GET request needs an `X-Requested-With` header (CSRF), login and password changes are rate-limited, request bodies are capped at 100 kB, and Helmet sets security headers. Password hashes never leave the server.
- **Access control:** `backend/src/services/accessService.js` decides who can see and change each record. Lists, the dashboard, search and the activity history all use the same rules.
- **Time zones:** due dates are calendar days. The browser sends its offset (`X-UTC-Offset`), so "today", "overdue" and "in the past" use the user's own day.

### API overview

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PATCH /api/auth/me`, `POST /api/auth/change-password` | Sessions and profile |
| `GET /api/dashboard/summary`, `GET /api/dashboard/timeline?start=` | Mission Control data and the week's tasks |
| `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id` | Tasks (`pageSize` up to 200 for the board, `canUpdateStatus` on each task) |
| `GET/POST /api/requests`, `GET /api/requests/:id`, `POST /api/requests/:id/decision` | Requests and decisions |
| `POST /api/comments` | Comments on tasks and requests |
| `GET /api/activity`, `GET /api/activity/summary` | History (filter by type or day) and daily counts |
| `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` | Notifications |
| `GET/POST /api/users`, `PATCH /api/users/:id`, `GET /api/users/assignable`, `GET /api/departments` | People |

## Setup

Requirements: Node.js 20+, npm, and Docker.

1. Start PostgreSQL. It runs on port **5433** so it doesn't clash with a local Postgres, and it also creates a `flowops_test` database for the tests.

   ```bash
   docker compose up -d
   ```

2. Set up the backend:

   ```bash
   cd backend
   npm install
   cp .env.example .env          # then set SESSION_SECRET to a long random string
   npx prisma migrate deploy
   npm run db:seed
   npm run dev                    # API on http://localhost:4000
   ```

3. In a second terminal, start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev                    # app on http://localhost:3000
   ```

### Environment variables (`backend/.env`)

| Variable | Example | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://flowops:flowops@localhost:5433/flowops` | PostgreSQL connection |
| `SESSION_SECRET` | a long random string | Signs the session cookie. Never commit a real value. |
| `PORT` | `4000` | API port |
| `NODE_ENV` | `development` | `production` turns on secure cookies |

The tests use `backend/.env.test` (copied from `.env.test.example`), which points at `flowops_test`. Neither `.env` file is committed.

### Demo accounts

All seeded accounts use the password `Password123!`. The people and data are fictional.

| Role | Email |
| --- | --- |
| Admin | admin@flowops.test |
| Manager (Operations) | daniel@flowops.test |
| Manager (IT) | priya@flowops.test |
| Employee | maya@flowops.test |
| Employee | jordan@flowops.test |

## Testing

```bash
# Backend API tests: Vitest + Supertest against the flowops_test database
cd backend
cp .env.test.example .env.test
npm run db:test:setup
npm test

# Frontend unit and component tests: Vitest + React Testing Library
cd frontend
npm test

# End-to-end and accessibility tests: Playwright + axe-core
# (first time: npx playwright install chromium)
# Starts its own servers on ports 3100/4100 and re-seeds only flowops_test.
npm run test:e2e

# Regenerate the README screenshots from the test database
npm run screenshots
```

- **Backend:** role scopes, permissions, validation, sessions, decisions, completion times and time zones.
- **Frontend:** data-shaping logic (week map, request journeys, timelines) and components (palette, board moves and rollbacks, FlowMap, panels, inbox, history).
- **End to end:**
  - the full request → approval → follow-up task → completion workflow;
  - drag and drop, including a refused move;
  - the command palette's permissions;
  - phone navigation;
  - and WCAG 2.2 AA scans of every page, panel and the palette, at desktop and phone sizes, plus reduced motion and the skip link.

## Accessibility

- Every interactive visual works by keyboard. The week map's stops, FlowMap's stages (arrow keys, Home, End), heatmap cells and board cards (Space to pick up, arrows to move, Space to drop) all have keyboard access, with screen-reader announcements for drag and drop.
- Dialogs and panels trap focus, close on Escape and return focus to where you were. A skip link leads to the page content.
- Text colours meet WCAG AA contrast on every surface; secondary text is at least 5.8:1.
- Layouts are checked at 320, 390, 820, 1024 and 1440 px wide with no horizontal scrolling.

## Known limitations

- Notifications are fetched when a page opens; they are not pushed in real time.
- Only the assigned manager can review a request. If that manager is deactivated, their pending requests can't be reassigned from the interface.
- Departments come from the seed data; there is no screen to add or rename them.
- There is no password reset by email. An admin creates accounts with a temporary password.
- The board and timeline load up to 200 tasks at a time and ask you to narrow the filters beyond that.
- Tasks completed before completion times were recorded show "time not recorded".
- The "review started" moment isn't recorded, so FlowMap shows how long a request has waited rather than when review began.
