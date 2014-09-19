/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.dragonmmomaker.server.npc;

import java.io.Serializable;

import com.dragonmmomaker.server.data.Tile;

/**
 *
 * @author Bryce
 */
public class Npc implements Serializable {
    private int mID; //NPC ID (template to draw stats/scripts from)
    private int mIID; //Instance ID (id of this specific npc spawn)
    private int mX;
    private int mY;
    private short mFloor;
    
    private int mSprite;
    private String mName;
    private int mHealth;
    private long mLastMove;
    private Tile mSpawn;
    
    public Npc(int pIID) {
        mIID = pIID;
    }
    
    public int getIid() {
        return mIID;
    }

    public int getId() {
        return mID;
    }

    public void setId(int pID) {
        mID = pID;
    }

    public int getX() {
        return mX;
    }

    public void setX(int pX) {
        mX = pX;
    }

    public int getY() {
        return mY;
    }

    public void setY(int pY) {
        mY = pY;
    }

    public short getFloor() {
        return mFloor;
    }

    public void setFloor(short pFloor) {
        mFloor = pFloor;
    }
    
    public int getSprite() {
        return mSprite;
    }
    
    public void setSprite(int pSprite) {
        mSprite = pSprite;
    }
    
    public String getName() {
        return mName;
    }
    
    public void setName(String pName) {
        mName = pName;
    }
    
    public long getHealth() {
        return mHealth;
    }
    
    public void setHealth(int pHealth) {
        mHealth = pHealth;
    }
    
    public long getLastMove() {
        return mLastMove;
    }
    
    public void setLastMove(long pLastMove) {
        mLastMove = pLastMove;
    }
    
    public Tile getSpawn() {
       return mSpawn;
    }
    
    public void setSpawn(Tile pSpawn) {
        mSpawn = pSpawn;
    }
    
    public String toString() {
        return this.mIID + "," + this.mX + "," + this.mY + "," + this.mFloor + "," + this.mSprite + "," + this.mName;
    }
}
