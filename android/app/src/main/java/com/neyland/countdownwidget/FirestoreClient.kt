package com.neyland.countdownwidget

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

data class Countdown(val label: String, val targetDate: Instant)

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
            results.add(Countdown(label, Instant.parse(targetDateStr)))
        }
        return results
    }
}
