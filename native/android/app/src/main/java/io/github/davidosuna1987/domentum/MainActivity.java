package io.github.davidosuna1987.domentum;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Keeps the sound going with the screen off (see BackgroundAudioPlugin)
        registerPlugin(BackgroundAudioPlugin.class);
        // The bars around the player take the theme's colour (see WindowColorPlugin)
        registerPlugin(WindowColorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
