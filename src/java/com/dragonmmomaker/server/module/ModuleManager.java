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
import java.util.concurrent.locks.ReentrantLock;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngineFactory;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

import com.dragonmmomaker.server.ServData;

public class ModuleManager {

    private ServData mData;
    private Map<String, Module> mModules;
    private Map<String, ArrayList<String>> mHooks;
    private ScriptEngineManager mEngineManager;
    ScriptEngine mEngine;
    ServData mCurrentServer = null;
    String lastMod = null;
    Queue<String> mLog;

    ReentrantLock mLock = new ReentrantLock();

    public ModuleManager(ServData pServData) {
        mData = pServData;
        
        mModules = new ConcurrentHashMap();
        mHooks = new ConcurrentHashMap();
        //mEngineManager = new ScriptEngineManager();
        //mEngine = mEngineManager.getEngineByName("nashorn");
        NashornScriptEngineFactory factory = new NashornScriptEngineFactory();
        mEngine = factory.getScriptEngine(new String[]{"-strict"});
        
        //String headers = "function parseInt(string, rad) { return Java.type('jdk.nashorn.internal.runtime.GlobalFunctions').parseInt(null, string, rad).intValue(); }\n";
        String headers = "var Tile = com.dragonmmomaker.server.data.Tile;\n";
        headers += "var Point = com.dragonmmomaker.server.util.GameUtils.Point;\n";
        
        try {
            mEngine.eval(headers);
        } catch (ScriptException e) {
            e.printStackTrace();
        }
        mData.Game.Data.fixEngine(mEngine);
        
        mEngine.put("Game", mData.Game.Utils);
        mEngine.put("Data", mData.Game.Data);
        //mEngine.put("World", mData.Game.Tiles);
        mEngine.put("console", mData.Log);
        mEngine.put("Module", this);
        
        mLog = new LinkedList();
    }

    public void loadModules() throws IOException, ScriptException {
        ServData._CurData = this.mData;
        File modfolder = new File(this.mData.DataDir + "/modules/");
        if (!modfolder.isDirectory()) {
            throw new IOException("'modules' is not a directory!");
        }
        File[] modules = modfolder.listFiles();
        if (modules != null) {
            for (File module : modules) {
                if (module.isFile() && module.getName().endsWith(".js")) {
                    String modname = module.getName().substring(0, module.getName().length() - 3);
                    loadModule(modname);
                }
            }
        }
    }

    public void loadModule(String pName) throws ScriptException {
        try {
            InputStream input = new FileInputStream(this.mData.DataDir + "/modules/" + pName + ".js");
            mEngine.eval(new InputStreamReader(input, "utf-8"));
            ScriptObjectMirror jObj = (ScriptObjectMirror) mEngine.get(pName);
            Module module = new Module(pName, this, jObj);
            mModules.put(pName, module);
        } catch (UnsupportedEncodingException | FileNotFoundException | ClassCastException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
            //TODO: Module Logging
            //this.log(e.toString());
        }
    }

    public void initModules() {
        ServData._CurData = this.mData;
        for (Entry<String,Module> entry : mModules.entrySet()) {
            entry.getValue().call(mData, "onInit");
        }
    }

    public void addHook(String pHook) {
        addHook(pHook, lastMod);
    }

    public void addHook(String pHook, String pModule) {
        if (!mHooks.containsKey(pHook)) {
            mHooks.put(pHook, new ArrayList<String>());
        }
        mHooks.get(pHook).add(pModule);
    }
    
    public void removeHook(String pHook) {
        removeHook(pHook, lastMod);
    }
    
    public void removeHook(String pHook, String pModule) {
        if (mHooks.containsKey(pHook)) {
            mHooks.get(pHook).remove(pModule);
        }
    }

    public void doHook(String pHook) {
        doHook(pHook, new HashMap<String, Object>());
    }

    public void doHook(String pHook, Map<String, Object> pArgs) {
        mLock.lock();
        try {
            ServData._CurData = this.mData;
            if (mHooks.containsKey(pHook)) {
                if (pArgs == null) {
                    pArgs = new HashMap<String, Object>();
                }
                for (String module : mHooks.get(pHook)) {
                    mModules.get(module).call(mData, "onHook", pHook, pArgs);
                }
            }
        } finally {
            mLock.unlock();
        }
    }
    
    public void log(String pMessage) {
        mLog.offer(pMessage);
        while(mLog.size() > 100) {
            mLog.poll();
        }
    }
}
