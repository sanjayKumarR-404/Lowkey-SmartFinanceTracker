# Lowkey: Smart Finance Tracker

A personal finance tracker built with the MERN stack. You can add a transaction by typing it, by pasting a bank SMS that the app reads for you, or by importing a bank statement CSV. The app sorts each transaction into a category, tracks budgets and recurring payments, and shows a clear monthly dashboard.

Built by **Sanjay Kumar R** as the AAT-1 portfolio project for **Full Stack Technologies (22CSE71)**, Department of Computer Science and Engineering, New Horizon College of Engineering.

---

## Objective

Almost every UPI payment or card swipe in India sends a bank SMS, but those messages just sit in the inbox. Most finance apps need bank linking, cost money, or do not understand Indian message formats and rupee formatting.

Lowkey is a simple and private alternative. The goal of the project is to:

- let a user keep their own financial records safely, with every account fully separate from the others,
- make adding transactions quick, by reading bank SMS messages and CSV statements,
- turn the raw records into useful monthly numbers, budgets and reminders.

## Features

**Accounts and security**
- Register and log in with a hashed password and a signed JWT.
- Every record belongs to one user. Nobody can read, edit or delete another user's data.

**Adding transactions**
- **Manual entry** with a clean slide-over form (a bottom sheet on phones).
- **Paste an SMS:** the app reads the amount, type (spent or received), merchant, date and account digits. You always see a preview and confirm before anything is saved.
- **CSV import** for bank statements.
- Safe delete with a five-second **Undo**.

**Smart helpers**
- **SMS parser** written with plain regular expressions. It tells the payment amount apart from the "Avl Bal" amount and ignores OTP, offer and bill reminder messages.
- **Auto-categorization** from the merchant name (for example Swiggy goes to Food & dining).
- **Learning from corrections:** when you change a category, the app remembers it for that merchant and offers to fix your older transactions too.
- **Recurring payment detection** from your past transactions.

**Planning**
- **Budgets:** a monthly limit for each category, progress bars, and clear "Near limit" and "Over by" warnings.
- **Recurring payments:** subscriptions, bills and EMIs with an upcoming list, a calendar view, and pause, edit and delete controls.

**Dashboard**
- Net savings for the month compared with the previous month.
- Six-month cash flow chart, spending by category donut, top merchants, and a short written summary of the month.
- Recent transactions, budget status and upcoming payments.

**Interface**
- Light and dark themes, a phone layout, a Ctrl+K command palette, and all amounts in rupees with Indian digit grouping (for example ₹1,25,000).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, Recharts, motion, lucide-react, date-fns, plain CSS with CSS variables, Fontsource (Geist and Fraunces) |
| Backend | Node.js, Express.js, Helmet, CORS, Morgan, express-rate-limit, dotenv |
| Database | MongoDB Atlas, Mongoose |
| Auth | JSON Web Tokens (jsonwebtoken), bcryptjs |
| Logic | JavaScript regular expressions and keyword rules (no machine learning libraries) |
| Tools | Git, GitHub, PowerShell, Google Antigravity (AI-assisted IDE) |

## Project structure

```
Lowkey-SmartFinanceTracker/
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # Route logic (auth, transactions, analytics, budgets, recurring)
│   ├── middleware/      # JWT check, 404 handler, error handler
│   ├── models/          # User, Transaction, CategoryRule, Budget, Recurring
│   ├── routes/          # Express route definitions
│   ├── scripts/         # seedDemoData.js (demo data for development)
│   ├── tests/           # SMS and category test scripts with sample data
│   ├── utils/           # smsParser.js, categorizer.js, recurringDetector.js
│   └── server.js        # Entry point
├── frontend/
│   └── src/
│       ├── components/  # Sidebar, TopBar, MobileTabBar, CommandPalette, TransactionDrawer, ...
│       ├── constants/   # Category list with colors and icons
│       ├── context/     # Auth, Theme, Toast and drawer state
│       ├── pages/       # Login, Register, Dashboard, Transactions, Budgets, Recurring, Import
│       ├── services/    # Axios API calls
│       └── utils/       # Rupee and date formatting helpers
├── docs/
│   ├── DESIGN_GUIDE.md  # Colors, fonts, spacing and motion rules
│   └── screenshots/     # Screenshots used in this README
├── .env.example         # Template for environment variables
├── PROJECT_CONTEXT.md   # Project description and coding rules
└── README.md
```

## Getting started

### What you need

