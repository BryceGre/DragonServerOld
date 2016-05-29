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

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import jdk.nashorn.internal.objects.Global;
import jdk.nashorn.internal.objects.NativeNumber;
import jdk.nashorn.internal.runtime.ScriptObject;


/**
 *
 * @author Bryce
 */
public class ArrayMap<T> extends LinkedHashMap<Integer,T> implements java.lang.Iterable<T> {
    /**
     * Default Constructor
     */
    public ArrayMap() {
        super();
    }
    
    /**
     * Designed to accept an EntrySet. Will create an ArrayMap from a Map using
     * any keys that can be converted to Integers.
     * 
     * @param arg0 the EntrySet of a Map with Integer keys.
     */
    public ArrayMap(Set<Map.Entry<? extends Object,T>> arg0) {
        super();
        for (Map.Entry<? extends Object,T> row : arg0) {
            Integer id = fixInt(row.getKey());
            if (id != null)
                this.put(id, row.getValue());
        }
    }
    
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

    @Override
    public java.util.Iterator iterator() {
        return new ArrayMapIterator();
    }
    
    private class ArrayMapIterator implements java.util.Iterator<T> {
        private LinkedList<Map.Entry<Integer,T>> entryList;
        
        public ArrayMapIterator() {
            entryList = new LinkedList(ArrayMap.this.entrySet());
            entryList.sort(new Comparator<Entry<Integer,T>>() {
                @Override
                public int compare(Entry<Integer, T> o1, Entry<Integer, T> o2) {
                    return Integer.compare(o1.getKey(), o2.getKey());
                }
            });
        }
        
        @Override
        public boolean hasNext() {
            return (entryList.peek() != null);
        }

        @Override
        public T next() {
            return entryList.poll().getValue();
        }
        
    }
}
