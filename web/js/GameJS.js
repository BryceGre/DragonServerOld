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

/*
 * GameJS.js is the core game functions specific to /game.html
 * For core game functions that are shared between admin and game, see Game.js
 */

var isAdmin = false; //let other scripts know this is not admin
_Game.gameTime = 0; //time in-game
// Game Variables
_Game.updateTime = 0; //time since last update
_Game.tickTime = 0; //single game tick
_Game.lastTime = $.now(); //last update time
_Game.canvas; //game canvas
_Game.context; //game canvas context
_Game.testcontext;
_Game.layers = null; //list of layers (pre-rendered canvases)
_Game.floors = new Array(9); //list of floors (pre-rendered canvases)
_Game.size = 0; //size of game window (draw-distance)
_Game.curKey = 0; //current keyboard key being held down
_Game.tileWorker = null; //worker for loading tiles
// Debug Variables
_Game.frameCount = 0;
_Game.FPS = 0;
_Game.lastSecond = 0;
_Game.doReDraw = false;

_Game.onLoaded = function() {
    Module.doHook("game_load", {admin: false});
    
    _Game.setupMenu();
    _UI.HUD.init();
    
    if (window.Worker)
        //_Game.tileWorker = new Worker("js/worker/tile.js");
    
    $("#login-form").dialog({autoOpen: false, height: 300, width: 350, modal: true, buttons: {"Log In": function() {
                var JSONObject = {"user": $("#name").val(), "pass": SHA256($("#password").val())};
                _Game.socket.send("login:" + JSON.stringify(JSONObject));
                $(this).dialog("close");
            }, "Register": function() {
                var JSONObject = {"user": $("#name").val(), "pass": SHA256($("#password").val()), "email": "none"};
                _Game.socket.send("register:" + JSON.stringify(JSONObject));
                $(this).dialog("close");
            }}});
    
    _Game.connect("client");
}

/**
 * Load the world (user,players,npcs,tiles) from a "load:" message string.
 * @param {String} string the body of the "load:" message, containing JSON data
 **/
_Game.loadWorld = function(string) {
    //parse JSON string
    var entities = JSON.parse(string);
    
    //set game time
    _Game.gameTime = entities.time;

    //create user
    var n = entities.user;
    _Game.world.user = new User(n.n, n.x, n.y, n.f, n.s);
    _Game.userID = n.id; //set user ID
    
    //create players (in-range of user)
    var players = entities.players;
    for (var i = 0; i < players.length; i++) {
        var n = players[i];
        _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
        _Game.reDrawDoor(_Game.world.players[n.id]); //open doors players are standing on
    }
    
    //create npcs (in-range of player)
    var npcs = entities.npcs;
    for (var i = 0; i < npcs.length; i++) {
        //npc data is seperated by commas for easier server-side storage
        var n = npcs[i].split(",");
        var id = parseInt(n[0]); //npc id
        var x = parseInt(n[1]); //npc x
        var y = parseInt(n[2]); //npc y
        var f = parseInt(n[3]); //npc floor
        var s = parseInt(n[4]); //npc sprite
        
        _Game.world.npcs[id] = new NPC(id, n[5], x, y, f, s);
        _Game.world.npcTile[Tile.key(x, y, f)] = id;
    }
    
    //update world with tiles
    _Game.updateWorld(entities.tiles);
    //initialize world to be drawn
    _Game.initDraw();
    _Game.doReDraw = true;
    
    //check and play music for player's current tile
    var playerTile = _Game.getTile(_Game.world.user.x, _Game.world.user.y, _Game.world.user.floor);
    if (playerTile && playerTile.music > 0) {
        Game.playMusic(playerTile.music);
    }
    //do "world_load" module hook.
    Module.doHook("world_load", {});
}

/**
 * Initialize pre-drawn layer cache
 **/
_Game.initDraw = function() {
    _Game.size = TILE_SIZE * (DRAW_DISTANCE * 2);
    
    //create floors. These are entire floors in one layer.
    //They are placed below the user's current floor.
    for (var f = 0; f < 10; f++) {
        //for each floor
        if (!_Game.floors[f]) {
            //game floor data doesn't exist, create it
            _Game.floors[f] = document.createElement("canvas");
            _Game.floors[f].width = _Game.size;
            _Game.floors[f].height = _Game.size;
            _Game.floors[f].changed = false;
        }
    }
    
    //create layers. These are multiple layers for the user's current floor.
    //m1 (mask1) and ma (mask admin) are blow the player.
    //f1 (fringe1) and fa (fringe anim) are above the player.
    if (!_Game.layers) {
        _Game.layers = new Object();
        //mask1
        _Game.layers.m1 = document.createElement("canvas");
        _Game.layers.m1.width = _Game.size;
        _Game.layers.m1.height = _Game.size;
        _Game.layers.m1.changed = false;
        //mask anim.
        _Game.layers.ma = document.createElement("canvas");
        _Game.layers.ma.width = _Game.size;
        _Game.layers.ma.height = _Game.size;
        _Game.layers.ma.changed = false;
        //fringe1
        _Game.layers.f1 = document.createElement("canvas");
        _Game.layers.f1.width = _Game.size;
        _Game.layers.f1.height = _Game.size;
        _Game.layers.f1.changed = false;
        //fringe anim.
        _Game.layers.fa = document.createElement("canvas");
        _Game.layers.fa.width = _Game.size;
        _Game.layers.fa.height = _Game.size;
        _Game.layers.fa.changed = false;
    }
}

/**
 * onUpdate function of the game loop
 * Updates game logic and data
 * @param {float} elapsed time elapsed since end of last game loop
 */
