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

public class DragonServer {

    private static boolean mRunning = false;
    private ServData mData;
    @SuppressWarnings("unused")
    private DBDriver mDatabaseDriver;
    private int mTimeFactor;
            
    public DragonServer() throws Exception {
        this(null, null, null, null);
    }
    
    public DragonServer(Map<String, Map<String, String>> pConfig, String pDataDir, LogCallback pLog) throws Exception {
        this(pConfig, pDataDir, pLog, null);
    }
    
    /*private DragonServer(int pPort, String pDatabaseDriver) throws Exception {
     this(pPort, new LogCallback() { @Override public void onLog(int pId, String pMessage) {} }, pDatabaseDriver);
     }*/
    private DragonServer(Map<String, Map<String, String>> pConfig, String pDataDir, LogCallback pLog, DBDriver pDriver) throws Exception {
        if (pDataDir == null) { pDataDir = ""; }
        if (pConfig == null) { pConfig = getConfig(pDataDir); }
        if (pLog == null) { pLog = new BlankLogCallback(); }
        if (pDriver == null) { pDriver = DBDriver.DERBY; }
        this.mData = new ServData(pConfig, pDataDir, pLog);
        this.mData.Log = pLog;
        this.mDatabaseDriver = pDriver;
        AdminHandler.setData(mData);
        ClientHandler.setData(mData);
        //this.mDatabaseDriver = pDatabaseDriver;
        Runtime.getRuntime().addShutdownHook(new ShutdownHook());
    }

    public DragonServer start() throws Exception {
        if (mRunning) {
            throw new Exception("Only one server can be running at any time!");
        }
        mData.Log.log(000, "Server Start");
        
        mData.Time.setTime(new Date().getTime());
        mTimeFactor = Integer.parseInt(mData.Config.get("Game").get("time_factor"));
        new Timer(true).schedule(new ServerTimer(), 0, 1000);
        
        initData();

        mData.Module.doHook("server_start");

        mData.Npcs.start();
        
        DragonServer.mRunning = true;

        return this;
    }

    public void initData() throws SQLException {
        
        mData.Log.log(001, "Loading Accounts");
        //if (!mData.DB.tableExists("accounts")) {
            mData.DB.createTable("accounts", Account.getStructure());
        //}
        
        Map<Tile,Integer> spawn = new LinkedHashMap();
        
        mData.Log.log(002, "Loading Tiles");
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
        
        mData.Tree.init();
        
        mData.Log.log(003, "Loading Modules");
        //load the modules into memory
        try {
            mData.Module.loadModules();
        } catch (IOException | ScriptException e) {
            e.printStackTrace();
        }
        
        mData.Log.log(004, "Starting Modules");
        //load the data from each table
        mData.Module.initModules();
        
        mData.Log.log(004, "Spawning NPCs");
        //spawn all NPCs
        mData.Npcs.spawnAll(spawn);
    }

    public DragonServer stop() {
        if (isRunning()) {
            mData.Module.doHook("server_stop");
        }
        
        mData.Npcs.stop();
        mData.DB.Disconnect();
        mRunning = false;
        mData.Log.log(99, "Server End");
        return this;
    }

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

    public static boolean isRunning() {
        return mRunning;
    }
    
    private static class BlankLogCallback extends LogCallback {
        @Override
        public void log(int pId, String pMessage) {
            // do nothing
        }
    }
    
    private class ServerTimer extends TimerTask {
        public static final int GC_FREQ = 5; //seconds
        private int count = 0;
        @Override
        public void run() {
            //add {mTimeFactor} seconds to the game time
            mData.Time.setTime(mData.Time.getTime() + (mTimeFactor * 1000));
            //also run the garbage collecter every second to keep memory consumption down.
            count++;
            if (count >= GC_FREQ) {
                System.gc();
                count = 0;
            }
        }
    }
}
