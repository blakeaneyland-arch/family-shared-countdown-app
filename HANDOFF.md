# Family Shared Countdown App — Handoff

## Status
Webpage and Android widget are both fully coded and the widget builds successfully (`gradlew assembleDebug` produces a real debug APK). Blocked on one thing only Blake can do: creating the Firebase project (needs his Google login). Everything else that was a pure tooling/code task is done.

Dev environment set up on this machine this session (none of it existed before): portable JDK 21, Android SDK (platform 36, build-tools 36.1.0, platform-tools/adb), Gradle 9.8.0 + a generated wrapper for the project. All installed to user-writable locations (`%LOCALAPPDATA%\DevTools`, `%LOCALAPPDATA%\Android\Sdk`) with no admin rights needed, and `JAVA_HOME`/`ANDROID_HOME`/`GRADLE_HOME`/`PATH` persisted at the user level so future sessions pick them up automatically.

## Architecture (locked in with Blake)
Two pieces sharing one Firestore database:

1. **Webpage (the main thing)** — plain HTML/JS, hosted free (Firebase Hosting fits naturally alongside Firestore).
   - Shows up to 5 (or more) countdowns in a list
   - Either Blake or his wife can add/edit/delete any countdown from their own phone (or any browser); changes sync live to the other person via Firestore, including deletions
   - Can show a true live-ticking days/hours/mins/secs display, since it's a page that stays open — no OS restrictions here like on a widget
2. **Android home-screen widget (small, lives on both phones)**
   - Thin display only — shows the single soonest/primary countdown as days/hours/mins, recalculated on each refresh (OS floor is roughly every 15-30 min; true per-second ticking is not possible on a standard Android widget without fighting battery/Doze restrictions, so don't try)
   - Tapping the widget opens the webpage (where the full list and editing lives)
   - Reads from the same Firestore data as the webpage — no separate sync mechanism needed

When the countdown hits zero: just show "Today!" and stop (no auto-flip to counting up, no special notification).

## Auth: one shared password
Instead of relying on an unlisted URL, the app uses a single shared Firebase Authentication account (one email+password that both Blake and his wife know) rather than individual logins. The UI only ever shows a password field — the fixed email is hidden in the code. Firebase's web SDK persists the signed-in session locally by default, so each of them only signs in once per device/browser, not every visit. Firestore security rules require `request.auth != null`, so this is enforced at the database level, not just a UI gate — the countdowns aren't readable/writable by anyone who doesn't have that session. The Android widget will need to do the same one-time sign-in (via the Firebase Auth REST API) and cache its session token on-device.

Setup needed once in the Firebase console: create that one shared user under Authentication > Users, with a password Blake and his wife agree on.

## Physical delivery: NFC tag
Blake and his wife are Foreign Service, often apart for weeks at a time — this app exists for that. Plan is to embed a cheap passive NFC tag (NTAG213 sticker, ~$5-10/pack) in a gift box/envelope, programmed with a plain URL pointing at the webpage (not the app directly — Android cannot silently install an app from an NFC tap, that's a deliberate security restriction with no workaround). Every tap, first time and all future times, opens the same webpage; no Android App Links / deep-linking setup needed since repeat-tap-opens-app-directly was explicitly decided against in favor of simplicity.

First-tap flow (Blake will be present for this one, so the landing page doesn't need to be foolproof for remote/unassisted use): tap tag -> notification -> browser opens to the webpage -> she optionally follows a "get the widget" link to download+sideload the APK (one-time "allow installs from this source" toggle, then install). The webpage itself should work fully standalone even if she never installs the widget at all.

Writing the tag is a one-time manual step (a free app like "NFC Tools" on Android writes a URL/NDEF record to a blank tag) — not custom software, just something Blake does once he has the final URL.

## Next steps
- [ ] **Blake only, needs Google login**: create the Firebase project + Firestore + shared Auth user (exact steps below) and send Claude the resulting config block
- [x] Build the webpage: list UI, add/edit/delete, live Firestore sync, live-ticking primary countdown display -- done, in `web/`
- [x] Firestore rules requiring `request.auth != null` -- done, in `firestore.rules`
- [ ] Plug in the real Firebase config (currently `REPLACE_ME` placeholders in `web/firebase-config.js` and `android/app/src/main/java/com/neyland/countdownwidget/Constants.kt`)
- [ ] Deploy the webpage (`npx firebase-tools deploy --only hosting,firestore:rules` once logged in) -- `firebase.json` is already set up for this
- [x] Install Android SDK/JDK/Gradle -- done this session, see Status above
- [x] Build the native widget: `AppWidgetProvider`, configure-on-add password screen, fetches soonest countdown from Firestore, renders days/hours/mins, refreshes on OS floor, tap opens the webpage URL -- done, in `android/`, builds clean
- [ ] Update `Constants.WEBPAGE_URL` in the Android project once the webpage is deployed, then rebuild
- [ ] Sideload the APK onto Blake's phone and wife's phone via `adb install` or direct file transfer + "install unknown apps"
- [ ] Publish the APK as a GitHub Release on this repo so it has a stable, shareable "tap to install" link, and add a "get the widget" link to it from the webpage
- [ ] Buy a blank NFC tag (NTAG213 sticker or similar) and write the webpage URL to it using a free app (e.g. "NFC Tools") — physical step, not software

### Exact Firebase console steps Blake needs to do
1. https://console.firebase.google.com -> Add project (any name, decline Analytics)
2. Build -> Firestore Database -> Create database -> production mode, any region
3. Build -> Authentication -> Get started -> Sign-in method -> enable Email/Password
4. Authentication -> Users tab -> Add user -> any email (or keep the placeholder `us@family-countdown.app`), password = the one shared password you and your wife will use
5. Project settings (gear icon) -> Your apps -> web icon `</>` -> register an app -> copy the config object shown
Send that config block back, plus the email used in step 4 if different from the placeholder.

## Context
Both Blake and his wife are on Android. Original ask was a home-screen widget; during scoping it became clear the real requirement (either person edits/deletes, changes sync both ways, up to 5 countdowns) needs a real shared datastore, not a one-way static file — hence Firestore, and splitting the "glanceable widget" from the "full editable list" into two pieces instead of cramming both into native Android UI.

This is also the first instance of a recurring pattern: Blake builds small low-effort apps as personal gifts for his wife, distributed by sideloading via a tap-to-install link rather than through the Play Store (no dev account, no store review, no cross-platform polish needed). See memory note `gift_app_workflow` for the standing preferences around this pattern — future small app ideas for his wife should default to this same shape unless told otherwise.

## Explicitly out of scope (for now)
- **Windows 11 native widget**: not needed now that the main experience is a webpage — it already works fine in a Windows browser, no separate native build required.
- **iOS**: not needed — both phones are Android.
- **Play Store listing**: not needed — sideload only.
- **Notifications/alerts**: explicitly not wanted — passive display only.
- **Separate individual logins**: not wanted — one shared password for both of them instead (see Auth section above).

## Effort estimate (as scoped above)
Roughly 5–9 hours of actual work, likely spread across 2–4 sittings since this is a first Android project and a first Firebase integration for Blake:
- Firebase project + Firestore setup: ~20 min
- Webpage (list UI, live sync, live countdown): ~1.5–3 hrs
- Android widget (thin display + tap-to-open-webpage): ~2–4 hrs
- Android Studio/SDK install: ~30–90 min
- Sideload to both phones: ~10-15 min/phone
- NFC tag: writing it is ~5 min once you have a blank tag in hand; ordering tags online adds shipping lead time outside of active work time
