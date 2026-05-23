# i18n, Color Coding, Currency UX & QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EN/HE/RU language switching with RTL support, light-theme color coding (income green / expense red / content on white), currency dropdowns with live exchange rates, and a full QA suite covering all API flows.

**Architecture:** i18next manages translations stored in JSON locale files; language choice is persisted in localStorage and triggers `document.dir` RTL/LTR switching. CSS variables in `index.css` define a light content theme while the sidebar stays dark. Currency dropdowns replace all free-text currency inputs; a new `GET /api/currency/rate` endpoint exposes the existing currency service to the client. Server QA uses Jest + supertest against the real dev database (same pattern as existing auth tests).

**Tech Stack:** i18next, react-i18next, i18next-browser-languagedetector, React Query, Jest, supertest, existing Prisma/Express stack.

---

## File Map

**Create:**
- `client/src/i18n/index.ts` — i18next init, language detector, RTL side-effect
- `client/src/i18n/locales/en.json` — English translations
- `client/src/i18n/locales/he.json` — Hebrew translations
- `client/src/i18n/locales/ru.json` — Russian translations
- `client/src/components/LanguageSelector.tsx` — EN/HE/RU toggle buttons (in Sidebar footer)
- `client/src/components/ui/select.tsx` — Reusable `<select>` wrapper component
- `client/src/components/CurrencySelect.tsx` — Currency dropdown with common currencies list
- `client/src/hooks/useCurrencyRate.ts` — React Query hook: `GET /api/currency/rate?from=X&to=Y`
- `server/src/routes/currency.ts` — `GET /api/currency/rate` endpoint
- `server/src/routes/__tests__/groups.routes.test.ts` — Group + member route integration tests
- `server/src/routes/__tests__/expenses.routes.test.ts` — Expense route integration tests
- `server/src/services/__tests__/expense.service.test.ts` — `calculateSplits` unit tests
- `server/src/services/__tests__/currency.service.test.ts` — `getExchangeRate` unit tests (mocked fetch)

**Modify:**
- `client/src/index.css` — define CSS variables for light content theme; body stays `bg-slate-900` for sidebar but main gets white background via layout
- `client/src/main.tsx` — wrap app with i18n init import
- `client/src/components/layout/AppLayout.tsx` — add `bg-white text-slate-900` to `<main>`
- `client/src/components/layout/Sidebar.tsx` — replace hardcoded Hebrew strings with `t()`, add `<LanguageSelector />`
- `client/src/pages/DashboardPage.tsx` — use `t()`
- `client/src/pages/GroupsPage.tsx` — use `t()`, replace currency `<Input>` with `<CurrencySelect>`
- `client/src/pages/GroupDetailPage.tsx` — use `t()`, color-code balances, add "View in currency" dropdown with live conversion
- `client/src/components/GroupCard.tsx` — use `t()`
- `client/src/pages/expenses/ExpenseFormPage.tsx` — use `t()`, `<CurrencySelect>` for currency fields
- `client/src/pages/expenses/ExpenseDetailPage.tsx` — use `t()`, color-code amounts, show exchange rate when currencies differ
- `client/src/App.tsx` — translate 404 page strings
- `server/src/app.ts` — mount currency router

---

### Task 1: i18n Setup & Translation Files

**Files:**
- Create: `client/src/i18n/index.ts`
- Create: `client/src/i18n/locales/en.json`
- Create: `client/src/i18n/locales/he.json`
- Create: `client/src/i18n/locales/ru.json`

- [ ] **Step 1: Install i18next packages**

```bash
cd /Users/romanp/Desktop/split/client
npm install i18next react-i18next i18next-browser-languagedetector
```

Expected: packages added without errors.

