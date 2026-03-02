# PSAU System — 100% Codebase Analysis
### Bugs · Inconsistencies · Security · Enhancements · Recruiter Strategy

---

## ⚠️ CRITICAL BUGS (break functionality right now)

### 1. Route Shadow Bug — `/receipts/search` returns a receipt, not search results
**File:** `server/routes/index.js`

```js
// ✅ These are fine — defined before /:id
router.get('/receipts/amounts', receiptController.getAmounts);
router.get('/receipts/recent',  receiptController.getRecentReceipts);
router.get('/receipts/:id',     receiptController.getReceiptById);   // <-- /:id

// ❌ BUG: defined AFTER /:id — Express matches "search" as the :id param
router.get('/receipts/search',  receiptController.searchReceipts);
```

`GET /api/receipts/search` hits `getReceiptById` with `id = "search"` — it queries the DB for a receipt with ID "search", returns 404. The search endpoint is completely unreachable.

**Fix:** Move `/receipts/search` above `/:id`, or (better) delete it since `getAllReceipts` already handles `?q=` filtering.

---

### 2. `POST /receipt` — Wrong path, inconsistent, and double-validated
**File:** `server/routes/index.js`

```js
router.post('/receipt',   validateReceipt, receiptController.createReceipt);  // singular
router.get('/receipts',   receiptController.getAllReceipts);                   // plural
router.put('/receipts/:id', ...)
router.delete('/receipts/:id', ...)
```

The create endpoint is `/receipt` (singular) while every other receipt endpoint is `/receipts` (plural). The frontend calls `/receipts` for everything. This is a REST violation and likely causes 404s on receipt creation.

Also, `createReceipt` controller does a **second manual validation** after Joi already ran:
```js
if (!student_id || !amount_number || !amount_letters || !paid_items || !semester_no) {
  return errorResponse(res, 'Missing required fields', 400);  // dead code — Joi already rejected this
}
```

---

### 3. Silent Student Auto-Creation in Receipt Controller
**File:** `server/controllers/receiptController.js`

```js
try {
  await StudentModel.getStudentById(student_id);
} catch (error) {
  // If student not found → silently create them!
  const student = await StudentModel.createStudent(studentData);
}
```

If a user enters a typo for the student ID, the system **silently creates a ghost student** with whatever name was typed. There is no error returned to the user. This is the worst kind of hidden side effect — it corrupts data without any indication.

The registration status logic here is also wrong:
```js
registration_status: paid_items === 'TF' ? 'F' : 'P'
```
`'TF'` is not a valid `paid_items` value. Valid values are `'T'`, `'R'`, `'F'`, `'TR'`, `'TRF'`, etc. This condition is **always false** — every auto-created student gets status `'P'`.

---

### 4. Frontend Sends Wrong Query Param for Pagination
**File:** `client/src/pages/students/list.js`

```js
const response = await apiService.get(`/students?page=${page}&size=${size}`);
```

The server reads `limit`, not `size`:
```js
const { page = 1, limit = 20 } = req.query;  // server/controllers/studentController.js
```

The `size` param is silently ignored. Every student list request uses the server's default of 20 regardless of what the UI sets. Pagination breaks silently.

---

### 5. Case Typo in Student Status Display
**File:** `client/src/pages/students/list.js`

```js
data-i18n="${student.registration_Status === 'F'   // ← lowercase 'S' on 'Status'
  ? 'fullyRegisteredStatus' 
  : 'partiallyRegisteredStatus'}"
>${student.REGISTRATION_STATUS === 'F'             // ← uppercase correct here
```

`student.registration_Status` is always `undefined` (the actual key is `REGISTRATION_STATUS`). The `data-i18n` key is always `'partiallyRegisteredStatus'` regardless of actual status.

---

### 6. `authTokenCache` Never Cleared on Logout
**File:** `client/src/services/apiService.js`

```js
let authTokenCache = null;

function getAuthToken() {
  if (authTokenCache) return authTokenCache;  // ← returns stale token after logout
  const token = localStorage.getItem('token');
  authTokenCache = token;
  return token;
}
```

On logout, `localStorage.removeItem('token')` is called, but `authTokenCache` stays set. Any subsequent API call within the same page session sends the old (now invalid) token — the user appears logged out but API calls still fire with the old credentials until the page reloads.

---

## 🔒 SECURITY VULNERABILITIES

### 7. Helmet Completely Disabled
**File:** `server/app.js`

```js
/*
app.use(helmet({ ... }));
*/
```

