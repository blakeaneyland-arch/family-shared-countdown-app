package com.neyland.countdownwidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import kotlin.concurrent.thread

/** Shown once, the first time either of them drags the widget onto a home screen.
 * Collects the one shared password, signs in, caches the session, then lets the widget
 * through to its normal rendering. */
class WidgetConfigureActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID
        )
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        setContentView(R.layout.activity_widget_configure)

        val passwordInput = findViewById<EditText>(R.id.config_password_input)
        val saveButton = findViewById<Button>(R.id.config_save_button)
        val statusText = findViewById<TextView>(R.id.config_status)

        if (AuthManager.isSignedIn(this)) {
            statusText.text = "Already signed in on this device -- tap Save to continue"
        }

        saveButton.setOnClickListener {
            val password = passwordInput.text.toString()
            if (password.isBlank() && !AuthManager.isSignedIn(this)) return@setOnClickListener

            if (password.isBlank()) {
                finishConfigure()
                return@setOnClickListener
            }

            saveButton.isEnabled = false
            statusText.text = "Checking..."

            thread {
                val result = AuthManager.signInWithPassword(this, password)
                runOnUiThread {
                    saveButton.isEnabled = true
                    result.onSuccess {
                        finishConfigure()
                    }.onFailure {
                        statusText.text = "Wrong password, try again"
                    }
                }
            }
        }
    }

    private fun finishConfigure() {
        val appWidgetManager = AppWidgetManager.getInstance(this)
        WidgetUpdater.updateWidget(this, appWidgetManager, appWidgetId)

        val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(RESULT_OK, resultValue)
        finish()
    }
}
