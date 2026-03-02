# PSAU Student Registration System
## Integration Package — CSS Architecture + SQLite Dev Database

---

## 📦 What's in This Package

```
psau-integration/
├── README.md                          ← You are here
│
├── styles/                            ← DROP THIS ENTIRE FOLDER into client/src/
│   ├── main.css                       ← Master entry point (already linked in HTML)
│   ├── base/
│   │   ├── _variables.css             ← Design tokens (colours, spacing, motion…)
│   │   ├── _reset.css                 ← Modern CSS reset + page scaffold
│   │   └── _typography.css            ← Heading scale, badges, status pills
│   ├── layout/
│   │   ├── _layout.css                ← Container, grid, page-header, card wrapper
│   │   └── _navbar.css                ← Sticky nav, hamburger, user pill, logout btn
│   ├── components/
│   │   ├── _buttons.css               ← Primary / secondary / danger / ghost / icon
│   │   ├── _forms.css                 ← All input types, searchable dropdown, filter row
│   │   ├── _tables.css                ← Data table, alternating rows, pagination
│   │   ├── _alerts.css                ← Floating toasts + inline alerts (4 variants each)
│   │   └── _loading.css               ← Spinners, skeleton shimmer, chart overlay
│   ├── pages/
│   │   ├── _login.css                 ← Hero gradient, login card, features grid
│   │   ├── _dashboard.css             ← Stat cards (stagger animation), widget panels
│   │   └── _receipts.css              ← Receipt form states, paid-items, print template
│   └── utils/
│       ├── _rtl.css                   ← Arabic RTL overrides
│       └── _print.css                 ← Clean print styles for receipt printing
│
├── server/
│   ├── config/
│   │   └── database.sqlite.js         ← Drop-in SQLite replacement for database.js
│   └── scripts/
│       └── db-sqlite-setup.js         ← One-time database creation + seed script
```

---

## 🎨 PART 1 — CSS Integration

### Step 1 — Copy the styles folder

Replace (or delete) the existing `client/src/styles/` folder with the one from this package:

```
# From your project root:
rm -rf client/src/styles
cp -r styles/ client/src/styles/
```

Or on Windows:
```
rmdir /s /q client\src\styles
xcopy /E /I styles client\src\styles
```

---

### Step 2 — Verify the HTML link is correct

Open `client/index.html` (and `client/src/index.html` if it exists) and confirm this line is present in `<head>`:

```html
<link rel="stylesheet" href="src/styles/main.css">
```

The `main.css` file is the **only** stylesheet you need to link — it imports everything else automatically via `@import`. Do **not** add individual `<link>` tags for the sub-files.

If your HTML already has `<link rel="stylesheet" href="/src/styles/main.css">` (absolute path with leading `/`), that's also correct. Both work depending on how your server serves static files.

---

### Step 3 — Verify your base.html template

Open `client/src/templates/base.html` and confirm the CSS link reads:

```html
<link rel="stylesheet" href="/src/styles/main.css">
```

No other CSS links are needed. If you see any old `styles.css` or other stylesheet references, remove them.

---

### Step 4 — Check Font Awesome is loaded

The component styles use Font Awesome icons. The `<head>` in `base.html` should already have:

```html
<link rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
```

If it's missing, add it **before** the main.css link.

---

### Step 5 — Verify Tajawal font loads

The `<head>` should also have:

```html
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
      rel="stylesheet">
```

Add it **before** main.css if missing.

---

### CSS Architecture — Key Points

#### Design Tokens (the only place to change the theme)

Every colour, spacing value, shadow, and animation duration is defined as a CSS custom property in `styles/base/_variables.css`. To change the primary brand colour for the entire app, you only need to edit one line:

```css
/* _variables.css */
--clr-brand-700: #5A2D8A;   /* ← change this */
```

#### Class Name Reference

