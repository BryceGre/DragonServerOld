package com.dragonmmomaker.server;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Date;
import java.util.Map;

import com.dragonmmomaker.datamap.DBase;
import com.dragonmmomaker.server.npc.NpcManager;
import com.dragonmmomaker.server.util.GameUtils;
import com.dragonmmomaker.war.ServerListener;

public class GameData {

    public DBase Data;
    public Map<String, Map<String, String>> Config;
    public GameUtils Utils;
    public NpcManager Npcs;
    public Date Time;

    public GameData(ServData pServData, Map<String, Map<String, String>> pConfig) {
        try {
            String host = pConfig.get("Database").get("host");
            String port = pConfig.get("Database").get("port");
            String name = pConfig.get("Database").get("name");
            String user = pConfig.get("Database").get("user");
            String pass = pConfig.get("Database").get("pass");
            String dataDir = ServerListener.dataDir;
            if (ServerListener.isEmbed) {
                Data = new DBase("org.hsqldb.jdbc.JDBCDriver", "jdbc:hsqldb:file:" + dataDir + "/data;sql.syntax_pgs=true;shutdown=true;", "accounts", "tiles");
                try {
                    Data.getConnection().prepareStatement("CREATE TYPE BYTEA AS VARBINARY(1000000)").execute(); //support for bytea
                } catch (SQLException e) {} //type already exists
            } else {
                try {
                Data = new DBase("org.postgresql.Driver", "jdbc:postgresql://"+host+":"+port+"/"+name+"?user="+user+"&password="+pass, "accounts", "tiles");
                } catch (final SQLException e) {
                    //possible database doesn't exist, try to create
                    Class.forName("org.postgresql.Driver");
                    try (Connection c = DriverManager.getConnection("jdbc:postgresql://"+host+":"+port+"/postgres?user="+user+"&password="+pass)) {
                        c.prepareStatement("CREATE DATABASE " + name).execute(); //support for bytea
                        c.close();
                        Data = new DBase("org.postgresql.Driver", "jdbc:postgresql://"+host+":"+port+"/"+name+"?user="+user+"&password="+pass, "accounts", "tiles");
                    } catch (SQLException ex) {
                        e.printStackTrace(); //print original exception
                    }
                }
            }
        } catch (ClassNotFoundException | SQLException e) {
            pServData.Log.log("Could not connect to Database. Error: " + e.toString());
            e.printStackTrace();
        }
        Config = pConfig;
        Utils = new GameUtils(pServData);
        Npcs = new NpcManager(pServData);
        Time = new Date();
    }

    /*
     * private HashMap<Object,Object> mData; private HashMap<Object,Object>
     * mArgs;
     * 
     * public Game(HashMap<Object,Object> pArgs) { mData = _Data; mArgs = pArgs;
     * }
     * 
     * public HashMap<Object,Object> getData() { return mData; }
     * 
     * public HashMap<Object,Object> getArgs() { return mArgs; }
     */
}
