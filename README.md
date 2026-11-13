# FlowOps

An operations workspace for tasks, requests and approvals.

FlowOps is a full-stack web app for the everyday work inside a small company. Employees work on assigned tasks and ask for things like equipment or IT support, managers review those requests and run their team's work, and admins manage accounts. I built it with React, Express and PostgreSQL, and I drew the work like a transit map: each person is a line through the week, and each request travels through stops from submission to completion.

[![CI](https://github.com/saxipatel-dev/flowops/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/saxipatel-dev/flowops/actions/workflows/ci.yml) ![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![Express 5](https://img.shields.io/badge/Express-5-444?logo=express&logoColor=white) ![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white) ![Prisma 6](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white) ![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white) ![MIT License](https://img.shields.io/badge/license-MIT-blue)

**[Try the live demo →](https://flowops-demo-2vo1.onrender.com)** · [Walkthrough](#walkthrough) · [Features](#features) · [How it works](#how-it-works) · [Running it locally](#running-it-locally) · [Tests](#tests) · [Limitations](#known-limitations)

![Mission Control, the FlowOps dashboard](screenshots/mission-control.png)

## Why I built this

I wanted to build something more involved than a basic CRUD app. An internal operations tool seemed like a good fit because it has real workflows: a request has to be reviewed, an approval creates follow-up work, and different people are allowed to see and do different things. That meant the frontend, backend and database all had to work together, not just store and show records. It also gave me room to try a more visual way of showing task progress and approvals than a plain table. Mostly, I wanted to get better at full-stack development by building one project properly from start to finish.

## What it does

In a small company, tasks, requests and approvals often live in different places: a spreadsheet for tasks, emails for requests, and someone's memory for who approved what. FlowOps keeps them in one place:

- **Tasks:** managers assign work with a priority and due date. The assignee moves it through To Do, In Progress and Completed.
- **Requests:** employees ask for equipment, purchases, IT support or general help, with an optional cost.
- **Approvals:** the requester's manager approves or rejects with a note. Approving an equipment or purchase request automatically creates a follow-up task to fulfil it.
- **Visibility:** each role sees what it needs. Employees see their own work, managers see their department, and admins see everything.
- **History and notifications:** every change is recorded, and people are notified when something changes for them.

## Walkthrough

[![A 40-second walkthrough: dashboard, dragging a task, submitting a request, approving it and seeing the result in History](docs/demo/walkthrough-storyboard.png)](docs/demo/flowops-walkthrough.webm)

[Watch the 40-second walkthrough](docs/demo/flowops-walkthrough.webm) (WebM). It follows one real workflow: a manager moves a task on the board, an employee submits a request, the manager approves it, and the result appears in the request's journey and in History. It was recorded with Playwright against the seeded test data (`npm run demo` records it again).

## Features

### Mission Control

The dashboard answers "what needs me today?" without opening any lists.

- **Needs you:** a queue of tickets for late work, decisions waiting on you and things due soon. Each ticket shows a short count, like "2d late" or "3d waiting".
- **Week map:** one line per person with a stop on each task's due date and a NOW line. You can pick a stop and start, complete or reopen the task right there. The change shows straight away and is undone if the server refuses it.
- **Request lines:** each open request as a small five-stop line. You can hover or tap a stop to see who did what and when.
- **Operations Pulse:** 13 weeks of activity as a heatmap. Pick a day to read what happened.

### Task Atlas

The same tasks in three views. Filters, the current view and the open task are kept in the URL, so a reload or a shared link brings you back to the same place.

| Board | Timeline |
| --- | --- |
| ![Task board](screenshots/task-atlas-board.png) | ![Task timeline](screenshots/task-atlas-timeline.png) |

- **Board:** drag cards between To Do, In Progress and Completed with a mouse, touch or the keyboard (Space to pick up, the arrow keys to move, Space to drop, with screen-reader announcements). Every movable card also has a "Move to" menu.
- **Timeline:** each task is a bar from the day it was created to its due date, with late work pinned in its own lane.
- **List:** a searchable, filterable table.
- **Task panel:** tasks open in a side panel; Back or Escape closes it.

### FlowMap and the Decision Journey

![Decision Journey for an approved request with a follow-up task in progress](screenshots/decision-journey.png)

Every request has a FlowMap: Submitted → With reviewer → Decision → Follow-up task → Completed. It's built only from what the database recorded:

- **Unfinished stages:** a stage that hasn't happened says so.
- **Rejections:** a rejected request ends at a red stop, and the later stages show as "does not apply".
- **Missing times:** a completion time that was never recorded shows as "time not recorded".

Each stop is a button (arrow keys, Home and End work too) that explains who did what, when, and the decision note. On a phone it turns into a vertical journey. The rest of the page has the decision record, the request details, comments and the full history.

### Approval Desk

![Approval Desk with the review queue and the decision form](screenshots/approval-desk.png)

Managers get a queue of requests sorted by how long they've been waiting. Picking one opens it next to the queue with its FlowMap and the decision form, so they can decide without leaving the page. Before deciding, the form shows what will happen: who gets notified and what follow-up task will be created, for whom and when. The server checks every decision again, including that the request is still pending.

### Also included

- **History:** a timeline of everything you're allowed to see, with a 13-week pulse ribbon to jump to a day and filters for tasks, requests and people.
- **Inbox:** notifications with unread ones first, filters, and mark as read.
- **People:** admins add people, change roles and departments, and deactivate accounts.
- **Profile:** your details and your open work, plus a password change, which signs out your other devices.
- **Command palette:** <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> jumps to pages and searches the tasks and requests you can open.
- **Phones and keyboards:** every page works on a phone, and the interactive pieces (week map, board, FlowMap, heatmap) work with the keyboard.

<details>
<summary>More screenshots</summary>

| History | Sign-in |
| --- | --- |
| ![History](screenshots/history.png) | ![Sign-in page](screenshots/sign-in.png) |

| Mission Control on a phone | FlowMap on a phone |
| --- | --- |
| <img src="screenshots/phone-mission-control.png" alt="Mission Control on a phone" width="300"> | <img src="screenshots/phone-flowmap.png" alt="FlowMap on a phone" width="300"> |

</details>

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | React 19, JavaScript, Vite, Tailwind CSS 4, React Router, Axios, dnd-kit (drag and drop), Lucide icons |
| Backend | Node.js, Express 5, REST API, express-session with sessions stored in PostgreSQL, Zod (validation), bcryptjs, Helmet, express-rate-limit |
| Database | PostgreSQL 16, Prisma ORM (schema, migrations, seed data) |
| Testing | Vitest, Supertest, React Testing Library, Playwright, axe-core |
| Tooling | Docker Compose (for PostgreSQL), Git, GitHub Actions |

## How it works

```mermaid
flowchart LR
    Browser["React app<br/>(Vite, Tailwind)"] -->|"JSON REST calls<br/>with a session cookie"| API

    subgraph API["Express API"]
        direction TB
        MW["Middleware<br/>session, CSRF header, rate limits"] --> Auth["requireAuth / requireRole"]
        Auth --> Routes["Controllers<br/>Zod validation"]
        Routes --> Access["Access rules<br/>accessService"]
        Routes --> Log["Activity log<br/>and notifications"]
    end

    Routes --> Prisma["Prisma Client"]
    Access --> Prisma
    Log --> Prisma
    Prisma --> DB[("PostgreSQL<br/>data + sessions")]
```

As an example, here's what happens when a manager approves a request:

1. The decision form sends `POST /api/requests/:id/decision` with the session cookie and an `X-Requested-With` header. The server rejects state-changing requests without that header, as a simple CSRF guard.
2. `requireAuth` loads the user from the session, and `requireRole('MANAGER')` stops anyone else.
3. The controller validates the body with Zod and checks that this manager is the request's reviewer.
4. In one database transaction it updates the request only if it's still pending, writes the activity log entry, notifies the requester, and creates the follow-up task.
5. The API returns the updated request, and the page redraws the FlowMap with the new follow-up stage.

### Engineering notes

- **Access rules live in one place.** `backend/src/services/accessService.js` decides who can see and change each task and request. Lists, the dashboard, the command palette search and History all use the same rules, so the frontend only hides what the API would refuse anyway.
- **Decisions can't happen twice.** The approval update only matches requests that are still pending, inside a transaction. A second decision, including two sent at the same moment, gets a clear conflict error. Both cases have tests.
- **Task permissions are narrow.** Assignees can only change a task's status. Managers can edit their own team's tasks. A task's completion time is set when it's completed and cleared if it's reopened.
- **Optimistic updates with a way back.** Moving a task on the board or the week map updates the screen first. If the server refuses, the card moves back and the server's reason is shown.
- **Sessions end when they should.** Signing in starts a fresh session, changing your password signs out your other devices, and deactivating someone ends all their sessions immediately.
- **Dates are calendar days.** The browser sends its UTC offset, so "today", "overdue" and "in the past" use your own day rather than the server's.
- **Visualizations are pure functions first.** The week map layout, request journeys and timeline placement are built by small functions in `frontend/src/services/` with their own unit tests, and the components only draw the result.

## What I learned

- Permissions get complicated quickly once there are three roles. Keeping every rule in one backend service made lists, the dashboard and detail pages agree, and edge cases still turned up: at one point a manager who had been demoted could still be picked as a request's reviewer.
- Dates were harder than expected. Due dates are calendar days, but the server ran in UTC, so tasks could show as overdue too early in the evening. Sending the browser's offset fixed it.
- Drawing workflows is mostly layout work: labels colliding on narrow weekend columns, lines that had to stretch when a panel opened on a phone, and making all of it reachable by keyboard.
- Automated accessibility checks found real problems I had missed, mostly controls whose accessible name didn't match the visible text.
- Testing flows that involve several users (an employee submits, a manager approves) needed an isolated, re-seeded test database so the tests never touch development data.

## Live demo

**https://flowops-demo-2vo1.onrender.com**: sign in with one click as Maya (employee), Daniel (manager) or Grace (admin).

- It runs on Render's free plan with a Neon PostgreSQL database. The free plan sleeps after about 15 minutes without visitors, so the first page can take 30 to 60 seconds to load.
- All data is fictional and resets to fresh demo data every time the server starts.
- Changing passwords, editing profiles and creating or deactivating users are turned off in the demo, so visitors can't lock each other out of the shared accounts.
- One Render service runs the Express API and serves the built React app, so the site and its session cookie share one origin. The setup is in [`render.yaml`](render.yaml).

## Running it locally

You'll need Node.js 22 (the version I develop and run CI with), npm, and Docker.

1. Clone the repository and start PostgreSQL. Docker Compose runs it on port 5433, so it won't clash with a local Postgres. It also creates a separate `flowops_test` database for the tests.

   ```bash
   git clone https://github.com/saxipatel-dev/flowops.git
   cd flowops
   docker compose up -d
   ```

2. Set up and start the backend:

   ```bash
   cd backend
   npm install
   cp .env.example .env           # then set SESSION_SECRET to a long random string
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

### Environment variables

These go in `backend/.env`; `.env.example` has the defaults.

| Variable | Example | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://flowops:flowops@localhost:5433/flowops` | PostgreSQL connection (the local Docker database) |
| `SESSION_SECRET` | a long random string | Signs the session cookie. The server won't start without it. |
| `PORT` | `4000` | API port |
| `NODE_ENV` | `development` | `production` turns on secure cookies |

The tests use `backend/.env.test` (copy it from `.env.test.example`), which points at `flowops_test`. The frontend doesn't need an env file: its dev server forwards `/api` to `http://localhost:4000`, and you can set `API_PROXY_TARGET` to point it somewhere else.

### Demo accounts

The seed creates fictional people. Every account's password is `Password123!`.

| Role | Email |
| --- | --- |
| Admin | admin@flowops.test |
| Manager (Operations) | daniel@flowops.test |
| Manager (IT) | priya@flowops.test |
| Employee | maya@flowops.test |
| Employee | jordan@flowops.test |

## Tests

```bash
# Backend: API tests with Vitest and Supertest against flowops_test
cd backend
cp .env.test.example .env.test
npm run db:test:setup
npm test

# Frontend: unit and component tests with Vitest and React Testing Library
cd frontend
npm test

# End-to-end and accessibility tests with Playwright and axe-core
# (first time only: npx playwright install chromium)
# Starts its own servers on ports 3100 and 4100 and re-seeds only flowops_test.
npm run test:e2e
```

- **Backend (74 tests):** role scopes, permissions, validation, sessions and password changes, request decisions (including double approvals), completion times, and time zones.
- **Frontend (74 tests):** the layout and journey functions, plus components such as the command palette, board moves and rollbacks, FlowMap, panels, the inbox and history.
- **End-to-end (22 tests):**
  - the whole submit → approve → follow-up task → complete flow across two accounts;
  - drag and drop, including a move the server refuses;
  - phone navigation and permissions in search;
  - automated axe-core checks against WCAG 2.2 AA rules on every page at desktop size and the main pages at phone size, plus checks for reduced motion and the skip link.

GitHub Actions runs all three suites and the production build on every push and pull request (`.github/workflows/ci.yml`). The backend and end-to-end jobs each start their own PostgreSQL container.

`npm run screenshots` and `npm run demo` regenerate the README images and the walkthrough from the seeded test data.

## Project structure

```
backend/
  prisma/              schema, migrations and seed data
  src/routes/          URL → controller, with auth and role guards
  src/controllers/     request handling and Zod validation
  src/services/        access rules, activity logging, sessions
  tests/               API tests
frontend/
  src/pages/           one component per route
  src/components/      shell, mission (dashboard), tasks, flow (FlowMap) and shared UI
  src/services/        API client and the pure layout and journey functions
  e2e/                 Playwright workflow and accessibility tests
docs/demo/             walkthrough video and storyboard
screenshots/           README images
```

## Known limitations

- Notifications are fetched when you open a page. They aren't pushed live.
- Only the assigned manager can review a request. If that manager is deactivated, their pending requests can't be reassigned from the app.
- Departments come from the seed data; there's no screen to add or rename them.
- There's no password reset by email. An admin creates accounts with a temporary password.
- The board and timeline load up to 200 tasks at a time and ask you to narrow the filters beyond that.
- Tasks completed before completion times were tracked show "time not recorded", and FlowOps doesn't record when a review started, only how long a request waited.
- It's a portfolio project. The public demo is the only deployment, and it hasn't been used in production.

## License

[MIT](LICENSE). The bundled fonts, Schibsted Grotesk, IBM Plex Sans and IBM Plex Mono, are installed from npm (Fontsource) under the SIL Open Font License.
