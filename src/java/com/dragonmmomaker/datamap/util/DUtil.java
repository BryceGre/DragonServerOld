/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package com.dragonmmomaker.datamap.util;

import java.util.Map;

import jdk.nashorn.internal.objects.Global;
import jdk.nashorn.internal.runtime.ScriptObject;

/**
 *
 * @author Bryce
 */
public class DUtil {
    public static ScriptObject toJS(Map<?,?> pMap) {
        ScriptObject sobj = Global.newEmptyInstance();
        sobj.putAll(pMap, false);
        return sobj;
    }
}
