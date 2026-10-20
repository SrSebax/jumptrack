package com.drako.jumptrack;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.widget.RemoteViews;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Widget "Racha": días seguidos entrenando y los días de esta semana.
 * Los datos los escribe StreakWidgetPlugin; aquí solo se pintan, recalculando la racha
 * con la fecha actual para que se apague sola si pasa un día sin entrenar.
 */
public class StreakWidgetProvider extends AppWidgetProvider {

    static final String PREFS = "jumptrack_widget";
    static final String KEY_DATA = "data";

    private static final long DAY_MS = 86_400_000L;
    /** Desde este tamaño (dp) cabe la fila con los días de la semana. */
    private static final int FULL_MIN_WIDTH = 220;
    private static final int FULL_MIN_HEIGHT = 100;
    private static final int[] DOT_IDS = {
        R.id.dot0, R.id.dot1, R.id.dot2, R.id.dot3, R.id.dot4, R.id.dot5, R.id.dot6
    };
    private static final int[] LABEL_IDS = {
        R.id.label0, R.id.label1, R.id.label2, R.id.label3, R.id.label4, R.id.label5, R.id.label6
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) {
            manager.updateAppWidget(id, viewsFor(context, manager, id));
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, Bundle newOptions) {
        // Al cambiar el tamaño en Android 11 o anterior hay que elegir el diseño a mano.
        manager.updateAppWidget(widgetId, viewsFor(context, manager, widgetId));
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : manager.getAppWidgetIds(new ComponentName(context, StreakWidgetProvider.class))) {
            manager.updateAppWidget(id, viewsFor(context, manager, id));
        }
    }

    /** Diseño completo o compacto según el tamaño del widget. */
    private static RemoteViews viewsFor(Context context, AppWidgetManager manager, int widgetId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+: el launcher elige el diseño solo al redimensionar.
            Map<SizeF, RemoteViews> layouts = new HashMap<>();
            layouts.put(new SizeF(0, 0), buildViews(context, false));
            layouts.put(new SizeF(FULL_MIN_WIDTH, FULL_MIN_HEIGHT), buildViews(context, true));
            return new RemoteViews(layouts);
        }
        Bundle options = manager.getAppWidgetOptions(widgetId);
        // En vertical, el ancho real es el mínimo y el alto real es el máximo.
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, FULL_MIN_WIDTH);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, FULL_MIN_HEIGHT);
        return buildViews(context, width >= FULL_MIN_WIDTH && height >= FULL_MIN_HEIGHT);
    }

    /** Día local como entero, igual que toEpochDay() en la web. */
    private static long todayEpochDay() {
        Calendar now = Calendar.getInstance();
        long local = now.getTimeInMillis() + now.get(Calendar.ZONE_OFFSET) + now.get(Calendar.DST_OFFSET);
        return Math.floorDiv(local, DAY_MS);
    }

    private static String days(int n) {
        return n == 1 ? "1 día" : n + " días";
    }

    private static RemoteViews buildViews(Context context, boolean full) {
        JSONObject data;
        try {
            data = new JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DATA, "{}"));
        } catch (JSONException e) {
            data = new JSONObject();
        }

        long today = todayEpochDay();
        int streak = data.optInt("streak", 0);
        // La racha sigue viva si terminó hoy o ayer.
        if (today - data.optLong("streakEndDay", Long.MIN_VALUE / 2) > 1) streak = 0;
        int best = Math.max(streak, data.optInt("bestStreak", 0));

        Set<Long> trained = new HashSet<>();
        JSONArray recent = data.optJSONArray("recentDays");
        if (recent != null) {
            for (int i = 0; i < recent.length(); i++) trained.add(recent.optLong(i));
        }

        boolean light = "light".equals(data.optString("theme"));
        int text = light ? 0xFF121417 : 0xFFFFFFFF;
        int muted = light ? 0xFF6A707A : 0xFF8E939C;

        RemoteViews views = new RemoteViews(context.getPackageName(), full ? R.layout.widget_streak : R.layout.widget_streak_small);
        views.setInt(R.id.widget_root, "setBackgroundResource", light ? R.drawable.widget_bg_light : R.drawable.widget_bg_dark);
        views.setInt(R.id.flame_tile, "setBackgroundResource", light ? R.drawable.widget_flame_tile_light : R.drawable.widget_flame_tile_dark);
        views.setTextViewText(R.id.streak_days, days(streak));
        views.setTextColor(R.id.streak_days, text);
        views.setTextViewText(R.id.streak_sub, full ? "Racha actual · Mejor: " + days(best) : "Racha · Mejor: " + best);
        views.setTextColor(R.id.streak_sub, muted);

        // 1970-01-01 fue jueves: con lunes = 0, el día de la semana es (epochDay + 3) mod 7.
        long monday = today - Math.floorMod(today + 3, 7);
        for (int i = 0; full && i < 7; i++) {
            long day = monday + i;
            int dot;
            if (trained.contains(day)) dot = R.drawable.widget_dot_done;
            else if (day == today) dot = R.drawable.widget_dot_today;
            else dot = light ? R.drawable.widget_dot_pending_light : R.drawable.widget_dot_pending_dark;
            views.setImageViewResource(DOT_IDS[i], dot);
            views.setTextColor(LABEL_IDS[i], muted);
        }

        Intent open = new Intent(context, MainActivity.class);
        views.setOnClickPendingIntent(
            R.id.widget_root,
            PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
        );
        return views;
    }
}
