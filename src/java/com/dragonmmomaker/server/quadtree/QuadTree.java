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

package com.dragonmmomaker.server.quadtree;

import com.dragonmmomaker.server.ServData;

/**
 * A dynamically expanding QuadTree.
 * 
 * Used for scene-graph management for a world of unkown size.
 * This QuadTree will automatically expand and contract itself based on where players move.
 * Leaves will always remain the same size (same width and height).
 * Nodes are added and removed where needed to keep the quadtree covering the entire game world.
 * 
 * @author Bryce
 */
public class QuadTree<E> {
    private Node mRoot; //Root node
    private int mZeroX; //Root node center X
    private int mZeroY; //Root node center Y
    private int mWidth; //Width of the entire quad tree (all leaves)
    private int mHeight; //Height of the entire quad tree (all leaves)
    private int mSize; //Size of each leaf (width and height)
    private int mLeaf; //Levels from the root node to the leaves
    private ServData mData; //current server data
    
    private int mNodes; //total numbr of nodes (statistics)
    private int mLeaves; //total number of leaves (statistics)
    
    /**
     * Constructor
     * @param pServData current server data
     */
    public QuadTree(ServData pServData) {
        mData = pServData;
    }
    
    /**
     * Initialize the QuadTree
     */
    public void init() {
        mRoot = new Node(null, 0, 1); //root node
        //leaf size should equal the draw distance * 2, meaning the viewport's width/height
        mSize = Integer.parseInt(mData.Config.get("Game").get("draw_distance")) * 2;
        
        //determine the total width and height of the game world
        int[] xMinMax = mData.Utils.getWorldWidth();
        int[] yMinMax = mData.Utils.getWorldHeight();
        mWidth = Math.max(xMinMax[1] - xMinMax[0], mSize * 4);
        mHeight = Math.max(yMinMax[1] - yMinMax[0], mSize * 4);
        
        mData.Log.log("Width: " + (xMinMax[1] - xMinMax[0]) + ", Height: " + (yMinMax[1] - yMinMax[0]));
        
        //determine the center of the game world
        mZeroX = ((xMinMax[1] - xMinMax[0]) / 2) + xMinMax[0];
        mZeroY = ((yMinMax[1] - yMinMax[0]) / 2) + yMinMax[0];
        
        //count the levels to the leaves
        mLeaf = 0;
        while ((mWidth / Pow(2, mLeaf+1)) >= mSize && (mHeight / Pow(2, mLeaf+1)) >= mSize) {
            mLeaf++;
        }
        
        //initialize some statistics
        mNodes = 1;
        mLeaves = 0;
    }

    /**
     * Add an object to the QuadTree
     * @param pX the x position of the object
     * @param pY the y position of the object
     * @param pObject the object to add
     * @return the leaf the object was added to
     */    
    public Leaf<E> addPoint(int pX, int pY, E pObject) {
        //move to the leaf at the object's position
        Leaf leaf = traverseRoot(pX, pY, false);
        //add the object to the leaf
        leaf.mData.add(pObject);
        
        //if this leaf was just created, we need to link it to adjacent leaves for easy lookup
        if (leaf.mN == null && !isOutOfBounds(pX, pY - getLeafHeight())) leaf.mN = traverseRoot(pX, pY - getLeafHeight(), true);
        if (leaf.mN != null) leaf.mN.mS = leaf;
        //System.out.println("North: " + getLeafHeight() + "," + (leaf.mN == null));
        if (leaf.mS == null && !isOutOfBounds(pX, pY + getLeafHeight())) leaf.mS = traverseRoot(pX, pY + getLeafHeight(), true);
        if (leaf.mS != null) leaf.mS.mN = leaf;
        //System.out.println("South: " + getLeafHeight() + "," + (leaf.mS == null));
        if (leaf.mE == null && !isOutOfBounds(pX + getLeafWidth(), pY)) leaf.mE = traverseRoot(pX + getLeafWidth(), pY, true);
        if (leaf.mE != null) leaf.mE.mW = leaf;
        //System.out.println("East: " + getLeafWidth() + "," + (leaf.mE == null));
        if (leaf.mW == null && !isOutOfBounds(pX - getLeafWidth(), pY)) leaf.mW = traverseRoot(pX - getLeafWidth(), pY, true);
        if (leaf.mW != null) leaf.mW.mE = leaf;
        //System.out.println("West: " + getLeafWidth() + "," + (leaf.mW == null));
        
        //return the leaf that new contains the object
        return leaf;
    }
    
