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

package com.dragonmmomaker.server.player;

import com.dragonmmomaker.server.ServData;

import com.dragonmmomaker.server.handler.ClientHandler;
import com.dragonmmomaker.server.quadtree.Leaf;
import com.dragonmmomaker.server.quadtree.LinkedBag;
import com.dragonmmomaker.server.quadtree.QuadTree.Loc;
import java.util.Set;

/**
 *
 * @author Bryce Gregerson
 */
public class Player {
    private int mID, mX, mY;
    private short mFloor;
    private String mName;
    private int mSprite;
    private ClientHandler mClient;
    private ServData mData;
    private Leaf<Player> mLeaf;
    
    private int mInLeaf;
    private int mInArea;
    private int mInRange;
    
    public Player(int pID, short pFloor, String pName, int pSprite, ClientHandler pClient) {
        mID = pID;
        mFloor = pFloor;
        mData = ServData._CurData;
        mClient = pClient;
        mName = pName;
        mSprite = pSprite;
        
        mInLeaf = 0;
        mInArea = 0;
        mInRange = 0;
    }
    
    public int getID() {
        return mID;
    }
    
    public ClientHandler getClient() {
        return mClient;
    }
    
    public int getX() {
        return mX;
    }
    
    public int getY() {
        return mY;
    }
    
    public short getFloor() {
        return mFloor;
    }
    
    public void setFloor(short pFloor) {
        mFloor = pFloor;
    }
    
    public void floor(short pFloor) {
        this.setFloor(pFloor);
    }
    
    public void move(int pX, int pY) {
        if (Math.abs(pX-mX) > 1 || Math.abs(pY-mY) > 1) throw new IllegalArgumentException();
        if (mData.Tree.isOutOfBounds(pX, pY)) return;
        if (!mData.Tree.isSameLeaf(pX, pY, mX, mY)) {
            //move player to destination leaf
            if (!mData.Tree.removePoint(mX, mY, mLeaf, this))
                mData.Log.log("Could not remove point!");
            mLeaf = mData.Tree.addPoint(pX, pY, this);
        }
        
        mX = pX;
        mY = pY;
    }
    
    public void warp(int pX, int pY) {
        if (mLeaf != null)
            if (!mData.Tree.removePoint(mX, mY, mLeaf, this))
                mData.Log.log("Could not remove point!");
        
        mX = pX;
        mY = pY;
        
        mLeaf = mData.Tree.addPoint(pX, pY, this);
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
    
    public Set<Player> getPlayers() {
        int dist = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
        LinkedBag<Player> bag = new LinkedBag();
        if (mLeaf == null) return bag;
        
        mInLeaf = 0;
        mInArea = 0;
        mInRange = 0;
        
        for (Player p : mLeaf.mData) {
            mInLeaf++;
            mInArea++;
            if (!p.equals(this)) {
                if (Math.abs(this.getX() - p.getX()) <= dist && Math.abs(this.getY() - p.getY()) <= dist && this.mFloor == p.mFloor) {
                    bag.add(p);
                    mInRange++;
                }
            } else mInRange++;
        }
        
        //System.out.println("mCurr Size: " + mLeaf.mData.size());
        Leaf last = null;
        
        switch (mData.Tree.getDirection(mX, mY)) {
            case Loc.SE:
                //System.out.println("SE");
                if (mLeaf.mS != null) {
                    addAllWithCheck(bag, mLeaf.mS.mData, dist);
                    if (last == null) last = mLeaf.mS.mE;
                }
                if (mLeaf.mE != null) {
                    addAllWithCheck(bag, mLeaf.mE.mData, dist);
                    if (last == null) last = mLeaf.mE.mS;
                }
                if (last == null && !mData.Tree.isOutOfBounds(mX + mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX + mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight(), true);
                break;
            case Loc.NE:
                //System.out.println("NE");
                if (mLeaf.mN != null) {
                    addAllWithCheck(bag, mLeaf.mN.mData, dist);
                    if (last == null) last = mLeaf.mN.mE;
                }
                if (mLeaf.mE != null) {
                    addAllWithCheck(bag, mLeaf.mE.mData, dist);
                    if (last == null) last = mLeaf.mE.mN;
                }
                if (last == null && !mData.Tree.isOutOfBounds(mX + mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX + mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight(), true);
                break;
            case Loc.SW:
                //System.out.println("SW");
                if (mLeaf.mS != null) {
                    addAllWithCheck(bag, mLeaf.mS.mData, dist);
                    if (last == null) last = mLeaf.mS.mW;
                }
                if (mLeaf.mW != null) {
                    addAllWithCheck(bag, mLeaf.mW.mData, dist);
                    if (last == null) last = mLeaf.mW.mS;
                }
                if (last == null && !mData.Tree.isOutOfBounds(mX - mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX - mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight(), true);
                break;
            case Loc.NW:
                //System.out.println("NW");
                if (mLeaf.mN != null) {
                    addAllWithCheck(bag, mLeaf.mN.mData, dist);
                    if (last == null) last = mLeaf.mN.mW;
                }
                if (mLeaf.mW != null) {
                    addAllWithCheck(bag, mLeaf.mW.mData, dist);
                    if (last == null) last = mLeaf.mW.mN;
                }
                if (last == null && !mData.Tree.isOutOfBounds(mX - mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX - mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight(), true);
                break;
        }
        if (last != null) addAllWithCheck(bag, last.mData, dist);
        return bag;
    }
    
    private void addAllWithCheck(Set<Player> bag, Set<Player> players, int dist) {
        for (Player p : players) {
            mInArea++;
            if (Math.abs(this.getX() - p.getX()) <= dist && Math.abs(this.getY() - p.getY()) <= dist && this.mFloor == p.mFloor) {
                bag.add(p);
                mInRange++;
            }
        }
    }
    
    public void remove() {
        if (!mData.Tree.removePoint(mX, mY, mLeaf, this))
            mData.Log.log("Could not remove point!");
    }
    
    @Override
    public boolean equals(Object obj) {
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final Player other = (Player) obj;
        if (this.mID != other.mID) {
            return false;
        }
        return true;
    }
    
    @Override
    public int hashCode() {
        return this.mID;
    }
    
    public String getStats() {
        return "In Leaf: " + mInLeaf + ", In Area: " + mInArea + ", In Range: " + mInRange;
    }
}
