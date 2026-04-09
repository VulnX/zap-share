# Installation

This document covers building Zap Share from source and using prebuilt packages.

---

## Build from Source

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) or npm

Install the Tauri CLI:

```bash
npm install -g @tauri-apps/cli
```

---

### Windows

Install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) first, then:

```bash
npm install
npm run tauri build
```

The installer will be output to `src-tauri/target/release/bundle/msi/`.

---

### Linux

Install the required system libraries (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  build-essential \
  curl \
  pkg-config \
  libssl-dev
```

Then build:

```bash
npm install
npm run tauri build
```

Output will be in `src-tauri/target/release/bundle/` as a `.deb` package or `AppImage`.

---

### Android

Install [Android Studio](https://developer.android.com/studio) with the NDK, then add the required Rust targets:

```bash
rustup target add \
  aarch64-linux-android \
  armv7-linux-androideabi \
  i686-linux-android \
  x86_64-linux-android
```

Initialize and build:

```bash
npm run tauri android init
npm run tauri android build
```

#### Self-signed APK for Android

For sideloading or testing, you can self-sign the release APK.

1. Generate a keystore:

```bash
keytool -genkey -v \
  -keystore zap-share.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias zap-share
```

2. Sign the APK using `apksigner` (found in your Android SDK `build-tools` directory):

```bash
apksigner sign \
  --ks zap-share.jks \
  --out zap-share-signed.apk \
  src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## Use Prebuilt Packages

Download the latest release for your platform from the [Releases](https://github.com/vulnx/zap-share/releases) page.

| Platform | Format |
|----------|--------|
| Windows  | `.msi`, `.exe` |
| Linux    | `.deb`, `AppImage` |
| Android  | `.apk` |
