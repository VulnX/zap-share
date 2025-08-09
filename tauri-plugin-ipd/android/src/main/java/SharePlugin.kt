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

    @Command
    fun getSharedUriList(invoke: Invoke) {

        val intent = activity.intent
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

        val ret = JSObject()
        ret.put("uriList", uriList)
        invoke.resolve(ret)
    }
}
