package com.neyland.countdownwidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

class CountdownWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // goAsync() keeps this receiver alive long enough to finish the network call;
        // without it Android can kill the process right after onUpdate() returns.
        val pendingResult = goAsync()
        Thread {
            try {
                for (appWidgetId in appWidgetIds) {
                    WidgetUpdater.updateWidgetSync(context, appWidgetManager, appWidgetId)
                }
            } finally {
                pendingResult.finish()
            }
        }.start()
    }
}
