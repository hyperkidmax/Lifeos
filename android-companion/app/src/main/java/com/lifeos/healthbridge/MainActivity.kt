package com.lifeos.healthbridge

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "LifeOS-MainActivity"
    }

    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient
    private lateinit var healthConnectManager: HealthConnectManager
    private lateinit var firestoreSyncEngine: FirestoreSyncEngine

    // UI elements
    private lateinit var tvAuthUser: TextView
    private lateinit var tvAuthUid: TextView
    private lateinit var btnAuth: Button
    private lateinit var tvHcSdkStatus: TextView
    private lateinit var tvHcPermissionsStatus: TextView
    private lateinit var btnGrantPermissions: Button
    private lateinit var btnSyncNow: Button
    private lateinit var pbSync: ProgressBar
    private lateinit var tvSyncStatus: TextView
    private lateinit var tvSyncSummary: TextView

    // Health Connect Permission Launcher
    private val requestPermissionsLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { grantedPermissions ->
        lifecycleScope.launch {
            updateHealthConnectUi()
        }
    }

    // Google Sign-In Launcher
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                val idToken = account?.idToken
                if (idToken != null) {
                    firebaseAuthWithGoogle(idToken)
                } else {
                    Toast.makeText(this, "Failed to retrieve Google ID token", Toast.LENGTH_SHORT).show()
                }
            } catch (e: ApiException) {
                Log.e(TAG, "Google sign in failed", e)
                Toast.makeText(this, "Google sign in failed: ${e.statusCode}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        auth = FirebaseAuth.getInstance()

        healthConnectManager = HealthConnectManager(this)
        firestoreSyncEngine = FirestoreSyncEngine(this)

        initViews()
        setupGoogleSignIn()
        setupListeners()
        schedulePeriodicSync()
    }

    override fun onResume() {
        super.onResume()
        updateAuthUi()
        lifecycleScope.launch {
            updateHealthConnectUi()
        }
    }

    private fun initViews() {
        tvAuthUser = findViewById(R.id.tv_auth_user)
        tvAuthUid = findViewById(R.id.tv_auth_uid)
        btnAuth = findViewById(R.id.btn_auth)
        tvHcSdkStatus = findViewById(R.id.tv_hc_sdk_status)
        tvHcPermissionsStatus = findViewById(R.id.tv_hc_permissions_status)
        btnGrantPermissions = findViewById(R.id.btn_grant_permissions)
        btnSyncNow = findViewById(R.id.btn_sync_now)
        pbSync = findViewById(R.id.pb_sync)
        tvSyncStatus = findViewById(R.id.tv_sync_status)
        tvSyncSummary = findViewById(R.id.tv_sync_summary)
    }

    private fun setupGoogleSignIn() {
        val webClientId = getString(R.string.default_web_client_id)
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    private fun setupListeners() {
        btnAuth.setOnClickListener {
            if (auth.currentUser != null) {
                // Sign out
                auth.signOut()
                googleSignInClient.signOut()
                updateAuthUi()
            } else {
                // Launch Google Sign-In
                googleSignInLauncher.launch(googleSignInClient.signInIntent)
            }
        }

        btnGrantPermissions.setOnClickListener {
            val status = healthConnectManager.checkAvailability()
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> {
                    requestPermissionsLauncher.launch(healthConnectManager.requiredPermissions)
                }
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                    // Prompt user to update/install Health Connect via Play Store
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        data = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                        setPackage("com.android.vending")
                    }
                    startActivity(intent)
                }
                else -> {
                    Toast.makeText(this, "Health Connect is not available on this device", Toast.LENGTH_LONG).show()
                }
            }
        }

        btnSyncNow.setOnClickListener {
            performSync()
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    Toast.makeText(this, "Firebase sign-in successful", Toast.LENGTH_SHORT).show()
                    updateAuthUi()
                } else {
                    Log.e(TAG, "Firebase sign-in failed", task.exception)
                    Toast.makeText(this, "Firebase auth error: ${task.exception?.message}", Toast.LENGTH_LONG).show()
                }
            }
    }

    private fun updateAuthUi() {
        val user = auth.currentUser
        if (user != null) {
            tvAuthUser.text = "Connected: ${user.email ?: "Signed In"}"
            tvAuthUid.text = "UID: ${user.uid}"
            btnAuth.text = getString(R.string.sign_out)
        } else {
            tvAuthUser.text = "Not signed in"
            tvAuthUid.text = "UID: -"
            btnAuth.text = getString(R.string.sign_in_google)
        }
    }

    private suspend fun updateHealthConnectUi() {
        val status = healthConnectManager.checkAvailability()
        when (status) {
            HealthConnectClient.SDK_AVAILABLE -> {
                tvHcSdkStatus.text = "Health Connect: Installed & Available"
                val hasAll = healthConnectManager.hasAllPermissions()
                if (hasAll) {
                    tvHcPermissionsStatus.text = "Permissions: Granted (Steps, Sleep, HR, Workouts)"
                    btnGrantPermissions.visibility = View.GONE
                } else {
                    tvHcPermissionsStatus.text = "Permissions: Incomplete or Missing"
                    btnGrantPermissions.visibility = View.VISIBLE
                    btnGrantPermissions.text = getString(R.string.grant_health_permissions)
                }
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                tvHcSdkStatus.text = "Health Connect: Update Required from Google Play Store"
                btnGrantPermissions.visibility = View.VISIBLE
                btnGrantPermissions.text = "Install / Update Health Connect"
            }
            else -> {
                tvHcSdkStatus.text = "Health Connect: Unavailable on this device"
                btnGrantPermissions.visibility = View.GONE
            }
        }
    }

    private fun performSync() {
        val user = auth.currentUser
        if (user == null) {
            Toast.makeText(this, "Please sign in with Google first", Toast.LENGTH_SHORT).show()
            return
        }

        pbSync.visibility = View.VISIBLE
        tvSyncStatus.text = getString(R.string.sync_status_syncing)
        tvSyncSummary.text = ""
        btnSyncNow.isEnabled = false

        lifecycleScope.launch {
            try {
                val hasPerms = healthConnectManager.hasAllPermissions()
                if (!hasPerms) {
                    pbSync.visibility = View.GONE
                    btnSyncNow.isEnabled = true
                    tvSyncStatus.text = "Permissions required before syncing"
                    Toast.makeText(this@MainActivity, "Grant Health Connect permissions first", Toast.LENGTH_SHORT).show()
                    return@launch
                }

                val result = firestoreSyncEngine.syncAll(healthConnectManager)
                pbSync.visibility = View.GONE
                btnSyncNow.isEnabled = true

                if (result.success) {
                    tvSyncStatus.text = getString(R.string.sync_status_success)
                    val hrText = if (result.heartRateAvg != null) "${result.heartRateAvg} bpm" else "None"
                    tvSyncSummary.text = """
                        • Steps: ${result.stepsCount}
                        • Sleep: ${result.sleepMinutes} min
                        • Avg HR: $hrText
                        • Workouts: ${result.workoutsSynced}
                        (Target: /users/${user.uid}/...)
                    """.trimIndent()
                } else {
                    tvSyncStatus.text = "Sync warning: ${result.message}"
                }
            } catch (e: Exception) {
                Log.e(TAG, "Sync error", e)
                pbSync.visibility = View.GONE
                btnSyncNow.isEnabled = true
                tvSyncStatus.text = getString(R.string.sync_status_error)
                tvSyncSummary.text = "Error: ${e.message}"
            }
        }
    }

    private fun schedulePeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<HealthSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            HealthSyncWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
}
