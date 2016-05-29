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

package com.dragonmmomaker.server.util;

/**
 *
 * @author Bryce
 */
public class Point {
    private int mX;
    private int mY;
    private short mFloor;

    public Point(int pX, int pY, short pFloor) {
        this.mX = pX;
        this.mY = pY;
        this.mFloor = pFloor;
    }

    public int getX() {
        return this.mX;
    }

    public void setX(int pX) {
        this.mX = pX;
    }

    public int getY() {
        return this.mY;
    }

    public void setY(int pY) {
        this.mY = pY;
    }

    public short getFloor() {
        return this.mFloor;
    }

    public void setFloor(short pFloor) {
        this.mFloor = pFloor;
    }

    public String getKey() {
        return this.mX + "," + this.mY + "," + this.mFloor;
    }

    @Override
    public String toString() {
        return this.getKey();
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final Point other = (Point) obj;
        if (this.mX != other.mX) {
            return false;
        }
        if (this.mY != other.mY) {
            return false;
        }
        if (this.mFloor != other.mFloor) {
            return false;
        }
        return true;
    }
    
    @Override
    public int hashCode() {
        Long hash = 0l;
        hash += mX;
        hash *= Integer.MAX_VALUE;
        hash += mY;
        hash *= 10;
        hash += mFloor;
        return hash.hashCode(); //use built-in long hash code
    }
}