| What you need             | Class(es) to use                                     |
|---------------------------|------------------------------------------------------|
| Primary button            | `btn-primary`                                        |
| Secondary/outlined button | `btn-secondary`                                      |
| Danger/delete button      | `btn-danger`                                         |
| Icon-only button          | `btn-icon`                                           |
| Delete icon button        | `btn-icon btn-delete`                                |
| Text input                | `form-control`                                       |
| Form field wrapper        | `form-group`                                         |
| Two-column form layout    | `form-row` (wraps two `.form-group` divs)            |
| Form card container       | `form-container`                                     |
| Form action row           | `form-actions`                                       |
| Table wrapper             | `table-container`                                    |
| Data table                | `<table>` inside `.table-container`                  |
| Page header               | `page-header`                                        |
| Floating toast            | Added dynamically via `#message-container`           |
| Inline alert              | `alert alert-success/error/warning/info`             |
| Spinning loader           | `spinner` (inline) or `loading-spinner` (full-page)  |
| Skeleton loader           | `skeleton skeleton-text` or `skeleton skeleton-rect` |
| Badge/pill                | `badge badge-primary/success/error/warning/gold`     |
| Student status badge      | `status-badge status-badge-P/R/C/I`                  |
| Searchable dropdown       | `searchable-input` → child `.search-results`         |

#### RTL Support

The styles use CSS logical properties (`padding-inline-start`, `margin-inline-end`, etc.) throughout, which means RTL works automatically when `<html dir="rtl">` is set. The `_rtl.css` file only overrides the small number of cases where logical properties weren't sufficient.

The app already switches `dir` via `setLanguage()` in `main.js` — no additional work needed.

---

## 🗄️ PART 2 — SQLite Database (Development)

The original project uses Oracle, which requires Oracle Instant Client installed on your machine. For local development, this package provides a full SQLite replacement that requires zero external dependencies beyond a Node.js package.

### Step 1 — Install better-sqlite3

Navigate to the `server/` directory and install the package:

```bash
cd server
npm install better-sqlite3
```

> **Windows note:** `better-sqlite3` compiles a native addon. If you get a build error, install the Windows build tools first:
> ```
> npm install --global windows-build-tools
> ```
> Or use the pre-built binary:
> ```
> npm install better-sqlite3 --build-from-source
> ```

---

### Step 2 — Replace the database adapter

Copy `database.sqlite.js` from this package into your server config directory and rename it:

```bash
# From your project root:
cp server/config/database.js server/config/database.oracle.js   # keep Oracle as backup
cp <this-package>/server/config/database.sqlite.js server/config/database.js
```

On Windows:
```
copy server\config\database.js server\config\database.oracle.js
copy <this-package>\server\config\database.sqlite.js server\config\database.js
```

The new `database.js` exposes the **identical API** as the original:
- `initialize()` — opens the SQLite file and sets WAL mode
- `close()` — closes the connection
- `executeQuery(sql, params)` — executes any query, returns `{ rows: [...] }`
- `getConnection()` — compatibility shim (not needed for SQLite but keeps old code working)

No other server files need to change.

---

### Step 3 — Run the setup script

Copy `db-sqlite-setup.js` into `server/scripts/` then run it once:

```bash
cp <this-package>/server/scripts/db-sqlite-setup.js server/scripts/db-sqlite-setup.js
cd server
node scripts/db-sqlite-setup.js
```

This will:
1. Create the `data/` directory (one level above `server/`) if it doesn't exist
2. Create the SQLite database file at `data/psau_dev.db`
3. Create all 4 tables: `DEPARTMENT`, `USERS`, `STUDENT`, `RECEIPT`
4. Create all indexes
5. Seed an admin user (`admin` / `Admin@1234`)
6. Seed 5 sample departments

You should see output like:
```
🛠   PSAU SQLite Setup
    DB path: /your/project/data/psau_dev.db

✅  _sequences table ready
✅  DEPARTMENT table ready
✅  USERS table ready
✅  STUDENT table ready
✅  RECEIPT table ready

👤  Admin user seeded:
    Username : admin
    Password : Admin@1234  ← change this immediately!
    User ID  : ADMIN1

📚  Seeded 5 sample departments

✨  Database setup complete.
```

---

### Step 4 — Set environment variables (optional)

You can customise the database path and initial admin credentials by adding these to `server/.env`:

