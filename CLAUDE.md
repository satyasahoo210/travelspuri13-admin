# CLAUDE.md - Workspace Guide & Guidelines

This file serves as the workspace-level developer configuration and chronological memory for coding assistants (e.g., Claude, Antigravity) working on the Travels Puri 13 PMS Hotel Admin project.

---

## 🛠️ Command Cheat Sheet

Always prefer `yarn` as the package manager in this workspace.

- **Development Server**: `yarn dev`
- **Production Build**: `yarn build`
- **TypeScript Typecheck**: `yarn tsc --noEmit`
- **Linting & Code Style**: `yarn lint`
- **Database Client**: `npx supabase gen types typescript --project-id "yispxbfpbepdwgggwmzf" --schema public > database.types.ts`. Generated Types are located at `database.types.ts`

---

## 💻 Node Script & Tool Execution Settings

- **Working Directory**: Always run scripts from the project root (`/Users/satya/Documents/freelance/PMS/pms_hotel_admin`) so local `node_modules` (like `@supabase/supabase-js`, `date-fns`, and `dotenv`) resolve correctly.
- **Environment Variables**: For scripts that require access to the database or external APIs, use the dotenv package or prefix execution:
  ```bash
  node -r dotenv/config path/to/script.js
  ```
  Note that the active production environment variables are stored in `.env.local`.
- **Database Access & RLS**:
  - The database has Row-Level Security (RLS) enabled.
  - Queries using the default `anon` key outside of an active browser session will return `0` rows unless authenticated.
  - For CLI test/diagnostic scripts, use a valid `service_role` key if available, pass authorization headers manually, or execute query logic using browser console evaluation hooks (`chrome-devtools-mcp`'s `evaluate_script`) to leverage cookies/session state.

---

## 🎨 Coding Style & Guidelines

### 1. Framework & Architecture
- **Next.js 15 (App Router)**: Follow React 19 rules and Next.js App Router server/client component separation.
- **State Management**:
  - Database is the source of truth (via Supabase REST API).
  - Sync UI state to the DB immediately after state mutations and trigger `syncBookingTotal(nextAssignments)` or `syncBookingTotal(assignments, nextServices)` to recalculate total balances, taxes, and service fees in both DB and local view.

### 2. Styling (CSS) & Design Aesthetics
- **Core CSS & Tailwind**: Use Tailwind CSS (v4) with vanilla CSS overrides when highly custom, pixel-perfect rendering is needed.
- **Harmonious Palette**: Use curated HSL colors for status badges and layouts. Avoid generic primaries (e.g., pure red/blue/green). Use subtle gradients and sleek dark mode panels where appropriate.
- **Typography & Layout**: Modern typography (Inter, Outfit) and rounded borders (`rounded-2xl`, `rounded-xl`).
- **Interactive UI**: Enhance components with subtle hover effects, active state micro-animations (Framer Motion is preferred), and clean glassmorphism patterns.

### 3. Component & Primitive Rules
- **Modals / Dialogs**:
  - Use Shadcn/Base UI components.
  - **Base UI Primitive Note**: When using Base UI components (like Dialog or Popover triggers), use the `render` prop (e.g., `render={(props) => <Button {...props} />}`) instead of standard `asChild` to avoid element type mismatches or hydration issues.
- **Click Propagation**: Wrap clickable actions inside list items or cards with `e.stopPropagation()` to prevent unwanted navigation triggers.

---

## 📜 Project History & Accomplishments

Here is a chronological record of the advanced booking management features built on this project:

1. **Global Constants (`lib/constants.ts`)**:
   - Created to standardize payment methods (Cash, Card, UPI, NetBanking, etc.) app-wide, preventing duplicate definitions.

2. **Interactive CTAs on Booking Registry (`app/bookings/page.tsx`)**:
   - Added contextual action buttons to the registry cards:
     - **Check-in CTA** for confirmed bookings.
     - **Record Payment CTA** for checked-in guests with due balances.
     - **Checkout CTA** for checked-in guests with zero balance.
   - Guarded critical actions (like checkout) using beautiful `<AlertDialog>` confirmation modals.

3. **6-Step Booking Wizard (`components/bookings/booking-form.tsx`)**:
   - Split the booking creation flow into a styled wizard:
     1. *Stay Details* (dates, guests).
     2. *Room Selection* (bottom sheet, grouped by room types).
     3. *Override Rates* (optional custom rates per-room).
     4. *Guest Details* (search/create).
     5. *Advance Payment* (cash/card/UPI entry).
     6. *Summary & Confirmation*.

4. **Room Switching (`handleSwitchRoom`)**:
   - Allows changing a guest's room. If switched mid-stay, it splits the booking duration, updates the check-out date of the old room to the switch date, creates a new assignment for the remainder of the stay, and automatically recalculates billing totals.

5. **Extend Booking Time (`handleExtendBooking`)**:
   - Implemented an "Extend Booking" dialog in the action menu. Shifting the checkout date by N days extends the checkout dates of active room assignments ending on the original check-out date, updates the master `Booking` record, and triggers a full total recalculation.

6. **Timeline-based Night Calculations**:
   - Integrated `getRoomStayNights` to calculate room nights based on individual check-in/out overrides instead of the general booking dates.
   - Updated the generated PDF Invoice (`lib/finance/invoice-pdf.ts`) to group room assignments by stay nights and display line-item summaries accurately.
