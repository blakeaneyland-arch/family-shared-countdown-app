package com.neyland.countdownwidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

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

    // Fires whenever the user resizes the widget on their home screen -- re-render
    // immediately so the text size matches the new size rather than waiting for
    // the next scheduled refresh.
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle,
    ) {
        WidgetUpdater.updateWidget(context, appWidgetManager, appWidgetId)
    }
}