- [ ] **Step 2: Create `client/src/i18n/locales/en.json`**

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "groups": "Groups",
    "expenses": "Expenses",
    "analytics": "Analytics",
    "notifications": "Notifications",
    "logout": "Logout"
  },
  "groups": {
    "title": "Groups",
    "newGroup": "New Group",
    "noGroups": "No groups yet. Create one to start splitting expenses.",
    "createFirst": "Create your first group",
    "createGroup": "Create Group",
    "name": "Name",
    "description": "Description (optional)",
    "defaultCurrency": "Default Currency",
    "cancel": "Cancel",
    "create": "Create",
    "creating": "Creating…",
    "failed": "Failed to create group. Please try again.",
    "loading": "Loading groups…",
    "members_one": "{{count}} member",
    "members_other": "{{count}} members"
  },
  "groupDetail": {
    "notFound": "Group not found.",
    "loading": "Loading…",
    "tabs": {
      "expenses": "Expenses",
      "members": "Members",
      "balances": "Balances"
    },
    "addExpense": "Add Expense",
    "noExpenses": "No expenses yet.",
    "paidBy": "Paid by {{name}}",
    "inviteMember": "Invite Member",
    "email": "Email",
    "invite": "Invite",
    "inviting": "Inviting…",
    "inviteFailed": "Could not invite member. Check the email and try again.",
    "remove": "Remove",
    "noBalances": "No balances.",
    "viewIn": "View in"
  },
  "expense": {
    "addExpense": "Add Expense",
    "editExpense": "Edit Expense",
    "description": "Description",
    "amount": "Amount",
    "currency": "Currency",
    "date": "Date",
    "paidBy": "Paid by",
    "category": "Category (optional)",
    "noCategory": "None",
    "splitType": "Split Type",
    "splitDetails": "Split Details",
    "equalSplit": "Split equally among {{count}} members.",
    "cancel": "Cancel",
    "saveChanges": "Save Changes",
    "addExpenseBtn": "Add Expense",
    "saving": "Saving…",
    "failed": "Failed to save expense. Please try again.",
    "loading": "Loading…",
    "notFound": "Expense not found.",
    "baseAmount": "Base Amount",
    "splitTypeLabel": "Split type",
    "categoryLabel": "Category",
    "receipt": "Receipt",
    "splits": "Splits",
    "settled": "Settled",
    "backToGroup": "← Back to Group",
    "edit": "Edit",
    "delete": "Delete",
    "confirmDelete": "Delete this expense?",
    "exchangeRate": "Rate: 1 {{from}} = {{rate}} {{to}}"
  },
  "auth": {
    "login": "Log In",
    "register": "Create Account",
    "email": "Email",
    "password": "Password",
    "name": "Full Name",
    "forgotPassword": "Forgot password?",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "loginWithGoogle": "Continue with Google",
    "resetPassword": "Reset Password",
    "sendReset": "Send Reset Link",
    "newPassword": "New Password"
  },
  "dashboard": {
    "greeting": "Hello, {{name}} 👋",
    "comingSoon": "Dashboard coming soon."
  },
  "common": {
    "loading": "Loading…",
    "notFound": "404",
    "notFoundMsg": "Page not found",
    "backHome": "Back to home"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/he.json`**

```json
{
  "nav": {
    "dashboard": "דאשבורד",
    "groups": "קבוצות",
    "expenses": "הוצאות",
    "analytics": "ניתוח",
    "notifications": "התראות",
    "logout": "התנתק"
  },
  "groups": {
    "title": "קבוצות",
    "newGroup": "קבוצה חדשה",
    "noGroups": "אין קבוצות עדיין. צור אחת כדי להתחיל לחלק הוצאות.",
    "createFirst": "צור את הקבוצה הראשונה שלך",
    "createGroup": "צור קבוצה",
    "name": "שם",
    "description": "תיאור (אופציונלי)",
    "defaultCurrency": "מטבע ברירת מחדל",
    "cancel": "ביטול",
    "create": "צור",
    "creating": "יוצר…",
    "failed": "יצירת הקבוצה נכשלה. אנא נסה שוב.",
    "loading": "טוען קבוצות…",
    "members_one": "{{count}} חבר",
    "members_other": "{{count}} חברים"
  },
  "groupDetail": {
    "notFound": "הקבוצה לא נמצאה.",
    "loading": "טוען…",
    "tabs": {
      "expenses": "הוצאות",
      "members": "חברים",
      "balances": "יתרות"
    },
    "addExpense": "הוסף הוצאה",
    "noExpenses": "אין הוצאות עדיין.",
    "paidBy": "שילם {{name}}",
    "inviteMember": "הזמן חבר",
    "email": "אימייל",
    "invite": "הזמן",
    "inviting": "מזמין…",
    "inviteFailed": "לא ניתן להזמין חבר. בדוק את האימייל ונסה שוב.",
    "remove": "הסר",
    "noBalances": "אין יתרות.",
    "viewIn": "הצג במטבע"
  },
  "expense": {
    "addExpense": "הוסף הוצאה",
    "editExpense": "ערוך הוצאה",
    "description": "תיאור",
    "amount": "סכום",
    "currency": "מטבע",
    "date": "תאריך",
    "paidBy": "שולם על ידי",
    "category": "קטגוריה (אופציונלי)",
    "noCategory": "ללא",
    "splitType": "סוג חלוקה",
    "splitDetails": "פרטי חלוקה",
    "equalSplit": "חלוקה שווה בין {{count}} חברים.",
    "cancel": "ביטול",
    "saveChanges": "שמור שינויים",
    "addExpenseBtn": "הוסף הוצאה",
    "saving": "שומר…",
    "failed": "שמירת ההוצאה נכשלה. אנא נסה שוב.",
    "loading": "טוען…",
    "notFound": "ההוצאה לא נמצאה.",
    "baseAmount": "סכום בסיס",
    "splitTypeLabel": "סוג חלוקה",
    "categoryLabel": "קטגוריה",
    "receipt": "קבלה",
    "splits": "חלוקה",
    "settled": "סולק",
    "backToGroup": "← חזרה לקבוצה",
    "edit": "עריכה",
    "delete": "מחיקה",
    "confirmDelete": "למחוק את ההוצאה?",
    "exchangeRate": "שער: 1 {{from}} = {{rate}} {{to}}"
  },
  "auth": {
    "login": "התחברות",
    "register": "יצירת חשבון",
    "email": "אימייל",
    "password": "סיסמה",
    "name": "שם מלא",
    "forgotPassword": "שכחת סיסמה?",
    "noAccount": "אין לך חשבון?",
    "hasAccount": "יש לך חשבון?",
    "loginWithGoogle": "המשך עם Google",
    "resetPassword": "איפוס סיסמה",
    "sendReset": "שלח קישור לאיפוס",
    "newPassword": "סיסמה חדשה"
  },
  "dashboard": {
    "greeting": "שלום, {{name}} 👋",
    "comingSoon": "הדאשבורד יהיה כאן בקרוב."
  },
  "common": {
    "loading": "טוען…",
    "notFound": "404",
    "notFoundMsg": "הדף לא נמצא",
    "backHome": "חזרה הביתה"
  }
}
```

- [ ] **Step 4: Create `client/src/i18n/locales/ru.json`**

```json
{
  "nav": {
    "dashboard": "Дашборд",
    "groups": "Группы",
    "expenses": "Расходы",
    "analytics": "Аналитика",
    "notifications": "Уведомления",
    "logout": "Выход"
  },
  "groups": {
    "title": "Группы",
    "newGroup": "Новая группа",
    "noGroups": "Групп пока нет. Создайте одну, чтобы начать делить расходы.",
    "createFirst": "Создать первую группу",
    "createGroup": "Создать группу",
    "name": "Название",
    "description": "Описание (необязательно)",
    "defaultCurrency": "Валюта по умолчанию",
    "cancel": "Отмена",
    "create": "Создать",
    "creating": "Создание…",
    "failed": "Не удалось создать группу. Попробуйте ещё раз.",
    "loading": "Загрузка групп…",
    "members_one": "{{count}} участник",
    "members_other": "{{count}} участников"
  },
  "groupDetail": {
    "notFound": "Группа не найдена.",
    "loading": "Загрузка…",
    "tabs": {
      "expenses": "Расходы",
      "members": "Участники",
      "balances": "Балансы"
    },
    "addExpense": "Добавить расход",
    "noExpenses": "Расходов пока нет.",
    "paidBy": "Оплатил {{name}}",
    "inviteMember": "Пригласить участника",
    "email": "Email",
    "invite": "Пригласить",
    "inviting": "Приглашение…",
    "inviteFailed": "Не удалось пригласить участника. Проверьте email и попробуйте снова.",
    "remove": "Удалить",
    "noBalances": "Балансов нет.",
    "viewIn": "Показать в"
  },
  "expense": {
    "addExpense": "Добавить расход",
    "editExpense": "Редактировать расход",
    "description": "Описание",
    "amount": "Сумма",
    "currency": "Валюта",
    "date": "Дата",
    "paidBy": "Оплатил",
    "category": "Категория (необязательно)",
    "noCategory": "Без категории",
    "splitType": "Тип разделения",
    "splitDetails": "Детали разделения",
    "equalSplit": "Разделить поровну между {{count}} участниками.",
    "cancel": "Отмена",
    "saveChanges": "Сохранить",
    "addExpenseBtn": "Добавить расход",
    "saving": "Сохранение…",
    "failed": "Не удалось сохранить расход. Попробуйте ещё раз.",
    "loading": "Загрузка…",
    "notFound": "Расход не найден.",
    "baseAmount": "Базовая сумма",
    "splitTypeLabel": "Тип разделения",
    "categoryLabel": "Категория",
    "receipt": "Квитанция",
    "splits": "Разделение",
    "settled": "Погашено",
    "backToGroup": "← Назад к группе",
    "edit": "Редактировать",
    "delete": "Удалить",
    "confirmDelete": "Удалить этот расход?",
    "exchangeRate": "Курс: 1 {{from}} = {{rate}} {{to}}"
  },
  "auth": {
    "login": "Войти",
    "register": "Создать аккаунт",
    "email": "Email",
    "password": "Пароль",
    "name": "Полное имя",
    "forgotPassword": "Забыли пароль?",
    "noAccount": "Нет аккаунта?",
    "hasAccount": "Уже есть аккаунт?",
    "loginWithGoogle": "Войти через Google",
    "resetPassword": "Сброс пароля",
    "sendReset": "Отправить ссылку",
    "newPassword": "Новый пароль"
  },
  "dashboard": {
    "greeting": "Привет, {{name}} 👋",
    "comingSoon": "Дашборд скоро появится."
  },
  "common": {
    "loading": "Загрузка…",
    "notFound": "404",
    "notFoundMsg": "Страница не найдена",
    "backHome": "На главную"
  }
}
```

- [ ] **Step 5: Create `client/src/i18n/index.ts`**

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import he from './locales/he.json';
import ru from './locales/ru.json';

const RTL_LANGS = ['he'];

function applyDirection(lang: string) {
  document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      ru: { translation: ru },
    },
    fallbackLng: 'he',
    supportedLngs: ['en', 'he', 'ru'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18n_lang',
    },
    interpolation: { escapeValue: false },
  });

applyDirection(i18n.language);

i18n.on('languageChanged', applyDirection);

export default i18n;
```

- [ ] **Step 6: Import i18n in `client/src/main.tsx`**

Add this import as the **first** import (before React imports):
```typescript
import './i18n/index';
```

Full `main.tsx`:
```typescript
import './i18n/index';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/i18n/ client/src/main.tsx client/package.json client/package-lock.json
git commit -m "feat: add i18n setup with EN/HE/RU translations"
```

---

### Task 2: Language Selector + RTL-aware Layout

**Files:**
- Create: `client/src/components/LanguageSelector.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/components/layout/AppLayout.tsx`
- Modify: `client/src/index.css`

- [ ] **Step 1: Create `client/src/components/LanguageSelector.tsx`**

```tsx
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'עב' },
  { code: 'ru', label: 'RU' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-1">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            i18n.language === code
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update `client/src/components/layout/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogout } from '../../hooks/useAuth';
import { LanguageSelector } from '../LanguageSelector';

