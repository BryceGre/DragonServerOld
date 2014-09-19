package com.dragonmmomaker.server;

import java.util.Map;

import com.dragonmmomaker.server.module.ModuleManager;
import com.dragonmmomaker.server.util.LogCallback;

public class ServData {

    public static ServData _CurData; //use carefully, preferably only with modules

    public GameData Game;
    public String DataDir;
    public Database DB;
    public ModuleManager Module;
    public LogCallback Log = new LogCallback() {
        @Override
        public void log(int pId, String pMessage) {
        }
    };

    public ServData(Map<String, Map<String, String>> pConfig, String pDataDir, LogCallback pLog) {
        Log = pLog;
        DataDir = pDataDir;
        Game = new GameData(this, pConfig);
        DB = new Database();
        Module = new ModuleManager(this);
        _CurData = this;
    }

    public ServData(Map<String, Map<String, String>> pConfig) {
        Game = new GameData(this, pConfig);
        DB = new Database();
        Module = new ModuleManager(this);
        _CurData = this;
    }
}
