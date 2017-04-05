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
 * A class representing a single player character
 * @author Bryce Gregerson
 */
public class Player {
    private int mID, mX, mY; //ID and character location
    private short mFloor; //character location
    private String mName; //character name
    private int mSprite; //characcter sprite
    private ClientHandler mClient; //client connection
    private ServData mData; //current server data
    private Leaf<Player> mLeaf; //leaf containing the player in the QuadTree
    
    //for reporting statistics
    private int mInLeaf;
    private int mInArea;
    private int mInRange;
    
    /**
     * Constructor
     * @param pID character ID (not account ID)
     * @param pFloor character floor
     * @param pName character
     * @param pSprite character sprite
     * @param pClient client connection
     */
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
    
    /**
     * Move the player to a given location.
     * The new location cannot be more than 1 tile away
     * @param pX the new X location
     * @param pY the new Y location
     */
    public void move(int pX, int pY) {
        //make sure the move is valid
        if (Math.abs(pX-mX) > 1 || Math.abs(pY-mY) > 1) throw new IllegalArgumentException();
        if (mData.Tree.isOutOfBounds(pX, pY)) return;
        //if the player moved beyond the bounds of the QuadTree's Leaf
        if (!mData.Tree.isSameLeaf(pX, pY, mX, mY)) {
            //move player to destination leaf
            if (!mData.Tree.removePoint(mLeaf, this))
                mData.Log.log("Could not remove point!");
            mLeaf = mData.Tree.addPoint(pX, pY, this);
        }
        
        //update player location
        mX = pX;
        mY = pY;
    }
    
    /**
     * Warp the player to a new location.
     * The new location can be anywhere
     * @param pX the new X location
     * @param pY the new Y location
     */
    public void warp(int pX, int pY) {
        //remove the player from their current leaf
        if (mLeaf != null)
            if (!mData.Tree.removePoint(mLeaf, this))
                mData.Log.log("Could not remove point!");
        
        //update player location
        mX = pX;
        mY = pY;
        
        //add the player to the destination leaf
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
    
    /**
     * Get a set of players who are in-range to this player.
     * the "range" is equal to the "draw_distance" setting
     * @return a Set of players within range
     */
    public Set<Player> getPlayers() {
        //get draw distance
        int dist = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
        //using a bag (multiset) speeds things up because we don't have to check for duplicates
        LinkedBag<Player> bag = new LinkedBag();
        //if the player dosn't belong to a leaf, return an empty set
        if (mLeaf == null) return bag;
        
        //reset statistics
        mInLeaf = 0;
        mInArea = 0;
        mInRange = 0;
        
        //for each player in the current player's leaf
        for (Player p : mLeaf.mData) {
            //update statistis
            mInLeaf++;
            mInArea++;
            //make sure this player isn't the current player
            if (!p.equals(this)) {
                //make sure this player is in range
                if (Math.abs(this.getX() - p.getX()) <= dist && Math.abs(this.getY() - p.getY()) <= dist && this.mFloor == p.mFloor) {
                    //add this player to the bag
                    bag.add(p);
                    mInRange++;
                }
            } else mInRange++;
        }
        
        //System.out.println("mCurr Size: " + mLeaf.mData.size());
        //always remember a valid leaf to use for the last check (diagonal)
        Leaf last = null;
        
        //based on the location of the player, we only need to check 3 other leafs in the QuadTree
        switch (mData.Tree.getDirection(mX, mY)) {
            case Loc.SE:
                //System.out.println("SE");
                //check southern leaf
                if (mLeaf.mS != null) {
                    addAllWithCheck(bag, mLeaf.mS.mData, dist);
                    if (last == null) last = mLeaf.mS.mE;
                }
                //check eastern leaf
                if (mLeaf.mE != null) {
                    addAllWithCheck(bag, mLeaf.mE.mData, dist);
                    if (last == null) last = mLeaf.mE.mS;
                }
                //if no valid leaf for last check, find it manually
                if (last == null && !mData.Tree.isOutOfBounds(mX + mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX + mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight(), true);
                break;
            case Loc.NE:
                //System.out.println("NE");
                //check northern leaf
                if (mLeaf.mN != null) {
                    addAllWithCheck(bag, mLeaf.mN.mData, dist);
                    if (last == null) last = mLeaf.mN.mE;
                }
                //check eastern leaf
                if (mLeaf.mE != null) {
                    addAllWithCheck(bag, mLeaf.mE.mData, dist);
                    if (last == null) last = mLeaf.mE.mN;
                }
                //if no valid leaf for last check, find it manually
                if (last == null && !mData.Tree.isOutOfBounds(mX + mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX + mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight(), true);
                break;
            case Loc.SW:
                //System.out.println("SW");
                //check southern leaf
                if (mLeaf.mS != null) {
                    addAllWithCheck(bag, mLeaf.mS.mData, dist);
                    if (last == null) last = mLeaf.mS.mW;
                }
                //check western leaf
                if (mLeaf.mW != null) {
                    addAllWithCheck(bag, mLeaf.mW.mData, dist);
                    if (last == null) last = mLeaf.mW.mS;
                }
                //if no valid leaf for last check, find it manually
                if (last == null && !mData.Tree.isOutOfBounds(mX - mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX - mData.Tree.getLeafWidth(), mY + mData.Tree.getLeafHeight(), true);
                break;
            case Loc.NW:
                //System.out.println("NW");
                //check northern leaf
                if (mLeaf.mN != null) {
                    addAllWithCheck(bag, mLeaf.mN.mData, dist);
                    if (last == null) last = mLeaf.mN.mW;
                }
                //check western leaf
                if (mLeaf.mW != null) {
                    addAllWithCheck(bag, mLeaf.mW.mData, dist);
                    if (last == null) last = mLeaf.mW.mN;
                }
                //if no valid leaf for last check, find it manually
                if (last == null && !mData.Tree.isOutOfBounds(mX - mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight()))
                    last = mData.Tree.getLeaf(mX - mData.Tree.getLeafWidth(), mY - mData.Tree.getLeafHeight(), true);
                break;
        }
        //check last leaf (diagonal)
        if (last != null) addAllWithCheck(bag, last.mData, dist);
        //return list of players
        return bag;
    }
    
    /**
     * Adds all players in one set to another set, as long as they are within a given distance
     * @param bag the set to move the players to
     * @param players the players to move
     * @param dist the maximum distance a player can be to move
     */
    private void addAllWithCheck(Set<Player> bag, Set<Player> players, int dist) {
        for (Player p : players) {
            mInArea++; //update statistics
            //check to make sure the player is within range
            if (Math.abs(this.getX() - p.getX()) <= dist && Math.abs(this.getY() - p.getY()) <= dist && this.mFloor == p.mFloor) {
                bag.add(p); //add the player
                mInRange++; //update statistics
            }
        }
    }
    
    /**
     * Remove this player from the map
     */
    public void remove() {
        if (!mData.Tree.removePoint(mLeaf, this))
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
