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

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.AbstractCollection;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

/**
 * A Map class representing a database.
 * Keys are table names and values are Map objects represnting tables.
 * 
 * The purpose of this class is to allow easy access to the database from Nashorn
 * Each row has a primary key "ID" (integer) and unique "Key" (String)
 * 
 * Usage is as follows:
 * Data.table[int id].column to look up row by ID
 * Data.table[String key].column to look up a row by Key
 * (Data is the DBase object)
 * (table is the name of the table to access)
 * (column is the name of the column to read or write to)
 * 
 * @author Bryce
 */
public class DBase implements Map<String, DTable> {

    private final Connection mConnection;
    private final HashSet<String> mBlacklist;

    /**
     * Get the DB connection object.
     * @return the DB connection object
     */
    public Connection getConnection() {
        return mConnection;
    }
    
    /**
     * Check if the connection is closed.
     * @return true if the connection is closed, false otherwise
     */
    public boolean isClosed() {
        try {
            if (this.getConnection().isClosed()) return true;
        } catch (SQLException e) {
            return true;
        }
        return false;
    }

    /**
     * Create a new instance of DB Map, and connect to the database.
     * @param pClass class of the database driver
     * @param pDriver database driver string
     * @param pBlacklist a list of table names that should be excluded from the DB map
     * @throws ClassNotFoundException if the class of the DB driver is not found
     * @throws SQLException if there was an issue connecting to the database
     */
    public DBase(String pClass, String pDriver, String... pBlacklist) throws ClassNotFoundException, SQLException {
        Class.forName(pClass); //load the driver
        mConnection = DriverManager.getConnection(pDriver); //connect to the database
        mBlacklist = new HashSet(); //create the table blacklist
        for (int i = 0; i < pBlacklist.length; i++) {
            //add blacklisted tables
            mBlacklist.add(pBlacklist[i].toLowerCase());
        }
    }
    
