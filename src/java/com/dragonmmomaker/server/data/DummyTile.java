/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.dragonmmomaker.server.data;

import com.dragonmmomaker.server.ServData;

/**
 *
 * @author Bryce
 */
public class DummyTile extends Tile {
    public DummyTile(int pX, int pY, short pFloor) {
        this(ServData._CurData, pX, pY, pFloor);
    }
    
    public DummyTile(ServData pServData, int pX, int pY, short pFloor) {
        super(pServData, 0, pX, pY, pFloor, Tile.DEFAULT_TILE, "", "");
    }
}
