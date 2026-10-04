package com.neyland.countdownwidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.SeekBar
import android.widget.TextView
import kotlin.concurrent.thread

/** Shown the first time either of them drags the widget onto a home screen, and
 * reachable again anytime afterward via the widget's long-press "Edit" option
 * (widgetFeatures="reconfigurable"). Collects the one shared password and the
 * manual text-size preference. */
class WidgetConfigureActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private lateinit var sizeSlider: SeekBar

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
        val sizePreview = findViewById<TextView>(R.id.config_size_preview)
        sizeSlider = findViewById(R.id.config_size_slider)

        if (AuthManager.isSignedIn(this)) {
            statusText.text = "Already signed in on this device -- tap Save to continue"
        }

        sizeSlider.progress = WidgetPrefs.getTextScalePercent(this)
        updateSizePreview(sizePreview, sizeSlider.progress)
        sizeSlider.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
                updateSizePreview(sizePreview, progress)
            }
            override fun onStartTrackingTouch(seekBar: SeekBar) {}
            override fun onStopTrackingTouch(seekBar: SeekBar) {}
        })

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

    private fun updateSizePreview(preview: TextView, progress: Int) {
        preview.textSize = 14f * (progress / 100f)
    }

    private fun finishConfigure() {
        WidgetPrefs.setTextScalePercent(this, sizeSlider.progress)

        val appWidgetManager = AppWidgetManager.getInstance(this)
        WidgetUpdater.updateWidget(this, appWidgetManager, appWidgetId)

        val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(RESULT_OK, resultValue)
        finish()
    }
}
