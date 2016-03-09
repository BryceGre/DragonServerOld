package com.dragonmmomaker.war;

import java.io.IOException;
import java.sql.Timestamp;
import java.text.DateFormat;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

import com.dragonmmomaker.server.DragonServer;
import com.dragonmmomaker.server.handler.AdminHandler;
import com.dragonmmomaker.server.handler.ClientHandler;
import com.dragonmmomaker.server.util.IniLoader;
import com.dragonmmomaker.server.util.LogCallback;
import javafx.util.Callback;

@WebListener
public class ServerListener implements ServletContextListener {

    public static String dataDir;
    public static boolean isEmbed = false;
    public static Map<String, Map<String, String>> config;
    
    private DragonServer gameServer;
    
    @Override
    public void contextDestroyed(ServletContextEvent arg0) {
        if (gameServer != null) {
            gameServer.stop();
        }
    }

    @Override
    public void contextInitialized(final ServletContextEvent arg0) {
        // ===== Start by loading the config file =====
        dataDir = System.getProperty("catalina.base", System.getProperty("catalina.home", System.getProperty("user.dir")));
        dataDir = dataDir + "/DragonServer";
        isEmbed = !(arg0.getServletContext().getInitParameter("isEmbed") == null);
        
        try {
            config = new IniLoader(dataDir + "/config.ini").load();
        } catch (IOException e) {
            System.out.println("Could not load config file. Error: " + e.toString());
            e.printStackTrace();
            config = new ConcurrentHashMap<String, Map<String, String>>();
        }
        boolean debug = false;
        if (config.containsKey("Common") && config.get("Common").containsKey("debug")) {
            debug = Boolean.parseBoolean(config.get("Common").get("debug"));
        }
        final boolean DEBUG = debug;
        final Callback LogCallback = (Callback) arg0.getServletContext().getAttribute("LogCallback");

        // ===== Start up the game server, and ready it =====
        try {
            gameServer = new DragonServer(config, dataDir, new LogCallback() {
                @Override
                public void log(int pID, String pMessage) {
                    Timestamp timestamp = new Timestamp(new Date().getTime());
                    String time = DateFormat.getTimeInstance().format(timestamp);
                    
                    String out = "(" + time + ") " + pMessage;
                    arg0.getServletContext().log(out);
                    if (LogCallback != null) {
                        LogCallback.call(out);
                    }
                }

                @Override
                public void debug(String pMessage) {
                    if (DEBUG) {
                        Timestamp timestamp = new Timestamp(new Date().getTime());
                        String time = DateFormat.getTimeInstance().format(timestamp);
                        
                        String out = "DEBUG: (" + time + ") " + pMessage;
                        arg0.getServletContext().log(out);
                        if (LogCallback != null) {
                            LogCallback.call(out);
                        }
                    }
                }
            });
            gameServer.start();
        } catch (Exception e) {
            ClientHandler.ERROR = "Could not start server! Error: " + e.toString();
            AdminHandler.ERROR = ClientHandler.ERROR;
            System.out.println(ClientHandler.ERROR);
            e.printStackTrace();
            return;
        }
    }
}
