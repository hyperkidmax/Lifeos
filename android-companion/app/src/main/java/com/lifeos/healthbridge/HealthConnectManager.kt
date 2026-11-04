package com.lifeos.healthbridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.reflect.KClass

/**
 * Manages interactions with Android Health Connect API.
 * Reads real health records synced from Samsung Health / Galaxy Watch 8.
 * Never creates fake or mock biometric data.
 */
class HealthConnectManager(private val context: Context) {

    val healthConnectClient: HealthConnectClient? by lazy {
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }
    }

    // Set of permissions required to read Galaxy Watch 8 biometrics
    val requiredPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class)
    )

    fun checkAvailability(): Int {
        return HealthConnectClient.getSdkStatus(context)
    }

    suspend fun hasAllPermissions(): Boolean {
        val client = healthConnectClient ?: return false
        val granted = client.permissionController.getGrantedPermissions()
        return granted.containsAll(requiredPermissions)
    }

    // --- Steps ---
    suspend fun readTotalSteps(startTime: Instant, endTime: Instant): Int {
        val client = healthConnectClient ?: return 0
        val request = ReadRecordsRequest(
            recordType = StepsRecord::class,
            timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
        )
        val response = client.readRecords(request)
        return response.records.sumOf { it.count.toInt() }
    }

    // --- Active Calories Burned ---
    suspend fun readTotalActiveCalories(startTime: Instant, endTime: Instant): Int {
        val client = healthConnectClient ?: return 0
        val request = ReadRecordsRequest(
            recordType = ActiveCaloriesBurnedRecord::class,
            timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
        )
        val response = client.readRecords(request)
        return response.records.sumOf { it.energy.inKilocalories.toInt() }
    }

    // --- Sleep ---
    data class SleepData(
        val totalMinutes: Int,
        val bedTime: String?,
        val wakeTime: String?,
        val deepMinutes: Int = 0,
        val remMinutes: Int = 0,
        val lightMinutes: Int = 0,
        val awakeMinutes: Int = 0
    )

    suspend fun readSleepSessions(startTime: Instant, endTime: Instant): SleepData? {
        val client = healthConnectClient ?: return null
        val request = ReadRecordsRequest(
            recordType = SleepSessionRecord::class,
            timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
        )
        val response = client.readRecords(request)
        val records = response.records
        if (records.isEmpty()) return null

        val formatter = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault())
        val earliestStart = records.minOf { it.startTime }
        val latestEnd = records.maxOf { it.endTime }
        val totalMinutes = java.time.Duration.between(earliestStart, latestEnd).toMinutes().toInt()

        return SleepData(
            totalMinutes = totalMinutes.coerceIn(0, 1440),
            bedTime = formatter.format(earliestStart),
            wakeTime = formatter.format(latestEnd)
        )
    }

    // --- Heart Rate ---
    data class HeartRateSummary(
        val avgBpm: Int?,
        val minBpm: Int?,
        val maxBpm: Int?,
        val restingBpm: Int?,
        val readings: List<Map<String, Any>>
    )

    suspend fun readHeartRate(startTime: Instant, endTime: Instant): HeartRateSummary? {
        val client = healthConnectClient ?: return null
        val request = ReadRecordsRequest(
            recordType = HeartRateRecord::class,
            timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
        )
        val response = client.readRecords(request)
        val records = response.records
        if (records.isEmpty()) return null

        val allSamples = records.flatMap { it.samples }
        if (allSamples.isEmpty()) return null

        val timeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault())
        val readings = allSamples.take(50).map { sample ->
            mapOf(
                "time" to timeFormatter.format(sample.time),
                "bpm" to sample.beatsPerMinute.toInt()
            )
        }

        val bpms = allSamples.map { it.beatsPerMinute.toInt() }
        val avg = bpms.average().toInt()
        val min = bpms.minOrNull()
        val max = bpms.maxOrNull()

        return HeartRateSummary(
            avgBpm = avg.coerceIn(30, 250),
            minBpm = min?.coerceIn(30, 250),
            maxBpm = max?.coerceIn(30, 250),
            restingBpm = min?.coerceIn(30, 250), // Approximation if resting metric absent
            readings = readings
        )
    }

    // --- Workouts / Exercise Sessions ---
    data class WorkoutSessionData(
        val id: String,
        val title: String,
        val startTime: Instant,
        val endTime: Instant,
        val durationMinutes: Int,
        val notes: String?
    )

    suspend fun readExerciseSessions(startTime: Instant, endTime: Instant): List<WorkoutSessionData> {
        val client = healthConnectClient ?: return emptyList()
        val request = ReadRecordsRequest(
            recordType = ExerciseSessionRecord::class,
            timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
        )
        val response = client.readRecords(request)
        return response.records.map { session ->
            val durationMin = java.time.Duration.between(session.startTime, session.endTime).toMinutes().toInt()
            WorkoutSessionData(
                id = session.metadata.id,
                title = session.title ?: "Workout (${session.exerciseType})",
                startTime = session.startTime,
                endTime = session.endTime,
                durationMinutes = durationMin.coerceIn(0, 1440),
                notes = session.notes
            )
        }
    }
}
