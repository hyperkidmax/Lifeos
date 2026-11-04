package com.lifeos.healthbridge

import android.content.Context
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Synchronizes real health records into the LifeOS Firestore database.
 * Strictly adheres to existing firestore.rules and wellness.ts schema.
 * Operates on the user's private document space (/users/{uid}/...).
 */
class FirestoreSyncEngine(private val context: Context) {

    companion object {
        private const val TAG = "LifeOS-SyncEngine"
        // Target exact database specified in firebase-applet-config.json
        const val FIRESTORE_DATABASE_ID = "ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4"
    }

    private val auth: FirebaseAuth get() = FirebaseAuth.getInstance()
    private val firestore: FirebaseFirestore get() = FirebaseFirestore.getInstance(FirebaseApp.getInstance(), FIRESTORE_DATABASE_ID)

    data class SyncResult(
        val success: Boolean,
        val stepsCount: Int = 0,
        val sleepMinutes: Int = 0,
        val heartRateAvg: Int? = null,
        val workoutsSynced: Int = 0,
        val message: String = ""
    )

    suspend fun syncAll(healthConnectManager: HealthConnectManager): SyncResult {
        val user = auth.currentUser
        if (user == null) {
            Log.e(TAG, "Sync aborted: User is not authenticated")
            return SyncResult(success = false, message = "Not signed in to Firebase")
        }

        val uid = user.uid
        val today = LocalDate.now(ZoneId.systemDefault())
        val dateString = today.format(DateTimeFormatter.ISO_LOCAL_DATE) // YYYY-MM-DD
        val startOfDay = today.atStartOfDay(ZoneId.systemDefault()).toInstant()
        val endOfDay = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant()

        // 1. Steps & Active Calories
        val stepsCount = healthConnectManager.readTotalSteps(startOfDay, endOfDay)
        val activeCalories = healthConnectManager.readTotalActiveCalories(startOfDay, endOfDay)

        if (stepsCount > 0) {
            val stepDoc = firestore.collection("users")
                .document(uid)
                .collection("stepLogs")
                .document(dateString)

            val stepPayload = hashMapOf<String, Any>(
                "id" to dateString,
                "userId" to uid,
                "date" to dateString,
                "count" to stepsCount.coerceIn(0, 250000),
                "distanceKm" to (stepsCount * 0.00075), // Standard step-to-km estimate
                "activeMinutes" to (stepsCount / 100),
                "caloriesBurned" to activeCalories,
                "timestamp" to System.currentTimeMillis(),
                "source" to "manual",
                "notes" to "Synced from Galaxy Watch 8 via Health Connect"
            )
            stepDoc.set(stepPayload, SetOptions.merge()).await()
            Log.d(TAG, "Synced steps for $dateString: $stepsCount")
        }

        // 2. Sleep Session
        // For sleep, query the last 24 hours to capture overnight sleep
        val sleepQueryStart = today.minusDays(1).atTime(18, 0).atZone(ZoneId.systemDefault()).toInstant()
        val sleepData = healthConnectManager.readSleepSessions(sleepQueryStart, endOfDay)
        var sleepMinutes = 0

        if (sleepData != null && sleepData.totalMinutes > 0) {
            sleepMinutes = sleepData.totalMinutes
            val sleepDoc = firestore.collection("users")
                .document(uid)
                .collection("sleepLogs")
                .document(dateString)

            val sleepPayload = hashMapOf<String, Any>(
                "id" to dateString,
                "userId" to uid,
                "date" to dateString,
                "totalMinutes" to sleepData.totalMinutes.coerceIn(0, 1440),
                "timestamp" to System.currentTimeMillis(),
                "source" to "manual",
                "notes" to "Synced from Galaxy Watch 8 via Health Connect"
            )
            sleepData.bedTime?.let { sleepPayload["bedTime"] = it }
            sleepData.wakeTime?.let { sleepPayload["wakeTime"] = it }

            sleepDoc.set(sleepPayload, SetOptions.merge()).await()
            Log.d(TAG, "Synced sleep for $dateString: ${sleepData.totalMinutes} mins")
        }

        // 3. Heart Rate
        val hrSummary = healthConnectManager.readHeartRate(startOfDay, endOfDay)
        var hrAvg: Int? = null

        if (hrSummary != null && hrSummary.avgBpm != null) {
            hrAvg = hrSummary.avgBpm
            val hrDoc = firestore.collection("users")
                .document(uid)
                .collection("heartRateLogs")
                .document(dateString)

            val hrPayload = hashMapOf<String, Any>(
                "id" to dateString,
                "userId" to uid,
                "date" to dateString,
                "timestamp" to System.currentTimeMillis(),
                "readings" to hrSummary.readings,
                "source" to "manual",
                "notes" to "Synced from Galaxy Watch 8 via Health Connect"
            )
            hrSummary.avgBpm.let { hrPayload["avgBpm"] = it }
            hrSummary.restingBpm?.let { hrPayload["restingBpm"] = it }
            hrSummary.minBpm?.let { hrPayload["minBpm"] = it }
            hrSummary.maxBpm?.let { hrPayload["maxBpm"] = it }

            hrDoc.set(hrPayload, SetOptions.merge()).await()
            Log.d(TAG, "Synced heart rate for $dateString: avg $hrAvg bpm")
        }

        // 4. Workouts / Exercise Sessions
        val workouts = healthConnectManager.readExerciseSessions(startOfDay, endOfDay)
        for (w in workouts) {
            val workoutDoc = firestore.collection("users")
                .document(uid)
                .collection("workoutLogs")
                .document(w.id)

            val workoutPayload = hashMapOf<String, Any>(
                "id" to w.id,
                "userId" to uid,
                "date" to dateString,
                "title" to w.title.take(150),
                "category" to "cardio",
                "durationMinutes" to w.durationMinutes.coerceIn(0, 1440),
                "exercises" to emptyList<Map<String, Any>>(), // Samsung Health does not export individual sets/reps
                "timestamp" to System.currentTimeMillis(),
                "notes" to (w.notes ?: "Synced from Galaxy Watch 8. Log strength sets/reps in LifeOS.")
            )

            workoutDoc.set(workoutPayload, SetOptions.merge()).await()
        }

        return SyncResult(
            success = true,
            stepsCount = stepsCount,
            sleepMinutes = sleepMinutes,
            heartRateAvg = hrAvg,
            workoutsSynced = workouts.size,
            message = "Sync completed successfully"
        )
    }
}
