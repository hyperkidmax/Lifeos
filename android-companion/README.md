# LifeOS HealthBridge (Android Companion)

A lightweight native Android companion application that bridges health and biometric data from **Samsung Galaxy Watch 8** (via Samsung Health and Health Connect) into your personal **LifeOS Firestore database**.

---

## 🏗 Architecture & Data Flow

```
┌────────────────────────┐
│  Galaxy Watch 8        │ (Continuous heart rate, step sensor, sleep tracking)
└───────────┬────────────┘
            │ Bluetooth Sync
            ▼
┌────────────────────────┐
│  Samsung Health App    │ (Redmi Note 9 Pro Max)
└───────────┬────────────┘
            │ Native Health Connect Sync (Configured in Samsung Health)
            ▼
┌────────────────────────┐
│  Android Health Connect│ (Google Play Services APK on Android 12)
└───────────┬────────────┘
            │ Jetpack Health Connect API (androidx.health.connect:connect-client:1.1.0)
            ▼
┌────────────────────────┐
│  LifeOS HealthBridge   │ (This Android companion app)
│  - Google Sign-In      │ (Authenticates dynamically; zero hardcoded secrets)
│  - Coroutine Workers   │ (Periodic 15-min background sync via WorkManager)
└───────────┬────────────┘
            │ Firebase Firestore Android SDK (Over gRPC)
            ▼
┌────────────────────────┐
│  LifeOS Firestore DB   │ (Project: gen-lang-client-0635319389)
│  /users/{uid}/...      │ (Target DB: ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4)
└───────────┬────────────┘
            │ Real-time Cloud Sync
            ▼
┌────────────────────────┐
│  LifeOS Web Dashboard  │ (Accessible on your iPhone 15 Pro Max & desktop browsers)
└────────────────────────┘
```

---

## 📦 What Data is Synced

| Metric | Health Connect Source Record | Target LifeOS Subcollection | Notes |
| :--- | :--- | :--- | :--- |
| **Steps & Distance** | `StepsRecord` | `/users/{uid}/stepLogs/{YYYY-MM-DD}` | Real daily steps and distance |
| **Active Calories** | `ActiveCaloriesBurnedRecord` | Included in `stepLogs` & `workoutLogs` | Real calories burned from activity |
| **Sleep Duration & Times** | `SleepSessionRecord` | `/users/{uid}/sleepLogs/{YYYY-MM-DD}` | Total sleep, bedtime, wake time |
| **Heart Rate** | `HeartRateRecord` | `/users/{uid}/heartRateLogs/{YYYY-MM-DD}` | Samples, min, max, and avg BPM |
| **Workout Sessions** | `ExerciseSessionRecord` | `/users/{uid}/workoutLogs/{session-id}` | Exercise type, duration, timestamp |

> **Strength Training Note:**
> Samsung Health does **not** export individual exercise sets, repetitions per set, or weights lifted (kg) to Health Connect. The companion synchronizes the exercise session time and calories. Use the existing workout logger in LifeOS for manual strength-training sets and reps.

---

## 🛠 Prerequisites

1. **Computer:**
   - [Android Studio](https://developer.android.com/studio) (Giraffe 2022.3+, Hedgehog, Iguana, or newer).
   - JDK 17 (bundled with Android Studio).

2. **Phone (Redmi Note 9 Pro Max on Android 12):**
   - **Health Connect App:** Install "Health Connect by Android" from Google Play Store if not already installed.
   - **Samsung Health:** Open Samsung Health → Settings → **Health Connect** → Turn ON "Sync with Health Connect" for Steps, Sleep, Heart Rate, and Exercise.
   - **Developer Options:** Settings → About phone → Tap "MIUI version" 7 times → Additional Settings → Developer options → Enable **USB Debugging**.

3. **Firebase Configuration (`google-services.json`):**
   - In your Firebase Console for project `gen-lang-client-0635319389`:
     - Add an Android App with package name: `com.lifeos.healthbridge`
     - Download `google-services.json`
     - Place it in: `/android-companion/app/google-services.json`

---

## 🚀 Setup & Build Steps

1. **Open the Project:**
   - Launch Android Studio.
   - Click **Open** and select the `/android-companion` directory.
   - Wait for Gradle sync to complete.

2. **Connect Device:**
   - Connect your Redmi Note 9 Pro Max via USB.
   - Accept the USB debugging authorization prompt on your phone.

3. **Build and Run:**
   - Select `app` in the run configuration dropdown.
   - Click the green **Run** button (or press `Shift + F10`).
   - The app will compile and install on your Redmi phone.

---

## 🧪 Testing the Integration

### Step 1: Sign in with your Google Account
- Open **LifeOS HealthBridge** on your phone.
- Tap **Sign in with Google**.
- Select your existing LifeOS Google account.
- Confirm that your email and Firebase `UID` appear on the dashboard.

### Step 2: Grant Health Connect Permissions
- Tap **Grant Health Permissions**.
- The Android Health Connect system dialog will appear.
- Enable read permissions for:
  - Steps
  - Sleep
  - Heart rate
  - Active calories burned
  - Exercise sessions
- Tap **Allow**.

### Step 3: Trigger a Manual Sync
- Ensure your Galaxy Watch 8 has synced with Samsung Health.
- Tap **Sync Health Data Now** in LifeOS HealthBridge.
- Check the summary report:
  - Steps count
  - Sleep minutes
  - Average HR (bpm)
  - Workouts count

### Step 4: Verify in LifeOS Web Dashboard
- Open LifeOS on your **iPhone 15 Pro Max** or web browser.
- Verify that the Daily Goals rings, steps count, sleep log, and heart rate card update to match your watch data.

---

## ⚡ Redmi / MIUI Optimization (Background Sync)

MIUI has aggressive battery management that can pause background `WorkManager` tasks. To ensure periodic sync works reliably every 15 minutes:

1. Open **Settings** on your Redmi phone.
2. Go to **Apps** → **Manage Apps** → **LifeOS HealthBridge**.
3. Toggle ON **Autostart**.
4. Tap **Battery Saver** → Select **No restrictions**.
5. Lock the app in the recent apps tray (optional, recommended).
