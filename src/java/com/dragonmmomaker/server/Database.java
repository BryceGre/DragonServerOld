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

package com.dragonmmomaker.server;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;

import com.dragonmmomaker.datamap.DBase;
import com.dragonmmomaker.war.ServerListener;
import com.dragonmmomaker.server.util.Callback;

/**
 * Core Database class
 * Used to manage the Database connection while running the server.
 * @author Bryce
 */
public class Database {

    private Connection mConnection;
    private UpdateThread mUThread;
    private Map<String,String> config;
    
    /**
     * Craete the Database Object
     * @param pArgs configuration arguments
     */
    public Database(Map<String,String> pArgs) {
        config = pArgs;
    }
    
    /**
     * Create and connect to the database
     * @return the DBase object representing the database connection
     */
    public DBase setup() {
        DBase data = null;
        //get connection data from the configuration
        String host = config.get("host");
        String port = config.get("port");
        String name = config.get("name");
        String user = config.get("user");
        String pass = config.get("pass");
        //get the data directory for embedded storage
        String dataDir = ServerListener.dataDir;
        //try to create the database object
        try {
            if (ServerListener.isEmbed) {
                //embedded database, use hsqldb driver from the data directory
                try {
                    data = new DBase("org.hsqldb.jdbc.JDBCDriver", "jdbc:hsqldb:file:" + dataDir + "/data;sql.syntax_pgs=true;shutdown=true;get_column_name=false;", "accounts", "tiles");
                } catch (final SQLException e) { e.printStackTrace();}
                //add support for bytea data type, as this is not native in hsqldb
                try {
                    data.getConnection().prepareStatement("CREATE TYPE BYTEA AS VARBINARY(1000000)").execute(); //support for bytea
                } catch (final SQLException e) {} //type already exists
            } else {
                //external database, use PostgreSQL
                try {
                    data = new DBase("org.postgresql.Driver", "jdbc:postgresql://"+host+":"+port+"/"+name+"?user="+user+"&password="+pass, "accounts", "tiles");
                } catch (final SQLException e) {
                    //possible database doesn't exist, try to create
                    Class.forName("org.postgresql.Driver");
                    try (Connection c = DriverManager.getConnection("jdbc:postgresql://"+host+":"+port+"/postgres?user="+user+"&password="+pass)) {
                        c.prepareStatement("CREATE DATABASE " + name).execute(); //support for bytea
                        c.close();
                        data = new DBase("org.postgresql.Driver", "jdbc:postgresql://"+host+":"+port+"/"+name+"?user="+user+"&password="+pass, "accounts", "tiles");
                    } catch (SQLException ex) {
                        e.printStackTrace(); //print original exception
                    }
                }
            }
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }
        
        //if we were successful in creating the database object
        if (data != null) {
            //get connection
            mConnection = data.getConnection();
            //set up a thread to close the database when the WebApp ends
            mUThread = new UpdateThread(new Callback<Void>() {
                @Override
                public void call(Void... params) {
                    try {
                        mConnection.close();
                        mConnection = null;
                    } catch (Exception e) { }
                }
            });
            //start the thread
            mUThread.start();
        }
        return data;
    }

    /**
     * Disconnect from the database
     */
    public void Disconnect() {
        if (mConnection != null) {
            mUThread.die();
        }
    }

    /**
     * Preform an SQL update on the UpdateThread
     * @param pSQL the SQL to query
     */
    public void Update(String pSQL) {
        mUThread.doUpdate(pSQL);
    }
    
    /**
     * Preform an SQL insert
     * @param pSQL the SQL to query
     * @return the ResultSet result
     * @throws SQLException if the SQL is invalid
     */
    public ResultSet Insert(String pSQL) throws SQLException {
        if (mConnection == null) throw new SQLException("Database is closed!");
        PreparedStatement statement = mConnection.prepareStatement(pSQL, Statement.RETURN_GENERATED_KEYS);
        statement.setQueryTimeout(30);
        statement.executeUpdate();
        
        //statement.closeOnCompletion();
        return statement.getGeneratedKeys();
    }
    
    /**
     * Preform an SQL Query
     * @param pSQL the SQL to query
     * @return the ResultSet result
     * @throws SQLException if the SQL is invalid
     */
    public ResultSet Query(String pSQL) throws SQLException {
        if (mConnection == null || mConnection.isClosed()) throw new SQLException("Database is closed!");
        Statement statement = mConnection.createStatement();
        statement.setQueryTimeout(30);
        
        //statement.closeOnCompletion();
        return statement.executeQuery(pSQL);
    }

    /**
     * Get the database metadata
     * @return the metadata
     * @throws SQLException if the metedata could not be retrieved
     */
    public DatabaseMetaData getMetaData() throws SQLException {
        if (mConnection == null || mConnection.isClosed()) throw new SQLException("Database is closed!");
        return mConnection.getMetaData();
    }

    /**
     * Check if a table exists in the database
     * @param pTable the name of the tabl
     * @return true if the database contains the table, false otherwise
     * @throws SQLException if the metadata could not be retrieved
     */
    public boolean tableExists(String pTable) throws SQLException {
        if (mConnection == null) throw new SQLException("Database is closed!");
        DatabaseMetaData dbmeta = mConnection.getMetaData();
        
        try (ResultSet rs = dbmeta.getTables(null, "APP", pTable.toUpperCase(), null)) {
            return rs.next();
        }
    }

    /**
     * Checks to make sure a table already exists. If it doesn't, it creates one
     * with the specified structure.
     *
     * @param pTable the name of the table
     * @param pStructure a string representing the structure of the table
     * @throws SQLException any exception besides an existing table
     */
    public void createTable(String pTable, String pStructure) throws SQLException {
        if (mConnection == null) throw new SQLException("Database is closed!");
        try (Statement statement = mConnection.createStatement()) {
            statement.setQueryTimeout(30);

            statement.executeUpdate("CREATE TABLE IF NOT EXISTS " + pTable + " (" + pStructure + ")");
        }
    }

    /**
     * Checks to make sure a table already exists. If it doesn't, it creates one
     * with only an ID column.
     *
     * @param pTable the name of the table
     * @throws SQLException any exception besides an existing table
     */
    public void createTable(String pTable) throws SQLException {
        if (mConnection == null) throw new SQLException("Database is closed!");
        try (Statement statement = mConnection.createStatement()) {
            statement.setQueryTimeout(30);

            statement.executeUpdate("CREATE TABLE IF NOT EXISTS " + pTable + " (id INTEGER AUTO_INCREMENT PRIMARY KEY)");
        }
    }

    /**
     * A seperate thrad preforms updates when it is convienient.
     */
    private class UpdateThread extends Thread {

        private boolean mDie = false;
        private Queue<String> mUpdates = new LinkedList<String>();
        private Callback<Void> pDieCallback;

        public UpdateThread(Callback<Void> pDead) {
            pDieCallback = pDead;
        }

        @Override
        public void run() {
            while (!(mDie && mUpdates.isEmpty())) {
                if (!mUpdates.isEmpty()) {
                    //do the next update
                    String sql = mUpdates.poll();
                    
                    if (mConnection == null) continue;

                    try (Statement statement = mConnection.createStatement()) {
                        statement.setQueryTimeout(30);

                        statement.executeUpdate(sql);
                    } catch (SQLException e) {
                        e.printStackTrace();
                    }
                } else {
                    try {
                        sleep(10);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }

            pDieCallback.call(null);
        }

        public void doUpdate(String pSQL) {
            mUpdates.offer(pSQL);
        }

        public void die() {
            mDie = true;
        }
    }
}
