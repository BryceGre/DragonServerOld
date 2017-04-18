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

/**
 * Player.js contains a number of classes for objects representing characters.
 * This includes the user, other players, npcs, etc.
 */

_Game.userID = 0; //current user ID

/**
 * Character parent class. Extended by User, Player, and NPC
 * @param {String} name the character's name
 * @param {Number} x the x position of the character's tile
 * @param {Number} y the y position of the character's tile
 * @param {Number} floor the floor the character is on
 * @param {Number} sprite the ID of the sprite the charcter is using
 * @returns {Character} new Character object
 */
function Character(name, x, y, floor, sprite) {
    this.direction = 0; //current movement direction
    this.facing = 0; //current facing direction
    this.moved = 0; //amount moved from current tile
    this.lastOffset = {x:0,y:0}; //last sprite offset (relative to sprite sheet, used for animation)
    this.x = parseInt(x); //x position
    this.y = parseInt(y); //y position
    this.floor = parseInt(floor); //floor
    this.lastPoint = new Point(this.x, this.y, this.floor); //previous position
    this.name = name; //name of the character
    this.sprite = parseInt(sprite); //sprite ID
    this.target = null; //character's target
    this.lastDoor = false; //if the character was last on a Door attribute
}

/**
 * Reset last position to current position
 */
Character.prototype.resetLastPoint = function() {
    this.lastPoint = new Point(this.x, this.y, this.floor);
}

/**
 * Replace the lastOffset of the Sprite with what should be the current offset.
 * @returns {Character.lastOffset|Object} the new value for lastOffset
 */
Character.prototype.getSpriteOffset = function() {
    //make sure charater is facing a direction
    if (this.facing != 0) {
        //create a new offset object
        var offset = new Object();
        //get the width and height of each sprite on the sheet
        var width = Math.floor(_Game.gfx.Sprites[this.sprite].width / 4);
        var height = Math.floor(_Game.gfx.Sprites[this.sprite].height / 4);
        //calculate the current y offset, based on which direction the character is facing
        if (this.facing == 37) { //left
            offset.y = 1 * height;
        } else if (this.facing == 38) { //up
            offset.y = 3 * height;
        } else if (this.facing == 39) { //right
            offset.y = 2 * height;
        } else if (this.facing == 40) { //down
            offset.y = 0 * height;
        }
        //calculate the current x offset, based on how much the character has moved
        var stage = Math.floor(this.moved / (TILE_SIZE / 4));
        offset.x = stage * width;
        this.lastOffset = offset;
    }
    //return the new lastOffset
    return this.lastOffset
}

/**
 * User sublcass of Character. Represents the current user.
 * @param {String} name the character's name
 * @param {Number} x the x position of the character's tile
 * @param {Number} y the y position of the character's tile
 * @param {Number} floor the floor the character is on
 * @param {Number} sprite the ID of the sprite the charcter is using
 * @returns {User} new User object
 */
function User(name, x, y, floor, sprite) {
    Character.call(this, name, x, y, floor, sprite);
    
    this.nextDir = 0; //next movement direction
    this.sprinting = false; //is user sprinting
    this.command = 0; //current input command
    this.user = true; //remember that this is user
}

/**
 * Player sublcass of Character. Represents another player.
 * @param {Number} id the ID of the player
 * @param {String} name the character's name
 * @param {Number} x the x position of the character's tile
 * @param {Number} y the y position of the character's tile
 * @param {Number} floor the floor the character is on
 * @param {Number} sprite the ID of the sprite the charcter is using
 * @returns {User} new Player object
 */
function Player(id, name, x, y, floor, sprite) {
    Character.call(this, name, x, y, floor, sprite);
    
    this.id = parseInt(id); //player id
    this.sprinting = false; //is user sprinting
    this.command = 0; //current input command
    this.player = true; //remember that this is a player
}

/**
 * NPC sublcass of Character. Represents a Non-Player Character.
 * @param {Number} id the ID of the npc
 * @param {String} name the character's name
 * @param {Number} x the x position of the character's tile
 * @param {Number} y the y position of the character's tile
 * @param {Number} floor the floor the character is on
 * @param {Number} sprite the ID of the sprite the charcter is using
 * @returns {User} new NPC object
 */
function NPC(id, name, x, y, floor, sprite) {
    Character.call(this, name, x, y, floor, sprite);
    
    this.id = parseInt(id); //npc id
    this.npc = true; //remember that this is a npc
}

//Set prototypes to Character class
User.prototype = Object.create(Character.prototype);
User.prototype.constructor = User; //keep constructor
Player.prototype = Object.create(Character.prototype);
Player.prototype.constructor = Player; //keep constructor
NPC.prototype = Object.create(Character.prototype);
NPC.prototype.constructor = NPC; //keep constructor

/**
 * Move the user to a new tile.
 */
User.prototype.move = function() {
    //set lastPoint to current position
    this.resetLastPoint();
    //get direction of user
    if (this.direction == 37) { // left
        //user is moving left
        this.x--; //move user
        //prune any NPCs that are out of the draw distance
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].x > this.x + DRAW_DISTANCE) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor)];
                delete _Game.world.npcs[key];
            }
        }
    } else if (this.direction == 38) { // up
        //user is moving up
        this.y--; //move user
        //prune any NPCs that are out of the draw distance
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].y > this.y + DRAW_DISTANCE) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor)];
                delete _Game.world.npcs[key];
            }
        }
    } else if (this.direction == 39) { // right
        //user is moving right
        this.x++; //move user
        //prune any NPCs that are out of the draw distance
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].x < this.x - DRAW_DISTANCE) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor)];
                delete _Game.world.npcs[key];
            }
        }
    } else if (this.direction == 40) { // down
        //user is moving down
        this.y++; //move user
        //prune any NPCs that are out of the draw distance
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].y < this.y - DRAW_DISTANCE) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor)];
                delete _Game.world.npcs[key];
            }
        }
    }

    //update music for the new tile
    var playerTile = _Game.getTile(this.x, this.y, this.floor);
    if (playerTile && playerTile.music > 0) {
        //music changed, play music
        Game.playMusic(playerTile.music);
    }
}