The entire `helmet` block — which sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and 8 other protective headers — is commented out. The API is running with no security headers at all. This is the first thing a security auditor checks.

---

### 8. CSRF Protection Disabled
**File:** `server/app.js`

```js
/*
app.use('/api/login', csrfProtection);
app.use('/api/receipts', csrfProtection);
...
*/
```

CSRF is fully commented out. State-changing endpoints (create/update/delete) have no cross-site request forgery protection. `csurf` is also deprecated — should be replaced with `csrf-csrf` or double-submit cookies.

---

### 9. Rate Limiting Disabled on Login
**File:** `server/app.js`

```js
// const limiter = rateLimit({...});
// app.use('/api/login', limiter);   ← commented out
```

The login endpoint has no rate limiting. An attacker can attempt unlimited passwords. The `express-rate-limit` package is installed and configured — it's just commented out.

---

### 10. `/api/register` Is Publicly Accessible
**File:** `server/routes/index.js`

```js
router.post('/register', validateRegisterInput, authController.register);
// ↑ This is BEFORE router.use(authenticate) — anyone on the internet can register
```

Anyone can call `POST /api/register` with `{ role: "A" }` and create themselves an admin account. There's no authentication check, no admin-only gate, nothing. This is a full account takeover vulnerability.

---

### 11. DevTunnel URLs Hardcoded in Production CORS
**File:** `server/app.js`

```js
const allowedOrigins = [
  'http://localhost:3000',
  'https://l9hcq09q-3000.euw.devtunnels.ms',   // ← dev tunnel URL in production config
  'https://l9hcq09q-5000.euw.devtunnels.ms'    // ← should be in .env, not source
];
```

These are temporary dev tunnel URLs committed to source code. CORS origins must come from environment variables.

---

### 12. `web.config` Sets `Access-Control-Allow-Origin: *`
**File:** `client/web.config`

```xml
<customHeaders>
  <add name="Access-Control-Allow-Origin" value="*" />
</customHeaders>
```

This completely overrides all server-side CORS restrictions at the IIS/reverse-proxy level. Any origin can make requests. This defeats the entire CORS configuration in `app.js`.

---

### 13. JWT Secret Fallback Missing
**File:** `server/app.js`, `server/middleware/authMiddleware.js`

If `JWT_SECRET` is undefined (missing `.env` file), `jwt.sign()` with `undefined` as the secret creates tokens that are trivially forgeable. There's no startup check that `JWT_SECRET` is set.

---

## 🏗️ CODE QUALITY & ARCHITECTURE PROBLEMS

### 14. `searchReceipts` is 100% Duplicate Code
**File:** `server/controllers/receiptController.js`

`searchReceipts` is a line-for-line copy of `getAllReceipts`. The comment even says "now handled by getAllReceipts." This controller, the route for it, and the client-side search endpoint are all dead weight. Delete all three.

---

### 15. Double Validation in Controllers
Controllers do manual field checks **after** Joi middleware already ran and rejected invalid input:
- `createReceipt` — manual check duplicates Joi schema
- `updateReceipt` — manual check duplicates Joi schema  
- `createDepartment` — has its own `validateDepartmentData()` function that duplicates the Joi schema

This means the Joi schemas cannot be trusted as the single source of truth for validation.

---

### 16. `getRecentReceipts` Fetches the Entire Table
**File:** `server/models/receiptModel.js`

```js
const query = `SELECT ... FROM SRRA.RECEIPT r LEFT JOIN ... ORDER BY r.ENTRY_DATE DESC`;
// No LIMIT in the SQL

const result = await executeQuery(query);
return result.rows.slice(0, limit);  // ← slices in JavaScript after loading everything
```

This fetches every row in the RECEIPT table, transfers them over the DB connection, then discards all but 5. On a real university database with thousands of records, this will be catastrophically slow.

---

### 17. `multer` Configured but Never Used
**File:** `server/routes/index.js`

```js
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
// upload is never used anywhere in the routes
```

This is dead code that creates an `uploads/` directory and loads the module unnecessarily.

---

### 18. `node-cron` Dependency Never Used
**File:** `server/package.json`

```json
"node-cron": "^3.0.3"
```

This package is installed but never imported or used anywhere. Adds install weight and an attack surface for nothing.

---

### 19. Mixed Logging — `console.log` Alongside Winston
Winston logger is used throughout, but `console.log` appears in production paths:
- `server/app.js`: `console.log('CORS blocked origin:', origin)`
- `server/app.js`: `console.log('Redirecting:', req.path)`
- `client/src/services/apiService.js`: `console.log('Unauthorized access detected...')`

