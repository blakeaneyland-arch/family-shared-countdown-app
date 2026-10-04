package com.neyland.countdownwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import java.time.Duration
import java.time.Instant

/** Builds and pushes the widget's RemoteViews. Shared by the AppWidgetProvider's periodic
 * refresh and the configure Activity's "show something immediately after sign-in" call. */
object WidgetUpdater {

    /** Fire-and-forget: does the network work on a background thread. */
    fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Thread { updateWidgetSync(context, appWidgetManager, appWidgetId) }.start()
    }

    /** Blocking: caller is responsible for being off the main thread already. */
    fun updateWidgetSync(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = buildViews(context)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun buildViews(context: Context): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_countdown)
        setWebpagePendingIntent(context, views)

        if (!AuthManager.isSignedIn(context)) {
            views.setTextViewText(R.id.widget_label, "Tap to set up")
            views.setTextViewText(R.id.widget_time, "")
            return views
        }

        val idToken = AuthManager.getValidIdToken(context)
        if (idToken == null) {
            views.setTextViewText(R.id.widget_label, "Sign-in expired, tap to fix")
            views.setTextViewText(R.id.widget_time, "")
            return views
        }

        try {
            val countdowns = FirestoreClient.fetchCountdowns(idToken)
            val now = Instant.now()

            // Same selection rule as the webapp: whichever countdown is explicitly
            // marked featured, falling back to the soonest upcoming one.
            val featured = countdowns.find { it.isPrimary }
                ?: countdowns.filter { it.targetDate.isAfter(now) }.minByOrNull { it.targetDate }

            if (featured == null) {
                views.setTextViewText(R.id.widget_label, "No countdowns yet")
                views.setTextViewText(R.id.widget_time, "")
            } else {
                views.setTextViewText(R.id.widget_label, featured.label)
                views.setTextViewText(
                    R.id.widget_time,
                    formatDuration(Duration.between(now, featured.targetDate))
                )
                applyColors(views, featured)
            }
        } catch (e: Exception) {
            views.setTextViewText(R.id.widget_label, "Couldn't update")
            views.setTextViewText(R.id.widget_time, "")
        }

        return views
    }

    private fun applyColors(views: RemoteViews, item: Countdown) {
        val textColor = parseColorSafely(item.textColor, default = Color.WHITE)
        views.setTextColor(R.id.widget_label, textColor)
        views.setTextColor(R.id.widget_time, textColor)

        val rgb = parseColorSafely(item.color, default = Color.DKGRAY) and 0x00FFFFFF
        val alpha = (item.opacity.coerceIn(10, 100) * 255 / 100) shl 24
        views.setInt(R.id.widget_root, "setBackgroundColor", rgb or alpha)
    }

    private fun parseColorSafely(hex: String, default: Int): Int =
        try {
            Color.parseColor(hex)
        } catch (e: IllegalArgumentException) {
            default
        }

    private fun setWebpagePendingIntent(context: Context, views: RemoteViews) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(Constants.WEBPAGE_URL))
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
    }

    private fun formatDuration(duration: Duration): String {
        val totalDays = duration.toDays()
        val years = totalDays / 365
        val hours = duration.toHours() % 24
        return when {
            years > 0 -> "${years}y ${totalDays - years * 365}d"
            totalDays > 0 -> "${totalDays}d ${hours}h"
            hours > 0 -> "${hours}h"
            else -> "<1h"
        }
    }
}
