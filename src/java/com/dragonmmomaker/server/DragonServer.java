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

/* Delimiter rules:                      				*
 *  message = messageID:messageVal						*
 *  messageVal = set1|set2|set3	(skippable)				*
 *  set = item1;item2;item3 							*
 *  item = val1,val2,val3								*/
package com.dragonmmomaker.server;

import java.io.IOException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;

import javax.script.ScriptException;

import com.dragonmmomaker.server.data.Account;
import com.dragonmmomaker.server.data.Tile;
import com.dragonmmomaker.server.handler.AdminHandler;
import com.dragonmmomaker.server.handler.ClientHandler;
import com.dragonmmomaker.server.util.DBDriver;
import com.dragonmmomaker.server.util.IniLoader;
import com.dragonmmomaker.server.util.LogCallback;

/**
 * A class representing the game server iteself.
 * @author Bryce
 */
public class DragonServer {

    private static boolean mRunning = false;
    private ServData mData; //server data
    @SuppressWarnings("unused")
    private DBDriver mDatabaseDriver;
    private int mTimeFactor; //in-game seconds per real-world second
    
    /**
     * Create a blank server
     * @throws Exception if something goes wrong
     */
    public DragonServer() throws Exception {
        this(null, null, null, null);
    }
    
    /**
     * Create a server
     * @param pConfig configuration for the server to use
     * @param pDataDir directory of the embedded database, if used
     * @param pLog log callback for reporting data
     * @throws Exception if something goes wrong
     */
    public DragonServer(Map<String, Map<String, String>> pConfig, String pDataDir, LogCallback pLog) throws Exception {
        this(pConfig, pDataDir, pLog, null);
    }
    
    /**
     * Create a server
     * @param pConfig  configuration for the server to use
     * @param pDataDir directory of the embedded database, if used
     * @param pLog log callback for reporting data
     * @param pDriver a custom database driver
     * @throws Exception  if something goes wrong
     */
    private DragonServer(Map<String, Map<String, String>> pConfig, String pDataDir, LogCallback pLog, DBDriver pDriver) throws Exception {
        //set up private vars
        if (pDataDir == null) { pDataDir = ""; }
        if (pConfig == null) { pConfig = getConfig(pDataDir); }
        if (pLog == null) { pLog = new BlankLogCallback(); }
        if (pDriver == null) { pDriver = DBDriver.DERBY; }
        //create a ServData object for storing information about the current state of the server
        this.mData = new ServData(pConfig, pDataDir, pLog);
        //set the Log
        this.mData.Log = pLog;
        //store the database driver
        this.mDatabaseDriver = pDriver;
        //pass the server data to the web handlers
        AdminHandler.setData(mData);
        ClientHandler.setData(mData);
        //this.mDatabaseDriver = pDatabaseDriver;
        //add a shutdown hook to do cleanup when exiting the webapp
        Runtime.getRuntime().addShutdownHook(new ShutdownHook());
    }

    /**
     * Start the server
     * @return this object. Useful for strining calls
     * @throws Exception if somthing goes wrong
     */
    public DragonServer start() throws Exception {
        if (mRunning) {
            throw new Exception("Only one server can be running at any time!");
        }
        mData.Log.log(000, "Server Start");
        
        //set up game time
        mData.Time.setTime(new Date().getTime());
        mTimeFactor = Integer.parseInt(mData.Config.get("Game").get("time_factor"));
        new Timer(true).schedule(new ServerTimer(), 0, 1000);
        
        //initialize game data, including accounts, maps, modules, and npcs
        initData();

        //notify modules that the server has started
        mData.Module.doHook("server_start");

        //tell the NPCManager that the server has startd
        mData.Npcs.start();
        
        //remember that the server has started
        DragonServer.mRunning = true;

        return this;
    }

