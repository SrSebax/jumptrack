package com.drako.jumptrack;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StreakWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
