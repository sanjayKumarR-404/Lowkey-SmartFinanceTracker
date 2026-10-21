# PROJECT CONTEXT — Lowkey Smart Finance Tracker

## Overview

**Project Name:** Lowkey — Smart Finance Tracker  
**Course:** Full Stack Technologies (College Major Project)  
**Stack:** MERN (MongoDB, Express, React, Node.js)

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Vite                   |
| Backend    | Node.js + Express                 |
| Database   | MongoDB with Mongoose ODM         |
| Auth       | JWT (JSON Web Tokens)             |
| Styling    | Vanilla CSS / component styles    |

---

## Features

1. **JWT Authentication** — Secure login and registration; tokens stored client-side.
2. **Manual Transaction Entry** — User can add income/expense records by hand.
3. **Bank SMS Parser** — User pastes a bank SMS; the app parses amount, type, and merchant automatically.
4. **CSV Bank Statement Import** — Upload a bank-exported CSV; transactions are bulk-imported.
5. **Auto-Categorization** — Transactions are automatically assigned a category (e.g., Food, Travel) based on keywords/merchant name.
6. **Monthly Budgets** — Set a spending limit per category per month; get alerts when close to limit.
7. **Recurring Payments** — Track subscriptions or EMIs that repeat on a schedule.
8. **Dashboard with Charts** — Visual summary of spending, income, and budget progress using charts.

---

## Folder Layout

```
Lowkey-SmartFinanceTracker/
├── backend/          # Node.js + Express API server
│   ├── controllers/  # Route handler functions
│   ├── models/       # Mongoose schemas
│   ├── routes/       # Express route definitions
│   ├── middleware/   # Auth checks, error handling
│   ├── utils/        # Helper functions (SMS parser, CSV parser, etc.)
│   └── server.js     # App entry point
│
├── frontend/         # React + Vite client
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page-level components (Dashboard, Login, etc.)
│   │   ├── context/     # React Context for global state (auth, etc.)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # Axios API call functions
│   │   └── main.jsx     # App entry point
│   └── index.html
│
├── docs/             # Project documentation, diagrams, reports
├── .env.example      # Template showing required environment variables (no real secrets)
├── PROJECT_CONTEXT.md  # This file — project reference for the AI assistant
└── README.md
```

---

## Coding Rules (for ALL future tasks)

These rules apply to every file created or modified in this project:

1. **Simple, readable code** — Write code a student can understand and explain in a viva. Avoid clever one-liners or advanced patterns that obscure intent.
2. **Comments explain *why*, not just *what*** — e.g., `// We decode the JWT here to get the logged-in user's ID` not just `// decode token`.
3. **No secrets in code** — All credentials, keys, and connection strings go in `.env`. Always provide a matching `.env.example` with placeholder values.
4. **Minimal file scope** — Only touch files that the current task actually requires. Do not refactor unrelated code.
5. **Post-task summary** — After every task, provide a short plain-English summary of every file created or changed, and what it does.

---

## Environment Variables

All tasks that introduce new environment variables must add them to `.env.example`.  
The real `.env` file is **never committed to git**.

Example variables (will grow as features are added):

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

---

## Notes for the AI Assistant

- This file is your reference for every task in this project.
- Always check this file first before making assumptions about the stack or structure.
- The student must be able to explain all code in a college viva — simplicity is more important than cleverness.
- When in doubt, write more comments, not fewer.