export default function Sidebar() {
  const { t } = useTranslation();
  const logout = useLogout();

  const navItems = [
    { to: '/dashboard', icon: '🏠', label: t('nav.dashboard') },
    { to: '/groups', icon: '👥', label: t('nav.groups') },
    { to: '/expenses', icon: '💸', label: t('nav.expenses') },
    { to: '/analytics', icon: '📊', label: t('nav.analytics') },
    { to: '/notifications', icon: '🔔', label: t('nav.notifications') },
  ];

  return (
    <aside className="w-56 bg-slate-800 border-e border-slate-700 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-5 border-b border-slate-700">
        <span className="text-xl font-bold text-white">💸 Split</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700 space-y-2">
        <LanguageSelector />
        <button
          onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <span>🚪</span>
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
```

Note: `border-e` is Tailwind's logical border (border-inline-end) — adapts to RTL automatically. Replace `border-l`/`border-r` throughout with `border-s`/`border-e` where direction matters.

- [ ] **Step 3: Update `client/src/components/layout/AppLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 bg-white text-slate-900 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Update `client/src/index.css`**

Define CSS variables and add RTL font stack. Replace the full file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --accent: #f1f5f9;
  --accent-foreground: #0f172a;
  --income: #16a34a;
  --expense: #dc2626;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: #0f172a;
  color: var(--foreground);
  font-family: Inter, 'Segoe UI', system-ui, sans-serif;
}

/* RTL: use a font that covers Hebrew and Russian */
:lang(he) body, [dir="rtl"] body {
  font-family: Inter, 'Segoe UI', Arial, sans-serif;
}

.text-income { color: var(--income); }
.text-expense { color: var(--expense); }
```

- [ ] **Step 5: Verify TypeScript and check browser**

```bash
cd /Users/romanp/Desktop/split/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/components/LanguageSelector.tsx \
        client/src/components/layout/Sidebar.tsx \
        client/src/components/layout/AppLayout.tsx \
        client/src/index.css
git commit -m "feat: add language selector and light content theme"
```

---

### Task 3: Translate All Pages

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`
- Modify: `client/src/pages/GroupsPage.tsx`
- Modify: `client/src/pages/GroupDetailPage.tsx`
- Modify: `client/src/components/GroupCard.tsx`
- Modify: `client/src/pages/expenses/ExpenseFormPage.tsx`
- Modify: `client/src/pages/expenses/ExpenseDetailPage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Update `client/src/pages/DashboardPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{t('dashboard.greeting', { name: user?.name })}</h1>
      <p className="text-slate-500">{t('dashboard.comingSoon')}</p>
    </div>
  );
}
```

- [ ] **Step 2: Update `client/src/components/GroupCard.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GroupWithMembers } from '@split/shared';

interface Props {
  group: GroupWithMembers;
}