_Game.onUpdate = function(elapsed) {
    //add to game time
    _Game.gameTime += (TIME_FACTOR * elapsed);
    //add to update time
    _Game.updateTime += elapsed;
    var intervalTime = 1000 / FRAME_RATE;
    //for each interval that passed since the last call
    while (_Game.updateTime >= intervalTime) {
        //process user movement
        if (_Game.world.user.direction != 0) {
            //user is moving, move user
            _Game.world.user.moved += MOVE_SPEED;
            //check if user moved an entire tile
            if (_Game.world.user.moved >= TILE_SIZE) {
                //user moved to a new tile, reset movement
                _Game.world.user.moved = 0;
                //if next tile is blocked
                if (_Game.isBlocked(_Game.world.user.nextDir, _Game.world.user.x, _Game.world.user.y, _Game.world.user.floor)) {
                    // make user face the direction even if he can't move that way
                    _Game.world.user.facing = _Game.world.user.nextDir;
                    _Game.socket.send("face:" + _Game.world.user.facing);
                    //set the next direction to 0 (not moving)
                    _Game.world.user.nextDir = 0;
                }
                //update to next direction
                _Game.world.user.direction = _Game.world.user.nextDir;
                if (_Game.world.user.direction != 0) {
                    //user is still moving
                    _Game.world.user.facing = _Game.world.user.direction;
                    //move user
                    _Game.world.user.move();
                    _Game.doReDraw = true;
                    //send move information
                    _Game.socket.send("move:" + _Game.world.user.direction);
                }
            }
        }
        
        //process player movement
        for (key in _Game.world.players) {
            //for each player
            if (_Game.world.players[key].direction != 0) {
                //player is moving, move player
                _Game.world.players[key].moved += MOVE_SPEED;
                //check if player moved an entire tile
                if (_Game.world.players[key].moved >= TILE_SIZE) {
                    //stop movement (wait for next move message)
                    _Game.world.players[key].moved = 0;
                    _Game.world.players[key].direction = 0;
                }
            }
        }
        
        //process NPC movement
        for (key in _Game.world.npcs) {
            //for each npc
            if (_Game.world.npcs[key].direction != 0) {
                //npc is moving, move npc
                _Game.world.npcs[key].moved += MOVE_SPEED;
                //check if npc moved an entire tile
                if (_Game.world.npcs[key].moved >= TILE_SIZE) {
                    //stop movement (wait for next move message)
                    _Game.world.npcs[key].moved = 0;
                    _Game.world.npcs[key].direction = 0;
                }
            }
        }
        
        _Game.updateTime -= intervalTime;
        //do "on_update" module hook
        Module.doHook("on_update", {admin: false});
    }
    
    //tick every second
    _Game.tickTime += elapsed;
    while (_Game.tickTime >= 1000) {
        //do "game_tick_module hook
        Module.doHook("game_tick");
        _Game.tickTime -= 1000;
    }
    
    //do "raw_update" module hook, which may run more or less than each frame
    Module.doHook("raw_update", {admin: false, elapsed: elapsed});
}

/**
 * onDraw function of the game loop
 * draws game data to canvas
 * @param {float} elapsed time elapsed since end of last game loop
 **/