In production, Winston logs go to files with timestamps and levels. `console.log` goes nowhere useful. Pick one and be consistent.

---

### 20. Bizarre Fetch Syntax
**File:** `client/src/services/apiService.js`

```js
let req = null;
const response = await fetch(`${API_BASE_URL}/login`, req = {
  method: 'POST',
  ...
});
```

`let req = null` is declared, then assigned the options object *inside the function call argument*. `req` is never read after this. This is confusing, non-idiomatic, and serves no purpose.

---

### 21. Global Window Pollution
**Files:** `client/src/pages/students/list.js`, `client/src/pages/students/index.js`, `client/src/pages/receipts/handlers.js`

```js
window.deleteStudent = deleteStudent;
window.loadStudentsPage = (page) => loadStudents(page);
window.deleteReceipt = deleteReceipt;
window.viewReceipt = function(receiptId) {...};
window.printReceipt = function(receiptId) {...};
```

Six global functions assigned to `window` because HTML strings use `onclick="deleteStudent(id)"`. This is a 2012 pattern. Modern approach: use event delegation on the table container.

---

### 22. Inline `<style>` Tags in Template Strings
**Files:** `receipts/list.js`, `students/index.js`, `users.js`, `pages/404.js`

Every page template injects a `<style>` block directly into the HTML string:
```js
return `
  <style>
    .search-box { position: relative; width: 100%; }
    .clear-search { position: absolute; right: 10px; ... }
  </style>
  <div class="container" style="margin-top: 20px;">
```

On every navigation, these styles are re-injected into the DOM. They:
- Override the proper CSS module system we built
- Cannot be cached
- Create specificity wars
- Are duplicated across files (`.search-box` appears in 3 different page files)

All of these belong in the CSS files.

---

### 23. Architectural Smell: `import '../dashboard.js'` in Student Module
**File:** `client/src/pages/students/index.js`

```js
import '../dashboard.js'; // Import dashboard.js for auth and header functionality
```

Students importing the dashboard page for auth is wrong. Auth should be a standalone service (`authService.js`) imported independently. The dashboard page should not be a dependency of unrelated pages.

---

## 🔀 INCONSISTENCIES

### 24. Field Naming Convention: camelCase vs snake_case
| Location | Convention | Example |
|---|---|---|
| `validationMiddleware.js` (student schema) | camelCase | `studentId`, `fullName`, `semesterNo` |
| `validationMiddleware.js` (receipt schema) | snake_case | `student_id`, `amount_number`, `paid_items` |
| `studentController.js` destructure | camelCase | `const { studentId, fullName } = req.body` |
| `receiptController.js` destructure | snake_case | `const { student_id, amount_number } = req.body` |
| Database columns | UPPER_SNAKE_CASE | `STUDENT_ID`, `FULL_NAME` |

Three different conventions in the same project, on the same entity layer. Pick snake_case for API payloads (most common REST convention) and be consistent.

---

### 25. `successResponse` Parameter Order is Wrong in `authController`
**File:** `server/controllers/authController.js`

```js
// register():
successResponse(res, 'User registered successfully', { userId }, 201);
//              ^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^  ^^^
//              res  message (string)                    data      status
```

But in `receiptController.js`:
```js
successResponse(res, { receipt_id: receiptId }, 201, 'Receipt created successfully');
//              ^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//              res  data (object)               status message
```

The argument order is swapped. One of these is calling `successResponse` wrong. Whatever the actual signature is, one of these two is passing the message where data should be and vice versa.

---

### 26. REST Naming Violations
| Route | Issue |
|---|---|
| `POST /api/receipt` | Should be `POST /api/receipts` (plural) |
| `POST /api/students/new` | Should be `POST /api/students` (RESTful convention) |
| `GET /api/department/stats/` | Should be `GET /api/departments/stats` (plural + no trailing slash) |
| `POST /api/students/search` | REST doesn't use POST for reads; use `GET /students?q=` |

---

### 27. `ternary` That's Always the Same
**File:** `client/src/pages/users.js`

```js
class="btn ${isEdit ? 'btn-primary' : 'btn-primary'}"
```
Both branches of the ternary are identical. This produces `btn btn-primary` always, which is correct, but the ternary is meaningless noise.

---

### 28. Dashboard `totalStudentsValue` Never Reflects Actual Count
**File:** `client/src/pages/dashboard/stats.js`

```js
export async function loadStudentStats() {
  const response = await apiService.get('/students/stats');
  displayStudentStats(response.data || {});
}
```

The stat card is updated here, but `displayStudentStats` looks for `stats.total` to update `totalStudentsValue`. If `getStudentStats` on the server returns a different structure, the dashboard total stays at `--` forever.

---

### 29. API Base URL Hardcoded
**File:** `client/src/services/apiService.js`

```js
const API_BASE_URL = 'http://localhost:5000/api';
```

This will fail in every environment that isn't `localhost:5000`. For production deployment in KSA (likely a cloud server or university IIS), this breaks everything. Should use a relative URL (`/api`) or an environment variable injected at build time.

---

### 30. Hardcoded `'http://localhost:5000/api'` Comment Shows Devtunnel URL
```js
// API Service for handling all API requests https://l9hcq09q-5000.euw.devtunnels.ms/
```

A devtunnel URL is sitting as a comment in source code. This leaks your development environment's tunnel address.

---

## 🎨 UI BUGS & ISSUES

### 31. ✅ Nav Underline Position in RTL — FIXED
**Root cause:** `inset-inline-start: 50%` + `transform: translateX(-50%)` is not RTL-safe because `translateX` does not flip with text direction. In RTL, `inset-inline-start: 50%` maps to `right: 50%`, then `translateX(-50%)` shifts the element further right (not centering it — pushing it off to the side, almost at the end of the word).

**Fix applied:** Replaced with `left: 0; right: 0; width: 0; margin-left: auto; margin-right: auto`. The `width` expands from center outward in both directions, perfectly RTL-safe.

---

### 32. `style="margin-top: 20px"` on Every Container
Every page template injects:
```html
<div class="container" style="margin-top: 20px;">
```
This defeats the CSS system. The `#main-content` padding in `_reset.css` should handle this, and `container` should be styled cleanly.