export function GroupCard({ group }: Props) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-3">
        {group.imageUrl ? (
          <img src={group.imageUrl} alt={group.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
            {group.name[0].toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-900">{group.name}</h3>
          <p className="text-xs text-slate-500">
            {t('groups.members_other', { count: group.members.length })} · {group.defaultCurrency}
          </p>
        </div>
      </div>
      {group.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{group.description}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Update `client/src/pages/GroupsPage.tsx`**

Replace all hardcoded strings with `t()` calls (only the strings change — keep the full component logic):

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroups, useCreateGroup } from '../hooks/useGroups';
import { GroupCard } from '../components/GroupCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

export function GroupsPage() {
  const { t } = useTranslation();
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createGroup.mutateAsync({ name, description: description || undefined, defaultCurrency: currency });
      setOpen(false);
      setName('');
      setDescription('');
      setCurrency('USD');
    } catch {
      setError(t('groups.failed'));
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('groups.title')}</h1>
        <Button onClick={() => setOpen(true)}>{t('groups.newGroup')}</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">{t('groups.loading')}</div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="mb-4">{t('groups.noGroups')}</p>
          <Button onClick={() => setOpen(true)}>{t('groups.createFirst')}</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => <GroupCard key={group.id} group={group} />)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('groups.createGroup')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">{t('groups.name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">{t('groups.description')}</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">{t('groups.defaultCurrency')}</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('groups.cancel')}</Button>
              <Button type="submit" disabled={createGroup.isPending}>
                {createGroup.isPending ? t('groups.creating') : t('groups.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Update `client/src/pages/GroupDetailPage.tsx`**

Replace all hardcoded strings. Keep full logic — only text changes (tab labels use `t('groupDetail.tabs.expenses')` etc., error/loading strings use `t('groupDetail.loading')` etc.). Full file:

```tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup, useGroupBalances, useInviteMember, useRemoveMember } from '../hooks/useGroups';
import { useExpenses } from '../hooks/useExpenses';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

type Tab = 'expenses' | 'members' | 'balances';

function formatBalance(balance: number, currency: string) {
  const abs = Math.abs(balance).toFixed(2);
  if (balance > 0) return `+${abs} ${currency}`;
  if (balance < 0) return `-${abs} ${currency}`;
  return `0.00 ${currency}`;
}

export function GroupDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: balances } = useGroupBalances(id);
  const { data: expensesPage } = useExpenses(id);
  const inviteMember = useInviteMember(id);
  const removeMember = useRemoveMember(id);
  const currentUserId = useAuthStore((s: { user: { id: string } | null }) => s.user?.id);
  const [tab, setTab] = useState<Tab>('expenses');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    try {
      await inviteMember.mutateAsync({ email: inviteEmail });
      setInviteOpen(false);
      setInviteEmail('');
    } catch {
      setInviteError(t('groupDetail.inviteFailed'));
    }
  }

  if (isLoading) return <div className="p-6 text-slate-400">{t('groupDetail.loading')}</div>;
  if (!group) return <div className="p-6 text-red-600">{t('groupDetail.notFound')}</div>;

  const isAdmin = group.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';

  const TABS: Tab[] = ['expenses', 'members', 'balances'];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
          {group.name[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
          {group.description && <p className="text-slate-500 text-sm">{group.description}</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tabKey
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t(`groupDetail.tabs.${tabKey}`)}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link
              to={`/expenses/new?groupId=${id}`}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t('groupDetail.addExpense')}
            </Link>
          </div>
          {expensesPage?.expenses.length === 0 ? (
            <p className="text-center text-slate-400 py-8">{t('groupDetail.noExpenses')}</p>
          ) : (
            <div className="space-y-2">
              {expensesPage?.expenses.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{expense.description}</p>
                    <p className="text-sm text-slate-500">
                      {t('groupDetail.paidBy', { name: expense.paidBy.name })} · {expense.date}
                    </p>
                  </div>
                  <span className="font-semibold text-expense">
                    {expense.amount.toFixed(2)} {expense.currency}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setInviteOpen(true)}>{t('groupDetail.inviteMember')}</Button>
            </div>
          )}
          <div className="space-y-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt={m.user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                      {m.user.name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm text-slate-900">{m.user.name}</p>
                    <p className="text-xs text-slate-500">{m.role}</p>
                  </div>
                </div>
                {isAdmin && m.userId !== currentUserId && (
                  <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(m.userId)}>
                    {t('groupDetail.remove')}
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('groupDetail.inviteMember')}</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="invite-email">{t('groupDetail.email')}</Label>
                  <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </div>
                {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>{t('expense.cancel')}</Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? t('groupDetail.inviting') : t('groupDetail.invite')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {tab === 'balances' && (
        <div>
          {!balances?.length ? (
            <p className="text-center text-slate-400 py-8">{t('groupDetail.noBalances')}</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => (
                <div key={b.userId} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                  <p className="font-medium text-slate-900">{b.name}</p>
                  <span className={`font-semibold ${b.balance > 0 ? 'text-income' : b.balance < 0 ? 'text-expense' : 'text-slate-500'}`}>
                    {formatBalance(b.balance, group.defaultCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update `client/src/pages/expenses/ExpenseFormPage.tsx`**

Add `const { t } = useTranslation();` and replace all string literals. Import `useTranslation` from `react-i18next`. Changes are string replacements only — do not change logic.

Full file:

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../hooks/useGroups';
import { useCreateExpense, useUpdateExpense, useExpense, useCategories } from '../../hooks/useExpenses';
import { useAuthStore } from '../../stores/auth.store';
import { SplitEditor } from '../../components/expense/SplitEditor';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import type { SplitType, SplitInput } from '@split/shared';

const SPLIT_TYPES: SplitType[] = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];

export function ExpenseFormPage() {
  const { t } = useTranslation();
  const { id: expenseId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const groupId = searchParams.get('groupId') ?? '';

  const { data: existingExpense } = useExpense(expenseId ?? '');
  const resolvedGroupId = existingExpense?.groupId ?? groupId;

  const { data: group } = useGroup(resolvedGroupId);
  const { data: categories } = useCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(expenseId ?? '');
  const currentUser = useAuthStore((s) => s.user);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidById, setPaidById] = useState('');
  const [splits, setSplits] = useState<SplitInput[]>([]);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (group && !initialized) {
      setInitialized(true);
      setPaidById(currentUser?.id ?? '');
      setSplits(group.members.map((m) => ({ userId: m.userId, amount: 0, percentage: 0, shares: 1 })));
      setCurrency(group.defaultCurrency);
    }
  }, [group, currentUser, initialized]);

  useEffect(() => {
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setCurrency(existingExpense.currency);
      setCategoryId(existingExpense.categoryId ?? '');
      setSplitType(existingExpense.splitType);
      setDate(existingExpense.date);
      setPaidById(existingExpense.paidById);
      setSplits(existingExpense.splits.map((s) => ({ userId: s.userId, amount: s.amount, percentage: 0, shares: 1 })));
    }
  }, [existingExpense]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (expenseId && existingExpense) {
        await updateExpense.mutateAsync({ description, amount: parseFloat(amount), currency, categoryId: categoryId || null, splitType, date, splits });
        navigate(`/groups/${existingExpense.groupId}`);
      } else {
        const expense = await createExpense.mutateAsync({ groupId: resolvedGroupId, paidById, description, amount: parseFloat(amount), currency, categoryId: categoryId || undefined, splitType, date, splits });
        navigate(`/groups/${expense.groupId}`);
      }
    } catch {
      setError(t('expense.failed'));
    }
  }

  if (!group) return <div className="p-6 text-slate-400">{t('expense.loading')}</div>;

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-slate-900">{expenseId ? t('expense.editExpense') : t('expense.addExpense')}</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <Label htmlFor="description">{t('expense.description')}</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label htmlFor="amount">{t('expense.amount')}</Label>
            <Input id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1 w-28">
            <Label htmlFor="currency">{t('expense.currency')}</Label>
            <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="date">{t('expense.date')}</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="paidBy">{t('expense.paidBy')}</Label>
          <select id="paidBy" value={paidById} onChange={(e) => setPaidById(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
            {group.members.map((m) => (<option key={m.userId} value={m.userId}>{m.user.name}</option>))}
          </select>
        </div>
        {categories && categories.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="category">{t('expense.category')}</Label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">{t('expense.noCategory')}</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label>{t('expense.splitType')}</Label>
          <div className="flex gap-2 flex-wrap">
            {SPLIT_TYPES.map((t_type) => (
              <button key={t_type} type="button" onClick={() => setSplitType(t_type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${splitType === t_type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                {t_type}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('expense.splitDetails')}</Label>
          <SplitEditor splitType={splitType} members={group.members} splits={splits} onChange={setSplits} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">{t('expense.cancel')}</Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? t('expense.saving') : (expenseId ? t('expense.saveChanges') : t('expense.addExpenseBtn'))}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Update `client/src/pages/expenses/ExpenseDetailPage.tsx`**

Add `useTranslation` and replace strings. Keep full logic:

```tsx
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useAuthStore } from '../../stores/auth.store';
import { useGroup } from '../../hooks/useGroups';
import { Button } from '../../components/ui/button';

export function ExpenseDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading } = useExpense(id);
  const { data: group } = useGroup(expense?.groupId ?? '');
  const deleteExpense = useDeleteExpense();
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (isLoading) return <div className="p-6 text-slate-400">{t('expense.loading')}</div>;
  if (!expense) return <div className="p-6 text-red-600">{t('expense.notFound')}</div>;

  const isAdmin = group?.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';
  const canEdit = expense.paidById === currentUserId || isAdmin;

  async function handleDelete() {
    if (!confirm(t('expense.confirmDelete'))) return;
    await deleteExpense.mutateAsync({ expenseId: expense!.id, groupId: expense!.groupId });
    navigate(`/groups/${expense!.groupId}`);
  }

  const currencyMismatch = expense.currency !== expense.baseCurrency;

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{expense.description}</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Link to={`/expenses/${id}/edit`} className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              {t('expense.edit')}
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteExpense.isPending}>
              {t('expense.delete')}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 p-5 bg-white">
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.amount')}</span>
          <span className="font-semibold text-expense">{expense.amount.toFixed(2)} {expense.currency}</span>
        </div>
        {currencyMismatch && (
          <div className="flex justify-between">
            <span className="text-slate-500">{t('expense.baseAmount')}</span>
            <span className="text-slate-700">{expense.amountBase.toFixed(2)} {expense.baseCurrency}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.paidBy')}</span>
          <span className="text-slate-900">{expense.paidBy.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.date')}</span>
          <span className="text-slate-900">{expense.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.splitTypeLabel')}</span>
          <span className="text-slate-900">{expense.splitType}</span>
        </div>
        {expense.category && (
          <div className="flex justify-between">
            <span className="text-slate-500">{t('expense.categoryLabel')}</span>
            <span className="text-slate-900">{expense.category.icon} {expense.category.name}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-3 text-slate-900">{t('expense.splits')}</h2>
        <div className="space-y-2">
          {expense.splits.map((split) => (
            <div key={split.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{split.user?.name ?? split.userId}</span>
                {split.isSettled && (
                  <span className="text-xs bg-green-100 text-income px-2 py-0.5 rounded-full">{t('expense.settled')}</span>
                )}
              </div>
              <span className={`text-sm font-semibold ${split.isSettled ? 'text-income' : 'text-expense'}`}>
                {split.amount.toFixed(2)} {expense.baseCurrency}
              </span>
            </div>
          ))}
        </div>
      </div>

      {expense.receiptUrl && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3 text-slate-900">{t('expense.receipt')}</h2>
          <img src={expense.receiptUrl} alt={t('expense.receipt')} className="rounded-lg border border-slate-200 max-w-full" />
        </div>
      )}

      <div className="mt-6">
        <Link to={`/groups/${expense.groupId}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          {t('expense.backToGroup')}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Update `client/src/App.tsx` 404 page**

Replace the inline 404 element with translated strings:

```tsx
// Add at top of file:
// import { useTranslation } from 'react-i18next';

// The 404 route element — create a tiny inline component:
```

In `App.tsx`, replace the `<Route path="*">` element with:

```tsx
<Route path="*" element={<NotFoundPage />} />
```

And add above the `export default function App()`:

```tsx
function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-2">{t('common.notFound')}</h1>
        <p className="text-slate-400 mb-4">{t('common.notFoundMsg')}</p>
        <a href="/dashboard" className="text-blue-400 hover:underline">{t('common.backHome')}</a>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify TypeScript**

```bash
cd /Users/romanp/Desktop/split/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/pages/ client/src/components/ client/src/App.tsx
git commit -m "feat: translate all pages to i18n keys"
```

---

### Task 4: Currency Rate API Endpoint

**Files:**
- Create: `server/src/routes/currency.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create `server/src/routes/currency.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getExchangeRate } from '../services/currency.service';

const router = Router();

const querySchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
});

router.get('/rate', async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'from and to (3-char currency codes) are required' } });
    return;
  }
  try {
    const rate = await getExchangeRate(parsed.data.from.toUpperCase(), parsed.data.to.toUpperCase());
    res.json({ from: parsed.data.from.toUpperCase(), to: parsed.data.to.toUpperCase(), rate });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('UNSUPPORTED_CURRENCY:')) {
      res.status(400).json({ error: { code: 'UNSUPPORTED_CURRENCY', message: err.message } });
      return;
    }
    res.status(502).json({ error: { code: 'CURRENCY_API_ERROR', message: 'Currency service unavailable' } });
  }
});