_Game.onDraw = function(elapsed) {
    var nowTime = $.now();
    
    //check if map needs to be re-drawn
    if (_Game.doReDraw) {
        //redraw map
        _Game.doReDraw = false;
        _Game.reDraw();
    }
    
    //clear the canvas
    _Game.context.clearRect(0, 0, _Game.canvas.width, _Game.canvas.height);

    //To reduce math, do calculations now:
    var offsetX = _Game.getMovedX(_Game.world.user);
    var offsetY = _Game.getMovedY(_Game.world.user);
    var destx = (_Game.canvas.width / 2) + offsetX - (TILE_SIZE * DRAW_DISTANCE);
    var desty = (_Game.canvas.height / 2) + offsetY - (TILE_SIZE * DRAW_DISTANCE);
    
    //do "pre_draw" module hook
    Module.doHook("pre_draw", {admin: false, elapsed: elapsed});
    
    //Draw lower floors
    for (var f = 0; f < _Game.world.user.floor; f++) {
        //todo: scale for paralax effect
        var scale = 1-((_Game.world.user.floor - f) * 0.05);
        var newx = (_Game.canvas.width / 2) + (offsetX - (TILE_SIZE * DRAW_DISTANCE)) * scale;
        var newy = (_Game.canvas.height / 2) + (offsetY - (TILE_SIZE * DRAW_DISTANCE)) * scale;
        
        _Game.context.drawImage(_Game.floors[f], newx, newy, _Game.size * scale, _Game.size * scale);
    }
    
    //Draw objects under player
    Module.doHook("pre_draw_mask", {admin: false});
    //Draw mask 1
    _Game.context.drawImage(_Game.layers.m1, destx, desty);
    //Draw make animation
    if (Math.floor(nowTime / 1000) % 2 == 0) {
        _Game.context.drawImage(_Game.layers.ma, destx, desty);
    }
    Module.doHook("post_draw_mask", {admin: false});
    
    //draw target indicator below all characters that are targeted
    if (_Game.world.user.target) {
        var targetX = _Game.getCanvasX(_Game.world.user.target.x, offsetX) - _Game.getMovedX(_Game.world.user.target);
        var targetY = _Game.getCanvasY(_Game.world.user.target.y, offsetY) - _Game.getMovedY(_Game.world.user.target);
        _Game.context.drawImage(_Game.target, 0, 0, TILE_SIZE, TILE_SIZE, targetX, targetY, TILE_SIZE, TILE_SIZE);
    }
    
    //queue the drawing from top to bottom, so that characters underneath other characters will be drawn on top. (head on top of feet)
    var queue = new Array();
    var w = Math.floor(_Game.gfx.Sprites[_Game.world.user.sprite].width / 4);
    var h = Math.floor(_Game.gfx.Sprites[_Game.world.user.sprite].height / 4);
    queue[_Game.world.user.y] = new Array(); //create y level in queue
    queue[_Game.world.user.y].push({ //push user into the y level array
        type: "user", args: {"user": _Game.world.user}, //character object
        sprite: _Game.gfx.Sprites[_Game.world.user.sprite], //character sprite
        offset: _Game.world.user.getSpriteOffset(), //sprite offset (animation)
        width: w, height: h, //sprite width and height
        x: (_Game.canvas.width / 2) - ((w/2) - (TILE_SIZE/2)), //x position
        y: (_Game.canvas.height / 2) - (h - TILE_SIZE) //y position
    });
    //put the players into the queue
    for (key in _Game.world.players) {
        if (_Game.world.players[key].floor == _Game.world.user.floor) {
            //player is on same floor as user
            var w = Math.floor(_Game.gfx.Sprites[_Game.world.players[key].sprite].width / 4);
            var h = Math.floor(_Game.gfx.Sprites[_Game.world.players[key].sprite].height / 4);
            var playerX = _Game.getCanvasX(_Game.world.players[key].x, offsetX) - _Game.getMovedX(_Game.world.players[key]) - ((w/2) - (TILE_SIZE/2));
            var playerY = _Game.getCanvasY(_Game.world.players[key].y, offsetY) - _Game.getMovedY(_Game.world.players[key]) - (h - TILE_SIZE);
            
            if (!queue[_Game.world.players[key].y]) {
                //y level does not exist in queue, create it
                queue[_Game.world.players[key].y] = new Array();
            }
            //push player into the y level array
            queue[_Game.world.players[key].y].push({
                type: "player", args: {"player": _Game.world.players[key]}, //character object
                sprite: _Game.gfx.Sprites[_Game.world.players[key].sprite], //character sprite
                offset: _Game.world.players[key].getSpriteOffset(), //sprite offset (animation)
                width: w, height: h, //sprite width and height
                x: playerX, y: playerY //x and y positions
            });
        }
    }
    //put the NPCs into the queue
    for (key in _Game.world.npcs) {
        if (_Game.world.npcs[key].floor == _Game.world.user.floor) {
            //npc is on same floor as user
            var w = Math.floor(_Game.gfx.Sprites[_Game.world.npcs[key].sprite].width / 4);
            var h = Math.floor(_Game.gfx.Sprites[_Game.world.npcs[key].sprite].height / 4);
            var npcX = _Game.getCanvasX(_Game.world.npcs[key].x, offsetX) - _Game.getMovedX(_Game.world.npcs[key]) - ((w/2) - (TILE_SIZE/2));
            var npcY = _Game.getCanvasY(_Game.world.npcs[key].y, offsetY) - _Game.getMovedY(_Game.world.npcs[key]) - (h - TILE_SIZE);
            
            if (!queue[_Game.world.npcs[key].y]) {
                //y level does not exist in queue, create it
                queue[_Game.world.npcs[key].y] = new Array();
            }
            //push npc into the y level array
            queue[_Game.world.npcs[key].y].push({
                type: "npc", args: {"npc": _Game.world.npcs[key]}, //character object
                sprite: _Game.gfx.Sprites[_Game.world.npcs[key].sprite], //character sprite
                offset: _Game.world.npcs[key].getSpriteOffset(), //sprite offset (animation)
                width: w, height: h, //sprite width and height
                x: npcX, y: npcY //x and y positions
            });
        }
    }
    //draw queue from top to bottom
    for (key in queue) {
        for (var i=0; i<queue[key].length; i++) {
            var n = queue[key][i];
            Module.doHook("pre_draw_" + n.type, n.args);
            _Game.context.drawImage(n.sprite, n.offset.x, n.offset.y, n.width, n.height, n.x, n.y, n.width, n.height);
            Module.doHook("post_draw_" + n.type, n.args);
        }
    }

    // draw objects above player
    Module.doHook("pre_draw_fringe", {admin: false});
    //Draw fringe 1
    _Game.context.drawImage(_Game.layers.f1, destx, desty);
    //Draw fringe animation
    if (Math.floor(nowTime / 1000) % 2 == 0) {
        _Game.context.drawImage(_Game.layers.fa, destx, desty);
    }
    Module.doHook("post_draw_fringe", {admin: false});

    //Do "post_draw" module hook
    Module.doHook("post_draw", {admin: false, elapsed: elapsed});

    //Keep track of the last second and _Game.FPS even if not debugging.
    _Game.frameCount++;
    var nowSecond = Math.floor(nowTime / 1000);
    if (nowSecond > _Game.lastSecond) {
        _Game.FPS = _Game.frameCount;
        _Game.frameCount = 0;
        _Game.lastSecond = nowSecond;
    }

    if (DEBUG) {
        //_Game.drawDebug();
    }
}

/**
 * Draw debug information on the screen
 **/
_Game.drawDebug = function() {
    _Game.context.fillText("Game FPS: " + _Game.FPS, 256, 10);
    _Game.context.fillText("Player X: " + (_Game.world.user.x - 1000000000), 256, 20);
    _Game.context.fillText("Player Y: " + (_Game.world.user.y - 1000000000), 256, 30);
    _Game.context.fillText("Player Floor: " + _Game.world.user.floor, 256, 40);
    var date = new Date(_Game.gameTime);
    _Game.context.fillText("Game Time: " + date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds(), 256, 50);
    _Game.context.fillText("Player Stats: " + _Game.stats.player, 256, 60);
    _Game.context.fillText("Q-Tree Stats: " + _Game.stats.tree, 256, 70);
}

/**
 * Re-Draw the saved game layers. This is done each time new game data is recieved.
 * TODO: shift and add instead of redraw entire layers when player moves
 **/
