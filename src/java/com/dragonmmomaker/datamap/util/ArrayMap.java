/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.dragonmmomaker.datamap.util;

import java.util.LinkedHashMap;

import jdk.nashorn.internal.objects.Global;
import jdk.nashorn.internal.objects.NativeNumber;
import jdk.nashorn.internal.runtime.ScriptObject;

/**
 *
 * @author Bryce
 */
public class ArrayMap<T> extends LinkedHashMap<Integer,T> {
    public ScriptObject toJS() {
        ScriptObject sobj = Global.newEmptyInstance();
        sobj.putAll(this, false);
        return sobj;
    }
    
    @Override
    public T get(Object arg0) {
        Integer id = fixInt(arg0);
        return super.get(id);
    }

    @Override
    public boolean containsKey(Object arg0) {
        Integer id = fixInt(arg0);
        return super.containsKey(id);
    }

    @Override
    public T remove(Object arg0) {
        Integer id = fixInt(arg0);
        return super.remove(id);
    }
    
    public static Integer fixInt(Object arg0) {
        if (arg0 instanceof Integer) {
            return (Integer)arg0;
        } else if (arg0 instanceof Number) {
            return ((Number)arg0).intValue();
        } else if (arg0 instanceof NativeNumber) { //nashorn
            return ((NativeNumber)arg0).intValue();
        } else {
            try {
                return Integer.parseInt(arg0.toString());
            } catch (NumberFormatException | java.lang.NullPointerException e) {
                return null;
            }
        }
    }
}