---

### 33. `style="float: right"` Still Used
```html
<button id="exportReceipts" class="btn btn-secondary float-right">Export to CSV</button>
```
Float layout in a flexbox world. The `page-header` is already flex — just add the button inside it.

---

### 34. Handlebars Minified Bundle in Source
**File:** `client/src/utils/handlebars.min.js`

A 70KB+ minified third-party library is committed directly into the repo. This should be an npm dependency managed via `package.json`, not a vendored minified file in source control. It can't be audited, updated, or replaced without manual work.

---

## 🚀 FEATURE & ENHANCEMENT SUGGESTIONS

### Server
1. **JWT Refresh Token** — 1-hour access tokens expire mid-session. Add a refresh token (stored as httpOnly cookie) with a 7-day window.
2. **API Versioning** — Prefix routes with `/api/v1/`. When you make breaking changes, you can ship `/api/v2/` without breaking existing clients.
3. **Request ID / Correlation ID** — Add a `X-Request-ID` header middleware. Logs tie together across a full request chain, invaluable for debugging.
4. **Audit Log** — Record who created/updated/deleted a receipt, student, or user, with timestamp. Universities need this for compliance.
5. **Soft Delete** — Instead of hard-deleting receipts/students, add `DELETED_AT` column. Maintains history, enables recovery.
6. **CSV/Excel Export** — The export button exists in UI but isn't implemented server-side. Use `exceljs` or `csv-stringify`.
7. **Reports endpoint** — The reports page exists in nav but has no backend. Even basic: revenue by month, students per department.
8. **Swagger/OpenAPI docs** — Auto-generate interactive API docs using `swagger-jsdoc` + `swagger-ui-express`. Recruiters and future devs will love this.
9. **Integration Tests** — Mocha + Supertest are already installed. Write at minimum: login flow, create receipt, get receipt by ID.
10. **Health Check endpoint** — `GET /api/health` returns `{ status: 'ok', db: 'connected', uptime: ... }`. Required for any cloud deployment.
11. **Input Sanitisation** — Joi validates structure but doesn't sanitise HTML/SQL injection attempts. Add `express-validator` sanitization or Joi `.trim()` and `.escape()`.

### Frontend
1. **Loading Skeletons** — Replace the plain `Loading...` text with skeleton card shimmer (the CSS is already written in `_loading.css`).
2. **Confirmation Dialogs** — Delete buttons use `confirm()` (browser native). Replace with a proper modal to match the design system.
3. **Form Validation Feedback** — Real-time field-level validation errors below each input as you type.
4. **Toast Notifications** — Currently success/error elements are `prepend`'d to `main`. Use the `#message-container` and `_alerts.css` toast system.
5. **Keyboard Navigation** — Modals, dropdowns, and tables should be navigable by keyboard (Tab, Escape, Arrow keys). Accessibility matters.
6. **Empty States** — "No results" states with an illustration and a call-to-action button look far more polished than a table with no rows.
7. **Search Debounce** — Some search inputs fire on every keystroke without debounce, hammering the API. Use a 300ms debounce.
8. **PWA Offline Page** — The manifest and service worker are there. Add a proper offline fallback page.
9. **Dark Mode** — CSS custom properties make this easy. Add a `[data-theme="dark"]` override file.
10. **Print CSS for Receipt** — The print template opens in a new window. A better pattern: `window.print()` on the current page with print-only CSS showing only the receipt card.

