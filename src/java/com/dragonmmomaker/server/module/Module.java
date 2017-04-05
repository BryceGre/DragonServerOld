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

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.runtime.ScriptRuntime;

import com.dragonmmomaker.server.ServData;

/**
 * Class representing a single module
 * @author Bryce
 */
public class Module {

    private final String mName; //unique module name
    private final ModuleManager mManager; //module manager
    private ScriptObjectMirror mMod; //ScriptObject  representing this module

    /**
     * Constructor
     * @param pName module name
     * @param pManager ModuleManager object
     * @param pMod ScriptObject for this module
     */
    public Module(String pName, ModuleManager pManager, ScriptObjectMirror pMod) {
        mName = pName;
        mManager = pManager;
        mMod = pMod;
        pMod.removeMember("client"); //free up memory
    }

    /**
     * Call a method in this module via Nashorn
     * @param pServData server data
     * @param pMethod the name of the method to call
     * @param pArgs a list of arguments to pass to the method
     * @return whatever object the method returned
     */
    public Object call(ServData pServData, String pMethod, Object... pArgs) {
        ServData._CurData = pServData; //force set of current server data
        String prevMov = mManager.lastMod.get(); //save lastmod for nested calls
        mManager.lastMod.set(mName); //set lastmod to this mod
        try {
            //get the module's "server" object
            ScriptObjectMirror modScript = (ScriptObjectMirror) mMod.getMember("server");
            //call the method
            return modScript.callMember(pMethod, pArgs);
        } catch (Throwable e) {
            e.printStackTrace();
            //TODO: Module Logging();
            //mManager.log(e.toString());
            return null;
        } finally {
            mManager.lastMod.set(prevMov); //restore lastmod for nested calls
        }
    }
    
    /**
     * Get a string containing the information about this module
     * @param key the key to access
     * @return the data contained in the key
     */
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
