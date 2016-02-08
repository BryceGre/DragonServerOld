/*
 * Copyright (c) 2016, Bryce
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
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
