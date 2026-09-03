# epass-mobile

React Native (Expo) front-end for the CROUS-UAC digital bus pass platform.
This is a UI-only port of the Stitch designs in
[`stitch_uac_buspass_digital_ticketing_platform/`](../stitch_uac_buspass_digital_ticketing_platform) —
no backend, all data is mocked locally.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) to run it on a physical device, or press `a` / `i` in
the terminal for an emulator, or `w` for a web preview.

## Structure

- `src/theme` — colors, spacing, typography ported from the Stitch `DESIGN.md` design tokens.
- `src/components` — shared UI primitives (Card, Badge, PrimaryButton, TopBar).
- `src/navigation` — `RootNavigator` (stack) plus `StudentTabs` / `DriverTabs` (bottom tabs).
- `src/screens/student` — Onboarding/KYC, Home, Book a Ticket, Active Ticket & GPS tracking, Profile.
- `src/screens/driver` — Driver Hub, Scan Boarding Pass, Passenger Lookup, Report Delay, Alerts.

## Flow

The app opens on a role picker (Étudiant / Chauffeur):

- **Étudiant** → KYC onboarding (3 steps) → student tabs (Home, Tickets, Booking, Profile).
- **Chauffeur** → driver tabs (Home, Scan, Users, Alerts); "Report Delay/Incident" on the driver
  Home screen opens the incident-report screen.

Everything is mocked in-memory (no auth, no API calls) so it can be explored end-to-end without a backend.