---

## 📁 RECRUITER STRATEGY — Getting Noticed in KSA

### The repo story
Commit history will tell the story of a developer who:
- Started with a working Oracle backend
- Identified and documented security vulnerabilities
- Migrated to a portable SQLite dev environment
- Rebuilt the entire frontend CSS architecture with a design system
- Fixed critical bugs (route shadowing, pagination, RTL)
- Added proper documentation

### What KSA tech recruiters specifically look for
1. **English-Arabic bilingual capability** — This project demonstrates it perfectly. Keep the README in both languages.
2. **Enterprise tech exposure** — Oracle, JWT auth, rate limiting, helmet. Mention this prominently.
3. **Institutional/government work** — University systems are respected in KSA's public sector tech jobs.
4. **REST API design** — Fix the inconsistencies before putting this on your CV.
5. **Security awareness** — The security fixes show maturity. Add a `SECURITY.md` that lists the vulnerabilities you found and fixed.

### Week-long commit plan
```
Day 1 (Mon): fix: critical route shadow bug on /receipts/search
             fix: POST /receipt path normalised to /receipts (RESTful)
Day 1 (Mon): fix: remove silent student auto-creation in createReceipt
Day 2 (Tue): security: enable Helmet with proper CSP configuration
             security: re-enable rate limiting on authentication endpoints
Day 2 (Tue): security: gate /register behind admin-only middleware
Day 3 (Wed): refactor: remove duplicate searchReceipts controller
             refactor: consolidate validation — Joi as single source of truth
             fix: getRecentReceipts SQL now uses LIMIT instead of JS slice
Day 3 (Wed): fix: authTokenCache cleared on logout
Day 4 (Thu): feat: CSS architecture — modular design system (16 files)
             fix: RTL nav underline centering via margin-auto pattern
Day 4 (Thu): refactor: remove all inline <style> tags from page templates
Day 5 (Fri): feat: SQLite development adapter with Oracle SQL translation
             feat: database setup script with seed data
Day 5 (Fri): fix: student pagination uses correct 'limit' query param
Day 6 (Sat): feat: Swagger/OpenAPI documentation for all endpoints
             feat: GET /api/health endpoint
Day 6 (Sat): fix: CORS origins moved to environment variables
Day 7 (Sun): docs: comprehensive README (EN + AR)
             docs: SECURITY.md documenting vulnerabilities found and fixed
             docs: CHANGELOG.md updated
```

### README must-haves for recruiters
- Tech stack badge grid (Node.js, Express, Oracle, SQLite, Vanilla JS, PWA)
- Architecture diagram (even a simple ASCII one)
- API documentation link (Swagger)
- Screenshots of the UI
- Local setup in 3 commands
- Live demo link (deploy to Railway or Render for free)

---

## PRIORITY FIX ORDER

```
IMMEDIATE (breaks the app):
  1. Route shadow — /receipts/search
  2. POST /receipt → POST /receipts
  3. Remove silent student creation
  4. Fix student pagination param (size → limit)
  5. Fix registration_Status case typo

SECURITY (do before any public deploy):
  6. Enable Helmet
  7. Enable rate limiting on /login
  8. Lock /register to admin-only
  9. Move CORS origins to .env
  10. Remove devtunnel URLs from source
  11. Add JWT_SECRET startup check

CODE QUALITY:
  12. Delete searchReceipts (dead code)
  13. Remove duplicate controller validations
  14. Fix getRecentReceipts SQL LIMIT
  15. Fix authTokenCache invalidation on logout
  16. Remove inline <style> tags
  17. Fix successResponse parameter order in authController
  18. Replace window.deleteStudent with event delegation
  19. Fix hardcoded API_BASE_URL
```

---

*Analysis performed: February 2026*
*Files examined: server/routes/index.js, server/controllers/*, server/models/*, server/middleware/*, server/app.js, client/src/services/apiService.js, client/src/pages/*, client/src/utils/*, client/web.config, server/package.json*