_Game.reDraw = function() {
    //var hours = new Date(_Game.gameTime).getUTCHours();
    //var night = 0;
    //day is between 6:00am and 6:00pm //TODO: configurable times
    //if (hours <= 6 || hours >= 18) {
        //night = TILE_SIZE;
    //}
    
    //width and height of tiles
    var width = Math.ceil((_Game.canvas.width / 2) / TILE_SIZE);
    var height = Math.ceil((_Game.canvas.height / 2) / TILE_SIZE);
    
    var destx, desty; //current x and y
    //zone of tiles to draw
    var minx = Math.max(_Game.world.user.x - DRAW_DISTANCE, Math.min(_Game.world.user.x - width,  _Game.world.user.lastPoint.x - width ));
    var maxx = Math.min(_Game.world.user.x + DRAW_DISTANCE, Math.max(_Game.world.user.x + width,  _Game.world.user.lastPoint.x + width ));
    var miny = Math.max(_Game.world.user.y - DRAW_DISTANCE, Math.min(_Game.world.user.y - height, _Game.world.user.lastPoint.y - height));
    var maxy = Math.min(_Game.world.user.y + DRAW_DISTANCE, Math.max(_Game.world.user.y + height, _Game.world.user.lastPoint.y + height));
    
    //starting x and y
    var basex = (DRAW_DISTANCE - (_Game.world.user.x - minx)) * TILE_SIZE;
    var basey = (DRAW_DISTANCE - (_Game.world.user.y - miny)) * TILE_SIZE;
   
    //local context objects
    var ctx_m1, ctx_ma, ctx_f1, ctx_fa;
    
    //for each floor equal or below the user
    for (var f = 0; f <= _Game.world.user.floor; f++) {
        if (f < _Game.world.user.floor) {
            //floor is below the user
            if (_Game.floors[f].changed) {
                //floor has changed, clear it
                _Game.floors[f].getContext("2d").clearRect(0, 0, _Game.size, _Game.size);
                _Game.floors[f].changed = false;
            }
            //draw everything onto one floor canvas
            ctx_m1 = _Game.floors[f].getContext("2d");
            ctx_ma = ctx_m1;
            ctx_f1 = ctx_m1;
            ctx_fa = ctx_m1;
        } else {
            //clear each layer's canvas
            //mask
            ctx_m1 = _Game.layers.m1.getContext("2d");
            ctx_m1.clearRect(0, 0, _Game.size, _Game.size);
            //mask animation
            ctx_ma = _Game.layers.ma.getContext("2d");
            ctx_ma.clearRect(0, 0, _Game.size, _Game.size);
            //fringe
            ctx_f1 = _Game.layers.f1.getContext("2d");
            ctx_f1.clearRect(0, 0, _Game.size, _Game.size);
            //fringe animation
            ctx_fa = _Game.layers.fa.getContext("2d");
            ctx_fa.clearRect(0, 0, _Game.size, _Game.size);
        }
        if (_Game.world.tiles[f]) {
            //tile data exists
            _Game.floors[f].changed = true; //floor now changed
            destx = basex; //starting x
            //for each tile x from minx to maxx
            for (var x = minx; x < maxx; x++) {
                if (_Game.world.tiles[f][x]) {
                    //x row exists in game cache
                    desty = basey; //starting y
                    for (var y = miny; y < maxy; y++) {
                        var tile = _Game.world.tiles[f][x][y];
                        if (tile) {
                            //tile data exists
                            if (tile.m2e && !_Game.isHideDoor(x, y, f)) {
                                //mask2 data exists, and not an open door. Draw mask2 + mask1 + ground
                                ctx_m1.drawImage(tile.m2, destx, desty);
                            } else if (tile.m1e) {
                                //mask2 data does not exist, but mask1 data does. Draw mask1 + ground
                                ctx_m1.drawImage(tile.m1, destx, desty);
                            } else if (tile.gre) {
                                //only ground data exists. Draw ground
                                ctx_m1.drawImage(tile.gr, destx, desty);
                            }
                            if (tile.mae) {
                                //draw mask animation
                                ctx_ma.drawImage(tile.ma, destx, desty);
                            }
                            if (tile.f2e && !_Game.isHideRoof(x, y, f)) {
                                //fringe2 data exists, and not a hidden roof. Draw fringe2 + fringe1
                                ctx_f1.drawImage(tile.f2, destx, desty);
                            } else if (tile.f1e) {
                                //fringe2 data does not exist, but fringe1 data does. Draw fringe1
                                ctx_f1.drawImage(tile.f1, destx, desty);
                            }
                            if (tile.fae) {
                                //draw fringe animation
                                ctx_fa.drawImage(tile.fa, destx, desty);
                            }
                        }
                        desty += TILE_SIZE; //next y tile
                    }
                }
                destx += TILE_SIZE; //next x tile
            }
        }
    }
    
    for (var f = _Game.world.user.floor+1; f < 10; f++) {
        if (_Game.floors[f].changed) {
            _Game.floors[f].getContext("2d").clearRect(0, 0, _Game.size, _Game.size);
            _Game.floors[f].changed = false;
        }
    }
}

/**
 * Re-Draw the saved mask layer to accomidate opening/closing doors
 * @param {Number|Character} a either a Character object or the x position of the tile
 * @param {type} b the y position of the tile, if a is not a Character object
 * @param {type} c the floor of the tile, if a is not a Character object
 **/
_Game.reDrawDoor = function(a, b, c) {
    var destx, desty; //tile destination
    var minx, maxx, miny, maxy; //tiles to redraw
    var f; //last floor
    var tile; //tile to check
    
    if (b === undefined || c === undefined) {
        //a is a character, treat it as such
        f = a.lastPoint.floor; //character recently changed floors
        tile = _Game.getTile(a.x, a.y, a.floor); //get the tile the character is on
        if (tile.attr1 == 5 || tile.attr2 == 5) {
            //tile is a door attribute
            if (a.lastDoor == true)
                //The last tile was a door, keep it open
                return;
            //else, mark the last tile as a door
            a.lastDoor = true;
            //keep a 3x3 list of tiles around the current tile
            minx = (a.x - 1);
            maxx = (a.x + 1);
            miny = (a.y - 1);
            maxy = (a.y + 1);
        } else {
            //tile is not a door attribute
            if (a.lastDoor == false)
                //The last tile was a door, keep it open
                return;
            //else, mark the last tile as a door
            a.lastDoor = false;
            //keep a 3x3 list of tiles around the current tile
            minx = (a.lastPoint.x - 1)
            maxx = (a.lastPoint.x + 1);
            miny = (a.lastPoint.y - 1);
            maxy = (a.lastPoint.y + 1);
        }
    } else {
        //a, b, and c are position values, treat them as such
        f = c;
        tile = _Game.getTile(a, b, c);
        //keep a 3x3 list of tiles around the current tile
        minx = (a - 1);
        maxx = (a + 1);
        miny = (b - 1);
        maxy = (b + 1);
    }
    if (_Game.world.user.floor != f)
        //don't re-draw doors if the user is not on the same floor as the door
        return;
    if (_Game.world.tiles[f]) {
        //the floor exists in the game cache
        //get context and starting y tile
        var ctx_m1 = _Game.layers.m1.getContext("2d");
        var basey = (DRAW_DISTANCE + (miny - _Game.world.user.y)) * TILE_SIZE;
        
        //ctx_m1.clearRect(destx, desty, TILE_SIZE*3, TILE_SIZE*3);
        
        //set current x tile to starting x tile
        destx = (DRAW_DISTANCE + (minx - _Game.world.user.x)) * TILE_SIZE;
        //for each tile in the 3x3 grid
        for (var x = minx; x <= maxx; x++) { //x
            if (_Game.world.tiles[f][x]) {
                //x row exists in game cache
                desty = basey; //set current y tile to starting y tile
                for (var y = miny; y <= maxy; y++) { //y
                    var tile = _Game.world.tiles[f][x][y];
                    if (tile && tile.attr1 == 5 || tile.attr2 == 5) {
                        //tile exits in game cache, clear it
                        ctx_m1.clearRect(destx, desty, TILE_SIZE, TILE_SIZE);
                        if (tile.m2e && !_Game.isHideDoor(x, y, f)) {
                            //mask2 data exists, and not an open door. Draw mask2 + mask1 + ground
                            ctx_m1.drawImage(tile.m2, destx, desty);
                        } else if (tile.m1e) {
                            //mask2 data does not exist, but mask1 data does. Draw mask1 + ground
                            ctx_m1.drawImage(tile.m1, destx, desty);
                        } else if (tile.gre) {
                            //only ground data exists. Draw ground
                            ctx_m1.drawImage(tile.gr, destx, desty);
                        }
                    }
                    desty += TILE_SIZE; //next y tile
                }
            }
            destx += TILE_SIZE; //next x tile
        }
    }
}

