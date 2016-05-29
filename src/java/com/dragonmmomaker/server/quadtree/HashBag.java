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
 *
 * @author Bryce
 */
public class HashBag<E> implements Set<E>, Cloneable, Serializable {
    private int mSize;
    private Object[] mHashSet;
    
    public HashBag() {
        this(10);
    }
    
    public HashBag(int pHashSize) {
        mHashSet = new Object[pHashSize];
        mSize = 0;
    }
    
    @Override
    public int size() {
        return mSize;
    }

    @Override
    public boolean isEmpty() {
        return (mSize == 0);
    }

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

    @Override
    public Iterator iterator() {
        return new MyIterator();
    }

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

    @Override
    public <T> T[] toArray(T[] a) {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    @Override
    public boolean add(E e) {
        Node node = new Node();
        
        node.mData = e;
        node.mNext = (Node) mHashSet[e.hashCode() % mHashSet.length];
        mHashSet[e.hashCode() % mHashSet.length] = node;
        
        mSize++;
        return true;
    }

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

    @Override
    public boolean containsAll(Collection<?> c) {
        java.util.Iterator<?> itr = c.iterator();
        while (itr.hasNext())
            if (!this.contains(itr.next()))
                return false;
        return true;
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        java.util.Iterator<? extends E> itr = c.iterator();
        while (itr.hasNext())
           this.add(itr.next());
        return true;
    }

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

    @Override
    public boolean removeAll(Collection<?> c) {
        java.util.Iterator<?> itr = c.iterator();
        boolean changed = false;
        while (itr.hasNext())
            changed = (changed || this.remove(itr.next()));
        return changed;
    }

    @Override
    public void clear() {
        mHashSet = new Object[mHashSet.length];
        mSize = 0;
    }
    
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
