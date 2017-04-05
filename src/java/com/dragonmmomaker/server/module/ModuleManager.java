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

package com.dragonmmomaker.server.module;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngineFactory;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

import com.dragonmmomaker.server.ServData;
import com.dragonmmomaker.server.util.SocketUtils;

/**
 * A class to manage all modules
 * @author Bryce
 */
public class ModuleManager {
    //multiple module return type modifiers
    public final static int ADD = 0;
    public final static int MUL = 1;
    public final static int AVG = 2;
    public final static int MAX = 3;
    public final static int MIN = 4;

    private final ServData mData; //server data
    private Map<String, Module> mModules; //modules by name
    private Map<String, ArrayList<String>> mHooks; //hooks by name
    final ScriptEngine mEngine; //script engine (Nashorn)
    final ThreadLocal<String> lastMod; //last module name
    Queue<String> mLog; //module log queue

    /**
     * Constructor
     * @param pServData current server data
     */
    public ModuleManager(final ServData pServData) {
        mData = pServData;
        //make the last module thread local
        lastMod = new ThreadLocal() {
            @Override
            protected String initialValue() {
                 return null;
            }
        };
        
        //thread-safe module map
        mModules = new ConcurrentHashMap();
        //thead-safe hook map
        mHooks = new ConcurrentHashMap();
        
        //start up scripting engine
        //TODO: remove strict
        //ScriptEngineManager manager = new ScriptEngineManager();
        //mEngine = manager.getEngineByName("nashorn");
        NashornScriptEngineFactory factory = new NashornScriptEngineFactory();
        mEngine = factory.getScriptEngine(new String[]{"-strict"});
        
        //build headers, include classes that may be needed
        //String headers = "function parseInt(string, rad) { return Java.type('jdk.nashorn.internal.runtime.GlobalFunctions').parseInt(null, string, rad).intValue(); }\n";
        StringBuilder headers = new StringBuilder();
        headers.append("var Tile = com.dragonmmomaker.server.data.Tile;\n"); //tile
        headers.append("var Point = com.dragonmmomaker.server.util.Point;\n"); //point
        //add headers to script
        try {
            mEngine.eval(headers.toString());
        } catch (ScriptException e) {
            e.printStackTrace();
        }
        //fix Nashorn engine to work with DBase
        mData.Data.fixEngine(mEngine);
        
        //add objects to Nashorn
        mEngine.put("Game", mData.Utils); //Game object
        mEngine.put("Data", mData.Data); //Data object
        mEngine.put("console", mData.Log); //console.log function
        mEngine.put("Module", this); //Module object
        mEngine.put("Server", true); //Server object (always true)
        
        //multiple return type modifiers objcts
        mEngine.put("ADD", ADD);
        mEngine.put("MUL", MUL);
        mEngine.put("AVG", AVG);
        mEngine.put("MAX", MAX);
        mEngine.put("MIN", MIN);
        
        //set up log queue
        mLog = new LinkedList();
    }

    /**
     * Load all modules from the data directory
     * @throws IOException error reading files
     * @throws ScriptException error parsing modules
     */
    public void loadModules() throws IOException, ScriptException {
        ServData._CurData = this.mData; //force set of current server data
        //load modules from data directory
        File modfolder = new File(this.mData.DataDir + "/modules/");
        if (!modfolder.isDirectory()) {
            throw new IOException("'modules' is not a directory!");
        }
        //list all module files
        File[] modules = modfolder.listFiles();
        if (modules != null) {
            //for each module
            for (File module : modules) {
                //as long as it is a .js file
                if (module.isFile() && module.getName().endsWith(".js")) {
                    //get the module name
                    String modname = module.getName().substring(0, module.getName().length() - 3);
                    //and load the module
                    loadModule(modname);
                }
            }
        }
    }

    /**
     * Load a single module from the data directory
     * @param pName the name of the module to load
     * @throws ScriptException error parsing module
     */
    public void loadModule(String pName) throws ScriptException {
        try {
            //open module file
            InputStream input = new FileInputStream(this.mData.DataDir + "/modules/" + pName + ".js");
            //evaluate module
            mEngine.eval(new InputStreamReader(input, "utf-8"));
            //get module ScriptObject
            ScriptObjectMirror jObj = (ScriptObjectMirror) mEngine.get(pName);
            //create module object
            Module module = new Module(pName, this, jObj);
            //add modules object to modules map
            mModules.put(pName, module);
        } catch (UnsupportedEncodingException | FileNotFoundException | ClassCastException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
            //TODO: Module Logging
            //this.log(e.toString());
        }
    }

    /**
     * Initialize all modules by calling their "server.onInit" method
     */
    public void initModules() {
        ServData._CurData = this.mData;
        for (Entry<String,Module> entry : mModules.entrySet()) {
            entry.getValue().call(mData, "onInit");
        }
    }

