package com.dragonmmomaker.server;

import java.util.Date;
import java.util.Map;

import com.dragonmmomaker.datamap.DBase;
import com.dragonmmomaker.server.module.ModuleManager;
import com.dragonmmomaker.server.npc.NpcManager;
import com.dragonmmomaker.server.player.Player;
import com.dragonmmomaker.server.player.PlayerManager;
import com.dragonmmomaker.server.quadtree.QuadTree;
import com.dragonmmomaker.server.util.GameUtils;
import com.dragonmmomaker.server.util.LogCallback;
import java.util.HashMap;

public class ServData {
    public static ServData _CurData; //use carefully, preferably only with modules
    public final String DataDir;
    public final Database DB;
    public final DBase Data;
    public final Map<String, Map<String, String>> Config;
    public final QuadTree<Player> Tree;
    public final PlayerManager Players;
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
        
        DB = new Database(Config.get("Database"));
        Players = new PlayerManager();
        Data = DB.setup();
        Utils = new GameUtils(this);
        Tree = new QuadTree(this);
        Module = new ModuleManager(this);
        Npcs = new NpcManager(this);
        Time = new Date();
    }
}
