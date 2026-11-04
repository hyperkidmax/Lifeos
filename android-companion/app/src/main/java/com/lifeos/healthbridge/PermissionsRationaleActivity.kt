package com.lifeos.healthbridge

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

/**
 * Mandatory activity handling the `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` intent.
 * Explains to the user why LifeOS requires Health Connect permissions (Galaxy Watch 8 sync).
 */
class PermissionsRationaleActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_rationale)

        findViewById<Button>(R.id.btn_close_rationale).setOnClickListener {
            finish()
        }
    }
}
