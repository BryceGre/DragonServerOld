package com.dragonmmomaker.server.data;

import java.sql.ResultSet;
import java.sql.SQLException;

import com.dragonmmomaker.server.ServData;

public class Account {

    private final ServData mServData;

    private final int mID;
    private String mUsername;
    private String mPassword;
    private String mEmail;
    private int mAccess;
    private int mChar1ID;
    private int mChar2ID;
    private int mChar3ID;

    public Account(final ServData pServData, int pID) {
        mServData = pServData;
        
        try (ResultSet rs = mServData.DB.Query("SELECT * FROM accounts WHERE id=" + pID)) {
            if (rs.next()) {
                mUsername = rs.getString("username");
                mPassword = rs.getString("password");
                mEmail = rs.getString("email");
                mAccess = rs.getInt("access");
                mChar1ID = rs.getInt("char1");
                mChar2ID = rs.getInt("char2");
                mChar3ID = rs.getInt("char3");
            } else {
                pID = -1;
            }
        } catch (SQLException e) {
            pID = -1;
        }
        mID = pID;
    }
    
    public Account(ServData pServData, String pUsername) {
        mServData = pServData;
        
        mUsername = pUsername;
        int pID = -1;
        
        try (ResultSet rs = mServData.DB.Query("SELECT * FROM accounts WHERE username='" + mUsername + "'")) {
            if (rs.next()) {
                pID = rs.getInt("id");
                mPassword = rs.getString("password");
                mEmail = rs.getString("email");
                mAccess = rs.getInt("access");
                mChar1ID = rs.getInt("char1");
                mChar2ID = rs.getInt("char2");
                mChar3ID = rs.getInt("char3");
            }
        } catch (SQLException e) {
            pID = -1;
        }
        mID = pID;
    }

    public static int insert(ServData pServData, String pUsername, String pPassword, String pEmail) {
        String sql = "INSERT INTO accounts (username,password,email,access,char1,char2,char3)";
        sql += " VALUES ('" + pUsername + "','" + pPassword + "','" + pEmail + "',0,0,0,0)";

        try (ResultSet rs = pServData.DB.Insert(sql)) {
            if (rs.next()) {
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
