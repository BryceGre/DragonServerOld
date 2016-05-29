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

public class ConfigServlet extends HttpServlet {

    private static final long serialVersionUID = -2270384472191594218L;

    private static final int DEFAULT_BUFFER_SIZE = 10240; // 10KB.

    private String mDataDir;
    private Map<String, Map<String, String>> mConfig;
    
    public void init() throws ServletException {
        mDataDir = ServerListener.dataDir;
        mConfig = ServerListener.config;
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        StringBuilder outtext = new StringBuilder();
        outtext.append("//Server Constants\n");
        outtext.append("const SERVER_IP = window.location.hostname;\n");
        outtext.append("const SERVER_PORT = " + getConfig("Server", "port", ""+request.getLocalPort()) + ";\n");
        
        outtext.append("\n//Game Constants\n");
        outtext.append("const FRAME_RATE = " + getConfig("Game", "frame_rate", "60") + ";\n");
        outtext.append("const TILE_SIZE = " + getConfig("Game", "tile_size", "32") + ";\n");
        outtext.append("const DRAW_DISTANCE = " + getConfig("Game", "draw_distance", "16") + ";\n");
        outtext.append("const MOVE_SPEED = " + getConfig("Game", "move_speed", "16") + ";\n");
        outtext.append("const CLIENT_WIDTH = " + getConfig("Game", "client_width", "768") + ";\n");
        outtext.append("const CLIENT_HEIGHT = " + getConfig("Game", "client_height", "512") + ";\n");
        outtext.append("const TIME_FACTOR = " + getConfig("Game", "time_factor", "1") + ";\n");
        
        outtext.append("\n//Common Constants\n");
        outtext.append("const DEBUG = " + getConfig("Common", "debug", "true") + ";\n");
        
        outtext.append("\n//File Constants\n");
        outtext.append("const GFX = new Object();\n");
        File graphics = new File(ServerListener.dataDir + "/GFX/");
        if (graphics.isDirectory()) {
            for (File folder : graphics.listFiles()) {
                if (folder.isDirectory()) {
                    outtext.append("GFX." + folder.getName() + " = " + folder.list().length + ";\n");
                }
            }
        }
        File audio = new File(ServerListener.dataDir + "/SFX/");
        outtext.append("const SFX = new Object();\n");
        if (audio.isDirectory()) {
            for (File folder : audio.listFiles()) {
                if (folder.isDirectory()) {
                    outtext.append("SFX." + folder.getName() + " = " + folder.list().length + ";\n");
                }
            }
        }
        
        outtext.append("\n//Game Modules\n");
        outtext.append("const ModuleList = new Array();\n");
        File modfolder = new File(ServerListener.dataDir + "/modules/");
        if (modfolder.isDirectory()) {
            File[] modules = modfolder.listFiles();
            if (modules != null) {
                for (File module : modules) {
                    if (module.isFile() && module.getName().endsWith(".js")) {
                        String modname = module.getName().substring(0, module.getName().length() - 3);
                        outtext.append("ModuleList.push('" + modname + "');\n");
                    }
                }
            }
        }

        outtext.append("\n//Initial Preferences\n");
        outtext.append("const InitPrefs = new Object();\n");
        outtext.append("InitPrefs['FillScreen'] = " + getConfig("Prefs", "fullscreen", "false") + ";\n");
        outtext.append("InitPrefs['GridW'] = Math.floor(CLIENT_WIDTH / TILE_SIZE);\n");
        outtext.append("InitPrefs['GridH'] = Math.floor(CLIENT_HEIGHT / TILE_SIZE);\n");

        // Init servlet response.
        response.reset();
        response.setBufferSize(DEFAULT_BUFFER_SIZE);
        response.setContentType("application/javascript");

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

    private String getConfig(String pSec, String pVal, String pDefault) {
        if (mConfig != null) {
            if (mConfig.containsKey(pSec)) {
                if (mConfig.get(pSec).containsKey(pVal)) {
                    return mConfig.get(pSec).get(pVal);
                }
            }
        }
        return pDefault;
    }
}
