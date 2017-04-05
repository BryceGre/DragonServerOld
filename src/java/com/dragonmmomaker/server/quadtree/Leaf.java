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

import com.dragonmmomaker.server.quadtree.HashBag;
import com.dragonmmomaker.server.quadtree.QuadTree;

/**
 * A leaf in the QuadTree
 * @author Bryce
 */
public class Leaf<E> {
    public QuadTree.Node mParent;
    public int mLoc;
    public HashBag<E> mData;
    public Leaf<E> mN, mS, mE, mW;

    /**
     * Constructor
     * @param pParent th QuadTree.Node to be this leaf's parent
     * @param pLoc the location of this leaf
     */
    public Leaf(QuadTree.Node pParent, int pLoc) {
        mParent = pParent;
        mLoc = pLoc;
        mData = new HashBag();
    }
    
}
