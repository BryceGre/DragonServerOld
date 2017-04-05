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

/**
 * A Map class representing a row.
 * Keys are column names and values are objects representing a row's value.
 * @author Bryce
 */
public class DRow extends HashMap<Object, Object> {
    
    private final int mID; //row ID
    private String mKey; //row Key
    protected final DTable mTable; //parent DTable object
    
    /**
     * Create and populate the row object
     * @param pID the ID of the row
     * @param pTable the parent table
     */
    public DRow(final int pID, final DTable pTable) {
        super();
        
        String pKey = null; //temp
        
        //make sure database is open
        if (!pTable.mBase.isClosed()) {
            //select this row from the database
            String sql = "SELECT * FROM " + pTable.getName() + " WHERE id=?";
            try (PreparedStatement statement = pTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setInt(1, pID);
                statement.setQueryTimeout(30);
                
                //load the row into the map
                try (ResultSet rs = statement.executeQuery()) {
                    if (rs.next()) {
                        pKey = rs.getString("key"); //key
                        load(rs); //all other values
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
    
    /**
     * Create and populate the row object
     * @param pKey the Key of the row
     * @param pTable the parent table
     */
    public DRow(final String pKey, final DTable pTable) {
        super();
        
        int pID = 0; //temp
        
        //make sure database is open
        if (!pTable.mBase.isClosed()) {
            //select this row from the database
            String sql = "SELECT * FROM " + pTable.getName() + " WHERE key=?";
            try (PreparedStatement statement = pTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, pKey);
                statement.setQueryTimeout(30);

                //load the row into the map
                try (ResultSet rs = statement.executeQuery()) {
                    if (rs.next()) {
                        pID = rs.getInt("id"); //key
                        load(rs); //all other values
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
    
    /**
     * Create and populate the row object
     * @param pRS the ResultSet contaning the row
     * @param pTable the parent table
     * @throws SQLException if the ResultSet cannot be read
     */
    public DRow(final ResultSet pRS, final DTable pTable) throws SQLException {
        super();
        
        mID = pRS.getInt("id"); //get ID from the ResultSet
        mKey = pRS.getString("key"); //get Key from the ResultSet
        mTable = pTable;
        
        load(pRS);  //get all other values from the ResultSet
    }
    
    /**
     * Loads values from a ResultSet into this Map object
     * Note that the row's values are cached for easy reading
     * @param pRS the ResultSet containing the row
     * @throws SQLException if the ResultSet cannot be read
     */
    private void load(ResultSet pRS) throws SQLException {
        //get the metadata from the ResultSet
        ResultSetMetaData rsmd = pRS.getMetaData();
        //for each column in the ResultSet
        for (int i = 1; i <= rsmd.getColumnCount(); i++) {
            //store the key column as a String
            if (rsmd.getColumnName(i).toLowerCase().equals("key")) {
                super.put("key", pRS.getString(i));
            //store the ID column as an Int
            } else if (rsmd.getColumnName(i).toLowerCase().equals("id")) {
                super.put("id", pRS.getInt(i));
            //store all other columns as the Objects they were saved as
            } else {
                //get the bytes from the database
                byte[] raw = pRS.getBytes(i);
                Object value = null;
                //retrieve the Object from the bytes
                if (raw != null) {
                    value = BinaryDB.retrieveObject(raw);
                }
                //add the object to the Map
                super.put(rsmd.getColumnName(i).toLowerCase(), value);
            }
        }
    }
    
    /**
     * Check if the row exists
     * This will not result in a query
     * @return true if this row is in the table, false otherwise
     */
    public boolean exists() {
        return super.containsKey("id"); //the row must have an ID if it exists
    }
    
    /**
     * Return a ScriptObject representing this row for use with Nashorn
     * @return a JavaScript object for use with Nashorn
     */
    public ScriptObject toJS() {
        //create empty object
        ScriptObject sobj = Global.newEmptyInstance();
        //add everything in the row
        sobj.putAll(this, false);
        //return the object
        return sobj;
    }
    
    /**
     * Save all values from a ScriptObject into this row in the database
     * Note: this will result in a query
     * @param arg0 a JavaScript object from Nashorn containing key-value pairs
     */
    public void putAll(ScriptObject arg0) {
        //map for use with regular putAll
        Map<Object,Object> newMap = new LinkedHashMap();
        //for each key-value pair in the ScriptObject
        for (Map.Entry<Object, Object> entry : arg0.entrySet()) {
            //make sure this object is storable in the database
            if (entry.getValue() instanceof Serializable) {
                newMap.put(entry.getKey().toString(), (Serializable)entry.getValue());
            //ScriptObjects are serializable via the BinaryDB class
            } else if (entry.getValue() instanceof ScriptObject) {
                newMap.put(entry.getKey().toString(), (ScriptObject)entry.getValue());
            }
        }
        //add all the entries to this map
        this.putAll(newMap);
    }
    
    /**
     * Check if this row contains a value for a column
     * This will not result in a query
     * @param arg0 the name of the column
     * @return true if this column has a value in this row, false otherwise
     */
    @Override
    public boolean containsKey(Object arg0) {
        return super.containsKey(arg0.toString().toLowerCase());
    }
    
    /**
     * Get a value from a column in this row
     * This will not rsult in a query
     * @param arg0 the name of the column
     * @return the value of the column
     */
    @Override
    public Object get(Object arg0) {
        return super.get(arg0.toString().toLowerCase());
    }
    
    /**
     * Get a value from a column in this row
     * This will not rsult in a query
     * @param arg0 the name of the column
     * @param defaultValue the value to use if arg0 doesn't exist
     * @return the value of the column
     */
    @Override
    public Object getOrDefault(Object arg0, Object defaultValue) {
        return super.getOrDefault(arg0.toString().toLowerCase(), defaultValue);
    }

    /**
     * Unsupported
     */
    @Override
    public void clear() {
        // unsupported
        throw new UnsupportedOperationException();
    }

    /**
     * Update a column's value in the row
     * Note: this will result in a query
     * @param arg0 the column to modify
     * @param arg1 the value to put in the column
     * @return the old value (if it exists) or null
     */
    @Override
    public Object put(Object arg0, Object arg1) {
        if (mTable.mBase.isClosed()) return null; //no connection
        Object old = super.get(arg0.toString().toLowerCase());
        //column to modify is ID
        if (arg0.toString().toLowerCase().equals("id")) {
            //cannot change ID
            throw new IllegalArgumentException("id cannot be changed!");
        }
        //column to modify is Key
        if (arg0.toString().toLowerCase().equals("key")) {
            //update the key column for this row
            String sql = "UPDATE " + mTable.getName() + " SET key=? WHERE id=?";
            try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg1.toString());
                
                statement.setInt(2, mID); //this row's ID
                statement.setQueryTimeout(30);

                statement.executeUpdate();
                
                //get the new Key
                mKey = arg1.toString();
            } catch (SQLException e) {
                e.printStackTrace();
                return null;
            }
            //also update the key in the cache
            super.put("key", arg1.toString());
            //and return the old key
            return old;
        }
        //column to modify is something else
        if (!super.containsKey(arg0.toString().toLowerCase())) {
            //Table doesn't contain this column, alter the table to do so
            String sql = "ALTER TABLE " + mTable.getName() + " ADD " + arg0.toString().toLowerCase() + " BYTEA";
            try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql)) {
                statement.setQueryTimeout(60);

                statement.executeUpdate();
            } catch (SQLException e) {
                e.printStackTrace();
                return null;
            }
        }
        //update the cache
        super.put(arg0.toString().toLowerCase(), arg1);
        if (mTable.mBase.isClosed()) return null; //no connection
        //update the row in the database
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
        //and return the old key
        return old;
    }
    
    /**
     * Update a column's value in the cache, but do not update the row in the database
     * This will not result in a query
     * @param arg0 the column to modify
     * @param arg1 the value to put in the column
     * @return the old value (if it exists) or null
     */
    Object unmanagedPut(Object arg0, Object arg1) {
        return super.put(arg0.toString().toLowerCase(), arg1);
    }
    
    /**
     * Update multiple columns' values in the row in one query
     * Note: this will result in a query
     * @param arg0 a Map containing the key-value pairs to update
     */
    @Override
    public void putAll(Map<? extends Object, ? extends Object> arg0) {
        //get the column names to update from arg0
        Iterator<? extends Object> itr = arg0.keySet().iterator();
        //data array to keep valus in for future use
        Object[] data = new Object[arg0.size()];
        //temporary variables
        String sql1 = "UPDATE " + mTable.getName() + " SET ";
        String sql2 = " WHERE id=" + mID;
        int count = 0;
        int key = -1;
        
        if (mTable.mBase.isClosed()) return; //no connection
        //for each column to update
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
        //perform the SQL query to update the row
        if (mTable.mBase.isClosed()) return; //no connection
        try (PreparedStatement statement = mTable.mBase.getConnection().prepareStatement(sql1 + sql2)) {
            //populate the SQL with the new data
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
    
    /**
     * Unsupportd
     */
    @Override
    public Object putIfAbsent(Object arg0, Object arg1) {
        return super.putIfAbsent(arg0.toString().toLowerCase(), arg1);
    }

    /**
     * Unsupported
     */
    @Override
    public Object remove(Object arg0) {
        // unsupported (TODO)
        //return super.remove(arg0.toString().toLowerCase());
        throw new UnsupportedOperationException();
    }
    
    /**
     * Unsupported
     */
    @Override
    public boolean remove(Object arg0, Object arg1) {
        // unsupported (TODO)
        //return super.remove(arg0.toString().toLowerCase(), arg1);
        throw new UnsupportedOperationException();
    }
    
    /**
     * Unsupported
     */
    @Override
    public Object replace(Object arg0, Object arg1) {
        return super.replace(arg0.toString().toLowerCase(), arg1);
    }
    
    /**
     * Unsupported
     */
    @Override
    public boolean replace(Object arg0, Object arg1, Object arg2) {
        return super.replace(arg0.toString().toLowerCase(), arg1, arg2);
        //this.com
    }
    
    /**
     * Unsupported
     */
    @Override
    public Object compute(Object arg0, BiFunction<? super Object, ? super Object, ? extends Object> arg1) {
        return super.compute(arg0.toString().toLowerCase(), arg1);
    }
    
    /**
     * Unsupported
     */
    @Override
    public Object computeIfAbsent(Object arg0, Function<? super Object, ? extends Object> arg1) {
        return super.computeIfAbsent(arg0.toString().toLowerCase(), arg1);
    }
    
    /**
     * Unsupported
     */
    @Override
    public Object computeIfPresent(Object arg0, BiFunction<? super Object, ? super Object, ? extends Object> arg1) {
        return super.computeIfPresent(arg0.toString().toLowerCase(), arg1);
    }
    
    @Override
    public int hashCode() {
        //hashcode based on the row's ID and table name (unique)
        final int prime = 31;
        int result = 1;
        result = prime * result + mID;
        result = prime * result + ((mTable == null) ? 0 : mTable.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        //equals based on the row's ID table's name (unique)
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

    /**
     * Class representing an entry in the map
     * In this case, a column value in the row
     */
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
