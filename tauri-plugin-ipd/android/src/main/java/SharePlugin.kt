package com.plugin.ipd

import android.app.Activity
import android.content.Intent
import android.net.Uri
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@TauriPlugin
class SharePlugin(private val activity: Activity) : Plugin(activity) {

    // Store the shared data as a class member to handle updates
    private var currentUriList: List<String> = emptyList()
    private var sharedText: String? = null

    // Called when a new Intent is received while the app is in the background
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        // Handle the new shared data
        handleShareIntent(intent)
    }

    // Command to get the shared URI list and text
    @Command
    fun getSharedData(invoke: Invoke) {

        val uriList =
                if (currentUriList.isNotEmpty()) {
                    currentUriList
                } else {
                    val intent = activity.intent
                    handleShareIntent(intent) // Process the current Intent
                    currentUriList
                }

        // Prepare the result
        val ret = JSObject()
        ret.put("uriList", uriList)
        ret.put("sharedText", sharedText ?: "")

        // Return the data back to Tauri
        invoke.resolve(ret)
    }

    // Function to handle the Intent and update the shared data
    private fun handleShareIntent(intent: Intent) {

        // Only reset sharedText and uriList if the action is SEND or SEND_MULTIPLE
        if (intent.action == Intent.ACTION_SEND || intent.action == Intent.ACTION_SEND_MULTIPLE) {

            // Reset shared data only for relevant actions
            val uriList = mutableListOf<String>()
            sharedText = null

            when (intent.action) {
                Intent.ACTION_SEND -> {

                    // Handle shared text
                    intent.getStringExtra(Intent.EXTRA_TEXT)?.let {
                        sharedText = it
                    }

                    // Handle shared URI (if any)
                    intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)?.let {
                        uriList.add(it.toString())
                    }
                }
                Intent.ACTION_SEND_MULTIPLE -> {

                    // Handle shared text
                    intent.getStringExtra(Intent.EXTRA_TEXT)?.let {
                        sharedText = it
                    }

                    // Handle multiple shared URIs
                    val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                    uris?.let {
                        uriList.addAll(it.map { uri -> uri.toString() })
                    }
                }
            }

            // Update the class member that stores the current URI list
            currentUriList = uriList
        }
    }
}
