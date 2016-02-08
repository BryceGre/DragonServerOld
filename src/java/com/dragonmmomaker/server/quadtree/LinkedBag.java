/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.dragonmmomaker.server.quadtree;

import java.util.Collection;
import java.util.Iterator;
import java.util.Set;

/**
 *
 * @author Bryce
 */
public class LinkedBag<E> implements Set<E> {
    private Node mHead;
    private int mSize;
    
    public LinkedBag() {
        mSize = 0;
    }
    
    @Override
    public int size() {
        return mSize;
    }

    @Override
    public boolean isEmpty() {
        return (mSize==0);
    }

    @Override
    public boolean contains(Object o) {
        Node node = mHead;
        while (node != null) {
            if (node.mData.equals(o))
                return true;
            node = node.mNext;
        }
        return false;
    }

    @Override
    public Iterator<E> iterator() {
        return new MyIterator();
    }

    @Override
    public Object[] toArray() {
        Object[] a = new Object[mSize];
        
        int i=0;
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
        node.mNext = mHead;
        mHead = node;
        
        mSize++;
        return true;
    }

    @Override
    public boolean remove(Object o) {
        Node node = mHead;
        if (node == null) return false;
        if (node.mData.equals(o)) {
            mHead = node.mNext;
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
        if (c == null) return false;
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
        mHead = null;
        mSize = 0;
    }
    
    private class Node {
        private Node mNext;
        private E mData;
    }
    
    public class MyIterator implements Iterator<E> {
        private Node mCur = null;

        public MyIterator() {
            mCur = mHead;
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
                return data;
            }
            return null;
        }
    }
}