    /**
     * Remove an object from the QuadTree
     * @param pX the x position of the object
     * @param pY the y position of the object
     * @param pObject the object to remove
     * @return true if successful, false otherwise
     */
    public boolean removePoint(int pX, int pY, Object pObject) {
        //remove the object from the leaf at the given point
        return this.removePoint(traverseRoot(pX, pY, true), pObject);
    }
    
    /**
     * Remove an object from the QuadTree
     * @param pLeaf the leaf containing the object
     * @param pObject the object to remove
     * @return true if successful, false otherwise
     */
    public boolean removePoint(Leaf<E> pLeaf, Object pObject) {
        if (pLeaf == null) return false; //no leaf to remove object from
        //try to remove the object from the leaf's data
        if (pLeaf.mData.remove(pObject)) {
            //if the leaf is now empty, remove it
            if (pLeaf.mData.size() == 0) {
                
                //remove the links to this leaf
                if (pLeaf.mN != null) pLeaf.mN.mS = null;
                if (pLeaf.mS != null) pLeaf.mS.mN = null;
                if (pLeaf.mE != null) pLeaf.mE.mW = null;
                if (pLeaf.mW != null) pLeaf.mW.mE = null;
                
                //remove this leaf
                pLeaf.mParent.mData[pLeaf.mLoc] = null;
                mLeaves--;
                
                //if the parent node is null, remove it as well
                Node node = pLeaf.mParent;
                while (node != null && node != mRoot) {
                    //if the node contains no children
                    if (node.mData[Loc.NE] == null && node.mData[Loc.NW] == null && node.mData[Loc.SE] == null && node.mData[Loc.SW] == null) {
                        //remove the node
                        node.mParent.mData[node.mLoc] = null;
                        mNodes--;
                    } else {
                        //stop checking parents
                        break;
                    }
                    //now check the node's parent
                    node = node.mParent;
                }
            }
            return true;
        }
        return false;
    }
    
    /**
     * Get the leaf at the given position
     * @param pX the x position of the leaf
     * @param pY the y position of the leaf
     * @param pSoft true will return null if the leaf doesn't exist. false will create the leaf if it doesn't exist and return it
     * @return the leaf at the given position
     */
    public Leaf<E> getLeaf(int pX, int pY, boolean pSoft) {
        return traverseRoot(pX, pY, pSoft);
    }
    
    /**
     * Get the width of a leaf
     * @return the width of a leaf
     */
    public int getLeafWidth() {
        return mWidth / Pow(2, mLeaf);
    }
    
    /**
     * Get the height of a leaf
     * @return the height of a leaf
     */
    public int getLeafHeight() {
        return mHeight / Pow(2, mLeaf);
    }
    
    /**
     * Get the direction a position is from the node
     * @param pX the x position to check
     * @param pY the y position to check
     * @return a value from Loc representing the direction the position is from the node
     */
    public int getDirection(int pX, int pY) {
        //center the point
        pX -= mZeroX;
        pY -= mZeroY;
        
        //get the position relative to the node
        int modX = pX % this.getLeafWidth();
        if (modX < 0) modX += this.getLeafWidth();
        int modY = pY % this.getLeafHeight();
        if (modY < 0) modY += this.getLeafHeight();
        
        //return the direction of the position
        if (modX > (this.getLeafWidth() / 2) && modY > (this.getLeafHeight() / 2)) {
            return Loc.SE;
        } else if (modX > (this.getLeafWidth() / 2)) {
            return Loc.NE;
        } else if (modY > (this.getLeafHeight() / 2)) {
            return Loc.SW;
        } else {
            return Loc.NW;
        }
    }
    
    /**
     * Check if two positions are in the same leaf, without traversing the tree.
     * @param pX1 the x position of the first point to check
     * @param pY1 the y position of the first point to check
     * @param pX2 the x position of the second point to check
     * @param pY2 the y position of the second point to check
     * @return true if the two points are in the same leaf, false otherwise
     */
    public boolean isSameLeaf(int pX1, int pY1, int pX2, int pY2) {
        //center the points
        pX1 -= mZeroX;
        pY1 -= mZeroY;
        pX2 -= mZeroX;
        pY2 -= mZeroY;
        
        //check if they exist in the same leaf
        boolean x = (Math.floorDiv(pX1, this.getLeafWidth()) == Math.floorDiv(pX2, this.getLeafWidth()));
        boolean y = (Math.floorDiv(pY1, this.getLeafHeight()) == Math.floorDiv(pY2, this.getLeafHeight()));
        
        //if they do, return true
        if (x && y) return true;
        //otherwise, return false
        return false;
    }
    