    /**
     * Initialize game data.
     * This includes accounts, tiles (maps), a scene graph, modules, and npcs
     * @throws SQLException 
     */
    public void initData() throws SQLException {
        
        //Load accounts
        mData.Log.log(001, "Loading Accounts");
        //if (!mData.DB.tableExists("accounts")) {
            mData.DB.createTable("accounts", Account.getStructure());
        //}
        
        //create a map on NPC spawn tiles
        Map<Tile,Integer> spawn = new LinkedHashMap();
        
        mData.Log.log(002, "Loading Tiles");
        //load the tiles (maps)
        /*Note that tiles are dynamically loaded as the game is played
         *meaning, they are not kept in memory. The reason we load them
         *now is to check for spawn tiles so things like NPCs can spawn.*/
        
        //if (!mData.DB.tableExists("tiles")) {
            mData.DB.createTable("tiles", Tile.getStructure());
        //}
        try (ResultSet rs = mData.DB.Query("SELECT * FROM tiles")) {
            Set<String> tiles = new HashSet();
            while (rs.next()) {
                Tile tile = new Tile(mData, rs.getInt("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                if (tile.getAttr1() == 6 || tile.getAttr2() == 6) {
                    if (tile.getAttr1() == 6)
                        spawn.put(tile, Integer.parseInt(tile.getA1data()));
                    else
                        spawn.put(tile, Integer.parseInt(tile.getA2data()));
                }
                //remove any duplicates
                if (tiles.contains(Tile.key(tile))) {
                    mData.DB.Update("DELETE FROM tiles WHERE id = " + tile.getID());
                } else {
                    tiles.add(Tile.key(tile));
                }
            }
            tiles = null; //don't keep tiles in memory
        }
        
        //initialize the dynamic QuadTree
        mData.Tree.init();
        
        mData.Log.log(003, "Loading Modules");
        //load the modules into memory
        try {
            mData.Module.loadModules();
        } catch (IOException | ScriptException e) {
            mData.Log.log("Module Error: " + e.getLocalizedMessage());
            e.printStackTrace();
        }
        
        mData.Log.log(004, "Starting Modules");
        //load the data from each table
        mData.Module.initModules();
        
        mData.Log.log(004, "Spawning NPCs");
        //spawn all NPCs
        mData.Npcs.spawnAll(spawn);
    }

    /**
     * Shut down the server the do cleanup
     * @return 
     */
    public DragonServer stop() {
        if (isRunning()) {
            //tell modules the server is shutting down
            mData.Module.doHook("server_stop");
        }
        //clean up processes, close the database, and end the serer
        mData.Npcs.stop();
        mData.DB.Disconnect();
        mRunning = false;
        mData.Log.log(99, "Server End");
        return this;
    }

    /**
     * Get the configuration map from the server files
     * @param pDataDir the data dirctory, accessable by the end user
     * @return a Map containing the configuration in config.ini in the data directory
     */
    private static Map<String,Map<String,String>> getConfig(String pDataDir) {
        try {
            return new IniLoader(pDataDir + "/config.ini").load();
        } catch (IOException e) {
            System.out.println("Could not load config file. Error: " + e.toString());
            e.printStackTrace();
            return new ConcurrentHashMap<String, Map<String, String>>();
        }
    }

    private class ShutdownHook extends Thread {
        public void run() {
            DragonServer.this.stop();
        }
    }

    /**
     * Check if a server is running
     * @return true if a server instance is running, false otherwise
     */
    public static boolean isRunning() {
        return mRunning;
    }
    
    /**
     * Default log callback in case none is supplied
     */
    private static class BlankLogCallback extends LogCallback {
        @Override
        public void log(int pId, String pMessage) {
            // do nothing
        }
    }
    
    /**
     * A timer that keeps track of server/game time
     */
    private class ServerTimer extends TimerTask {
        public static final int GC_FREQ = 5; //seconds
        private int count = 0;
        @Override
        public void run() {
            //add {mTimeFactor} seconds to the game time
            mData.Time.setTime(mData.Time.getTime() + (mTimeFactor * 1000));
            mData.Module.doHook("game_tick");
            //also run the garbage collecter every second to keep memory consumption down.
            count++;
            if (count >= GC_FREQ) {
                System.gc();
                count = 0;
            }
        }
    }
}
