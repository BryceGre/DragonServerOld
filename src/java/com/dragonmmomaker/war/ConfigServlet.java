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

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet for creating the config.ini file for the clients
 * @author Bryce
 */
public class ConfigServlet extends HttpServlet {

    private static final long serialVersionUID = -2270384472191594218L;

    private static final int DEFAULT_BUFFER_SIZE = 10240; // 10KB.

    private String mDataDir; //data directory
    private Map<String, Map<String, String>> mConfig; //config map
    
    /**
     * Initialize the servlet
     * @throws ServletException 
     */
    public void init() throws ServletException {
        mDataDir = ServerListener.dataDir; //get the data directory
        mConfig = ServerListener.config; //get the config map
    }

    /**
     * On a HTTP GET request, send the config map in a JavaScript-readable format
     * @param request the HTTP GET request
     * @param response the HTTP response
     * @throws ServletException
     * @throws IOException 
     */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        //start a new StrngBulder
        StringBuilder outtext = new StringBuilder();
        outtext.append("//Server Constants\n"); //server constants
        outtext.append("const SERVER_IP = window.location.hostname;\n"); //game server IP address
        outtext.append("const SERVER_PORT = " + getConfig("Server", "port", ""+request.getLocalPort()) + ";\n"); //game server Port
        
        outtext.append("\n//Game Constants\n"); //game constants
        outtext.append("const FRAME_RATE = " + getConfig("Game", "frame_rate", "60") + ";\n"); //frame rate
        outtext.append("const TILE_SIZE = " + getConfig("Game", "tile_size", "32") + ";\n"); //tile size
        outtext.append("const DRAW_DISTANCE = " + getConfig("Game", "draw_distance", "16") + ";\n"); //draw distance
        outtext.append("const MOVE_SPEED = " + getConfig("Game", "move_speed", "16") + ";\n"); //movement speed
        outtext.append("const CLIENT_WIDTH = " + getConfig("Game", "client_width", "768") + ";\n"); //viewport width
        outtext.append("const CLIENT_HEIGHT = " + getConfig("Game", "client_height", "512") + ";\n"); //viewport height
        outtext.append("const TIME_FACTOR = " + getConfig("Game", "time_factor", "1") + ";\n"); //in-game time factor
        
        outtext.append("\n//Common Constants\n"); //other constants
        outtext.append("const DEBUG = " + getConfig("Common", "debug", "true") + ";\n"); //debug true or false
        
        outtext.append("\n//File Constants\n"); //data file constants
        outtext.append("const GFX = new Object();\n"); //graphics files
        File graphics = new File(ServerListener.dataDir + "/GFX/"); //Data/GFX/
        if (graphics.isDirectory()) { //make sure it's a directory
            //for each folder in the GFX folder
            for (File folder : graphics.listFiles()) {
                //if it is a directory
                if (folder.isDirectory()) {
                    //add it's file count to the output
                    outtext.append("GFX." + folder.getName() + " = " + folder.list().length + ";\n");
                }
            }
        }
        outtext.append("const SFX = new Object();\n"); //sound files
        File audio = new File(ServerListener.dataDir + "/SFX/"); //Data/SFX/
        if (audio.isDirectory()) {
            //for each folder in the SFX folder
            for (File folder : audio.listFiles()) {
                //if it is a directory
                if (folder.isDirectory()) {
                    //add it's file count to the output
                    outtext.append("SFX." + folder.getName() + " = " + folder.list().length + ";\n");
                }
            }
        }
        
        outtext.append("\n//Game Modules\n"); //module files
        outtext.append("const ModuleList = new Array();\n"); //an array of module names
        File modfolder = new File(ServerListener.dataDir + "/modules/"); //Data/modules/
        if (modfolder.isDirectory()) {
            //get a list of modules in the directory
            File[] modules = modfolder.listFiles();
            if (modules != null) {
                //for each module file
                for (File module : modules) {
                    //if it is in fact a module
                    if (module.isFile() && module.getName().endsWith(".js")) {
                        //get its name
                        String modname = module.getName().substring(0, module.getName().length() - 3);
                        //and add it to the output
                        outtext.append("ModuleList.push('" + modname + "');\n");
                    }
                }
            }
        }

        outtext.append("\n//Initial Preferences\n"); //default user preferences that can be changed by the client
        outtext.append("const InitPrefs = new Object();\n"); //prefs object
        outtext.append("InitPrefs['FillScreen'] = " + getConfig("Prefs", "fullscreen", "false") + ";\n"); //whether or not to strech the game window to fill the screen
        outtext.append("InitPrefs['GridW'] = Math.floor(CLIENT_WIDTH / TILE_SIZE);\n"); //the map-editor grid width
        outtext.append("InitPrefs['GridH'] = Math.floor(CLIENT_HEIGHT / TILE_SIZE);\n"); //the map-editor grid height

        // Init servlet response.
        response.reset();
        response.setBufferSize(DEFAULT_BUFFER_SIZE);
        response.setContentType("application/javascript");

        //output the response to the client
        PrintStream output = null;
        try {
            output = new PrintStream(new BufferedOutputStream(response.getOutputStream(), DEFAULT_BUFFER_SIZE));
            output.print(outtext);
        } finally {
            // Gently close streams.
            if (output != null) {
                output.close();
            }
        }
    }

    /**
     * Get a specific configuration value
     * @param pSec the section of the value
     * @param pVal the value name
     * @param pDefault the default value if the value is not found
     * @return the value of the given name, or pDefault if the value is not found
     */
    private String getConfig(String pSec, String pVal, String pDefault) {
        if (mConfig != null) { //if there is a config file
            if (mConfig.containsKey(pSec)) { //if the section exists
                if (mConfig.get(pSec).containsKey(pVal)) { //if the value exists
                    return mConfig.get(pSec).get(pVal); //return the value
                }
            }
        }
        return pDefault; //return the default
    }
}
