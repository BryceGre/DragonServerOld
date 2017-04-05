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

import java.io.Serializable;
import java.util.Collection;
import java.util.Iterator;
import java.util.Set;

/**
 * A HashBag (HashMultiSet) class.
 * 
 * My professor called this class an abomination, and it certainly sounds like it should be.
 * But a "bag" is simply a set that can have multiple elements.
 * 
 * If we know that we won't be trying to add any duplicates, using this means that
 * we don't have to search through each bucket for duplicates on each add() call.
 * 
 * @author Bryce
 */
public class HashBag<E> implements Set<E>, Cloneable, Serializable {
    private int mSize;
    private Object[] mHashSet;
    
    /**
     * Constructor
     * (10 buckets)
     */
    public HashBag() {
        this(10);
    }
    
    /**
     * Constructor
     * @param pHashSize the number of buckets to use
     */
    public HashBag(int pHashSize) {
        mHashSet = new Object[pHashSize];
        mSize = 0;
    }
    
    /**
     * Get the size of the bag
     * @return the size
     */
    @Override
    public int size() {
        return mSize;
    }

    /**
     * Check if the bag is empty
     * @return true if the bag is empty, false otherwise
     */
    @Override
    public boolean isEmpty() {
        return (mSize == 0);
    }

    /**
     * Check if the bag contains an element
     * @param o the object to check for
     * @return true if the bag contains o, false otherwise
     */
    @Override
    public boolean contains(Object o) {
        Node node = (Node)mHashSet[o.hashCode() % mHashSet.length];
        while (node != null) {
            if (o.equals(node.mData))
                return true;
            node = node.mNext;
        }
        return false;
    }

    /**
     * Get the iterator for this bag.
     * @return the iterator
     */
    @Override
    public Iterator iterator() {
        return new MyIterator();
    }

    /**
     * Convert this bag to an array
     * @return an array containing all elements in this bag
     */
    @Override
    public Object[] toArray() {
        Object[] a = new Object[mSize];
        
        int i = 0;
        Iterator<E> itr = this.iterator();
        while(itr.hasNext()) {
            a[i] = itr.next();
            i++;
        }
        return a;
    }

    /**
     * Unsupported
     */
    @Override
    public <T> T[] toArray(T[] a) {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    /**
     * Add an element to the bag
     * @param e the object to add
     * @return true if successful (always true)
     */
    @Override
    public boolean add(E e) {
        Node node = new Node();
        
        node.mData = e;
        node.mNext = (Node) mHashSet[e.hashCode() % mHashSet.length];
        mHashSet[e.hashCode() % mHashSet.length] = node;
        
        mSize++;
        return true;
    }

    /**
     * Remove an element from the bag
     * @param o the object to remove
     * @return true if something was removed, false otherwise
     */
    @Override
    public boolean remove(Object o) {
        Node node = (Node) mHashSet[o.hashCode() % mHashSet.length];
        if (node == null) return false;
        if (node.mData.equals(o)) {
            mHashSet[o.hashCode() % mHashSet.length] = node.mNext;
            mSize--;
            return true;
        }
        Node next = node.mNext;
        while (next != null) {
            if (next.equals(o)) {
                node.mNext = next.mNext;
                mSize--;
                return true;
            }
            node = next;
            next = node.mNext;
        }
        return false;
    }

    /**
     * Check if this bag contains all all elements on a collection
     * @param c the collection to check against this bag
     * @return true if this bag contains all elements in c, false otherwise
     */
    @Override
    public boolean containsAll(Collection<?> c) {
        java.util.Iterator<?> itr = c.iterator();
        while (itr.hasNext())
            if (!this.contains(itr.next()))
                return false;
        return true;
    }

    /**
     * Add all elements in a collection to this bag
     * @param c the collection of lements to add
     * @return true if successful (always true)
     */
    @Override
    public boolean addAll(Collection<? extends E> c) {
        java.util.Iterator<? extends E> itr = c.iterator();
        while (itr.hasNext())
           this.add(itr.next());
        return true;
    }

    /**
     * Retain all elements in a collection
     * @param c the collection of elements
     * @return true if this bag was changed, false otherwise
     */
    @Override
    public boolean retainAll(Collection<?> c) {
        Iterator<E> itr = this.iterator();
        boolean changed = false;
        while (itr.hasNext()) {
            E e = itr.next();
            if (!c.contains(e)) {
                this.remove(e);
                changed = true;
            }
        }
        return changed;
    }

    /**
     * Remove all elements in a collection from this bag
     * @param c the collection of elements to remove
     * @return true if anything was removed, false otherwise
     */
    @Override
    public boolean removeAll(Collection<?> c) {
        java.util.Iterator<?> itr = c.iterator();
        boolean changed = false;
        while (itr.hasNext())
            changed = (changed || this.remove(itr.next()));
        return changed;
    }

    /**
     * remove all elements from this bag
     */
    @Override
    public void clear() {
        mHashSet = new Object[mHashSet.length];
        mSize = 0;
    }
    
    /**
     * A class representing a Node in a bucket
     */
    private class Node {
        protected Node mNext;
        protected E mData;
    }
    
    public class MyIterator implements Iterator<E> {
        private int mBucket = 0;
        private Node mCur = null;

        public MyIterator() {
            mCur = (Node) mHashSet[mBucket];
            this.validateNext();
        }
        
        @Override
        public boolean hasNext() {
            return (mCur != null);
        }

        @Override
        public E next() {
            if (mCur != null) {
                E data = mCur.mData;
                mCur = mCur.mNext;
                this.validateNext();
                return data;
            }
            return null;
        }
        
        private void validateNext() {
            while (mCur == null) {
                mBucket++;
                if (mBucket >= mHashSet.length)
                    break;
                mCur = (Node) mHashSet[mBucket];
            }
        }
    }
}
