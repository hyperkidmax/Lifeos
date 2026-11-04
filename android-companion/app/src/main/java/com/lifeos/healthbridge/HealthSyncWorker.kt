package com.lifeos.healthbridge

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.auth.FirebaseAuth

/**
 * Background WorkManager worker that periodically checks Health Connect
 * and updates LifeOS Firestore without requiring the app to be open.
 */
class HealthSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val WORK_NAME = "LifeOS_HealthConnect_PeriodicSync"
        private const val TAG = "LifeOS-SyncWorker"
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Starting periodic Health Connect background sync…")

        val user = FirebaseAuth.getInstance().currentUser
        if (user == null) {
            Log.d(TAG, "User not signed in. Skipping background sync.")
            return Result.success()
        }

        val healthConnectManager = HealthConnectManager(applicationContext)
        if (!healthConnectManager.hasAllPermissions()) {
            Log.d(TAG, "Health Connect permissions missing. Skipping background sync.")
            return Result.success()
        }

        return try {
            val syncEngine = FirestoreSyncEngine(applicationContext)
            val result = syncEngine.syncAll(healthConnectManager)
            if (result.success) {
                Log.d(TAG, "Background sync successful: ${result.stepsCount} steps, ${result.sleepMinutes} mins sleep.")
                Result.success()
            } else {
                Log.w(TAG, "Background sync completed with warning: ${result.message}")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Background sync failed", e)
            Result.retry()
        }
    }
}
