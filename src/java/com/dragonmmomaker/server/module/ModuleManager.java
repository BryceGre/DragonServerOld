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

public class ModuleManager {
    
    public final static int ADD = 0;
    public final static int AVG = 1;
    public final static int MAX = 2;
    public final static int MIN = 3;

    private final ServData mData;
    private Map<String, Module> mModules;
    private Map<String, ArrayList<String>> mHooks;
    final ScriptEngine mEngine;
    final ThreadLocal<String> lastMod;
    Queue<String> mLog;

    public ModuleManager(final ServData pServData) {
        mData = pServData;
        lastMod = new ThreadLocal() {
            @Override
            protected String initialValue() {
                 return null;
            }
        };
        
        mModules = new ConcurrentHashMap();
        mHooks = new ConcurrentHashMap();
        //TODO: remove strict
        //ScriptEngineManager manager = new ScriptEngineManager();
        //mEngine = manager.getEngineByName("nashorn");
        NashornScriptEngineFactory factory = new NashornScriptEngineFactory();
        mEngine = factory.getScriptEngine(new String[]{"-strict"});
        
        //String headers = "function parseInt(string, rad) { return Java.type('jdk.nashorn.internal.runtime.GlobalFunctions').parseInt(null, string, rad).intValue(); }\n";
        StringBuilder headers = new StringBuilder();
        headers.append("var Tile = com.dragonmmomaker.server.data.Tile;\n");
        headers.append("var Point = com.dragonmmomaker.server.util.Point;\n");
        
        try {
            mEngine.eval(headers.toString());
        } catch (ScriptException e) {
            e.printStackTrace();
        }
        mData.Data.fixEngine(mEngine);
        
        mEngine.put("Game", mData.Utils);
        mEngine.put("Data", mData.Data);
        mEngine.put("console", mData.Log);
        mEngine.put("Module", this);
        mEngine.put("Server", true);
        
        mEngine.put("ADD", ADD);
        mEngine.put("AVG", AVG);
        mEngine.put("MAX", MAX);
        mEngine.put("MIN", MIN);
        
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
        addHook(pHook, lastMod.get());
    }

    public void addHook(String pHook, String pModule) {
        if (!mHooks.containsKey(pHook)) {
            mHooks.put(pHook, new ArrayList<String>());
        }
        mHooks.get(pHook).add(pModule);
    }
    
    public void removeHook(String pHook) {
        removeHook(pHook, lastMod.get());
    }
    
    public void removeHook(String pHook, String pModule) {
        if (mHooks.containsKey(pHook)) {
            mHooks.get(pHook).remove(pModule);
        }
    }

    public Double doHook(String pHook) {
        return doHook(pHook, new HashMap<String, Object>());
    }
    
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

    public Double doHook(String pHook, Map<String, Object> pArgs, int pRet) {
        double sum = 0;
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
    
    public int getPref(String pPref) {
        return getPref(pPref, lastMod.get());
    }
    
    public int getPref(String pPref, String pModule) {
        return Integer.parseInt(mData.Config.get("Module").get(pModule.toLowerCase() + "_" + pPref.toLowerCase()));
    }
    
    public void log(String pMessage) {
        mLog.offer(pMessage);
        while(mLog.size() > 100) {
            mLog.poll();
        }
    }
}
