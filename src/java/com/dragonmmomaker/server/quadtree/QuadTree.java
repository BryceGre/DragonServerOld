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

import com.dragonmmomaker.server.player.Player;
import com.dragonmmomaker.server.ServData;

/**
 *
 * @author Bryce
 */
public class QuadTree<E> {
    private Node mRoot;
    private int mZeroX;
    private int mZeroY;
    private int mWidth;
    private int mHeight;
    private int mSize;
    private int mLeaf;
    private ServData mData;
    
    private int mNodes;
    private int mLeaves;
    
    public QuadTree(ServData pServData) {
        mData = pServData;
    }
    
    public void init() {
        mRoot = new Node(null, 0, 1);
        mSize = Integer.parseInt(mData.Config.get("Game").get("draw_distance")) * 2;
        
        int[] xMinMax = mData.Utils.getWorldWidth();
        int[] yMinMax = mData.Utils.getWorldHeight();
        mWidth = Math.max(xMinMax[1] - xMinMax[0], mSize * 4);
        mHeight = Math.max(yMinMax[1] - yMinMax[0], mSize * 4);
        
        mData.Log.log("Width: " + (xMinMax[1] - xMinMax[0]) + ", Height: " + (yMinMax[1] - yMinMax[0]));
        
        mZeroX = ((xMinMax[1] - xMinMax[0]) / 2) + xMinMax[0];
        mZeroY = ((yMinMax[1] - yMinMax[0]) / 2) + yMinMax[0];
        
        mLeaf = 0;
        while ((mWidth / Pow(2, mLeaf+1)) >= mSize && (mHeight / Pow(2, mLeaf+1)) >= mSize) {
            mLeaf++;
        }
        
        mNodes = 1;
        mLeaves = 0;
    }
    
    public Leaf<Player> addPoint(int pX, int pY, E pObject) {
        Leaf leaf = traverseRoot(pX, pY, false);
        leaf.mData.add(pObject);
        
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
        
        return leaf;
    }
    
    public boolean removePoint(int pX, int pY, Object pObject) {
        return this.removePoint(pX, pY, traverseRoot(pX, pY, true), pObject);
    }
    
    public boolean removePoint(int pX, int pY, Leaf<Player> pLeaf, Object pObject) {
        if (pLeaf == null) return false;
        if (pLeaf.mData.remove(pObject)) {
            if (pLeaf.mData.size() == 0) {
                
                if (pLeaf.mN != null) pLeaf.mN.mS = null;
                if (pLeaf.mS != null) pLeaf.mS.mN = null;
                if (pLeaf.mE != null) pLeaf.mE.mW = null;
                if (pLeaf.mW != null) pLeaf.mW.mE = null;
                
                pLeaf.mParent.mData[pLeaf.mLoc] = null;
                mLeaves--;
                
                Node node = pLeaf.mParent;
                while (node != null && node != mRoot) {
                    if (node.mData[Loc.NE] == null && node.mData[Loc.NW] == null && node.mData[Loc.SE] == null && node.mData[Loc.SW] == null) {
                        node.mParent.mData[node.mLoc] = null;
                        mNodes--;
                    } else {
                        break;
                    }
                    node = node.mParent;
                }
            }
            return true;
        }
        return false;
    }
    
    public Leaf<Player> getLeaf(int pX, int pY, boolean pSoft) {
        Leaf leaf = traverseRoot(pX, pY, pSoft);
        return leaf;
    }
    
    public int getLeafWidth() {
        return mWidth / Pow(2, mLeaf);
    }
    
    public int getLeafHeight() {
        return mHeight / Pow(2, mLeaf);
    }
    
