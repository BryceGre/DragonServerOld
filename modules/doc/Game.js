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
 * Provides tools for interacting with the game.
 * @type Object
 */
Game = new Object();
/**
 * Available: Client,Server
 * Retrieves the Tile object at the given location
 * 
 * @param {number} x the x position of the tile
 * @param {number} y the y position of the tile
 * @param {number} floor the floor the tile is on
 * @returns {Tile} the Tile object representing the tile at (x,y) on floor.
 */
Game.getTile = function(x, y, floor) {}
/**
 * Available: Client,Server
 * Sets the Tile object at the given location.
 * 
 * If called from the client, the tile is only changed for that client.
 * If called from the server, the tile is changed for all players, but only
 * on the next load. (players already viewing this tile will see no differnece)
 * @param {number} x the x position of the tile
 * @param {number} y the y position of the tile
 * @param {number} floor the floor the tile is on
 * @param {Tile} tile the tile to set at (x,y) on floor.
 */
Game.setTile = function(x, y, floor, tile) {}
/**
 * Available: Server
 * Warps a specified player to a given location.
 * 
 * @param {type} index the index of the player to warp
 * @param {type} x the x position to warp the player to
 * @param {type} y the y position to warp the player to
 * @param {type} floor the floor to warp the player to
 */
Game.warpPlayer = function(index, x, y, floor) {}

//TODO:
Game.playMusic = function(id) {}
Game.stopMusic = function() {}
Game.getPageX = function(x) {}
Game.getPageY = function(y) {}
Game.getTileX = function(x) {}
Game.getTileY = function(y) {}
Game.getClickedX = function(e) {}
Game.getClickedY = function(e) {}
Game.setPref = function(pref, val) {}
Game.getPref = function(pref) {}

Game.menus = new Object();
/**
 * Provides tools for interacting with currently connected clients.
 * @type Object
 */
Game.socket = new Object();
/**
 * Available: Client,Server
 * Sends a message to the client/server.
 * 
 * If called from the client, will send a message to the server.
 * If called from the server, will send a message to whatever client.
 * triggered the hook, or do nothing for server-triggered hooks.
 * @param {string} message the message to send
 */
Game.socket.send = function(message) {}
/**
 * Available: Server
 * Sends a message to all connected clients.
 * 
 * Differentiates between client.html and admin.html connections, will call
 * whatever set of connections (client/admin) containing whatever client
 * triggered the hook, or send to both for server-triggered hooks.
 * @param {string} message the message to send
 */
Game.socket.sendAll = function(message) {}
/**
 * Available: Server
 * Sends a message to all connected clients other than whaever client triggered
 * the current hook.
 * 
 * Differentiates between client.html and admin.html connections, will call
 * whatever set of connections (client/admin) containing whatever client
 * triggered the hook, or do nothing for server-triggered hooks.
 * @param {string} message the message to send
 */
Game.socket.sendAllOther = function(message) {}
/**
 * Available: Server
 * Sends a message to all connected clients who are within the draw_distance of
 * the client that triggered the current hook.
 * 
 * Only applies to client.html connections, will do nothing for admin.html
 * connections or for server-triggered hooks.
 * @param {string} message the message to send
 */
Game.socket.sendRange = function(message) {}
/**
 * Available: Server
 * Sends a message to all connected clients who are within the draw_distance of
 * the client that triggered the current hook, save the client that triggered
 * the current hook.
 * 
 * Only applies to client.html connections, will do nothing for admin.html
 * connections or for server-triggered hooks.
 * @param {string} message the message to send
 */
Game.socket.sendRangeOther = function(message) {}