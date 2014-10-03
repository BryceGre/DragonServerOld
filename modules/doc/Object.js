/* 
 * Copyright (c) 2014, Bryce
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
/**
 * @class
 * Available: Client
 * Creates a new user (the player using this client). There should be no reason
 * to call this.
 * 
 * @param {string} name the name of the user
 * @param {number} x the x position of the user
 * @param {number} y the y position of the user
 * @param {number} floor the floor the user is on
 * @param {number} sprite the sprite to use for the user
 * @returns {User} a new instance of User.
 */
function User(name, x, y, floor, sprite) {
    this.getSpriteOffset = getSpriteOffset;
}

/**
 * @class
 * Available: Client
 * Creates a new player. (represents a player using a different client)
 * 
 * @param {number} id the id of the player
 * @param {string} name the name of the player
 * @param {number} x the x position of the player
 * @param {number} y the y position of the player
 * @param {number} floor the floor the player is on
 * @param {number} sprite the sprite to use for the player
 * @returns {Player} the new Player.
 */
function Player(id, name, x, y, floor, sprite) {
    this.getSpriteOffset = getSpriteOffset;
}
/**
 * @class
 * Available: Client
 * Creates a new npc. (acts like a player, but is controlled by code)
 * 
 * @param {string} name the name of the npc
 * @param {number} x the x position of the npc
 * @param {number} y the y position of the npc
 * @param {number} floor the floor the npc is on
 * @param {number} sprite the sprite to use for the npc
 * @returns {NPC} the new NPC.
 */
function NPC(name, x, y, floor, sprite) {
    this.getSpriteOffset = getSpriteOffset;
}
/**
 * Updates and returns the current sprite offset. The offset is a {@link Point}
 * representing the top-left point of the sprite on the spritesheet to use for
 * drawing. Spritesheets are 4x4, individual RPGMaker format.
 * 
 * @returns {Point} the top-left point of the sprite on the spritesheet.
 */
function getSpriteOffset() {}

/**
 * @class
 * Available: Client,Server
 * Creates a new Tile. The tile is automatically added to the world.
 * 
 * If called from the client, this tile is only added to the client's view.
 * If called from the server, this tile is added to the world for everyone.
 * Additionally, the tile is saved in the database.
 * 
 * @param {number} x the x position of the tile
 * @param {number} y the y position of the tile
 * @param {number} floor the floor the tile is on
 * @param {string} [data] a string representing the tile's data. Defualts to a
 * blank tile.
 * @param {string} [a1d=""] data for use by the tile's first attribute
 * @param {string} [a2d=""] data for use by the tile's first attribute
 * @returns {Tile} a new tile, added to the game.
 */
function Tile(x, y, floor, data, a1d, a2d) {}

/**
 * @class
 * Available: Client,Server
 * Creates a new Point. A point is a simple object that has 3 members, with
 * names matching it's parameters.
 * @param {type} x the x position
 * @param {type} y the y position
 * @param {type} floor the floor
 * @returns {Point} a point representing x,y,floor.
 */
function Point(x, y, floor) {
    this.getKey = getKey;
}
/**
 * Available: Client,Server
 * Returns a string key that is unique to this point, useful for indexing.
 * @returns {string} a key unique to this point (x, y, and floor)
 */
function getKey() {}