package com.neyland.countdownwidget

import android.content.Context

/** The manual text-size preference set via the widget's configure screen slider.
 * One shared value for the widget on this device (not per-instance -- there's
 * normally only ever one). */
object WidgetPrefs {
    private const val PREFS = "widget_prefs"
    private const val KEY_TEXT_SCALE_PERCENT = "text_scale_percent"
    const val DEFAULT_SCALE_PERCENT = 150

    fun getTextScalePercent(context: Context): Int =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getInt(KEY_TEXT_SCALE_PERCENT, DEFAULT_SCALE_PERCENT)

    fun setTextScalePercent(context: Context, percent: Int) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_TEXT_SCALE_PERCENT, percent)
            .apply()
    }
}
