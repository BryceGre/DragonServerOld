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

package com.dragonmmomaker.server.npc;

import java.io.Serializable;

import com.dragonmmomaker.server.data.Tile;

/**
 * Class representing a single NPC (non-player character)
 * @author Bryce
 */
public class Npc implements Serializable {
    private int mID; //NPC ID (template to draw stats/scripts from)
    private final int mIID; //Instance ID (id of this specific npc spawn)
    private int mX; //NPC's current X location
    private int mY; //NPC's current Y location
    private short mFloor; //NPC's current floor
    
    private int mSprite; //sprite ID
    private String mName; //name
    private int mHealth; //health
    private long mLastMove; //time of last movement
    private Tile mSpawn; //tile to spawn on
    private int mRespawn; //should respawn
    
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
    
    public int getRespawn() {
        return mRespawn;
    }
    
    public void setRespawn(int pRespawn) {
        mRespawn = pRespawn;
    }
    
    public void tickRespawn() {
        mRespawn -= 1;
    }
    
    public String toString() {
        return this.mIID + "," + this.mX + "," + this.mY + "," + this.mFloor + "," + this.mSprite + "," + this.mName + "," + this.mHealth;
    }
}
