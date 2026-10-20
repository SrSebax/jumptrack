package com.drako.jumptrack;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Recibe desde la web los datos de la racha y refresca el widget de la pantalla de inicio. */
@CapacitorPlugin(name = "StreakWidget")
public class StreakWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        context.getSharedPreferences(StreakWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(StreakWidgetProvider.KEY_DATA, call.getData().toString())
            .apply();
        StreakWidgetProvider.updateAll(context);
        call.resolve();
    }
}