/**
 * Get the x position on the canvas to draw a tile
 * @param {type} x the x location of the tile in the world
 * @param {type} offsetX the offset to include
 * @returns {Number} the x position on the canvas to draw the tile
 */
_Game.getCanvasX = function(x, offsetX) {
    //if not offset is given
    if (offsetX === undefined)
        //get moved offset for user
        offsetX = _Game.getMovedX(_Game.world.user)
    //calulate middle of canvas
    var middleX = (_Game.canvas.width / 2) + offsetX;
    //return tile x position
    return ((x - _Game.world.user.x) * TILE_SIZE) + middleX;
}

/**
 * Get the y position on the canvas to draw a tile
 * @param {type} y the y location of the tile in the world
 * @param {type} offsetY the offset to include
 * @returns {Number} the y position on the canvas to draw the tile
 */
_Game.getCanvasY = function(y, offsetY) {
    //if no offset is given
    if (offsetY === undefined)
        //get moved offset for user
        offsetY = _Game.getMovedY(_Game.world.user);
    //calulate middle of canvas
    var middleY = (_Game.canvas.height / 2) + offsetY;
    //return tile y position
    return ((y - _Game.world.user.y) * TILE_SIZE) + middleY;
}

/**
 * Get the offset x for a character based on how much they've moved
 * @param {type} char the character to check
 * @returns {Number} the x offset to draw the character at
 */
_Game.getMovedX = function(char) {
    //if the character is moving
    if (char.direction != 0) {
        //if the character is moving left
        if (char.direction == 37) {
            return 0 - (TILE_SIZE - char.moved);
        //if the character is moving right
        } else if (char.direction == 39) {
            return 0 + (TILE_SIZE - char.moved);
        }
    }
    //character is not moving
    return 0;
}

/**
 * Get the offset y for a character based on how much they've moved
 * @param {type} char the character to check
 * @returns {Number} the y offset to draw the character at
 */
_Game.getMovedY = function(char) {
    //if the character is moving
    if (char.direction != 0) {
        //if the character is moving up
        if (char.direction == 38) {
            return 0 - (TILE_SIZE - char.moved);
        //if the character is moving down
        } else if (char.direction == 40) {
            return 0 + (TILE_SIZE - char.moved);
        }
    }
    //character is not moving
    return 0;
}

/**
 * Check if a given location is blocked from player movement.
 * @param dir the direction to check, using arrowkey keycodes
 * @param {type} x the x position of the player
 * @param {type} y the y position of the player
 * @param {type} floor the floor of the player
 * @return {Boolean} true if the player is blocked from moving in the given direction, false otherwise
 */
_Game.isBlocked = function(dir, x, y, floor) {
    var tile;
    if (dir == 37) { // left
        if (x <= 0)
            //player is at edge of world, block
            return true;
        tile = _Game.getTile(x - 1, y, floor);
    } else if (dir == 38) { // up
        if (y <= 0)
            //player is at edge of world, block
            return true;
        tile = _Game.getTile(x, y - 1, floor);
    } else if (dir == 39) { // right
        if (x >= 2000000000)
            //player is at edge of world, block
            return true;
        tile = _Game.getTile(x + 1, y, floor);
    } else if (dir == 40) { // down
        if (y >= 2000000000)
            //player is at edge of world, block
            return true;
        tile = _Game.getTile(x, y + 1, floor);
    }
    //check for blocked attribute
    if (tile && (tile.attr1 == 1 || tile.attr2 == 1))
        return true;
    //check for npc
    else if (_Game.world.npcTile[Tile.key(tile)])
        return true;
    //not blocked
    else
        return false;
}

/**
 * Check a given position for whether or not the game should hide door tiles if a player is at that location
 * @param {type} x the x position to check
 * @param {type} y the y position to check
 * @param {type} f the floor to check
 * @returns {Boolean} true if the door tile should be hidden, false otherwise */
