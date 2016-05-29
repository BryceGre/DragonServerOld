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

package com.dragonmmomaker.datamap;

import java.io.Serializable;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;

import jdk.nashorn.internal.objects.Global;
import jdk.nashorn.internal.runtime.ScriptObject;

import com.dragonmmomaker.datamap.binary.BinaryDB;

public class DRow extends HashMap<Object, Object> {
    
    private final int mID;
    private String mKey;
    protected final DTable mTable;
    
    public DRow(final int pID, final DTable pTable) {
        super();
        
        String pKey = null; //temp
        
        //make sure database is open
        if (!pTable.mBase.isClosed()) {
            //load Row into Map
            String sql = "SELECT * FROM " + pTable.getName() + " WHERE id=?";
            try (PreparedStatement statement = pTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setInt(1, pID);
                statement.setQueryTimeout(30);

                try (ResultSet rs = statement.executeQuery()) {
                    if (rs.next()) {
                        pKey = rs.getString("key");
                        load(rs);
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        
        mID = pID;
        mKey = pKey;
        mTable = pTable;
    }
    
    public DRow(final String pKey, final DTable pTable) {
        super();
        
        int pID = 0; //temp
        
        //make sure database is open
        if (!pTable.mBase.isClosed()) {
            //load Row into Map
            String sql = "SELECT * FROM " + pTable.getName() + " WHERE key=?";
            try (PreparedStatement statement = pTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, pKey);
                statement.setQueryTimeout(30);

                try (ResultSet rs = statement.executeQuery()) {
                    if (rs.next()) {
                        pID = rs.getInt("id");
                        load(rs);
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        
        mID = pID;
        mKey = pKey;
        mTable = pTable;
    }
    
    public DRow(final ResultSet pRS, final DTable pTable) throws SQLException {
        super();
        
        mID = pRS.getInt("id");
        mKey = pRS.getString("key");
        mTable = pTable;
        
        load(pRS);
    }
    
    private void load(ResultSet pRS) throws SQLException {
        ResultSetMetaData rsmd = pRS.getMetaData();
        for (int i = 1; i <= rsmd.getColumnCount(); i++) {
            if (rsmd.getColumnName(i).toLowerCase().equals("key")) {
                super.put("key", pRS.getString(i));
            } else if (rsmd.getColumnName(i).toLowerCase().equals("id")) {
                super.put("id", pRS.getInt(i));
            } else {
                byte[] raw = pRS.getBytes(i);
                Object value = null;
                if (raw != null) {
                    value = BinaryDB.retrieveObject(raw);
                }
                super.put(rsmd.getColumnName(i).toLowerCase(), value);
            }
        }
    }
    
    public boolean exists() {
        return super.containsKey("id");
    }
    
    public ScriptObject toJS() {
        ScriptObject sobj = Global.newEmptyInstance();
        sobj.putAll(this, false);
        return sobj;
    }
    
    public void putAll(ScriptObject arg0) {
        Map<Object,Object> newMap = new LinkedHashMap();
        for (Map.Entry<Object, Object> entry : arg0.entrySet()) {
            //make sure this object is storable in the database
            if (entry.getValue() instanceof Serializable) {
                newMap.put(entry.getKey().toString(), (Serializable)entry.getValue());
            } else if (entry.getValue() instanceof ScriptObject) {
                newMap.put(entry.getKey().toString(), (ScriptObject)entry.getValue());
            }
        }
        this.putAll(newMap);
    }
    
    @Override
    public boolean containsKey(Object arg0) {
        return super.containsKey(arg0.toString().toLowerCase());
    }
    
    @Override
    public Object get(Object arg0) {
        return super.get(arg0.toString().toLowerCase());
    }
    
    @Override
    public Object getOrDefault(Object arg0, Object defaultValue) {
        return super.getOrDefault(arg0.toString().toLowerCase(), defaultValue);
    }

    @Override
    public void clear() {
        // unsupported
        throw new UnsupportedOperationException();
    }

    @Override
    public Object put(Object arg0, Object arg1) {
        if (mTable.mBase.isClosed()) return null;
        Object old = super.get(arg0.toString().toLowerCase());
        
        if (arg0.toString().toLowerCase().equals("id")) {
            throw new IllegalArgumentException("id cannot be changed!");
        }
        if (arg0.toString().toLowerCase().equals("key")) {
            String sql = "UPDATE " + mTable.getName() + " SET key=? WHERE id=?";
            try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg1.toString());
                
                statement.setInt(2, mID);
                statement.setQueryTimeout(30);

                statement.executeUpdate();
                
                mKey = arg1.toString();
            } catch (SQLException e) {
                e.printStackTrace();
                return null;
            }
            super.put("key", arg1.toString());
            return old;
        }
        if (!super.containsKey(arg0.toString().toLowerCase())) {
            String sql = "ALTER TABLE " + mTable.getName() + " ADD " + arg0.toString().toLowerCase() + " BYTEA";
            try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setQueryTimeout(60);

                statement.executeUpdate();
            } catch (SQLException e) {
                e.printStackTrace();
                return null;
            }
        }
        super.put(arg0.toString().toLowerCase(), arg1);
        if (mTable.mBase.isClosed()) return null;
        String sql = "UPDATE " + mTable.getName() + " SET " + arg0.toString().toLowerCase() + "=? WHERE id=?";
        try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
            statement.setBytes(1, BinaryDB.prepareObject(arg1));
            
            statement.setInt(2, mID);
            statement.setQueryTimeout(30);

            statement.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }

        return old;
    }
    
    Object unmanagedPut(Object arg0, Object arg1) {
        return super.put(arg0.toString().toLowerCase(), arg1);
    }
    
    @Override
    public void putAll(Map<? extends Object, ? extends Object> arg0) {
        Iterator<? extends Object> itr = arg0.keySet().iterator();
        Object[] data = new Object[arg0.size()];
        String sql1 = "UPDATE " + mTable.getName() + " SET ";
        String sql2 = " WHERE id=" + mID;
        int count = 0;
        int key = -1;
        if (mTable.mBase.isClosed()) return;
        while (itr.hasNext()) {
            //get the key
            Object col = itr.next();
            if (col.toString().toLowerCase().equals("id")) { continue; }
            //make sure it exists
            if (!super.containsKey(col.toString().toLowerCase())) {
                if (mTable.mBase.isClosed()) return;
                String sql = "ALTER TABLE " + mTable.getName() + " ADD " + col.toString().toLowerCase() + " BYTEA";
                try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
                    statement.setQueryTimeout(60);

                    statement.executeUpdate();
                } catch (SQLException e) {
                    e.printStackTrace();
                }
            }
            //add to cache
            super.put(col.toString().toLowerCase(), arg0.get(col));
            //add it onto the SQL statement
            sql1 += col.toString().toLowerCase() + "=?";
            if (itr.hasNext())
                sql1 += ", ";
            //record the data
            data[count] = arg0.get(col);
            if (col.toString().toLowerCase().equals("key"))
                key = count;
            count++;
        }
        if (mTable.mBase.isClosed()) return;
        try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql1 + sql2)) {
            for (int i=0; i<count; i++) {
                if (i == key)
                    if (data[i] == null)
                        statement.setString(i+1, null);
                    else
                        statement.setString(i+1, data[i].toString());
                else
                    statement.setBytes(i+1, BinaryDB.prepareObject(data[i]));
            }
            statement.setQueryTimeout(30);
            
            statement.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    @Override
    public Object putIfAbsent(Object arg0, Object arg1) {
        return super.putIfAbsent(arg0.toString().toLowerCase(), arg1);
    }

    @Override
    public Object remove(Object arg0) {
        // unsupported (TODO)
        //return super.remove(arg0.toString().toLowerCase());
        throw new UnsupportedOperationException();
    }
    
    @Override
    public boolean remove(Object arg0, Object arg1) {
        // unsupported (TODO)
        //return super.remove(arg0.toString().toLowerCase(), arg1);
        throw new UnsupportedOperationException();
    }
    
    @Override
    public Object replace(Object arg0, Object arg1) {
        return super.replace(arg0.toString().toLowerCase(), arg1);
    }
    
    @Override
    public boolean replace(Object arg0, Object arg1, Object arg2) {
        return super.replace(arg0.toString().toLowerCase(), arg1, arg2);
        //this.com
    }
    
    @Override
    public Object compute(Object arg0, BiFunction<? super Object, ? super Object, ? extends Object> arg1) {
        return super.compute(arg0.toString().toLowerCase(), arg1);
    }
    
    @Override
    public Object computeIfAbsent(Object arg0, Function<? super Object, ? extends Object> arg1) {
        return super.computeIfAbsent(arg0.toString().toLowerCase(), arg1);
    }
    
    @Override
    public Object computeIfPresent(Object arg0, BiFunction<? super Object, ? super Object, ? extends Object> arg1) {
        return super.computeIfPresent(arg0.toString().toLowerCase(), arg1);
    }
    
    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + mID;
        result = prime * result + ((mTable == null) ? 0 : mTable.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        DRow other = (DRow) obj;
        if (mID != other.mID) {
            return false;
        }
        if (mTable == null) {
            if (other.mTable != null) {
                return false;
            }
        } else if (!mTable.equals(other.mTable)) {
            return false;
        }
        return true;
    }

    public class Entry implements Map.Entry<Object, Object> {

        private final Object mKey;
        private final Object mValue;

        public Entry(String pKey, Object pValue) {
            mKey = pKey;
            mValue = pValue;
        }

        @Override
        public Object getKey() {
            return mKey;
        }

        @Override
        public Object getValue() {
            return mValue;
        }

        @Override
        public Object setValue(Object arg0) {
            return DRow.this.put(mKey, arg0);
        }
    }
}
