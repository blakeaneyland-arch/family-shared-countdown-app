package com.neyland.countdownwidget

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

data class Countdown(
    val label: String,
    val targetDate: Instant,
    val color: String,
    val textColor: String,
    val opacity: Int,
    val isPrimary: Boolean,
)

private const val DEFAULT_COLOR = "#e2b33c"
private const val DEFAULT_TEXT_COLOR = "#f4f3f7"
private const val DEFAULT_OPACITY = 30

object FirestoreClient {
    /** Fetches the whole countdowns collection. There are only ever a handful of documents,
     * so a single plain GET (rather than a structured query) is all that's needed. */
    fun fetchCountdowns(idToken: String): List<Countdown> {
        val url = URL(
            "https://firestore.googleapis.com/v1/projects/${Constants.FIREBASE_PROJECT_ID}" +
                "/databases/(default)/documents/countdowns"
        )
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("Authorization", "Bearer $idToken")
        conn.connectTimeout = 8000
        conn.readTimeout = 8000

        if (conn.responseCode != 200) {
            throw Exception("Firestore fetch failed: HTTP ${conn.responseCode}")
        }

        val response = JSONObject(conn.inputStream.bufferedReader().readText())
        val documents = response.optJSONArray("documents") ?: return emptyList()

        val results = mutableListOf<Countdown>()
        for (i in 0 until documents.length()) {
            val fields = documents.getJSONObject(i).getJSONObject("fields")
            val label = fields.getJSONObject("label").getString("stringValue")
            val targetDateStr = fields.getJSONObject("targetDate").getString("timestampValue")
            val color = fields.optJSONObject("color")?.optString("stringValue") ?: DEFAULT_COLOR
            val textColor = fields.optJSONObject("textColor")?.optString("stringValue") ?: DEFAULT_TEXT_COLOR
            val opacity = fields.optJSONObject("opacity")?.optString("integerValue")?.toIntOrNull() ?: DEFAULT_OPACITY
            val isPrimary = fields.optJSONObject("isPrimary")?.optBoolean("booleanValue") ?: false
            results.add(Countdown(label, Instant.parse(targetDateStr), color, textColor, opacity, isPrimary))
        }
        return results
    }
}