_Game.isHideDoor = function(x, y, f) {
    var tile = _Game.getTile(x, y, f);
    if (!tile) {
        return false;
    }
    // if there is no door attribute at this tile
    if ((tile.attr1 != 5 && tile.attr2 != 5)) {
        return false;
    } else {
        //if the user is on a door
        var user = _Game.getTile(_Game.world.user.x, _Game.world.user.y, _Game.world.user.floor);
        if (user) {
            if (user.attr1 == 5 || user.attr2 == 5) {
                // if the door the user is on is or is adjacent to this tile
                if ((user.x <= x + 1 && user.x >= x - 1) && (user.y <= y + 1 && user.y >= y - 1)) {
                    return true;
                }
            }
        }
        //or was on a door
        var last = _Game.getTile(_Game.world.user.lastPoint.x, _Game.world.user.lastPoint.y, _Game.world.user.lastPoint.floor);
        if (last && _Game.world.user.direction != 0) {
            if (last.attr1 == 5 || last.attr2 == 5) {
                // if the door the user is walking on to is or is adjacent to this tile
                if ((last.x <= x + 1 && last.x >= x - 1) && (last.y <= y + 1 && last.y >= y - 1)) {
                    return true;
                }
            }
        }

        // also open doors for other players
        for (key in _Game.world.players) {
            // if the other player is on a door
            var player = _Game.getTile(_Game.world.players[key].x, _Game.world.players[key].y, _Game.world.players[key].floor);
            if (player) {
                if (player.attr1 == 5 || player.attr2 == 5) {
                    // if the door the player is on is or is adjacent to this tile
                    if ((player.x <= x + 1 && player.x >= x - 1) && (player.y <= y + 1 && player.y >= y - 1)) {
                        return true;
                    }
                }
            }
            //or was on a door
            var last = _Game.getTile(_Game.world.players[key].lastPoint.x, _Game.world.players[key].lastPoint.y, _Game.world.players[key].lastPoint.floor);
            if (last && _Game.world.players[key].direction != 0) {
                if (last.attr1 == 5 || last.attr2 == 5) {
                    // if the door the player is walking on to is or is adjacent to this tile
                    if ((last.x <= x + 1 && last.x >= x - 1) && (last.y <= y + 1 && last.y >= y - 1)) {
                        return true;
                    }
                }
            }
        }
        

        // also open doors for other players
        for (key in _Game.world.npcs) {
            // if the other player is on a door
            var npc = _Game.getTile(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor);
            if (npc) {
                if (npc.attr1 == 5 || npc.attr2 == 5) {
                    // if the door the player is on is or is adjacent to this tile
                    if ((npc.x <= x + 1 && npc.x >= x - 1) && (npc.y <= y + 1 && npc.y >= y - 1)) {
                        return true;
                    }
                }
            }
            //or was on a door
            var last = _Game.getTile(_Game.world.npcs[key].lastPoint.x, _Game.world.npcs[key].lastPoint.y, _Game.world.npcs[key].lastPoint.floor);
            if (last && _Game.world.npcs[key].direction != 0) {
                if (last.attr1 == 5 || last.attr2 == 5) {
                    // if the door the player is walking on to is or is adjacent to this tile
                    if ((last.x <= x + 1 && last.x >= x - 1) && (last.y <= y + 1 && last.y >= y - 1)) {
                        return true;
                    }
                }
            }
        }
        // no one standing on door, do not hide
        return false;
    }
}

/**
 * Check a given position for whether or not the game should hide roof tiles if the player is at that location
 * @param {type} x the x position to check
 * @param {type} y the y posiiton to check
 * @param {type} f the floor to check
 * @returns {Boolean} true if the roof tiles should be hidden, false otherwise
 */
_Game.isHideRoof = function(x, y, f) {
    var tile = _Game.getTile(x, y, f); //get tile at location
    if (!tile) {
        //no tile here, don't hide roof
        return false;
    }
    //make sure the user is on this floor
    var user = _Game.getTile(_Game.world.user.x, _Game.world.user.y, f);
    if (user) {
        //user is on this floor, check for roof attribute
        if (tile.attr1 != 4 && tile.attr2 != 4) {
            return false; //tile is not roof
        }
        if (user.attr1 != 4 && user.attr2 != 4) {
            return false; //user is not under roof
        }
        return true; //user is under roof, tile is roof, hide tile.
    }
    return false;
}

/**
 * Handle a keyboard keyDown event
 * @param {type} e event data
 */
_Game.keyDown = function(e) {
    //do key_down module hook
    Module.doHook("key_down", {admin: false, key: e.which});
    
    //check to make sure that the user isn't typing text
    if ($(":focus").length > 0) {
        if ($(":focus").prop("tagName") == "INPUT") {
            //user is typing text, don't process key events
            return;
        }
    }
    
    var key = 0;
    //treat WSAD keys as arrow keys
    switch (e.which) {
        case 65:
            key = 37;
            break;
        case 87:
            key = 38;
            break;
        case 68:
            key = 39;
            break;
        case 83:
            key = 40;
            break;
        default:
            key = e.which;
    }
    
    //if the key pressed in an arrow key
    if (key >= 37 && key <= 40) {
        e.preventDefault(); //prevent page scrolling
        if (_Game.curKey != key) { // prevent repeat
            if (_Game.world.user.direction == 0) {
                if (!_Game.isBlocked(key, _Game.world.user.x, _Game.world.user.y, _Game.world.user.floor)) {
                    _Game.world.user.direction = key;
                    _Game.world.user.facing = key;
                    //move user
                    _Game.world.user.move();
                    //_Game.reDraw();
                    _Game.doReDraw = true;
                    //send move information
                    _Game.socket.send("move:" + _Game.world.user.direction);
                } else {
                    // make user face the direction even if he can't move that way
                    _Game.world.user.direction = 0;
                    _Game.world.user.facing = key;
                    _Game.socket.send("face:" + _Game.world.user.facing);
                }
            }
            _Game.world.user.nextDir = key;
            
            _Game.curKey = e.which;
        }
    } else if (key == 32) {
        //interact
        _Game.socket.send("act:" + _Game.world.user.facing);
        Module.doHook("act", {dir: _Game.world.user.facing});
    }

    // if (e.which == 16) {
    // _Game.world.user.sprinting = true;
    // }
    
    //forward keypress to UI
    _UI.keyDown(e);
}

/**
 * Handle a keyboard keyUp event
 * @param {type} e event data
 */
_Game.keyUp = function(e) {
    //do key_up module hook
    Module.doHook("key_up", {admin: false, key: e.which});
    
    //check to make sure that the user isn't typing text
    if ($(":focus").length > 0) {
        if ($(":focus").prop("tagName") == "INPUT") {
            //user is typing text, don't process key events
            return;
        }
    }
    
    var key = 0;
    //treat WSAD keys as arrow keys
    switch (e.which) {
        case 65:
            key = 37;
            break;
        case 87:
            key = 38;
            break;
        case 68:
            key = 39;
            break;
        case 83:
            key = 40;
            break;
        default:
            key = e.which;
    }
    
    if (key == _Game.world.user.direction) {
        //released directional key
        e.preventDefault();
        _Game.world.user.nextDir = 0;
    }
    
    _Game.curKey = 0;

    // if (e.which == 16) {
    // _Game.world.user.sprinting = false;
    // }
}

/**
 * handle a canvas onClick event
 * @param {type} e event data
 */