    /**
     * Check if a position is outside the bounds of the QuadTree
     * @param pX the x position to check
     * @param pY the y position to check
     * @return true if the position is out of bounds, false otherwise
     */
    public boolean isOutOfBounds(int pX, int pY) {
        //center the point
        pX -= mZeroX;
        pY -= mZeroY;
        
        //check the bounds
        if (pX >= (mWidth / 2) || pX <= -(mWidth / 2))
            return true;
        if (pY >= (mHeight / 2) || pY <= -(mHeight / 2))
            return true;
        return false;
    }
    
    /**
     * Get the size of a leaf
     * @return the size of a leaf
     */
    public int getSize() {
        return this.mSize;
    }
    
    /**
     * Get the number of nodes in the QuadTree
     * @return the number of nodes
     */
    public int getNodeCount() {
        return mNodes;
    }
    
    /**
     * Get the number of leaves in the QuadTree
     * @return the number of leaves
     */
    public int getLeafCount() {
        return mLeaves;
    }
    
    /**
     * Get a string representing some statistics
     * @return a string containing stats
     */
    public String getStats() {
        return "Nodes: " + mNodes + ", Leaves: " + mLeaves;
    }
    
    /**
     * Traverse the tree from the root to the leaf at a given position
     * @param pX the x position to check
     * @param pY the y position to check
     * @param pSoft true will return null if the leaf doesn't exist. false will create the leaf if it doesn't exist and return it
     * @return the leaf at the given position, or null if pSoft is true and the leaf doesn't exist
     */
    private Leaf<E> traverseRoot(int pX, int pY, boolean pSoft) {
        short loc; //direction of next node
        int newX, newY; //location of next node
        Node node; //next node
        
        //center the point
        pX -= mZeroX;
        pY -= mZeroY;
        
        //check the diection of the next node
        if (pX >= 0 && pY >= 0) {
            //next node is to the south-east
            loc = Loc.SE;
            //if the node doesn't exist
            if (mRoot.mData[loc] == null) {
                //return null if soft
                if (pSoft) return null;
                //else create the node
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            //move the location to the next node
            newX = pX - node.getWidth();
            newY = pY - node.getHeight();
            //System.out.println("New Point: SE");
        } else if (pX >= 0) {
            //next node is to the north-east
            loc = Loc.NE;
            //if the node doesn't exist
            if (mRoot.mData[loc] == null) {
                //return null if soft
                if (pSoft) return null;
                //else create the node
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            //move the location to the next node
            newX = pX - node.getWidth();
            newY = pY + node.getHeight();
            //System.out.println("New Point: NE");
        } else if (pY >= 0) {
            //next node is to the south-west
            loc = Loc.SW;
            //if the node doesn't exist
            if (mRoot.mData[loc] == null) {
                //return null if soft
                if (pSoft) return null;
                //else create the node
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            //move the location to the next node
            newX = pX + node.getWidth();
            newY = pY - node.getHeight();
            //System.out.println("New Point: SW");
        } else {
            //next node is to the north-west
            loc = Loc.NW;
            //if the node doesn't exist
            if (mRoot.mData[loc] == null) {
                //return null if soft
                if (pSoft) return null;
                //else create the node
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            //move the location to the next node
            newX = pX + node.getWidth();
            newY = pY + node.getHeight();
            //System.out.println("New Point: NW");
        }
        //continue traversing the next node
        return traverseTree(newX, newY, pSoft, node);
    }
    
    /**
     * Traverse the tree from a given node to the leaf at a given position
     * @param pX the x position to check
     * @param pY the y position to check
     * @param pSoft true will return null if the leaf doesn't exist. false will create the leaf if it doesn't exist and return it
     * @param pNode the node to start at
     * @return the leaf at the given position, or null if pSoft is true and the leaf doesn't exist
     */
    private Leaf<E> traverseTree(int pX, int pY, boolean pSoft, Node pNode) {
        short loc; //direction of next node
        Node node; //next node
        
        //check the diection of the next node
        if (pX >= 0 && pY >= 0) {
            //next node is to the south-east
            loc = Loc.SE;
            //if the node is a leaf
            if (isLeaf(pNode, loc)) {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    pNode.mData[loc] = new Leaf<E>(pNode, loc);
                    mLeaves++;
                }
                //return the node
                return (Leaf) pNode.mData[loc];
            } else {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                //center around the node
                int newX = pX - node.getWidth();
                int newY = pY - node.getHeight();
                //System.out.println("SE: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("SE: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                //continue traversing the tree
                return traverseTree(newX, newY, pSoft, node);
            }
        } else if (pX >= 0) {
            loc = Loc.NE;
            
            if (isLeaf(pNode, loc)) {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    pNode.mData[loc] = new Leaf<E>(pNode, loc);
                    mLeaves++;
                }
                return (Leaf) pNode.mData[loc];
            } else {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                //center around the node
                int newX = pX - node.getWidth();
                int newY = pY + node.getHeight();
                //System.out.println("NE: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("NE: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                //continue traversing the tree
                return traverseTree(newX, newY, pSoft, node);
            }
        } else if (pY >= 0) {
            loc = Loc.SW;
            
            if (isLeaf(pNode, loc)) {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    pNode.mData[loc] = new Leaf<E>(pNode, loc);
                    mLeaves++;
                }
                return (Leaf) pNode.mData[loc];
            } else {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                //center around the node
                int newX = pX + node.getWidth();
                int newY = pY - node.getHeight();
                //System.out.println("SW: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("SW: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                //continue traversing the tree
                return traverseTree(newX, newY, pSoft, node);
            }
        } else {
            loc = Loc.NW;
            
            if (isLeaf(pNode, loc)) {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    pNode.mData[loc] = new Leaf<E>(pNode, loc);
                    mLeaves++;
                }
                return (Leaf) pNode.mData[loc];
            } else {
                //if the node doesn't exist
                if (pNode.mData[loc] == null) {
                    //return null if soft
                    if (pSoft) return null;
                    //else create the node
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                //center around the node
                int newX = pX + node.getWidth();
                int newY = pY + node.getHeight();
                //System.out.println("NW: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("NW: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                //continue traversing the tree
                return traverseTree(newX, newY, pSoft, node);
            }
        }
    }
    
    /**
     * Check if a node or it's child is a leaf
     * @param pNode the node to check
     * @param pLoc the direction of the child
     * @return true if the child is a leaf, false otherwise
     */
    private boolean isLeaf(Node pNode, int pLoc) {
        //if the child doesn't exist
        if (pNode.mData[pLoc] == null)
            //check if this node is at leaf level
            if (pNode.mLevel == mLeaf)
                return true;
            else
                return false;
        //else check the class of the child
        return pNode.mData[pLoc].getClass().equals(Leaf.class);
    }
    
    /**
     * Class representing a Node in the tree
     */
    class Node {
        private Node mParent; //the parent node
        private int mLoc; //the location of this node relative to the parent
        private int mLevel; //the level of this node in the tree
        private Object[] mData = new Object[4]; //the 4 children of this node
        
        /**
         * Constructor
         * @param pParent the node's parent
         * @param pLoc the node's location relative to the parent
         * @param pLevel the node's level
         */
        public Node(Node pParent, int pLoc, int pLevel) {
            mParent = pParent;
            mLoc = pLoc;
            mLevel = pLevel;
        }
        
        /**
         * Get the width covered by the node
         * @return the width of the node
         */
        private int getWidth() {
            return mWidth / Pow(2,mLevel);
        }
        
        /**
         * Get the height covered by the node
         * @return the height of the node
         */
        private int getHeight() {
            return mHeight / Pow(2,mLevel);
        }
    }
    
    /**
     * A simple function to calculate an integer power
     * @param a the base
     * @param b the exponent
     * @return the base raised to the exponent
     */
    private static int Pow(int a, int b) {
        int out = 1;
        for (int i=0; i<b; i++) {
            out *= a;
        }
        return out;
    }
    
    /**
     * Class containing location IDs
     */
    public static class Loc {
        public static final short NE = 0;
        public static final short NW = 1;
        public static final short SE = 2;
        public static final short SW = 3;
    }
}
