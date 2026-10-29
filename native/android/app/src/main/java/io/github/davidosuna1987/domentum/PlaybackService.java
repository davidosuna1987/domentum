package io.github.davidosuna1987.domentum;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * A foreground service of type mediaPlayback: while it runs, Android keeps the player (and its sound) alive.
 * It also listens for headphones being unplugged or Bluetooth going away ("becoming noisy"): Android says so just
 * before the sound moves to the speaker, and the player pauses at once.
 */
public class PlaybackService extends Service {
    // debug builds only: lets a test send it with adb, since the system's own broadcast can't be faked
    static final String TEST_OUTPUT_LOST = BuildConfig.APPLICATION_ID + ".TEST_OUTPUT_LOST";
    static final String ACTION_START = "start";
    static final String ACTION_PAUSE = "pause";
    private static final String CHANNEL = "playback";
    private static final int ID = 1;

    private final BroadcastReceiver noisy = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (BackgroundAudioPlugin.instance != null) BackgroundAudioPlugin.instance.fromService("output-lost");
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        ContextCompat.registerReceiver(this, noisy, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY), ContextCompat.RECEIVER_NOT_EXPORTED);
        if (BuildConfig.DEBUG) ContextCompat.registerReceiver(this, noisy, new IntentFilter(TEST_OUTPUT_LOST), ContextCompat.RECEIVER_EXPORTED);
    }

    @Override
    public void onDestroy() {
        unregisterReceiver(noisy);
        super.onDestroy();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_PAUSE.equals(intent.getAction())) {
            if (BackgroundAudioPlugin.instance != null) BackgroundAudioPlugin.instance.fromService("pause");
            stopSelf();
            return START_NOT_STICKY;
        }
        String title = intent != null ? intent.getStringExtra("title") : null;
        String text = intent != null ? intent.getStringExtra("text") : null;
        Notification n = build(title != null ? title : "Domentum", text != null ? text : "");
        if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(ID, n);
        return START_NOT_STICKY;
    }

    private Notification build(String title, String text) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Reproducción", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Lo que está sonando, con un botón para pausar");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent open = PendingIntent.getActivity(this, 0,
            new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), flags);
        PendingIntent pause = PendingIntent.getService(this, 1,
            new Intent(this, PlaybackService.class).setAction(ACTION_PAUSE), flags);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_domentum)
            .setColor(0xFFC4352A)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(open)
            .addAction(0, "Pausar", pause)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
