
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
    
    private int mID;
    private String mKey;
    protected DTable mTable;
    
    public DRow(int pID, DTable pTable) {
        super();
        
        mID = pID;
        mTable = pTable;
        
        if (mTable.mBase.isClosed()) return;
        //load Row into Map
        String sql = "SELECT * FROM " + mTable.getName() + " WHERE id=?";
        try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
            statement.setInt(1, mID);
            statement.setQueryTimeout(30);
            
            load(statement);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    
    public DRow(String pKey, DTable pTable) {
        super();
        
        mKey = pKey;
        mTable = pTable;
        
        if (mTable.mBase.isClosed()) return;
        //load Row into Map
        String sql = "SELECT * FROM " + mTable.getName() + " WHERE key=?";
        try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
            statement.setString(1, mKey);
            statement.setQueryTimeout(30);
            
            load(statement);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public void load(PreparedStatement pSQL) throws SQLException {
        try (ResultSet rs = pSQL.executeQuery()) {
            if (rs.next()) {
                ResultSetMetaData rsmd = rs.getMetaData();
                for (int i = 1; i <= rsmd.getColumnCount(); i++) {
                    if (rsmd.getColumnName(i).toLowerCase().equals("key")) {
                        mKey = rs.getString(i);
                        super.put("key", mKey);
                    } else if (rsmd.getColumnName(i).toLowerCase().equals("id")) {
                        mID = rs.getInt(i);
                        super.put("id", mID);
                    } else {
                        byte[] raw = rs.getBytes(i);
                        Object value = null;
                        if (raw != null) {
                            value = BinaryDB.retrieveObject(raw);
                        }
                        super.put(rsmd.getColumnName(i).toLowerCase(), value);
                    }
                }
            }
        }
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
    }

    @Override
    public Object put(Object arg0, Object arg1) {
        if (mTable.mBase.isClosed()) return null;
        Object old = super.get(arg0.toString().toLowerCase());
        
        if (arg0.toString().toLowerCase().equals("id")) {
            return null;
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
        return null;
    }
    
    @Override
    public boolean remove(Object arg0, Object arg1) {
        // unsupported (TODO)
        //return super.remove(arg0.toString().toLowerCase(), arg1);
        return false;
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

        private Object mKey;
        private Object mValue;

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