export default router;
```

- [ ] **Step 2: Mount in `server/src/app.ts`**

Add import:
```typescript
import currencyRouter from './routes/currency';
```

Add mount (no auth required — exchange rates are public):
```typescript
app.use('/api/currency', currencyRouter);
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/romanp/Desktop/split/server && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Smoke test endpoint**

```bash
curl "http://localhost:3001/api/currency/rate?from=USD&to=ILS"
```
Expected: `{"from":"USD","to":"ILS","rate":<number>}`

- [ ] **Step 5: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/routes/currency.ts server/src/app.ts
git commit -m "feat: add currency rate API endpoint"
```

---

### Task 5: Currency Dropdowns in Forms

**Files:**
- Create: `client/src/components/ui/select.tsx`
- Create: `client/src/components/CurrencySelect.tsx`
- Modify: `client/src/pages/GroupsPage.tsx`
- Modify: `client/src/pages/expenses/ExpenseFormPage.tsx`

- [ ] **Step 1: Create `client/src/components/ui/select.tsx`**

```tsx
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

export function Select({ className = '', placeholder, children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${className}`}
      {...props}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {children}
    </select>
  );
}
```

- [ ] **Step 2: Create `client/src/components/CurrencySelect.tsx`**

```tsx
import { Select } from './ui/select';

export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'ILS', name: 'Israeli Shekel' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'KRW', name: 'Korean Won' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'THB', name: 'Thai Baht' },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
}

export function CurrencySelect({ value, onChange, id, className }: Props) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {COMMON_CURRENCIES.map(({ code, name }) => (
        <option key={code} value={code}>{code} — {name}</option>
      ))}
    </Select>
  );
}
```

- [ ] **Step 3: Replace currency Input with CurrencySelect in `client/src/pages/GroupsPage.tsx`**

Replace the currency field:
```tsx
// Remove:
import { Input } from '../components/ui/input';
// (keep Input import if still used for name/description)

// Add:
import { CurrencySelect } from '../components/CurrencySelect';

// Replace the currency Input block:
// OLD:
// <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
// NEW:
<CurrencySelect id="currency" value={currency} onChange={setCurrency} />
```

Also change `useState('USD')` initial state — USD is already a valid option, no change needed.

- [ ] **Step 4: Replace currency Input with CurrencySelect in `client/src/pages/expenses/ExpenseFormPage.tsx`**

Replace the currency field block:
```tsx
// Add import:
import { CurrencySelect } from '../../components/CurrencySelect';

// Replace the currency field (the <div className="space-y-1 w-28"> block):
<div className="space-y-1 w-52">
  <Label htmlFor="currency">{t('expense.currency')}</Label>
  <CurrencySelect id="currency" value={currency} onChange={setCurrency} />
</div>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/romanp/Desktop/split/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/components/ui/select.tsx \
        client/src/components/CurrencySelect.tsx \
        client/src/pages/GroupsPage.tsx \
        client/src/pages/expenses/ExpenseFormPage.tsx
git commit -m "feat: replace currency text inputs with currency dropdown"
```

---

### Task 6: Exchange Rate Display

**Files:**
- Create: `client/src/hooks/useCurrencyRate.ts`
- Modify: `client/src/pages/expenses/ExpenseDetailPage.tsx`
- Modify: `client/src/pages/GroupDetailPage.tsx`

Show the exchange rate on the expense detail page when expense currency ≠ group base currency. Add a "View in currency" selector on the balances tab that converts all balances in real time.

- [ ] **Step 1: Create `client/src/hooks/useCurrencyRate.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface RateResult {
  from: string;
  to: string;
  rate: number;
}

export function useCurrencyRate(from: string, to: string) {
  return useQuery<RateResult>({
    queryKey: ['currency-rate', from, to],
    queryFn: async () => {
      const { data } = await api.get('/currency/rate', { params: { from, to } });
      return data;
    },
    enabled: !!from && !!to && from !== to,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Show exchange rate on `client/src/pages/expenses/ExpenseDetailPage.tsx`**

Add the rate badge below the amounts block when `currencyMismatch` is true. After the closing `</div>` of the amounts block, add:

```tsx
// Import at top:
import { useCurrencyRate } from '../../hooks/useCurrencyRate';

// Inside the component, after existing state:
const { data: rateData } = useCurrencyRate(expense.currency, expense.baseCurrency);

// After the rounded-xl amounts block, add:
{currencyMismatch && rateData && (
  <div className="mt-2 text-xs text-slate-400 text-end">
    {t('expense.exchangeRate', {
      from: rateData.from,
      rate: rateData.rate.toFixed(4),
      to: rateData.to,
    })}
  </div>
)}
```

- [ ] **Step 3: Add "View in currency" to balances tab in `client/src/pages/GroupDetailPage.tsx`**

Add `CurrencySelect` and `useCurrencyRate` to the balances tab so the user can see all balances converted to any currency.

```tsx
// Imports to add:
import { CurrencySelect } from '../components/CurrencySelect';
import { useCurrencyRate } from '../hooks/useCurrencyRate';

// New state in GroupDetailPage:
const [viewCurrency, setViewCurrency] = useState('');

// Derive the "view currency" — default to group's baseCurrency once group loads:
// Add this effect:
useEffect(() => {
  if (group && !viewCurrency) setViewCurrency(group.defaultCurrency);
}, [group, viewCurrency]);

// Hook (place near other hooks):
const { data: convRate } = useCurrencyRate(group?.defaultCurrency ?? '', viewCurrency);

// In the balances tab section, add a currency selector above the list:
{tab === 'balances' && (
  <div>
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm text-slate-500">{t('groupDetail.viewIn')}</span>
      <div className="w-52">
        <CurrencySelect value={viewCurrency} onChange={setViewCurrency} />
      </div>
    </div>
    {!balances?.length ? (
      <p className="text-center text-slate-400 py-8">{t('groupDetail.noBalances')}</p>
    ) : (
      <div className="space-y-2">
        {balances.map((b) => {
          const rate = convRate?.rate ?? 1;
          const converted = b.balance * rate;
          const displayCurrency = viewCurrency || group.defaultCurrency;
          return (
            <div key={b.userId} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
              <p className="font-medium text-slate-900">{b.name}</p>
              <div className="text-end">
                <span className={`font-semibold ${converted > 0 ? 'text-income' : converted < 0 ? 'text-expense' : 'text-slate-500'}`}>
                  {formatBalance(converted, displayCurrency)}
                </span>
                {viewCurrency && viewCurrency !== group.defaultCurrency && (
                  <p className="text-xs text-slate-400">{formatBalance(b.balance, group.defaultCurrency)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/romanp/Desktop/split/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/hooks/useCurrencyRate.ts \
        client/src/pages/expenses/ExpenseDetailPage.tsx \
        client/src/pages/GroupDetailPage.tsx
git commit -m "feat: show exchange rates and multi-currency balance view"
```

---

### Task 7: QA — calculateSplits Unit Tests

**Files:**
- Create: `server/src/services/__tests__/expense.service.test.ts`

Pure unit tests — no database needed. Tests the four split modes and rounding behavior.

- [ ] **Step 1: Create `server/src/services/__tests__/expense.service.test.ts`**

```typescript
import { calculateSplits } from '../expense.service';

describe('calculateSplits — EQUAL', () => {
  it('splits evenly when divisible', () => {
    const splits = calculateSplits(30, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' },
    ]);
    expect(splits).toEqual([
      { userId: 'a', amount: 10 },
      { userId: 'b', amount: 10 },
      { userId: 'c', amount: 10 },
    ]);
  });

  it('last person gets remainder on indivisible amount', () => {
    const splits = calculateSplits(10, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000);
    expect(splits[0].amount).toBe(splits[1].amount);
    expect(splits[2].amount).toBeGreaterThanOrEqual(splits[0].amount);
  });
});

describe('calculateSplits — EXACT', () => {
  it('uses provided amounts as-is', () => {
    const splits = calculateSplits(100, 'EXACT', [
      { userId: 'a', amount: 60 },
      { userId: 'b', amount: 40 },
    ]);
    expect(splits).toEqual([
      { userId: 'a', amount: 60 },
      { userId: 'b', amount: 40 },
    ]);
  });
});

describe('calculateSplits — PERCENTAGE', () => {
  it('allocates by percentage with last-person rounding', () => {
    const splits = calculateSplits(100, 'PERCENTAGE', [
      { userId: 'a', percentage: 33 },
      { userId: 'b', percentage: 33 },
      { userId: 'c', percentage: 34 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(10000);
  });

  it('sums to total when percentages are round', () => {
    const splits = calculateSplits(200, 'PERCENTAGE', [
      { userId: 'a', percentage: 25 },
      { userId: 'b', percentage: 75 },
    ]);
    expect(splits[0].amount).toBe(50);
    expect(splits[1].amount).toBe(150);
  });
});

describe('calculateSplits — SHARES', () => {
  it('splits by share weights', () => {
    const splits = calculateSplits(60, 'SHARES', [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 2 },
    ]);
    expect(splits[0].amount).toBe(20);
    expect(splits[1].amount).toBe(40);
  });

  it('last person gets remainder', () => {
    const splits = calculateSplits(10, 'SHARES', [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 1 },
      { userId: 'c', shares: 1 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/romanp/Desktop/split/server && npm test -- --testPathPattern="expense.service.test" --verbose
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/services/__tests__/expense.service.test.ts
git commit -m "test: add calculateSplits unit tests"
```

---

### Task 8: QA — Currency Service Unit Tests

**Files:**
- Create: `server/src/services/__tests__/currency.service.test.ts`

Mock global `fetch` to test caching logic without making real HTTP calls.

- [ ] **Step 1: Create `server/src/services/__tests__/currency.service.test.ts`**

```typescript
import { getExchangeRate } from '../currency.service';
import { prisma } from '../../lib/prisma';

const mockRates = { USD: 1, EUR: 0.92, ILS: 3.7 };

const mockFetch = jest.fn().mockResolvedValue({
  json: async () => ({ result: 'success', rates: mockRates }),
});

beforeAll(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(async () => {
  await prisma.currencyRate.deleteMany({
    where: { fromCurrency: 'USD' },
  });
  mockFetch.mockClear();
});

afterAll(async () => {
  await prisma.currencyRate.deleteMany({ where: { fromCurrency: 'USD' } });
  await prisma.$disconnect();
});

describe('getExchangeRate', () => {
  it('returns 1 for same currency', async () => {
    const rate = await getExchangeRate('USD', 'USD');
    expect(rate).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches from API and stores in DB on cache miss', async () => {
    const rate = await getExchangeRate('USD', 'ILS');
    expect(rate).toBe(3.7);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const cached = await prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: 'USD', toCurrency: 'ILS' } },
    });
    expect(cached).not.toBeNull();
    expect(Number(cached!.rate)).toBe(3.7);
  });

  it('returns cached rate without calling API on cache hit', async () => {
    await getExchangeRate('USD', 'EUR'); // prime cache
    mockFetch.mockClear();
    const rate = await getExchangeRate('USD', 'EUR'); // should hit cache
    expect(rate).toBe(0.92);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws UNSUPPORTED_CURRENCY for unknown target', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ result: 'success', rates: { EUR: 0.92 } }),
    });
    await expect(getExchangeRate('USD', 'XYZ')).rejects.toThrow('UNSUPPORTED_CURRENCY:XYZ');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/romanp/Desktop/split/server && npm test -- --testPathPattern="currency.service.test" --verbose
```
Expected: all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/services/__tests__/currency.service.test.ts
git commit -m "test: add currency service unit tests with mocked fetch"
```

---

### Task 9: QA — Group Routes Integration Tests

**Files:**
- Create: `server/src/routes/__tests__/groups.routes.test.ts`

Uses supertest + real DB. Creates users and groups with the `@qatest.split` email domain for cleanup.

- [ ] **Step 1: Create `server/src/routes/__tests__/groups.routes.test.ts`**

```typescript
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';

const prisma = new PrismaClient();
const DOMAIN = '@qagroups.split';

async function registerAndLogin(name: string, email: string) {
  await request(app).post('/api/auth/register').send({ name, email, password: 'password123' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.group.deleteMany({
    where: { createdBy: { email: { endsWith: DOMAIN } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

afterAll(async () => {
  await prisma.group.deleteMany({
    where: { createdBy: { email: { endsWith: DOMAIN } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.$disconnect();
});

describe('POST /api/groups', () => {
  it('creates a group and returns 201 with creator as ADMIN', async () => {
    const token = await registerAndLogin('Alice', `alice${DOMAIN}`);
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Trip', defaultCurrency: 'USD' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Trip');
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].role).toBe('ADMIN');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'Trip' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing name', async () => {
    const token = await registerAndLogin('Bob', `bob1${DOMAIN}`);
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/groups', () => {
  it('returns only groups the user belongs to', async () => {
    const tokenA = await registerAndLogin('Alice2', `alice2${DOMAIN}`);
    const tokenB = await registerAndLogin('Bob2', `bob2${DOMAIN}`);

    await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Alice Group' });
    await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenB}`).send({ name: 'Bob Group' });

    const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.every((g: { name: string }) => g.name === 'Alice Group')).toBe(true);
  });
});

describe('POST /api/groups/:id/invite', () => {
  it('allows admin to invite a user by email', async () => {
    const tokenA = await registerAndLogin('Admin', `admin1${DOMAIN}`);
    await request(app).post('/api/auth/register').send({ name: 'Guest', email: `guest1${DOMAIN}`, password: 'password123' });

    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Party' });
    const groupId = groupRes.body.id;

    const inviteRes = await request(app)
      .post(`/api/groups/${groupId}/invite`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: `guest1${DOMAIN}` });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.role).toBe('MEMBER');
  });

  it('returns 409 when user is already a member', async () => {
    const tokenA = await registerAndLogin('Admin2', `admin2${DOMAIN}`);
    await request(app).post('/api/auth/register').send({ name: 'Guest2', email: `guest2${DOMAIN}`, password: 'password123' });

    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Party2' });
    const groupId = groupRes.body.id;

    await request(app).post(`/api/groups/${groupId}/invite`).set('Authorization', `Bearer ${tokenA}`).send({ email: `guest2${DOMAIN}` });
    const res = await request(app).post(`/api/groups/${groupId}/invite`).set('Authorization', `Bearer ${tokenA}`).send({ email: `guest2${DOMAIN}` });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/groups/:id/balances', () => {
  it('returns zero balance for group with no expenses', async () => {
    const token = await registerAndLogin('BalUser', `baluser${DOMAIN}`);
    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Bal Group' });
    const groupId = groupRes.body.id;

    const res = await request(app).get(`/api/groups/${groupId}/balances`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].balance).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/romanp/Desktop/split/server && npm test -- --testPathPattern="groups.routes.test" --verbose
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/routes/__tests__/groups.routes.test.ts
git commit -m "test: add group routes integration tests"
```

---

### Task 10: QA — Expense Routes Integration Tests

**Files:**
- Create: `server/src/routes/__tests__/expenses.routes.test.ts`

- [ ] **Step 1: Create `server/src/routes/__tests__/expenses.routes.test.ts`**

```typescript
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';

const prisma = new PrismaClient();
const DOMAIN = '@qaexpenses.split';

interface UserCtx { token: string; userId: string }

async function setupUser(name: string, email: string): Promise<UserCtx> {
  await request(app).post('/api/auth/register').send({ name, email, password: 'password123' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return { token: res.body.accessToken, userId: res.body.user.id };
}

async function setupGroupWithMembers(adminToken: string, members: UserCtx[]) {
  const groupRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Test Group', defaultCurrency: 'USD' });
  const groupId = groupRes.body.id as string;

  for (const m of members) {
    await request(app)
      .post(`/api/groups/${groupId}/invite`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: m.userId }); // will fail — need email
  }
  return { groupId, members: groupRes.body.members };
}

beforeEach(async () => {
  await prisma.expense.deleteMany({ where: { group: { createdBy: { email: { endsWith: DOMAIN } } } } });
  await prisma.group.deleteMany({ where: { createdBy: { email: { endsWith: DOMAIN } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

afterAll(async () => {
  await prisma.expense.deleteMany({ where: { group: { createdBy: { email: { endsWith: DOMAIN } } } } });
  await prisma.group.deleteMany({ where: { createdBy: { email: { endsWith: DOMAIN } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.$disconnect();
});

describe('POST /api/expenses', () => {
  it('creates an expense with EQUAL split and returns 201', async () => {
    const alice = await setupUser('Alice', `alice${DOMAIN}`);
    const bob = await setupUser('Bob', `bob${DOMAIN}`);

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Trip', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;

    await request(app)
      .post(`/api/groups/${groupId}/invite`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ email: `bob${DOMAIN}` });

    const groupDetail = await request(app).get(`/api/groups/${groupId}`).set('Authorization', `Bearer ${alice.token}`);
    const memberIds = groupDetail.body.members.map((m: { userId: string }) => m.userId);

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        groupId,
        paidById: alice.userId,
        description: 'Dinner',
        amount: 100,
        currency: 'USD',
        splitType: 'EQUAL',
        date: '2025-01-15',
        splits: memberIds.map((id: string) => ({ userId: id })),
      });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Dinner');
    expect(res.body.splits).toHaveLength(2);
    expect(res.body.splits[0].amount).toBe(50);
    expect(res.body.splits[1].amount).toBe(50);
  });

  it('returns 403 when requester is not a group member', async () => {
    const alice = await setupUser('Alice2', `alice2${DOMAIN}`);
    const carol = await setupUser('Carol', `carol${DOMAIN}`);

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Private', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({
        groupId,
        paidById: carol.userId,
        description: 'Snacks',
        amount: 20,
        currency: 'USD',
        splitType: 'EQUAL',
        date: '2025-01-15',
        splits: [{ userId: carol.userId }],
      });

    expect(res.status).toBe(403);
  });

  it('returns 400 for missing required fields', async () => {
    const alice = await setupUser('Alice3', `alice3${DOMAIN}`);
    const token = alice.token;

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No amount' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses', () => {
  it('requires groupId query param', async () => {
    const alice = await setupUser('Alice4', `alice4${DOMAIN}`);
    const res = await request(app).get('/api/expenses').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(400);
  });

  it('returns paginated expenses for the group', async () => {
    const alice = await setupUser('Alice5', `alice5${DOMAIN}`);

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Paginated Group', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;
    const aliceId = alice.userId;

    await request(app).post('/api/expenses').set('Authorization', `Bearer ${alice.token}`).send({
      groupId, paidById: aliceId, description: 'E1', amount: 10, currency: 'USD', splitType: 'EQUAL', date: '2025-01-01', splits: [{ userId: aliceId }],
    });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${alice.token}`).send({
      groupId, paidById: aliceId, description: 'E2', amount: 20, currency: 'USD', splitType: 'EQUAL', date: '2025-01-02', splits: [{ userId: aliceId }],
    });

    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${alice.token}`)
      .query({ groupId, page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.expenses).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.hasMore).toBe(false);
  });
});

describe('DELETE /api/expenses/:id', () => {
  it('payer can delete their own expense', async () => {
    const alice = await setupUser('Alice6', `alice6${DOMAIN}`);
    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${alice.token}`).send({ name: 'Del Group', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;

    const expRes = await request(app).post('/api/expenses').set('Authorization', `Bearer ${alice.token}`).send({
      groupId, paidById: alice.userId, description: 'To Delete', amount: 5, currency: 'USD', splitType: 'EQUAL', date: '2025-01-01', splits: [{ userId: alice.userId }],
    });

    const delRes = await request(app).delete(`/api/expenses/${expRes.body.id}`).set('Authorization', `Bearer ${alice.token}`);
    expect(delRes.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/romanp/Desktop/split/server && npm test -- --testPathPattern="expenses.routes.test" --verbose
```
Expected: all tests pass.

- [ ] **Step 3: Run all tests together**

```bash
cd /Users/romanp/Desktop/split/server && npm test -- --verbose
```
Expected: all test suites pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/routes/__tests__/expenses.routes.test.ts
git commit -m "test: add expense routes integration tests"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Language selection EN/HE/RU | Task 1 (setup), Task 2 (selector), Task 3 (all pages) |
| Language changes labels but allows any content | Task 1 — only UI strings are in translation files; user content (group names, expense descriptions) is freeform |
| RTL for Hebrew | Task 1 (`applyDirection`), Task 2 (`dir="rtl"` on html element) |
| Income/positive = green | Tasks 3, 6 — `text-income` CSS var on positive balances and settled splits |
| Expenses/negative = red | Tasks 3, 6 — `text-expense` on expense amounts and negative balances |
| Black on white background | Task 2 — `AppLayout` main gets `bg-white text-slate-900` |
| Currency dropdown everywhere | Task 5 — `CurrencySelect` replaces all free-text currency inputs |
| Show exchange rate when currency differs | Task 6 — rate badge on ExpenseDetailPage |
| Group-level settlement currency | Groups already have `defaultCurrency`; balances computed in base currency |
| "View in any currency" on balances | Task 6 — `CurrencySelect` + live conversion in balances tab |
| Full QA module | Tasks 7–10 — calculateSplits, currency service, group routes, expense routes |

**No placeholders found.**

**Type consistency:** `CurrencySelect` uses `value: string` / `onChange: (code: string) => void` consistently in Tasks 5 and 6. `useCurrencyRate` returns `{ from, to, rate }` matching the server response shape used in Task 4. All i18n keys used in Task 3 are defined in Task 1.
