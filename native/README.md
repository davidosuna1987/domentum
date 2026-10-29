# Domentum: apps for Android, iPhone and Mac

The three apps are the same player as the website (`../app`), packed into a native shell, so they look and work exactly the same: every theme, light/dark, zen mode, your mixes. When `app/` changes, rebuilding an app takes it along.

- `android/` and `ios/`: [Capacitor](https://capacitorjs.com) projects. `node sync.mjs` copies `app/` into `www/`, and `npx cap sync` puts it inside both projects (the copies are not in git).
- `android/.../BackgroundAudioPlugin.java` and `PlaybackService.java`: while sound plays, a foreground service with a notification ("Pausar") keeps it going with the screen off. `WindowColorPlugin.java` paints the status and navigation bars with the theme's colour.
- `ios/App/App/AppDelegate.swift` and `Info.plist` (`UIBackgroundModes: audio`): the sound keeps going with the screen locked, and the silent switch doesn't mute it.
- `macos/`: a small Swift app that shows the player with WebKit and serves its files from inside the app (`domentum://app/`). Native menus, the window's title bar takes the theme's colour, zen mode can go full screen.

## Building

```bash
cd native && npm install
```

- **Android** (needs Android Studio's SDK and JDK 21): `npm run android` → `android/app/build/outputs/apk/release/app-release.apk`.
- **Mac**: `node macos/build.mjs` → `../dist/Domentum.app` and `../dist/Domentum-mac.dmg` (Apple Silicon and Intel).
- **iPhone** (Xcode): `npm run ios`, then open `ios/App/App.xcodeproj` in Xcode.
- **Everything, and publish it**: `node release.mjs 1.1.0 "what changed"` builds the extension, the Android app and the Mac app and attaches the three to a new GitHub release. The landing links to the latest release.

Icons and splash screens come from the same mark as the website: `python3 ../design/native-icons.py`.

## Signing and stores

- **Android**: release builds are signed with `~/.domentum-keys/android-release.jks`, and its passwords are in `android/keystore.properties` (also copied to `~/.domentum-keys/`). Neither is in git. **Back up that folder**: phones only accept an update signed with the same key, so losing it means people have to uninstall the app to get a new version. Google Play also needs it (or Play App Signing), plus a Play Console account (one-time fee).
- **Mac**: signed ad hoc, so macOS asks to confirm it the first time (System Settings → Privacy & Security → "Open Anyway"). To skip that, sign and notarise it with an Apple Developer account (Developer ID).
- **iPhone**: Apple only lets apps onto an iPhone through the App Store or TestFlight, which needs an Apple Developer account (annual fee). Until then, iPhone users install the web app from Safari (Share → Add to Home Screen), which looks the same.

Once an app is in a store, set its link in `design/landing/build.mjs` (`PLAY_STORE`, `MAC_STORE`, `CHROME_STORE`) and rebuild the landing: its buttons then go straight to the store.
