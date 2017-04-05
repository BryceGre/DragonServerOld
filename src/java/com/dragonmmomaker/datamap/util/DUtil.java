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

package com.dragonmmomaker.datamap.util;

import java.util.Map;

import jdk.nashorn.internal.objects.Global;
import jdk.nashorn.internal.runtime.ScriptObject;

/**
 * A simple utility to conert a Map to a ScriptObject for Nashorn
 * @author Bryce
 */
public class DUtil {
    /**
     * Converts a Map of key-value pairs into a Nashorn ScriptObject
     * @param pMap the Map to convert
     * @return the Nashorn Object representing the map
     */
    public static ScriptObject toJS(Map<?,?> pMap) {
        ScriptObject sobj = Global.newEmptyInstance();
        sobj.putAll(pMap, false);
        return sobj;
    }
}
