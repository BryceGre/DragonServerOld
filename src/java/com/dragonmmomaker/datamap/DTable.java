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

import java.nio.charset.Charset;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.AbstractCollection;
import java.util.Collection;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import com.dragonmmomaker.datamap.binary.BinaryDB;
import com.dragonmmomaker.datamap.util.ArrayMap;

/**
 * A Map class representing a table.
 * Each row has a key (string) and an id (integer) automatically added
 * Keys can be row names or ids and values are Map objects represnting rows.
 * @author Bryce
 */
public class DTable implements Map<Object, DRow> {

    protected final DBase mBase; //parent DBase object
    private final String mName; //table name

    /**
     * Get the name of the table.
     * @return the table's name
     */
    public String getName() {
        return mName;
    }
    
    /**
     * Create a table object.
     * @param pTableName the name of the table
     * @param pBase the parent DBase object
     */
    public DTable(final String pTableName, final DBase pBase) {
        mName = pTableName;
        mBase = pBase;
    }

    /**
     * Truncate the table, removing all entires.
     */
    @Override
    public void clear() {
        String sql = "DROP TABLE " + mName;
        if (mBase.isClosed()) return; //no connection
        //try to drop the table
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
        sql = "CREATE TABLE " + mName + " (id SERIAL PRIMARY KEY, key VARCHAR(255) UNIQUE)";
        if (mBase.isClosed()) return; //no connection
        //try to re-create the table
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    /**
     * Check if the table contains a row
     * Only use this if you're checking for a row's "key" string
     * @param arg0 the key or id of the row
     * @return true if the row exists, false otherwise
     */
    @Override
    public boolean containsKey(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0); //turn Object into int
        if (mBase.isClosed()) return false; //no connection
        if (id != null) {
            //arg0 is a number, check the id column
            return true; //can create any key
            //need to do this because nashorn checks containsKey before calling get
        } else if (arg0 != null) {
            //arg0 is an object, check the key column
            String sql = "SELECT * FROM " + mName + " WHERE key=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg0.toString());
                statement.setQueryTimeout(30);

                try(ResultSet rs = statement.executeQuery()) {
                    return rs.next();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        return false;
    }
    
    /**
     * Check if the table contains a row
     * Use this instead of containsKey if you're checking for a row's "ID"
     * @param arg0 the ID of the row
     * @return true if the row exists, false otherwise
     */
    public boolean containsID(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0); //turn Object into int
        if (mBase.isClosed()) return false; //no connection
        if (id != null) {
            //arg0 is a number, check the id column
            String sql = "SELECT * FROM " + mName + " WHERE id=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setInt(1, id);
                statement.setQueryTimeout(30);

                //return result
                try(ResultSet rs = statement.executeQuery()) {
                    return rs.next();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        } else if (arg0 != null) {
            //arg0 is an object, check the key column
            //this really shouldn't be happening if this function is used correctly
            String sql = "SELECT * FROM " + mName + " WHERE key=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg0.toString());
                statement.setQueryTimeout(30);

                //return result
                try(ResultSet rs = statement.executeQuery()) {
                    return rs.next();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        return false;
    }

    /**
     * Unsupported
     */
    @Override
    public boolean containsValue(Object arg0) {
        // unsupported
        throw new UnsupportedOperationException();
    }
    
    /**
     * Generate a Set containing each row in the table.
     * @return a Set of Map.Entry objects representing rows in the table
     */
    @Override
    public Set<Map.Entry<Object, DRow>> entrySet() {
        Set<Map.Entry<Object, DRow>> entrySet = new LinkedHashSet<Map.Entry<Object, DRow>>();
        if (mBase.isClosed()) return entrySet; //no connection, return empty set
        //select all rows
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                //put each result into the entrySet
                while (rs.next()) {
                    int id = rs.getInt("id");
                    entrySet.add(new DTable.Entry(new Integer(id), new DRow(rs, this)));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        
        //return the entrySet
        return entrySet;
    }
    
    /**
     * Get a Map representing a row from the table.
     * If the row does not exist, create it.
     * @param arg0 either a number representing the "ID" of the row, or a string representing the "Key" of the row
     * @return the Map object representing the row
     */
    @Override
    public DRow get(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0); //turn Object into int
        if (mBase.isClosed()) return null; //no connecton
        if (id != null) {
            //arg0 is a number, check the id column
            DRow row = new DRow(id, this);
            if (!row.exists()) {
                //row doesn't exist, create it.
                String sql = "INSERT INTO " + mName + " (id) VALUES (?)";
                try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                    statement.setInt(1, id);
                    statement.setQueryTimeout(60);

                    statement.executeUpdate();
                    
                    //return the new row
                    return new DRow(id, this);
                } catch (SQLException e) {
                    e.printStackTrace();
                }
            }
            //return the row existing row
            return row;
        } else if (arg0 != null) {
            //arg0 is an object, use the key column
            DRow row = new DRow(arg0.toString(), this);
            if (row.exists()) {
                //row found, return it.
                return row;
            } else {
                //row not found, return null
                return null;
            }
            
        }
        return null;
    }
    
    /**
     * Return a list of a single column value for all rows
     * @param arg0 the name of the column to list
     * @return a map with the row's ID as the key and the column's value as the value
     */
    public ArrayMap<Object> list(Object arg0) {
        ArrayMap<Object> all = new ArrayMap();
        //arg0 is the "id" field
        if (arg0.toString().toLowerCase().equals("id")) {
            //the keySet function does what we want here
            Set<Object> keys = this.keySet();
            //build an ArrayMap with the IDs and null values
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            return all;
        }
        if (mBase.isClosed()) return all; //no connction
        String sql = "";
        //arg0 is the "key" field
        if (arg0.toString().toLowerCase().equals("key")) {
            //select all rows' ID,Key columns
            sql = "SELECT id,key FROM " + mName;
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setQueryTimeout(60);
                
                //build an ArrayMap with the "key" column as the value
                try(ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        all.put(rs.getInt("id"), rs.getString("key"));
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
            //return the ArrayMap
            return all;
        }
        //arg0 is some other field
        sql = "ALTER TABLE " + mName + " ADD " + arg0.toString().toLowerCase() + " BYTEA";
        //make sure column exists
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);
            statement.executeUpdate();
            
            //column didn't exist, return all nulls
            Set<Object> keys = this.keySet();
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            //return the ArrayMap
            return all;
        } catch (SQLException e) { /*column exists*/ }
        if (mBase.isClosed()) return all; //no connection
        //select all rows' id,arg0 columns
        sql = "SELECT id," + arg0.toString().toLowerCase() + " FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);
            
            //build an ArrayMap with the values of the column with the name matching arg0 as the value
            try(ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    //column will be a BLOB
                    byte[] raw = rs.getBytes(arg0.toString().toLowerCase());
                    
                    //convert the BLOB into an object
                    Object value = null;
                    if (raw != null) {
                        value = BinaryDB.retrieveObject(raw);
                    }
                    //put the object into the ArrayMap
                    all.put(rs.getInt("id"), value);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        //return the ArrayMap
        return all;
    }
    
    /**
     * Return a list of a all columns' value for all rows
     * @return a map with the row's ID as the key and a DRow object as the value
     */
    public ArrayMap<Object> listAll() {
        ArrayMap<Object> all = new ArrayMap();
        if (mBase.isClosed()) return all; //no connection
        
        String sql = "SELECT * FROM " + mName;
        //get everything from all rows
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            //put each row into the ArrayMap
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    int id = rs.getInt("id");
                    all.put(new Integer(id), new DRow(rs, this));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        
        //return the ArrayMap
        return all;
    }
    
    /**
     * Return a list of a raw column's value for all rows
     * @param arg0 the name of the column to list
     * @return a map with the row's ID as the key and the column's bytes as the value
     */
    public ArrayMap<byte[]> listRaw(Object arg0) {
        ArrayMap<byte[]> all = new ArrayMap();
        //arg0 is the "id" field
        if (arg0.toString().toLowerCase() == "id") {
            //the keySet function does what we want here
            Set<Object> keys = this.keySet();
            //build an ArrayMap with the IDs and null values
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            //return the ArrayMap
            return all;
        }
        if (mBase.isClosed()) return all; //no connection
        String sql = "";
        //arg0 is the "key" field
        if (arg0.toString().toLowerCase().equals("key")) {
            sql = "SELECT id,key FROM " + mName;
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setQueryTimeout(60);

                //build an ArrayMap with the "key" column's bytes as the value
                try(ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        all.put(rs.getInt("id"), rs.getString("key").getBytes(Charset.forName("UTF-8")));
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
            //return the ArrayMap
            return all;
        }
        //arg0 is some other field
        sql = "ALTER TABLE " + mName + " ADD " + arg0.toString().toLowerCase() + " BYTEA";
        //make sure column exists
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);
            statement.executeUpdate();
            
            //column didn't exist, return all nulls
            Set<Object> keys = this.keySet();
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            //return the ArrayMap
            return all;
        } catch (SQLException e) { /*column exists*/ }
        if (mBase.isClosed()) return all; //no connection
        //select all rows' id,arg0 columns
        sql = "SELECT id," + arg0.toString().toLowerCase() + " FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            //build an ArrayMap with the values of the column with the name matching arg0 as the value
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    //column will be BLOB
                    byte[] raw = rs.getBytes(arg0.toString().toLowerCase());
                    //add the BLOB to the ArrayMap
                    all.put(rs.getInt("id"), raw);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        //return the ArrayMap
        return all;
    }

    /**
     * Check if the table is empty
     * @return true if the table contains no rows, false otherwise
     */
    @Override
    public boolean isEmpty() {
        if (mBase.isClosed()) return true; //no connection
        //select everything
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            //check if at least 1 row exists
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return true;
    }
    
    /**
     * Generate a Set of row IDs in the table.
     * @return a Set of Integers representing row IDs in the table
     */
    @Override
    public Set<Object> keySet() {
        Set<Object> keySet = new LinkedHashSet();
        if (mBase.isClosed()) return keySet; //no connction
        //select all rows
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    //add the id
                    keySet.add(new Integer(rs.getInt("id")));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        //return the keySet;
        return keySet;
    }

    /**
     * Unsupportd. Tables are created automatically using the Get function
     */
    @Override
    public DRow put(Object arg0, DRow arg1) {
        // unsupported, use get for auto-create
        throw new UnsupportedOperationException();
    }
    
    /**
     * Insert a new row, using the next ID and an empty Key
     * @return the new blank row
     */
    public DRow insert() {
        if (mBase.isClosed()) return null; //no connection
        String sql = "INSERT INTO " + mName + " DEFAULT VALUES";
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            statement.setQueryTimeout(30);
            statement.executeUpdate();
            
            try (ResultSet rs = statement.getGeneratedKeys()) {
                if (rs.next()) {
                    return new DRow(rs.getInt("id"), this);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }

    /**
     * Unsupported
     */
    @Override
    public void putAll(Map<? extends Object, ? extends DRow> arg0) {
        // unsupported
        throw new UnsupportedOperationException();
    }

    /**
     * Remove a row from the table
     * @param arg0 the ID or Key of the row to remove
     * @return always null
     */
    @Override
    public DRow remove(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0); //turn Object into int
        if (mBase.isClosed()) return null; //no connection
        if (id != null) {
            //arg0 is a number, check the id column
            String sql = "DELETE FROM " + mName + " WHERE id=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setInt(1, id);
                statement.setQueryTimeout(30);

                statement.executeUpdate();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        } else if (arg0 != null) {
            //arg0 is a string, check the key column
            String sql = "DELETE FROM " + mName + " WHERE key=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg0.toString());
                statement.setQueryTimeout(30);

                statement.executeUpdate();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        //row was removed and is no longer a valid object
        return null;
    }

    /**
     * Get the size of the table
     * @return the number of rows in the table
     */
    @Override
    public int size() {
        return this.keySet().size();
    }

    /**
     * Get a collection containing all of th rows in the table
     * @return a Collection of DRows
     */
    @Override
    public Collection<DRow> values() {
        //create the collection
        Collection<DRow> values = new AbstractCollection<DRow>() {
            @Override
            public Iterator<DRow> iterator() {
                return new Iterator<DRow>() {
                    //use the entrySet iterator in place of a custom iterator
                    private Iterator<Map.Entry<Object, DRow>> mItr = DTable.this.entrySet().iterator();

                    @Override
                    public boolean hasNext() {
                        return mItr.hasNext();
                    }

                    @Override
                    public DRow next() {
                        return mItr.next().getValue();
                    }
                };
            }

            @Override
            public int size() {
                return DTable.this.size();
            }
        };

        //populate the collection
        Iterator<DRow> itr = values.iterator(); //entrySet iterator
        while (itr.hasNext()) {
            values.add(itr.next()); //add iterator values to the collection
        }
        
        //return the collection
        return values;
    }

    @Override
    public int hashCode() {
        //hashcode based on the table's name (unique)
        final int prime = 31;
        int result = 1;
        result = prime * result + ((mName == null) ? 0 : mName.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        //equals based on the table's name (unique)
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        DTable other = (DTable) obj;
        if (mName == null) {
            if (other.mName != null) {
                return false;
            }
        } else if (!mName.equals(other.mName)) {
            return false;
        }
        return true;
    }

    /**
     * Class representing an entry in the map
     * In this case, a row in the table
     */
    public class Entry implements Map.Entry<Object, DRow> {

        private Object mKey; //the ID or Key
        private DRow mValue; //the row

        public Entry(Object pKey, DRow pValue) {
            mKey = pKey;
            mValue = pValue;
        }

        @Override
        public Object getKey() {
            return mKey;
        }

        @Override
        public DRow getValue() {
            return mValue;
        }

        @Override
        public DRow setValue(DRow arg0) {
            return DTable.this.put(mKey, arg0);
        }
    }
}
