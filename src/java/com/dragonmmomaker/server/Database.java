package com.dragonmmomaker.server;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedList;
import java.util.Queue;

import javafx.util.Callback;

public class Database {

    private Connection mConnection;
    private UpdateThread mUThread;

    public Database connect(Connection pConn) {
        mConnection = pConn;

        if (mConnection != null) {
            mUThread = new UpdateThread(new Callback<Void,Void>() {
                @Override
                public Void call(Void param) {
                    try {
                        mConnection.close();
                        mConnection = null;
                    } catch (Exception e) {
                    }
                    return null;
                }
            });
            mUThread.start();
        }

        return this;
    }

    public void Disconnect() {
        if (mConnection != null) {
            mUThread.die();
        }
    }

    public void Update(String pSQL) {
        mUThread.doUpdate(pSQL);
    }
    
    public ResultSet Insert(String pSQL) throws SQLException {
        if (mConnection == null) throw new SQLException("Database is closed!");
        PreparedStatement statement = mConnection.prepareStatement(pSQL, Statement.RETURN_GENERATED_KEYS);
        statement.setQueryTimeout(30);
        statement.executeUpdate();
        
        //statement.closeOnCompletion();
        return statement.getGeneratedKeys();
    }
    
    public ResultSet Query(String pSQL) throws SQLException {
        if (mConnection == null || mConnection.isClosed()) throw new SQLException("Database is closed!");
        Statement statement = mConnection.createStatement();
        statement.setQueryTimeout(30);
        
        //statement.closeOnCompletion();
        return statement.executeQuery(pSQL);
    }

    public DatabaseMetaData getMetaData() throws SQLException {
        if (mConnection == null || mConnection.isClosed()) throw new SQLException("Database is closed!");
        return mConnection.getMetaData();
    }

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

    private class UpdateThread extends Thread {

        private boolean mDie = false;
        private Queue<String> mUpdates = new LinkedList<String>();
        private Callback<Void,Void> pDieCallback;

        public UpdateThread(Callback<Void,Void> pDead) {
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
