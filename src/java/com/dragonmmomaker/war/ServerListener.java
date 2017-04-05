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

/**
 * DragonServer listener to start and stop the server when the webapp is started and stopped
 * @author Bryce
 */
@WebListener
public class ServerListener implements ServletContextListener {

    public static String dataDir; //data directory
    public static boolean isEmbed = false; //should the database be embedded?
    public static Map<String, Map<String, String>> config; //config map
    
    private DragonServer gameServer; //server object
    
    /**
     * Shut down the server
     * @param arg0 
     */
    @Override
    public void contextDestroyed(ServletContextEvent arg0) {
        if (gameServer != null) { //if the server has been started
            gameServer.stop(); //stop it
        }
    }

    /**
     * Start up the server
     * @param arg0 
     */
    @Override
    public void contextInitialized(final ServletContextEvent arg0) {
        // ===== Start by loading the config file =====
        //data directory is the cataline.base, cataline.home, or user.dir directory
        dataDir = System.getProperty("catalina.base", System.getProperty("catalina.home", System.getProperty("user.dir")));
        dataDir = dataDir + "/DragonServer"; //appended with "/DragonServer/"
        isEmbed = !(arg0.getServletContext().getInitParameter("isEmbed") == null); //check if the isEmbed parameter is given
        
        //load the config file
        try {
            config = new IniLoader(dataDir + "/config.ini").load();
        } catch (IOException e) {
            System.out.println("Could not load config file. Error: " + e.toString());
            e.printStackTrace();
            //return a blank config file
            config = new ConcurrentHashMap<String, Map<String, String>>();
        }
        //check if Debug should be true
        boolean debug = false;
        if (config.containsKey("Common") && config.get("Common").containsKey("debug")) {
            debug = Boolean.parseBoolean(config.get("Common").get("debug"));
        }
        //set up some final variables for use within the Log class
        final boolean DEBUG = debug;
        final Callback LogCallback = (Callback) arg0.getServletContext().getAttribute("LogCallback");

        // ===== Start up the game server, and ready it =====
        try {
            //create the server
            gameServer = new DragonServer(config, dataDir, new LogCallback() {
                @Override
                public void log(int pID, String pMessage) {
                    //append a timestamp
                    Timestamp timestamp = new Timestamp(new Date().getTime());
                    String time = DateFormat.getTimeInstance().format(timestamp);
                    
                    //and output the message
                    String out = "(" + time + ") " + pMessage;
                    arg0.getServletContext().log(out);
                    //also call the log in the parameters, if given
                    if (LogCallback != null) {
                        LogCallback.call(out);
                    }
                }

                @Override
                public void debug(String pMessage) {
                    if (DEBUG) { //only output if DEBUG is enabled
                        //append a timestamp
                        Timestamp timestamp = new Timestamp(new Date().getTime());
                        String time = DateFormat.getTimeInstance().format(timestamp);
                        
                        //and output the message
                        String out = "DEBUG: (" + time + ") " + pMessage;
                        arg0.getServletContext().log(out);
                        //also call the log in the parameters, if given
                        if (LogCallback != null) {
                            LogCallback.call(out);
                        }
                    }
                }
            });
            //start the server
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