_Game.onClick = function(e) {
    _UI.HideMenu(); //hide any open menu
    //get clicked location
    _Game.world.user.target = null;
    var x = _Game.getClickedX(e);
    var y = _Game.getClickedY(e);
    
    //check players for potential target
    for (key in _Game.world.players) {
        if (_Game.world.players[key].floor == _Game.world.user.floor) {
            if (_Game.world.players[key].x == x && _Game.world.players[key].y == y) {
                //clicked on another player, target them
                _Game.world.user.target = _Game.world.players[key];
                return;
            }
        }
    }
    //check npcs for potential target
    for (key in _Game.world.npcs) {
        if (_Game.world.npcs[key].floor == _Game.world.user.floor) {
            if (_Game.world.npcs[key].x == x && _Game.world.npcs[key].y == y) {
                //clicked on an npc, target it
                _Game.world.user.target = _Game.world.npcs[key];
                return;
            }
        }
    }
    
    //do click module hook
    Module.doHook("click", {admin:false, x: x, y: y});
}

/**
 * Handle a WebSocket message event
 * @param {type} data the message
 */
_Game.onMessage = function(data) {
    var n = data.split(":"); //split the message
    var message = n.splice(0, 1); //splice out first word
    message.push(n.join(':')); //join remaining words

    //switch message head
    switch (message[0]) {
        case "login":
            if (message[1] == "1") {
                // success
                console.log("Logged in.");
                _Game.socket.send("char:1");
            } else {
                // failure
                alert("Incorrect login information");
                $("#login-form").dialog("open");
            }
            break;
        case "register":
            if (message[1] == "1") {
                // success
                alert("Registered successfully!");
                $("#login-form").dialog("open");
            } else {
                // failure
                alert("Username taken, try again.");
                $("#login-form").dialog("open");
            }
        case "load":
            console.log("Loading game");
            //send tile data to the world
            _Game.loadWorld(message[1]);
            //load the game
            _Game.loadGame();
            break;
        case "enter":
            //player enters local context
            var n = JSON.parse(message[1]); //player info
            if (!_Game.world.players[n.id]) {
                //player info doesn't exist in local context, create it
                _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
                _Game.reDrawDoor(_Game.world.players[n.id]); //update any open/closed doors
            }
            break;
        case "leave":
            //player leaves local context
            var n = parseInt(message[1]); //player info
            //remember player location
            var x = _Game.world.players[n].x;
            var y = _Game.world.players[n].y;
            var f = _Game.world.players[n].floor;
            //delete player from local context
            delete _Game.world.players[n];
            _Game.reDrawDoor(x, y, f); //update any open/closed doors at the player's last location
            break;
        case "more":
            var n = JSON.parse(message[1]);
            //load tiles
            _Game.updateWorld(n.tiles);
            //load players
            var players = n.players;
            for (var i = 0; i < players.length; i++) {
                var p = players[i];
                _Game.world.players[p.id] = new Player(p.id, p.n, p.x, p.y, p.f, p.s);
                _Game.reDrawDoor(_Game.world.players[p.id]);
            }
            //load npcs
            for (var i = 0; i < n.npcs.length; i++) {
                var npc = n.npcs[i].split(",");
                var id = parseInt(npc[0]);
                var x = parseInt(npc[1]);
                var y = parseInt(npc[2]);
                var f = parseInt(npc[3]);
                var s = parseInt(npc[4]);
                _Game.world.npcs[id] = new NPC(id, npc[5], x, y, f, s);
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            }
            break;
        case "move":
            var n = JSON.parse(message[1]);
            //other player moves
            if (!_Game.world.players[n.id]) {
                //player info doesn't exist in local context, create it
                _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
                _Game.reDrawDoor(_Game.world.players[n.id]);
            } else {
                //player info exists in local context, update it
                _Game.world.players[n.id].resetLastPoint();
                _Game.world.players[n.id].x = n.x;
                _Game.world.players[n.id].y = n.y;
                _Game.world.players[n.id].floor = n.f;
                _Game.reDrawDoor(_Game.world.players[n.id]);
            }
            //save direction and facing information
            _Game.world.players[n.id].direction = n.dir;
            _Game.world.players[n.id].facing = n.dir;
            _Game.world.players[n.id].moved = 0;
            break;
        case "snap":
            var n = JSON.parse(message[1]);
            //snap user
            var point = _Game.world.user.lastPoint;
            if (n.x != point.x && n.y != point.y && n.f != point.f) {
                _Game.world.user.x = n.x;
                _Game.world.user.y = n.y
                //_Game.world.user.floor = n.f;
                _Game.doReDraw = true;
                //_Game.reDraw();
            }
            _Game.stats.player = n.stats.p;
            _Game.stats.tree = n.stats.t;
            break;
        case "face":
            var n = JSON.parse(message[1]);
            _Game.world.players[n.id].facing = n.dir;
            break;
        case "warp":
            var n = JSON.parse(message[1]);
            if (n.id) {
                //other player warping, update information
                _Game.world.players[n.id].x = n.x;
                _Game.world.players[n.id].y = n.y;
                _Game.world.players[n.id].floor = n.f;
                _Game.world.players[n.id].moved = 0;
                _Game.world.players[n.id].direction = 0;
                _Game.reDrawDoor(_Game.world.players[n.id]);
                _Game.world.players[n.id].resetLastPoint();
                _Game.world.players[n.id].lastDoor = false;
                _Game.reDrawDoor(_Game.world.players[n.id]);
            } else {
                //this player warping
                _Game.world.user.x = n.x;
                _Game.world.user.y = n.y;
                _Game.world.user.floor = n.f;
                _Game.world.user.moved = 0;
                _Game.world.user.direction = 0;
                //load tiles
                _Game.updateWorld(n.tiles);
                _Game.reDraw();
                //load npcs
                for (var i = 0; i < n.npcs.length; i++) {
                    var npc = n.npcs[i].split(",");
                    var id = parseInt(npc[0]);
                    var x = parseInt(npc[1]);
                    var y = parseInt(npc[2]);
                    var f = parseInt(npc[3]);
                    var s = parseInt(npc[4]);
                    _Game.world.npcs[id] = new NPC(id, npc[5], x, y, f, s);
                    _Game.world.npcTile[Tile.key(x, y, f)] = id;
                }
            }
            break;
        case "floor":
            var n = JSON.parse(message[1]);
            if (n.id) {
                //other player changing floor, update information
                _Game.world.players[n.id].floor = n.f;
                _Game.world.players[n.id].moved = 0;
                _Game.world.players[n.id].direction = 0;
                _Game.reDrawDoor(_Game.world.players[n.id]);
                _Game.world.players[n.id].resetLastPoint();
                _Game.world.players[n.id].lastDoor = false;
                _Game.reDrawDoor(_Game.world.players[n.id]);
            } else {
                //this player changing floor
                _Game.world.user.floor = n.f;
                _Game.world.user.moved = 0;
                _Game.world.user.direction = 0;
            }
            break;
        case "npc-move":
            var n = JSON.parse(message[1]);
            //get npc info
            var npc = n.npc.split(",");
            var id = parseInt(npc[0]);
            var x = parseInt(npc[1]);
            var y = parseInt(npc[2]);
            var f = parseInt(npc[3]);
            var s = parseInt(npc[4]);
            
            if (!_Game.world.npcs[id]) {
                //npc doesn't exist in local context, create it
                _Game.world.npcs[id] = new NPC(id, npc[5], x, y, f, s);
            } else {
                //npc exists in local context, update it
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[id].x, _Game.world.npcs[id].y, _Game.world.npcs[id].floor)];
                _Game.world.npcs[id].resetLastPoint();
                _Game.world.npcs[id].x = x;
                _Game.world.npcs[id].y = y;
                _Game.world.npcs[id].floor = f;
            }
            //check if NPC moves out of local area
            var del = false;
            if (_Game.world.npcs[id].direction == 37) { // left
                del = (_Game.world.npcs[id].x < _Game.world.user.x - DRAW_DISTANCE);
            } else if (_Game.world.npcs[id].direction == 38) { // up
                del = (_Game.world.npcs[id].y < _Game.world.user.y - DRAW_DISTANCE);
            } else if (_Game.world.npcs[id].direction == 39) { // right
                del = (_Game.world.npcs[id].x > _Game.world.user.x + DRAW_DISTANCE);
            } else if (_Game.world.npcs[id].direction == 40) { // down
                del = (_Game.world.npcs[id].y > _Game.world.user.y + DRAW_DISTANCE);
            }
            //if it does
            if (del) {
                //remove it from the local context
                delete _Game.world.npcs[id];
            } else {
                //else, update it's info
                _Game.world.npcs[id].direction = n.dir;
                _Game.world.npcs[id].facing = n.dir;
                _Game.world.npcs[id].moved = 0;
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            }
            break;
        case "npc-die":
            var id = parseInt(message[1]);
            //if npc exists within local context
            if (_Game.world.npcs[id]) {
                //kill npc
                var npc = _Game.world.npcs[id];
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[id].x, _Game.world.npcs[id].y, _Game.world.npcs[id].floor)];
                delete _Game.world.npcs[id];
                //do npc_die module hook
                Module.doHook("npc_die", {npc: npc});
            }
            
            break;
        case "npc-res":
            //npc ressurection
            var npc = message[1].split(",");
            var id = parseInt(npc[0]);
            var x = parseInt(npc[1]);
            var y = parseInt(npc[2]);
            var f = parseInt(npc[3]);
            var s = parseInt(npc[4]);
            if (!_Game.world.npcs[id]) {
                //npc doesn't exist in local context, spawn it
                _Game.world.npcs[id] = new NPC(id, npc[5], x, y, f, s);
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            } else {
                //npc exists in local context, move it back to spawn
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[id].x, _Game.world.npcs[id].y, _Game.world.npcs[id].floor)];
                _Game.world.npcs[id].resetLastPoint();
                _Game.world.npcs[id].x = x;
                _Game.world.npcs[id].y = y;
                _Game.world.npcs[id].floor = f;
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            }
            break;
    }
    //do message hook
    Module.doHook("message", {admin: false, "head": message[0], "body": message[1]});
}

