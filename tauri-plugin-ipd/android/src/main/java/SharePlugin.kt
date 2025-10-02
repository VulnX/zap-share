package com.plugin.ipd

import android.app.Activity
import android.content.Intent
import android.net.Uri
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@TauriPlugin
class SharePlugin(private val activity: Activity): Plugin(activity) {

    // Store the URI list as a class member to handle updates across commands
    private var currentUriList: List<String> = emptyList()

    // Called when a new Intent is received while the app is in the background
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        // Handle the new shared data
        handleShareIntent(intent)
    }

    // Command to get the shared URI list
    @Command
    fun getSharedUriList(invoke: Invoke) {
        val uriList = if (currentUriList.isNotEmpty()) {
            currentUriList
        } else {
            val intent = activity.intent
            val uriList = handleShareIntent(intent)  // Process the current Intent
            uriList
        }

        // Return the URI list back to Tauri
        val ret = JSObject()
        ret.put("uriList", uriList)
        invoke.resolve(ret)
    }

    // Function to handle the Intent and update the URI list
    private fun handleShareIntent(intent: Intent): List<String> {
        val uriList = mutableListOf<String>()
        when (intent.action) {
            Intent.ACTION_SEND -> {
                intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)?.let {
                    uriList.add(it.toString())
                }
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                if (uris != null) uriList.addAll(uris.map { it.toString() })
            }
        }

        // Update the class member that stores the current URI list
        currentUriList = uriList
        return uriList
    }
}
