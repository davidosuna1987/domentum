package io.github.davidosuna1987.domentum;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The player calls start() when sound begins and stop() when it pauses. While it plays, a foreground service
 * (PlaybackService) with a notification keeps the app alive, so the sound goes on with the screen off or in
 * another app. The notification's "Pausar" comes back to the player as an "action" event.
 */
@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {
    static BackgroundAudioPlugin instance;
    private String title = "Domentum";
    private String text = "";
    private boolean playing = false;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void start(PluginCall call) {
        title = call.getString("title", "Domentum");
        text = call.getString("text", "");
        askForNotificationsOnce();
        try {
            post();
            playing = true;
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start playback service", e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        playing = false;
        getContext().stopService(new Intent(getContext(), PlaybackService.class));
        call.resolve();
    }

    private void post() {
        Intent intent = new Intent(getContext(), PlaybackService.class)
            .setAction(PlaybackService.ACTION_START)
            .putExtra("title", title)
            .putExtra("text", text);
        ContextCompat.startForegroundService(getContext(), intent);
    }

    // Back from the permission dialog: a notification posted before it was allowed stays hidden, so post it again
    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (playing && (Build.VERSION.SDK_INT < 33
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)) {
            try { post(); } catch (Exception ignored) {}
        }
    }

    void fromNotification(String action) {
        if ("pause".equals(action)) playing = false;
        JSObject data = new JSObject();
        data.put("action", action);
        notifyListeners("action", data, true);
    }

    // Android 13+ hides the playback notification unless allowed; ask the first time sound starts, only once
    private void askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < 33) return;
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        SharedPreferences prefs = getContext().getSharedPreferences("domentum", 0);
        if (prefs.getBoolean("askedNotifications", false)) return;
        prefs.edit().putBoolean("askedNotifications", true).apply();
        ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 4401);
    }
}