- [Node.js](https://nodejs.org) (LTS version) and npm
- [Git](https://git-scm.com)
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) account

### 1. Set up the database

1. In MongoDB Atlas, create a free **M0** cluster.
2. Under **Database Access**, create a database user and save the password.
3. Under **Network Access**, allow your IP address.
4. Click **Connect, then Drivers**, and copy the connection string. Replace `<db_password>` with your password and add a database name after `.mongodb.net/`, so it ends like this:
   `...mongodb.net/financetracker?retryWrites=true&w=majority`

### 2. Clone and configure

```bash
git clone https://github.com/sanjayKumarR-404/Lowkey-SmartFinanceTracker.git
cd Lowkey-SmartFinanceTracker
```

Copy the environment template and fill in your values (see [Environment variables](#environment-variables)):

```bash
# Windows (PowerShell or Command Prompt)
copy .env.example .env

# macOS or Linux
cp .env.example .env
```

To make a strong `JWT_SECRET`, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

You should see **MongoDB connected** in the terminal. Open `http://localhost:5000/api/health` and you should get `{"status":"ok"}`.

### 4. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env` with this line (or copy `frontend/.env.example`):

```
VITE_API_URL=http://localhost:5000/api
```

Then run:

```bash
npm run dev
```

Open `http://localhost:5173`, register an account, and you are ready to go.

### 5. Add sample data (optional)

To fill an account with realistic demo transactions so the charts look populated:

```bash
cd backend
npm run seed:demo -- your-email@example.com
```

Add `--reset` to remove the earlier demo data first. This script refuses to run when `NODE_ENV` is `production`.

## Environment variables

**Root `.env`** (used by the backend):

| Variable | What it is |
|---|---|
| `PORT` | Port for the API. Default `5000`. |
| `MONGO_URI` | Your MongoDB Atlas connection string. |
| `JWT_SECRET` | A long random secret used to sign login tokens. |
| `JWT_EXPIRES_IN` | How long a login token stays valid, for example `7d`. |

**`frontend/.env`:**

| Variable | What it is |
|---|---|
| `VITE_API_URL` | Base URL of the API, for example `http://localhost:5000/api`. |

The real `.env` files are ignored by Git. Only the `.env.example` templates are committed.

## Useful scripts

Run these from the `backend` folder:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API with nodemon (restarts on every change). |
| `npm start` | Starts the API with plain Node. |
| `npm run seed:demo -- <email>` | Creates demo transactions and budgets for an account. |
| `npm run test:sms` | Runs the SMS parser against the sample messages and prints accuracy. |
| `npm run test:category` | Runs the categorizer against sample merchants and prints accuracy. |

From the `frontend` folder:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app at `http://localhost:5173`. |
| `npm run build` | Creates a production build. |

## Trying the SMS parser

Click **Add transaction**, open the **Paste SMS** tab, and paste this made-up message:

```
HDFC Bank: Rs. 1,250.00 debited from A/c **4321 on 21-10-26 to SWIGGY. Avl Bal: Rs. 45,210.50.
```

The app reads it as:

| Field | Result |
|---|---|
| Type | Expense |
| Amount | ₹1,250.00 (not the ₹45,210.50 balance) |
| Merchant | SWIGGY |
| Date | 21 Oct 2026 |
| Category (suggested) | Food & dining |

You can edit any field, then press **Looks right? Save it**. Messages that are not transactions, such as OTPs, are rejected with a short message.

## API overview

All routes except register, login and health need the header `Authorization: Bearer <token>`.

| Area | Method and route | What it does |
|---|---|---|
| Health | `GET /api/health` | Checks that the server is running. |
| Auth | `POST /api/auth/register` | Creates an account and returns a token. |
| Auth | `POST /api/auth/login` | Logs in and returns a token. |
| Auth | `GET /api/auth/me` | Returns the logged-in user. |
| Transactions | `GET /api/transactions` | Lists transactions (filters: `type`, `category`, `month`, `year`, `search`, `page`, `limit`). |
| Transactions | `POST /api/transactions` | Adds a transaction. |
| Transactions | `PUT /api/transactions/:id` | Edits a transaction (owner only). |
| Transactions | `DELETE /api/transactions/:id` | Deletes a transaction (owner only). |
| Transactions | `GET /api/transactions/summary` | Income, expense and net for a month. |
| Transactions | `POST /api/transactions/parse-sms` | Reads a bank SMS and returns a preview. Saves nothing. |
| Transactions | `GET /api/transactions/suggest-category` | Suggests a category for a merchant. |
| Transactions | `POST /api/transactions/recategorize` | Moves all transactions of a merchant to one category. |
| Analytics | `GET /api/analytics/overview` | Dashboard numbers for a month. |
| Budgets | `GET /api/budgets` | Budgets with spent, remaining and status for a month. |
| Budgets | `GET /api/budgets/suggestions` | Suggested limits from the last 3 months. |
| Budgets | `POST /api/budgets` | Creates or updates a budget. |
| Budgets | `DELETE /api/budgets/:id` | Deletes a budget. |
| Recurring | `GET /api/recurring` | Lists recurring items and the monthly total. |
| Recurring | `GET /api/recurring/upcoming` | Payments due in the next days. |
| Recurring | `GET /api/recurring/suggestions` | Recurring payments found in past transactions. |
| Recurring | `POST /api/recurring` | Adds a recurring item. |
| Recurring | `PUT /api/recurring/:id` | Edits, pauses, resumes or dismisses an item. |
| Recurring | `DELETE /api/recurring/:id` | Deletes an item. |

## Security

- **Passwords** are never stored. They are hashed with bcryptjs (cost factor 12).
- **JWT** tokens are signed with a secret kept in `.env`, and checked on every protected route.
- **Ownership checks:** each record stores its owner. Editing or deleting someone else's record returns `404`, so it does not even reveal that the record exists.
- **Rate limiting** allows at most 10 login or register requests per IP in 15 minutes.
- **Helmet** adds standard security headers, and search text is escaped before it is used in a database query.
- **Secrets stay out of Git.** `.env` is ignored, and only `.env.example` is committed.

## Tests

Two plain Node scripts test the logic without any test framework:

- `npm run test:sms` runs 42 sample bank messages (HDFC, SBI, ICICI, Axis, Kotak, Paytm and generic UPI styles, including 7 that must be rejected). Result: **42 of 42 passed**.
- `npm run test:category` runs 45 sample merchants. Result: **45 of 45 passed**.

The sample messages were made for testing, so these scores show that the logic works on the formats it was written for. They do not prove that every real bank message will be read correctly.


## Author
**Sanjay Kumar R**    
**GitHub:** [@sanjayKumarR-404](https://github.com/sanjayKumarR-404)