    public int getDirection(int pX, int pY) {
        pX -= mZeroX;
        pY -= mZeroY;
        
        int modX = pX % this.getLeafWidth();
        if (modX < 0) modX += this.getLeafWidth();
        int modY = pY % this.getLeafHeight();
        if (modY < 0) modY += this.getLeafHeight();
        
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
    
    public boolean isSameLeaf(int pX1, int pY1, int pX2, int pY2) {
        pX1 -= mZeroX;
        pY1 -= mZeroY;
        pX2 -= mZeroX;
        pY2 -= mZeroY;
        
        boolean x = (Math.floorDiv(pX1, this.getLeafWidth()) == Math.floorDiv(pX2, this.getLeafWidth()));
        boolean y = (Math.floorDiv(pY1, this.getLeafHeight()) == Math.floorDiv(pY2, this.getLeafHeight()));
        
        if (x && y) return true;
        return false;
    }
    
    public boolean isOutOfBounds(int pX, int pY) {
        pX -= mZeroX;
        pY -= mZeroY;
        
        if (pX >= (mWidth / 2) || pX <= -(mWidth / 2))
            return true;
        if (pY >= (mHeight / 2) || pY <= -(mHeight / 2))
            return true;
        return false;
    }
    
    public int getSize() {
        return this.mSize;
    }
    
    public int getNodeCount() {
        return mNodes;
    }
    
    public int getLeafCount() {
        return mLeaves;
    }
    
    public String getStats() {
        return "Nodes: " + mNodes + ", Leaves: " + mLeaves;
    }
    
    private Leaf<Player> traverseRoot(int pX, int pY, boolean pSoft) {
        short loc;
        Node node;
        int newX, newY;
        pX -= mZeroX;
        pY -= mZeroY;
        
        if (pX >= 0 && pY >= 0) {
            loc = Loc.SE;
            if (mRoot.mData[loc] == null) {
                if (pSoft) return null;
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            newX = pX - node.getWidth();
            newY = pY - node.getHeight();
            //System.out.println("New Point: SE");
        } else if (pX >= 0) {
            loc = Loc.NE;
            if (mRoot.mData[loc] == null) {
                if (pSoft) return null;
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            newX = pX - node.getWidth();
            newY = pY + node.getHeight();
            //System.out.println("New Point: NE");
        } else if (pY >= 0) {
            loc = Loc.SW;
            if (mRoot.mData[loc] == null) {
                if (pSoft) return null;
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            newX = pX + node.getWidth();
            newY = pY - node.getHeight();
            //System.out.println("New Point: SW");
        } else {
            loc = Loc.NW;
            if (mRoot.mData[loc] == null) {
                if (pSoft) return null;
                node = new Node(mRoot, loc, 2);
                mRoot.mData[loc] = node;
                mNodes++;
            } else node = (Node) mRoot.mData[loc];
            newX = pX + node.getWidth();
            newY = pY + node.getHeight();
            //System.out.println("New Point: NW");
        }
        return traverseTree(newX, newY, pSoft, node);
    }
    
    private Leaf<Player> traverseTree(int pX, int pY, boolean pSoft, Node pNode) {
        short loc;
        Node node;
        
        if (pX >= 0 && pY >= 0) {
            loc = Loc.SE;
            
            if (isLeaf(pNode, loc)) {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    pNode.mData[loc] = new Leaf<Player>(pNode, loc);
                    mLeaves++;
                }
                return (Leaf) pNode.mData[loc];
            } else {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                int newX = pX - node.getWidth();
                int newY = pY - node.getHeight();
                //System.out.println("SE: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("SE: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                return traverseTree(newX, newY, pSoft, node);
            }
        } else if (pX >= 0) {
            loc = Loc.NE;
            
            if (isLeaf(pNode, loc)) {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    pNode.mData[loc] = new Leaf<Player>(pNode, loc);
                    mLeaves++;
                }
                return (Leaf) pNode.mData[loc];
            } else {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                int newX = pX - node.getWidth();
                int newY = pY + node.getHeight();
                //System.out.println("NE: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("NE: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                return traverseTree(newX, newY, pSoft, node);
            }
        } else if (pY >= 0) {
            loc = Loc.SW;
            
            if (isLeaf(pNode, loc)) {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    pNode.mData[loc] = new Leaf<Player>(pNode, loc);
                    mLeaves++;
                }
                return (Leaf) pNode.mData[loc];
            } else {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                int newX = pX + node.getWidth();
                int newY = pY - node.getHeight();
                //System.out.println("SW: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("SW: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                return traverseTree(newX, newY, pSoft, node);
            }
        } else {
            loc = Loc.NW;
            
            if (isLeaf(pNode, loc)) {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    pNode.mData[loc] = new Leaf<Player>(pNode, loc);
                    mLeaves++;
                }
                return (Leaf) pNode.mData[loc];
            } else {
                if (pNode.mData[loc] == null) {
                    if (pSoft) return null;
                    node = new Node(pNode, loc, pNode.mLevel+1);
                    pNode.mData[loc] = node;
                    mNodes++;
                } else node = (Node) pNode.mData[loc];
                int newX = pX + node.getWidth();
                int newY = pY + node.getHeight();
                //System.out.println("NW: In Bounds: (" + pX + "," + pY + ")");
                //System.out.println("NW: Size: " + node.getSize() + ", New: ("+ newX + "," + newY + ")");
                return traverseTree(newX, newY, pSoft, node);
            }
        }
    }
    
    private boolean isLeaf(Node pNode, int pLoc) {
        if (pNode.mData[pLoc] == null)
            if (pNode.mLevel == mLeaf)
                return true;
            else
                return false;
        return pNode.mData[pLoc].getClass().equals(Leaf.class);
    }
    
    class Node {
        private Node mParent;
        private int mLoc;
        private int mLevel;
        private Object[] mData = new Object[4];
        
        public Node(Node pParent, int pLoc, int pLevel) {
            mParent = pParent;
            mLoc = pLoc;
            mLevel = pLevel;
        }
        
        private int getWidth() {
            return mWidth / Pow(2,mLevel);
        }
        
        private int getHeight() {
            return mHeight / Pow(2,mLevel);
        }
    }
    
    private static int Pow(int a, int b) {
        int out = 1;
        for (int i=0; i<b; i++) {
            out *= a;
        }
        return out;
    }
    
    public static class Loc {
        public static final short NE = 0;
        public static final short NW = 1;
        public static final short SE = 2;
        public static final short SW = 3;
    }
}
