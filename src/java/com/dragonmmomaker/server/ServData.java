package com.dragonmmomaker.server;

import java.util.Date;
import java.util.Map;

import com.dragonmmomaker.datamap.DBase;
import com.dragonmmomaker.server.module.ModuleManager;
import com.dragonmmomaker.server.npc.NpcManager;
import com.dragonmmomaker.server.util.GameUtils;
import com.dragonmmomaker.server.util.LogCallback;

public class ServData {

    public static ServData _CurData; //use carefully, preferably only with modules
;
    public final String DataDir;
    public final Database DB;
    public final DBase Data;
    public final Map<String, Map<String, String>> Config;
    public final GameUtils Utils;
    public final ModuleManager Module;
    public final NpcManager Npcs;
    public final Date Time;
    
    public LogCallback Log = new LogCallback() {
        @Override
        public void log(int pId, String pMessage) {
        }
    };

    public ServData(Map<String, Map<String, String>> pConfig, String pDataDir, LogCallback pLog) {
        Log = pLog;
        Config = pConfig;
        DataDir = pDataDir;
        _CurData = this;
        
        DB = new Database(Config.get("Database"));;
        Data = DB.setup();
        Utils = new GameUtils(this);
        Module = new ModuleManager(this);
        Npcs = new NpcManager(this);
        Time = new Date();
    }
}
