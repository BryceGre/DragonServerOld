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

package com.dragonmmomaker.server.data;

import java.sql.ResultSet;
import java.sql.SQLException;

import com.dragonmmomaker.server.ServData;

/**
 * A class representing a player account
 * @author Bryce
 */
public class Account {

    private final ServData mServData; //server data

    private final int mID; //account ID
    private String mUsername; //username
    private String mPassword; //password (SHA256 hashed)
    private String mEmail; //email address (unused currently)
    private int mAccess; //access level (0 is regular user, higher is admins)
    private int mChar1ID; //first character ID
    private int mChar2ID; //second character ID (unused currently)
    private int mChar3ID; //third character ID (unused currently)

    /**
     * Constrcutor
     * @param pServData server data
     * @param pID account ID
     */
    public Account(final ServData pServData, int pID) {
        mServData = pServData;
        
        //query the account information from the database via the account ID
        try (ResultSet rs = mServData.DB.Query("SELECT * FROM accounts WHERE id=" + pID)) {
            if (rs.next()) {
                //store all the data
                mUsername = rs.getString("username");
                mPassword = rs.getString("password");
                mEmail = rs.getString("email");
                mAccess = rs.getInt("access");
                mChar1ID = rs.getInt("char1");
                mChar2ID = rs.getInt("char2");
                mChar3ID = rs.getInt("char3");
            } else {
                //no matching account
                pID = -1;
            }
        } catch (SQLException e) {
            //no matching account
            pID = -1;
        }
        //store ID
        mID = pID;
    }
    
    /**
     * Constructor
     * @param pServData server data
     * @param pUsername account username
     */
    public Account(ServData pServData, String pUsername) {
        mServData = pServData;
        
        //stor the username
        mUsername = pUsername;
        int pID = -1;
        
        //query the account information from the database via the account username
        try (ResultSet rs = mServData.DB.Query("SELECT * FROM accounts WHERE username='" + mUsername + "'")) {
            if (rs.next()) {
                //store all the data
                pID = rs.getInt("id");
                mPassword = rs.getString("password");
                mEmail = rs.getString("email");
                mAccess = rs.getInt("access");
                mChar1ID = rs.getInt("char1");
                mChar2ID = rs.getInt("char2");
                mChar3ID = rs.getInt("char3");
            }
        } catch (SQLException e) {
            //no matching account
            pID = -1;
        }
        //store ID
        mID = pID;
    }
    
    /**
     * Fast function for inserting an account into the database
     * @param pServData the server data for the current server
     * @param pUsername the new account's username
     * @param pPassword the new account's password
     * @param pEmail the new account's user
     * @return the new account ID, or -1 if the account could not be created
     */
    public static int insert(ServData pServData, String pUsername, String pPassword, String pEmail) {
        String sql = "INSERT INTO accounts (username,password,email,access,char1,char2,char3)";
        sql += " VALUES ('" + pUsername + "','" + pPassword + "','" + pEmail + "',0,0,0,0)";
        //insert the new account into the database
        try (ResultSet rs = pServData.DB.Insert(sql)) {
            if (rs.next()) {
                //get the ID of the new account
                int id = rs.getInt("id");
                while (rs.next()); //close the connection
                
                return id;
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return -1;
    }

    public int getID() {
        return mID;
    }

    public String getUsername() {
        return mUsername;
    }

    public boolean checkPassword(String pPassword) {
        return mPassword.equals(pPassword);
    }

    public String getEmail() {
        return mEmail;
    }

    public int getAccess() {
        return mAccess;
    }

    public void setAccess(int pAccess) {
        mAccess = pAccess;
        mServData.DB.Update("UPDATE accounts SET access=" + getAccess() + " WHERE id=" + getID());
    }

    public int getChar1ID() {
        return mChar1ID;
    }

    public void setChar1ID(int pID) {
        mChar1ID = pID;
        mServData.DB.Update("UPDATE accounts SET char1=" + getChar1ID() + " WHERE id=" + getID());
    }

    public int getChar2ID() {
        return mChar2ID;
    }

    public void setChar2ID(int pID) {
        mChar2ID = pID;
        mServData.DB.Update("UPDATE accounts SET char1=" + getChar2ID() + " WHERE id=" + getID());
    }

    public int getChar3ID() {
        return mChar3ID;
    }

    public void setChar3ID(int pID) {
        mChar3ID = pID;
        mServData.DB.Update("UPDATE accounts SET char1=" + getChar3ID() + " WHERE id=" + getID());
    }

    /**
     * Get a String representing the structure of the "accounts" table in the database.
     * This is to create the table if it does not exist.
     */
    public static String getStructure() {
        String structure = "";
        structure += "id SERIAL PRIMARY KEY, ";
        structure += "username VARCHAR(255) NOT NULL DEFAULT '', ";
        structure += "password VARCHAR(255) NOT NULL DEFAULT '', ";
        structure += "email VARCHAR(255) NOT NULL DEFAULT '', ";
        structure += "access SMALLINT NOT NULL DEFAULT 0, ";
        structure += "char1 INTEGER NOT NULL DEFAULT 0, ";
        structure += "char2 INTEGER NOT NULL DEFAULT 0, ";
        structure += "char3 INTEGER NOT NULL DEFAULT 0";

        return structure;
    }
}
