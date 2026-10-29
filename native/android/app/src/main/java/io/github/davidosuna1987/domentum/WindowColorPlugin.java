package io.github.davidosuna1987.domentum;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Paints the window behind the status and navigation bars with the theme's colour, so they don't show white. */
@CapacitorPlugin(name = "WindowColor")
public class WindowColorPlugin extends Plugin {
    @PluginMethod
    public void set(PluginCall call) {
        String hex = call.getString("color", "#f4f0e6");
        int color;
        try {
            color = Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            call.reject("Not a colour: " + hex);
            return;
        }
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            getBridge().getWebView().setBackgroundColor(color);
        });
        call.resolve();
    }
}