```env
# SQLite (development only)
SQLITE_PATH=../../data/psau_dev.db

# Initial admin credentials (only used by the setup script)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword
ADMIN_ID=ADMIN1

# Keep NODE_ENV as development to prevent the app from exiting on DB errors
NODE_ENV=development
```

---

### Step 5 — Start the server

```bash
cd server
npm run dev
```

The server will connect to SQLite automatically. You should see:
```
[INFO]: SQLite database connected: /your/project/data/psau_dev.db
[INFO]: Server running on port 5000 in development mode
```

Login with `admin` / `Admin@1234`.

---

### How the SQL Translation Works

The SQLite adapter automatically translates Oracle-specific SQL into SQLite-compatible SQL at runtime. You do **not** need to modify any model files. Here's what gets translated:

| Oracle syntax                                   | SQLite equivalent                              |
|-------------------------------------------------|------------------------------------------------|
| `SRRA.STUDENT` (schema prefix)                  | `STUDENT`                                      |
| `SYSDATE`                                       | `datetime('now')`                              |
| `TRUNC(col) = TO_DATE(:p, 'YYYY-MM-DD')`        | `DATE(col) = @p`                               |
| `SELECT ... NEXTVAL AS X FROM DUAL`             | Internal `_sequences` table increment          |
| `:paramName` (Oracle bind syntax)               | `@paramName` (SQLite named params)             |
| `ROWNUM` pagination (double/single nest)        | `LIMIT @limit OFFSET @offset`                  |
| Column names returned as lowercase              | Auto-uppercased to match Oracle behaviour      |

---

### Switching Back to Oracle

When you're ready to deploy with Oracle, simply restore the original adapter:

```bash
cp server/config/database.oracle.js server/config/database.js
```

No model or controller files need to change in either direction.

---

## 🗂️ Final Project Structure After Integration

```
your-project/
├── data/
│   └── psau_dev.db                    ← SQLite dev database (auto-created)
│
├── client/
│   ├── index.html
│   └── src/
│       ├── styles/                    ← ✅ REPLACED with this package
│       │   ├── main.css
│       │   ├── base/
│       │   ├── layout/
│       │   ├── components/
│       │   ├── pages/
│       │   └── utils/
│       ├── main.js
│       ├── pages/
│       └── ...
│
└── server/
    ├── config/
    │   ├── database.js                ← ✅ REPLACED with SQLite adapter
    │   └── database.oracle.js         ← Original Oracle adapter (backup)
    ├── scripts/
    │   ├── db-sqlite-setup.js         ← ✅ ADDED — run once to create DB
    │   └── db-setup.js                ← Original Oracle setup (unchanged)
    ├── models/                        ← UNCHANGED
    ├── controllers/                   ← UNCHANGED
    ├── routes/                        ← UNCHANGED
    └── ...
```

---

## ❓ Troubleshooting

**`@import` rules not working / styles not loading**
- Make sure your Express server serves static files from `client/` with `express.static()`. The `@import` rules are resolved by the browser, so all CSS files must be reachable over HTTP.
- Check browser DevTools → Network tab → filter by CSS to see which files are 404.

**`better-sqlite3` install fails on Windows**
- Run as Administrator
- Install: `npm install --global --production windows-build-tools`
- Then retry: `npm install better-sqlite3`

**`Cannot find module 'better-sqlite3'`**
- Make sure you ran `npm install better-sqlite3` inside the `server/` directory, not the project root.

**Login fails after SQLite setup**
- Confirm `NODE_ENV=development` is set in `server/.env` — in production mode, a failed DB init causes the process to exit.
- Re-run the setup script if the database file was deleted.

**Styles look broken / no colours**
- Confirm `client/src/styles/main.css` exists and all sub-folders (`base/`, `layout/`, etc.) are present.
- Open browser DevTools → Console — look for CSS `@import` 404 errors.

---

## 📝 Notes

- The SQLite adapter is **for development only**. Oracle remains the production database.
- The `data/psau_dev.db` file should be added to `.gitignore`.
- All CSS files use CSS custom properties — no preprocessor (Sass/Less) is needed.
- The design system tokens in `_variables.css` are the single source of truth for all visual decisions. Never hard-code colour hex values in component files.
