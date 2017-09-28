/*Copyright 2016 Bryce Gregerson

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/

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

/**
 * A class to store server data that can be shared between multiple classes
 * @author Bryce
 */
public class ServData {
    public static ServData _CurData; //use carefully, preferably only with modules
    public final String DataDir; //data directory for config, graphics, sounds, etc.
    public final Database DB; //database object
    public final DBase Data; //DBase database map object
    public final Map<String, Map<String, String>> Config; //server configuration
    public final QuadTree<Player> Tree; //scene-graph management dynamic QuadTree
    public final PlayerManager Players; //player (user) manager
    public final GameUtils Utils; //utilities for game functions
    public final ModuleManager Module; //module manager
    public final NpcManager Npcs; //npc manager
    public final Date Time; //server/game time
    //log callback, default to nothing
    public LogCallback Log;

    /**
     * Constructor
     * @param pConfig server configuration map
     * @param pDataDir data directory
     * @param pLog log object
     */
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
