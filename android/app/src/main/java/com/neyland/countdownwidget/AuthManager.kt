package com.neyland.countdownwidget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * One shared Firebase Auth account for both household members. Signing in on a device
 * stores a refresh token so future widget updates (and app opens) don't need the password
 * again -- mirrors how the webpage persists its session.
 */
object AuthManager {
    private const val PREFS = "countdown_auth"
    private const val KEY_ID_TOKEN = "id_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"
    private const val KEY_EXPIRES_AT = "expires_at"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isSignedIn(context: Context): Boolean =
        prefs(context).contains(KEY_REFRESH_TOKEN)

    fun signInWithPassword(context: Context, password: String): Result<Unit> {
        return try {
            val url = URL(
                "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword" +
                    "?key=${Constants.FIREBASE_API_KEY}"
            )
            val body = JSONObject().apply {
                put("email", Constants.SHARED_AUTH_EMAIL)
                put("password", password)
                put("returnSecureToken", true)
            }
            val response = postJson(url, body)
            saveTokens(
                context,
                response.getString("idToken"),
                response.getString("refreshToken"),
                response.getString("expiresIn").toLong()
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** A valid ID token, refreshing it first if expired. Null if never signed in or refresh failed. */
    fun getValidIdToken(context: Context): String? {
        val p = prefs(context)
        val refreshToken = p.getString(KEY_REFRESH_TOKEN, null) ?: return null
        val expiresAt = p.getLong(KEY_EXPIRES_AT, 0)

        if (System.currentTimeMillis() < expiresAt) {
            return p.getString(KEY_ID_TOKEN, null)
        }

        return try {
            val url = URL("https://securetoken.googleapis.com/v1/token?key=${Constants.FIREBASE_API_KEY}")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            conn.doOutput = true
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.outputStream.use {
                it.write("grant_type=refresh_token&refresh_token=$refreshToken".toByteArray())
            }
            if (conn.responseCode != 200) return null

            // Note: this endpoint uses snake_case field names, unlike signInWithPassword's camelCase.
            val response = JSONObject(conn.inputStream.bufferedReader().readText())
            val newIdToken = response.getString("id_token")
            val newRefreshToken = response.getString("refresh_token")
            val expiresIn = response.getString("expires_in").toLong()
            saveTokens(context, newIdToken, newRefreshToken, expiresIn)
            newIdToken
        } catch (e: Exception) {
            null
        }
    }

    private fun saveTokens(context: Context, idToken: String, refreshToken: String, expiresInSeconds: Long) {
        prefs(context).edit()
            .putString(KEY_ID_TOKEN, idToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            // refresh a minute early so a near-expiry token is never used
            .putLong(KEY_EXPIRES_AT, System.currentTimeMillis() + (expiresInSeconds * 1000) - 60_000)
            .apply()
    }

    private fun postJson(url: URL, body: JSONObject): JSONObject {
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.outputStream.use { it.write(body.toString().toByteArray()) }

        if (conn.responseCode !in 200..299) {
            val err = conn.errorStream?.bufferedReader()?.readText()
            throw Exception("HTTP ${conn.responseCode}: $err")
        }
        return JSONObject(conn.inputStream.bufferedReader().readText())
    }
}