    /**
     * Add a hook to the currently running module
     * @param pHook the name of the hook
     */
    public void addHook(String pHook) {
        addHook(pHook, lastMod.get());
    }

    /**
     * Add a hook to a module
     * @param pHook the name of the hook
     * @param pModule the module to hook into
     */
    public void addHook(String pHook, String pModule) {
        if (!mHooks.containsKey(pHook)) {
            mHooks.put(pHook, new ArrayList<String>());
        }
        mHooks.get(pHook).add(pModule);
    }
    
    /**
     * Remove a hook from the currently running module
     * @param pHook the name of the hook
     */
    public void removeHook(String pHook) {
        removeHook(pHook, lastMod.get());
    }
    
    /**
     * Remove a hook from a module
     * @param pHook the name of the hook
     * @param pModule the module to unhook from
     */
    public void removeHook(String pHook, String pModule) {
        if (mHooks.containsKey(pHook)) {
            mHooks.get(pHook).remove(pModule);
        }
    }

    /**
     * Execute a hook (run all modules's "ohHook()" methods with that hook)
     * for the current module.
     * Uses the "ADD" modifier by default
     * @param pHook the name of the hook
     * @return the sum of all return values from executing the hook
     */
    public Double doHook(String pHook) {
        return doHook(pHook, new HashMap<String, Object>());
    }
    
    /**
     * Execute a hook (run all modules's "ohHook()" methods with that hook)
     * for the current module.
     * Uses the "ADD" modifier by default
     * @param pHook the name of the hook
     * @param pArgs arguments to supply to the "onHook()" methods
     * @return the sum of all return values from executing the hook
     */
    public Double doHook(String pHook, Map<String, Object> pArgs) {
        return doHook(pHook, pArgs, ADD);
    }
    
    //for use within server, on first hook call. Locks to prevent multithreading errors
    public void doHook(String pHook, Map<String, Object> pArgs, SocketUtils pUtils) {
        mData.Utils.setSocket(pUtils);
        if (pArgs == null) pArgs = new HashMap<String, Object>();
        if (!pArgs.containsKey("index")) {
            int index = pUtils.getIndex();
            if (index >= 0)
                pArgs.put("index", index);
        }
        doHook(pHook, pArgs, ADD);
    }
    
    //for sending in doHook(pHook, false, pRet)
    public Double doHook(String pHook, boolean args, int pRet) {
        return doHook(pHook, new HashMap<String, Object>(), pRet);
    }

    /**
     * Execute a hook (run all modules's "ohHook()" methods with that hook)
     * for the current module.
     * @param pHook the name of the hook
     * @param pArgs arguments to supply to the "onHook()" methods
     * @param pRet the multiple return type modifier (ADD/MUL/AVG/MAX/MIN) to use
     * @return the sum/product/average/maximum/minimum of all return values from executing the hook.
     */
    public Double doHook(String pHook, Map<String, Object> pArgs, int pRet) {
        double sum = 0;
        if (pRet == ADD) sum = 0;
        if (pRet == MUL) sum = 1;
        if (pRet == MIN) sum = Double.MAX_VALUE;
        if (pRet == MAX) sum = Double.MIN_VALUE;
        int num = 0;
        ServData._CurData = this.mData;
        if (mHooks.containsKey(pHook)) {
            if (pArgs == null) {
                pArgs = new HashMap<String, Object>();
            }
            for (String module : mHooks.get(pHook)) {
                Object result = mModules.get(module).call(mData, "onHook", pHook, pArgs);
                if (result instanceof Number) {
                    Number number = (Number)result;
                    if (pRet == MAX) {
                        if (number.doubleValue() > sum) sum = number.doubleValue();
                    } else if (pRet == MIN) {
                        if (number.doubleValue() < sum) sum = number.doubleValue();
                    } else if (pRet == MUL) {
                        sum *= number.doubleValue();
                    } else {
                        sum += number.doubleValue();
                    }
                    num++;
                }
            }
            if (pRet == AVG && num > 0) return (sum / num);
        }
        
        return sum;
    }
    
    /**
     * Get a preference (user-specific information) from the current module
     * @param pPref the name of the pref
     * @return the value of the pref
     */
    public int getPref(String pPref) {
        return getPref(pPref, lastMod.get());
    }
    
    /**
     * Get a preference (user-specific information) from a module
     * @param pPref the name of the pref
     * @param pModule the name of the module
     * @return the value of the pref
     */
    public int getPref(String pPref, String pModule) {
        return Integer.parseInt(mData.Config.get("Module").get(pModule.toLowerCase() + "_" + pPref.toLowerCase()));
    }
    
    /**
     * Add message to log 
     * @param pMessage the message to add
     */
    public void log(String pMessage) {
        mLog.offer(pMessage);
        while(mLog.size() > 100) {
            mLog.poll();
        }
    }
}