    /**
     * Fix issues with Nashorn and DatabaseMap
     * @param pEngine the Nashorn script engine
     */
    public void fixEngine(ScriptEngine pEngine) {
        //add Util class
        String headers = "var Util = com.dragonmmomaker.datamap.util.DUtil;\n";
        
        //wrap JSON.stingify to take a Map as an argument.
        //since JSON.stringify requires a ScriptObject by default
        StringBuilder json = new StringBuilder();
        json.append("var JSON = Object.create(JSON);\n");
        json.append("var JSONProto = Object.getPrototypeOf(JSON);\n");
        json.append("JSON.stringify = function(obj) {\n");
        json.append("    arguments[0] = JSON.toJS(obj);\n");
        json.append("    return JSONProto.stringify.apply(this, arguments);\n");
        json.append("};");
        json.append("JSON.toJS = function(obj) {\n");
        json.append("    if (obj instanceof Java.type('java.util.Map')) {\n");
        json.append("        var obj2 = Util.toJS(obj);\n");
        json.append("        for(var key in obj2) {\n");
        json.append("           obj2[key] = JSON.toJS(obj2[key])\n");
        json.append("        }; return obj2;\n");
        json.append("    } else if (obj instanceof Java.type('jdk.nashorn.internal.runtime.ScriptObject')) {\n");
        json.append("        for(var key in obj) {\n");
        json.append("           obj[key] = JSON.toJS(obj[key])\n");
        json.append("        }; return obj;\n");
        json.append("    } else {\n");
        json.append("        return obj;\n");
        json.append("    }\n");
        json.append("}");
        
        //evaluate headers
        try {
            pEngine.eval(headers);
            pEngine.eval(json.toString());
        } catch (ScriptException e) {
            e.printStackTrace();
        }
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
     * Check if the database contains a table.
     * @param arg0 the name of the table
     * @return true if the table is in the database, false otherise
     */
    @Override
    public boolean containsKey(Object arg0) {
        if (mBlacklist.contains(arg0.toString().toLowerCase())) {
            return false; //don't check for blacklisted tables
        }
        try {
            if (this.isClosed()) return false; //no connection
            //get tables from the metadata with the given name
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            try (ResultSet rs = dbmeta.getTables(null, null, arg0.toString().toLowerCase(), null)) {
                return rs.next(); //if a table with the name exists, this will be true. false otherwise
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false; //there was a SQLException, return false
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
     * Generate a Set containing each table in the database.
     * Does not include blacklisted tables.
     * @return a Set of Map.Entry objects representing tables in the database
     */
    @Override
    public Set<Map.Entry<String, DTable>> entrySet() {
        Set<Map.Entry<String, DTable>> entrySet = new LinkedHashSet();
        try {
            if (this.isClosed()) return entrySet; //connection closed, return empty set
            //get list of tables from the metadata.
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            try (ResultSet rs = dbmeta.getTables(null, null, "%", null)) {
                while (rs.next()) {
                    //get the name
                    String name = rs.getString(3);
                    if (!mBlacklist.contains(name)) {
                        //add a new entry representing the table
                        entrySet.add(new DBase.Entry(name, new DTable(name, this)));
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return entrySet;
    }

    /**
     * Get a Map representing a table from the database.
     * If the table does not exist, create it.
     * @param arg0 the name of the table
     * @return the Map object representing the table
     */
    @Override
    public DTable get(Object arg0) {
        if (mBlacklist.contains(arg0.toString().toLowerCase())) {
            //don't check tables with blacklisted names
            return null;
        }
        if (this.isClosed()) return null; //no connection
        //create the table if it doesn't exist
        String sql = "CREATE TABLE IF NOT EXISTS " + arg0.toString().toLowerCase() + " (id SERIAL PRIMARY KEY, key VARCHAR(255) UNIQUE)";
        try (PreparedStatement statement = mConnection.prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
            statement.close();
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
        //return the table
        return new DTable(arg0.toString(), this);
    }

    /**
     * Check if the database is empty.
     * @return true if there are no tables in the database, false otherwise
     */
    @Override
    public boolean isEmpty() {
        try {
            if (this.isClosed()) return true; //no connection
            //get all table names from the metadata
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            try (ResultSet rs = dbmeta.getTables(null, null, "%", null)) {
                while (rs.next()) {
                    //if the table is not blacklisted, then we have found something
                    if (!mBlacklist.contains(rs.getString(3))) {
                        return false;
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return true; //nothing was found
    }

    /**
     * Generate a Set of table names in the database.
     * @return a Set of Strings representing table names in the database
     */
    @Override
    public Set<String> keySet() {
        Set<String> keySet = new LinkedHashSet<String>();
        try {
            if (this.isClosed()) return keySet; //no connection
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            //get all table names from the metadata
            try (ResultSet rs = dbmeta.getTables(null, null, "%", null)) {
                while (rs.next()) {
                    //get the name of the table
                    String name = rs.getString(3);
                    if (!mBlacklist.contains(name)) {
                        //add the name
                        keySet.add(name);
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return keySet;
    }

    /**
     * Unsupported
     */
    @Override
    public DTable put(String arg0, DTable arg1) {
        // unsupported
        throw new UnsupportedOperationException();
    }

    /**
     * Unsupported
     */
    @Override
    public void putAll(Map<? extends String, ? extends DTable> arg0) {
        // unsupported
        throw new UnsupportedOperationException();
    }

    /**
     * Remove a table from the database.
     * @param arg0 the name of the table to remove
     * @return null in all cases
     */
    @Override
    public DTable remove(Object arg0) {
        if (mBlacklist.contains(arg0.toString().toLowerCase())) {
            return null;
        }
        if (this.isClosed()) return null; //no connection
        //try to drop the table
        String sql = "DROP TABLE IF EXISTS " + arg0.toString().toLowerCase();
        try (PreparedStatement statement = mConnection.prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
            statement.close();
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null; //return null
    }

    /**
     * Get the number of tables in the database.
     * @return the table count
     */
    @Override
    public int size() {
        return this.keySet().size();
    }

    /**
     * Get a collection of tables from the database.
     * @return a collection of the database's tables
     */
    @Override
    public Collection<DTable> values() {
        Collection<DTable> values = new AbstractCollection<DTable>() {
            @Override
            public Iterator<DTable> iterator() {
                return new Iterator<DTable>() {
                    private Iterator<Map.Entry<String, DTable>> mItr = DBase.this.entrySet().iterator();

                    @Override
                    public boolean hasNext() {
                        return mItr.hasNext();
                    }

                    @Override
                    public DTable next() {
                        return mItr.next().getValue();
                    }
                };
            }

            @Override
            public int size() {
                return DBase.this.size();
            }
        };

        //populate the collection
        Iterator<DTable> itr = values.iterator();
        while (itr.hasNext()) {
            values.add(itr.next());
        }

        return values;
    }

    /**
     * Class representing an entry in the map.
     * In this case, a table in the database.
     */
    public class Entry implements Map.Entry<String, DTable> {

        private String mKey;
        private DTable mValue;

        public Entry(String pKey, DTable pValue) {
            mKey = pKey;
            mValue = pValue;
        }

        @Override
        public String getKey() {
            return mKey;
        }

        @Override
        public DTable getValue() {
            return mValue;
        }

        @Override
        public DTable setValue(DTable arg0) {
            return DBase.this.put(mKey, arg0);
        }
    }
}
