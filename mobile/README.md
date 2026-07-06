# PsiNMR mobile (Capacitor)

Native **iOS and Android** apps for PsiNMR, built with
[Capacitor](https://capacitorjs.com). They wrap the touch-first mobile web view
(the `#/m` route), so there is **no second UI codebase**. See
[../planning/MOBILE_APP.md](../planning/MOBILE_APP.md) for the fuller plan.

## The key design: a thin client that auto-updates

`server.url` in [`capacitor.config.ts`](capacitor.config.ts) points at
`https://psinmr.com/#/m`. The store binary is a thin native shell around the
live web view, which means:

- **Web updates ship instantly** to installed apps — no App Store / Play Store
  resubmission for frontend changes.
- **Pro rides along.** When accounts/login land in the web app, the mobile apps
  get them automatically (Capacitor persists cookies/storage). OAuth redirects
  should use a deep link / `Browser` plugin — noted for when Pro arrives.
- Only native-capability changes (file associations, share targets, permissions)
  require a new store build.

Offline is a later enhancement; a minimal fallback lives in
[`www/`](www/index.html).

### App Store review note

A pure webview wrapper can fall foul of Apple guideline **4.2 (minimum
functionality)**. The mitigation is already in the plan: the native shell adds
**file open ("open .nmrium/zip with PsiNMR")** and **share-sheet import/export**,
giving it capabilities a browser tab doesn't have. Add these Capacitor plugins
before submitting.

## Build

The native `ios/` and `android/` projects are generated locally (they're
git-ignored), so you need Xcode (iOS) and/or Android Studio.

```bash
cd mobile
npm install
npm run add:ios       # or: npm run add:android
npm run sync
npm run open:ios      # opens Xcode → run on a simulator/device
```

Because content is remote, you usually **don't** rebuild for web changes — just
reopen the app. Rebuild only when native config/plugins change.

> This directory is a scaffold. `ios/`/`android/` are created by
> `npx cap add …`; validate against the current Capacitor 6 docs before the
> first store submission.