/**
 * Get the x location on the screen in pixels from a tile x position
 * @param {type} x the x position of the tile
 * @returns {Number} the x location relative to the canvas's upper-left
 */
_Game.getTileX = function(x) {
    var tileX = ((x - _Game.world.user.x) * TILE_SIZE) + (_Game.canvas.width / 2);
    //take into account any user movement that is in-progress
    if (_Game.world.user.direction != 0) {
        if (_Game.world.user.direction == 37) { // left
            tileX -= TILE_SIZE - _Game.world.user.moved;
        } else if (_Game.world.user.direction == 39) { // right
            tileX += TILE_SIZE - _Game.world.user.moved;
        }
    }
    return Math.floor(tileX);
}

/**
 * Get the y location on the screen in pixels from a tile x position
 * @param {type} y the y position of the tile
 * @returns {Number} the y location relative to the canvas's upper-left
 */
_Game.getTileY = function(y) {
    var tileY = ((y - _Game.world.user.y) * TILE_SIZE) + (_Game.canvas.height / 2);
    //take into account any user movement that is in-progress
    if (_Game.world.user.direction != 0) {
        if (_Game.world.user.direction == 38) { // up
            tileY -= TILE_SIZE - _Game.world.user.moved;
        } else if (_Game.world.user.direction == 40) { // down
            tileY += TILE_SIZE - _Game.world.user.moved;
        }
    }
    return Math.floor(tileY);
}

/**
 * Get the tile x position from a mouse even on the screen
 * @param {type} e the mouse event on the screen
 * @returns {Number} the clicked tile's x position
 */
_Game.getClickedX = function(e) {
    var middleX = ($("#game").width() / 2);
    var tileRatio = $("#game").width() / CLIENT_WIDTH;
    return _Game.world.user.x + Math.floor((((e.pageX - $("#game").offset().left) - middleX) / tileRatio) / TILE_SIZE);
}

/**
 * Get the tile y position from a mouse even on the screen
 * @param {type} e the mouse event on the screen
 * @returns {Number} the clicked tile's y position
 */
_Game.getClickedY = function(e) {
    var middleY = ($("#game").height() / 2);
    var tileRatio = $("#game").height() / CLIENT_HEIGHT;
    return _Game.world.user.y + Math.floor((((e.pageY - $("#game").offset().top) - middleY) / tileRatio) / TILE_SIZE);
}

function alphaComposite(mv, ov, a) {
    return (mv * a) + (ov * (1 - a));
}