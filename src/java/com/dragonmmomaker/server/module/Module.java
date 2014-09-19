package com.dragonmmomaker.server.module;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.runtime.ScriptRuntime;

import com.dragonmmomaker.server.ServData;

public class Module {

    private String mName;
    private ModuleManager mManager;
    private ScriptObjectMirror mMod;

    public Module(String pName, ModuleManager pManager, ScriptObjectMirror pMod) {
        mName = pName;
        mManager = pManager;
        mMod = pMod;
        pMod.removeMember("client"); //free up memory
    }

    public Object call(ServData pServData, String pMethod, Object... pArgs) {
        ServData._CurData = pServData; //force set of current server data
        String prevMov = mManager.lastMod;
        mManager.lastMod = mName;
        try {
            ScriptObjectMirror modScript = (ScriptObjectMirror) mMod.getMember("server");
            return modScript.callMember(pMethod, pArgs);
        } catch (Throwable e) {
            e.printStackTrace();
            //TODO: Module Logging();
            //mManager.log(e.toString());
            return null;
        } finally {
            mManager.lastMod = prevMov;
        }
    }
    
    public String getInfo(String key) {
        if (key != "server" && key != "client") {
            if (mMod.getMember(key) != ScriptRuntime.UNDEFINED) {
                return mMod.getMember(key).toString();
            }
        }
        return "";
    }
    
    public String getName() {
        return mName;
    }
}
