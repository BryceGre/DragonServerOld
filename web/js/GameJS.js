var isAdmin = false;
_Game.gameTime = 0;
// Game Variables
_Game.updateTime = 0;
_Game.lastTime = $.now();
_Game.canvas;
_Game.context;
_Game.testcontext;
_Game.curKey = 0;
// Debug Variables
_Game.frameCount = 0;
_Game.FPS = 0;
_Game.lastSecond = 0;

_Game.onLoaded = function() {
    Module.doHook("game_load", {admin: false});
    
    _Game.setupMenu();
    
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

_Game.loadWorld = function(string) {
    var entities = JSON.parse(string);
    
    _Game.gameTime = entities.time;

    var n = entities.user;
    _Game.world.user = new User(n.n, n.x, n.y, n.f, n.s);
    _Game.userID = n.id;

    var players = entities.players;
    for (var i = 0; i < players.length; i++) {
        var n = players[i];
        _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
    }
    
    var npcs = entities.npcs;
    for (var i = 0; i < npcs.length; i++) {
        var n = npcs[i].split(",");
        var id = parseInt(n[0]);
        var x = parseInt(n[1]);
        var y = parseInt(n[2]);
        var f = parseInt(n[3]);
        var s = parseInt(n[4]);
        
        _Game.world.npcs[id] = new NPC(x, y, f, s);
        _Game.world.npcTile[Tile.key(x, y, f)] = id;
    }
    
    _Game.updateWorld(entities.tiles);
    
    var playerTile = _Game.getTile(_Game.world.user.x, _Game.world.user.y, _Game.world.user.floor);
    if (playerTile && playerTile.music > 0) {
        Game.playMusic(playerTile.music);
    }
    Module.doHook("world_load", {});
}

_Game.onUpdate = function(elapsed) {
    _Game.gameTime += (TIME_FACTOR * elapsed);
    
    _Game.updateTime += elapsed;
    var intervalTime = 1000 / FRAME_RATE;
    while (_Game.updateTime >= intervalTime) {
        if (_Game.world.user.direction != 0) {
            _Game.world.user.moved += MOVE_SPEED;
            if (_Game.world.user.moved >= TILE_SIZE) {
                _Game.world.user.moved = 0;
                //if next tile is blocked
                if (_Game.isBlocked(_Game.world.user.nextDir, _Game.world.user.x, _Game.world.user.y, _Game.world.user.floor)) {
                    // make user face the direction even if he can't move that way
                    _Game.world.user.facing = _Game.world.user.nextDir;
                    _Game.socket.send("face:" + _Game.world.user.facing);
                    _Game.world.user.nextDir = 0;
                }
                //update to next direction
                _Game.world.user.direction = _Game.world.user.nextDir;
                if (_Game.world.user.direction != 0) {
                    _Game.world.user.facing = _Game.world.user.direction;
                    //move user
                    _Game.world.user.move();
                    //send move information
                    _Game.socket.send("move:" + _Game.world.user.direction);
                }
            }
        }

        for (key in _Game.world.players) {
            if (_Game.world.players[key].direction != 0) {
                _Game.world.players[key].moved += MOVE_SPEED;
                if (_Game.world.players[key].moved >= TILE_SIZE) {
                    _Game.world.players[key].moved = 0;
                    _Game.world.players[key].direction = 0;
                }
            }
        }
        
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].direction != 0) {
                _Game.world.npcs[key].moved += MOVE_SPEED;
                if (_Game.world.npcs[key].moved >= TILE_SIZE) {
                    _Game.world.npcs[key].moved = 0;
                    _Game.world.npcs[key].direction = 0;
                }
            }
        }
        
        _Game.updateTime -= intervalTime;
        Module.doHook("on_update", {admin: false});
    }
    
    Module.doHook("raw_update", {admin: false, elapsed: elapsed});
}

_Game.onDraw = function(elapsed) {
    var nowTime = $.now();
    var hours = new Date(_Game.gameTime).getUTCHours();
    _Game.context.clearRect(0, 0, _Game.canvas.width, _Game.canvas.height);

    // to reduce math, do calculations now:
    var offsetX = 0;
    var offsetY = 0;
    if (_Game.world.user.direction != 0) {
        if (_Game.world.user.direction == 37) { // left
            offsetX -= (TILE_SIZE - _Game.world.user.moved);
        } else if (_Game.world.user.direction == 38) { // up
            offsetY -= (TILE_SIZE - _Game.world.user.moved);
        } else if (_Game.world.user.direction == 39) { // right
            offsetX += (TILE_SIZE - _Game.world.user.moved);
        } else if (_Game.world.user.direction == 40) { // down
            offsetY += (TILE_SIZE - _Game.world.user.moved);
        }
    }
    var middleX = (_Game.canvas.width / 2) + offsetX;
    var middleY = (_Game.canvas.height / 2) + offsetY;
    var night = 0;
    //day is between 6:00am and 6:00pm //TODO: configurable times
    if (hours <= 6 || hours >= 18) {
        night = TILE_SIZE;
    }
    Module.doHook("pre_draw", {admin: false, elapsed: elapsed});

    // Draw objects under player
    for (var f = 0; f <= _Game.world.user.floor; f++) {
        var destsize = TILE_SIZE - (2 * (_Game.world.user.floor - f));
        for (var x = (_Game.world.user.x - DRAW_DISTANCE); x < (_Game.world.user.x + DRAW_DISTANCE); x++) {
            var destx = ((x - _Game.world.user.x) * destsize) + middleX;
            for (var y = (_Game.world.user.y - DRAW_DISTANCE); y < (_Game.world.user.y + DRAW_DISTANCE); y++) {
                var desty = ((y - _Game.world.user.y) * destsize) + middleY;
                var tile = _Game.getTile(x, y, f);
                if (tile) {
                    Module.doHook("pre_draw_mask", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw ground
                    if (tile.grs != 0 || tile.grx != 0 || tile.gry != 0) {
                        _Game.context.drawImage(tile.gr, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                    }
                    Module.doHook("draw_gr", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw mask 1
                    if (tile.m1s != 0 || tile.m1x != 0 || tile.m1y != 0) {
                        _Game.context.drawImage(tile.m1, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                    }
                    Module.doHook("draw_m1", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw mask2
                    if (tile.m2s != 0 || tile.m2x != 0 || tile.m2y != 0) {
                        // check for door=
                        if (!_Game.isHideDoor(x, y, f)) {
                            // no one standing on door, leave shown
                            _Game.context.drawImage(tile.m2, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                        }
                    }
                    Module.doHook("draw_m2", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw mask anim.
                    if (Math.floor(nowTime / 1000) % 2 == 0) {
                        if (tile.mas != 0 || tile.max != 0 || tile.may != 0) {
                            _Game.context.drawImage(tile.ma, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                        }
                        Module.doHook("draw_ma", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                    }
                    Module.doHook("post_draw_mask", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                    if (f < _Game.world.user.floor) {
                        Module.doHook("pre_draw_fringe", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                        // draw fringe 1
                        if (tile.f1s != 0 || tile.f1x != 0 || tile.f1y != 0) {
                            _Game.context.drawImage(tile.f1, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                        }
                        Module.doHook("draw_f1", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                        // draw fringe 2
                        if (tile.f2s != 0 || tile.f2x != 0 || tile.f2y != 0) {
                            // check for roof
                            if (!_Game.isHideRoof(x, y, f)) {
                                // no roof above user, keep all roof tiles shown
                                _Game.context.drawImage(tile.f2, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                            }
                        }
                        Module.doHook("draw_f2", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                        // draw fringe anim
                        if (Math.floor(nowTime / 1000) % 2 == 0) {
                            if (tile.fas != 0 || tile.fax != 0 || tile.fay != 0) {
                                _Game.context.drawImage(tile.fa, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                            }
                            Module.doHook("draw_fa", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                        }
                        Module.doHook("post_draw_fringe", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                    }
                }
            }
        }
    }
    
    //queue the drawing from top to bottom, so that characters underneath other characters will be drawn on top. (head on top of feet)
    var queue = new Array();

    // draw players
    var w = Math.floor(_Game.gfx.Sprites[_Game.world.user.sprite].width / 4);
    var h = Math.floor(_Game.gfx.Sprites[_Game.world.user.sprite].height / 4);
    queue[_Game.world.user.y] = new Array();
    queue[_Game.world.user.y].push({
        type: "user", args: {"user": _Game.world.user},
        sprite: _Game.gfx.Sprites[_Game.world.user.sprite],
        offset: _Game.world.user.getSpriteOffset(),
        width: w, height: h,
        x: (_Game.canvas.width / 2) - ((w/2) - (TILE_SIZE/2)),
        y: (_Game.canvas.height / 2) - (h - TILE_SIZE)
    });
    for (key in _Game.world.players) {
        if (_Game.world.players[key].floor == _Game.world.user.floor) {
            var w = Math.floor(_Game.gfx.Sprites[_Game.world.players[key].sprite].width / 4);
            var h = Math.floor(_Game.gfx.Sprites[_Game.world.players[key].sprite].height / 4);
            var playerX = ((_Game.world.players[key].x - _Game.world.user.x) * TILE_SIZE) + middleX - ((w/2) - (TILE_SIZE/2));
            var playerY = ((_Game.world.players[key].y - _Game.world.user.y) * TILE_SIZE) + middleY - (h - TILE_SIZE);
            if (_Game.world.players[key].direction != 0) {
                if (_Game.world.players[key].direction == 37) { // left
                    playerX += (TILE_SIZE - _Game.world.players[key].moved);
                } else if (_Game.world.players[key].direction == 38) { // up
                    playerY += (TILE_SIZE - _Game.world.players[key].moved);
                } else if (_Game.world.players[key].direction == 39) { // right
                    playerX -= (TILE_SIZE - _Game.world.players[key].moved);
                } else if (_Game.world.players[key].direction == 40) { // down
                    playerY -= (TILE_SIZE - _Game.world.players[key].moved);
                }
            }
            //add player to queue
            if (!queue[_Game.world.players[key].y]) {
                queue[_Game.world.players[key].y] = new Array();
            }
            queue[_Game.world.players[key].y].push({
                type: "player", args: {"player": _Game.world.players[key]},
                sprite: _Game.gfx.Sprites[_Game.world.players[key].sprite],
                offset: _Game.world.players[key].getSpriteOffset(),
                width: w, height: h,
                x: playerX, y: playerY
            });
        }
    }
    for (key in _Game.world.npcs) {
        if (_Game.world.npcs[key].floor == _Game.world.user.floor) {
            var w = Math.floor(_Game.gfx.Sprites[_Game.world.npcs[key].sprite].width / 4);
            var h = Math.floor(_Game.gfx.Sprites[_Game.world.npcs[key].sprite].height / 4);
            var npcX = ((_Game.world.npcs[key].x - _Game.world.user.x) * TILE_SIZE) + middleX - ((w/2) - (TILE_SIZE/2));
            var npcY = ((_Game.world.npcs[key].y - _Game.world.user.y) * TILE_SIZE) + middleY - (h - TILE_SIZE);
            if (_Game.world.npcs[key].direction != 0) {
                if (_Game.world.npcs[key].direction == 37) { // left
                    npcX += (TILE_SIZE - _Game.world.npcs[key].moved);
                } else if (_Game.world.npcs[key].direction == 38) { // up
                    npcY += (TILE_SIZE - _Game.world.npcs[key].moved);
                } else if (_Game.world.npcs[key].direction == 39) { // right
                    npcX -= (TILE_SIZE - _Game.world.npcs[key].moved);
                } else if (_Game.world.npcs[key].direction == 40) { // down
                    npcY -= (TILE_SIZE - _Game.world.npcs[key].moved);
                }
            }
            //add npc to queue
            if (!queue[_Game.world.npcs[key].y]) {
                queue[_Game.world.npcs[key].y] = new Array();
            }
            queue[_Game.world.npcs[key].y].push({
                type: "npc", args: {"npc": _Game.world.npcs[key]},
                sprite: _Game.gfx.Sprites[_Game.world.npcs[key].sprite],
                offset: _Game.world.npcs[key].getSpriteOffset(),
                width: w, height: h,
                x: npcX, y: npcY
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
    var f = _Game.world.user.floor;
    for (var x = (_Game.world.user.x - DRAW_DISTANCE); x < (_Game.world.user.x + DRAW_DISTANCE); x++) {
        var destx = ((x - _Game.world.user.x) * TILE_SIZE) + middleX;
        for (var y = (_Game.world.user.y - DRAW_DISTANCE); y < (_Game.world.user.y + DRAW_DISTANCE); y++) {
            var desty = ((y - _Game.world.user.y) * TILE_SIZE) + middleY;
            var tile = _Game.getTile(x, y, f);
            if (tile) {
                Module.doHook("pre_draw_fringe", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                // draw fringe 1
                if (tile.f1s != 0 || tile.f1x != 0 || tile.f1y != 0) {
                    _Game.context.drawImage(tile.f1, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, TILE_SIZE, TILE_SIZE);
                }
                Module.doHook("draw_f1", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                // draw fringe 2
                if (tile.f2s != 0 || tile.f2x != 0 || tile.f2y != 0) {
                    // check for roof
                    if (!_Game.isHideRoof(x, y, f)) {
                        // no roof above user, keep all roof tiles shown
                        _Game.context.drawImage(tile.f2, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, TILE_SIZE, TILE_SIZE);
                    }
                }
                Module.doHook("draw_f2", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                // draw fringe anim
                if (tile.fas != 0 || tile.fax != 0 || tile.fay != 0) {
                    if (Math.floor(nowTime / 1000) % 2 == 0) {
                        _Game.context.drawImage(tile.fa, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, TILE_SIZE, TILE_SIZE);
                    }
                    Module.doHook("draw_fa", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
                }
                Module.doHook("post_draw_fringe", {admin: false, "x": x, "y": y, "floor": f, "tile": tile});
            }
        }
    }

    Module.doHook("post_draw", {admin: false, elapsed: elapsed});

    // keep track of the last second and _Game.FPS even if not debugging.
    _Game.frameCount++;
    var nowSecond = Math.floor(nowTime / 1000);
    if (nowSecond > _Game.lastSecond) {
        _Game.FPS = _Game.frameCount;
        _Game.frameCount = 0;
        _Game.lastSecond = nowSecond;
    }

    if (DEBUG) {
        _Game.drawDebug();
    }
}

_Game.drawDebug = function() {
    _Game.context.fillText("_Game.FPS: " + _Game.FPS, 0, 10);
    _Game.context.fillText("Player X: " + (_Game.world.user.x - 1000000000), 0, 20);
    _Game.context.fillText("Player Y: " + (_Game.world.user.y - 1000000000), 0, 30);
    _Game.context.fillText("Player Floor: " + _Game.world.user.floor, 0, 40);
    var date = new Date(_Game.gameTime);
    _Game.context.fillText("Game Time: " + date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds(), 0, 50);
}

_Game.isBlocked = function(dir, x, y, floor) {
    var tile;
    if (dir == 37) { // left
        if (x <= 0)
            return true;
        tile = _Game.getTile(x - 1, y, floor);
    } else if (dir == 38) { // up
        if (y <= 0)
            return true;
        tile = _Game.getTile(x, y - 1, floor);
    } else if (dir == 39) { // right
        if (x >= 2000000000)
            return true;
        tile = _Game.getTile(x + 1, y, floor);
    } else if (dir == 40) { // down
        if (y >= 2000000000)
            return true;
        tile = _Game.getTile(x, y + 1, floor);
    }
    if (tile && (tile.attr1 == 1 || tile.attr2 == 1))
        return true;
    else if (_Game.world.npcTile[Tile.key(tile)])
        return true;
    else
        return false;
}

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

_Game.isHideRoof = function(x, y, f) {
    var tile = _Game.getTile(x, y, f);
    if (!tile) {
        return false;
    }
    var user = _Game.getTile(_Game.world.user.x, _Game.world.user.y, f);
    if (user) {
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

_Game.keyDown = function(e) {
    Module.doHook("key_down", {admin: false, key: e.which});
    
    if ($(":focus").length > 0) {
        if ($(":focus").prop("tagName") == "INPUT") {
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
    
    if (key >= 37 && key <= 40) {
        e.preventDefault();
        if (_Game.curKey != key) { // prevent repeat
            if (_Game.world.user.direction == 0) {
                if (!_Game.isBlocked(key, _Game.world.user.x, _Game.world.user.y, _Game.world.user.floor)) {
                    _Game.world.user.direction = key;
                    _Game.world.user.facing = key;
                    //move user
                    _Game.world.user.move();
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
    }

    // if (e.which == 16) {
    // _Game.world.user.sprinting = true;
    // }
}

_Game.keyUp = function(e) {
    Module.doHook("key_up", {admin: false, key: e.which});
    
    if ($(":focus").length > 0) {
        if ($(":focus").prop("tagName") == "INPUT") {
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
        e.preventDefault();
        _Game.world.user.nextDir = 0;
    }
    
    _Game.curKey = 0;

    // if (e.which == 16) {
    // _Game.world.user.sprinting = false;
    // }
}

_Game.onMessage = function(data) {
    var n = data.split(":");
    var message = n.splice(0, 1);
    message.push(n.join(':'));

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
            _Game.loadWorld(message[1]);
            _Game.loadGame();
            break;
        case "enter":
            var n = JSON.parse(message[1]);
            _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
            break;
        case "leave":
            delete _Game.world.players[parseInt(message[1])];
            break;
        case "more":
            var n = JSON.parse(message[1]);
            //load tiles
            _Game.updateWorld(n.tiles);
            //load npcs
            for (var i = 0; i < n.npcs.length; i++) {
                var npc = n.npcs[i].split(",");
                var id = parseInt(npc[0]);
                var x = parseInt(npc[1]);
                var y = parseInt(npc[2]);
                var f = parseInt(npc[3]);
                var s = parseInt(npc[4]);
                _Game.world.npcs[id] = new NPC(x, y, f, s);
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            }
            break;
        case "move":
            var n = JSON.parse(message[1]);
            if (!_Game.world.players[n.id]) {
                _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
            } else {
                _Game.world.players[n.id].resetLastPoint();
                _Game.world.players[n.id].x = n.x;
                _Game.world.players[n.id].y = n.y;
                _Game.world.players[n.id].floor = n.f;
            }
            _Game.world.players[n.id].direction = n.dir;
            _Game.world.players[n.id].facing = n.dir;
            _Game.world.players[n.id].moved = 0;
            break;
        case "npc-move":
            var n = JSON.parse(message[1]);
            
            if (!_Game.world.npcs[n.id]) {
                _Game.world.npcs[n.id] = new NPC(n.x, n.y, n.f, n.s);
            } else {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[n.id].x, _Game.world.npcs[n.id].y, _Game.world.npcs[n.id].floor)];
                _Game.world.npcs[n.id].resetLastPoint();
                _Game.world.npcs[n.id].x = n.x;
                _Game.world.npcs[n.id].y = n.y;
                _Game.world.npcs[n.id].floor = n.f;
            }
            var del = false;
            if (_Game.world.npcs[n.id].direction == 37) { // left
                del = (_Game.world.npcs[n.id].x < _Game.world.user.x - DRAW_DISTANCE);
            } else if (_Game.world.npcs[n.id].direction == 38) { // up
                del = (_Game.world.npcs[n.id].y < _Game.world.user.y - DRAW_DISTANCE);
            } else if (_Game.world.npcs[n.id].direction == 39) { // right
                del = (_Game.world.npcs[n.id].x > _Game.world.user.x + DRAW_DISTANCE);
            } else if (_Game.world.npcs[n.id].direction == 40) { // down
                del = (_Game.world.npcs[n.id].y > _Game.world.user.y + DRAW_DISTANCE);
            }
            if (del) {
                delete _Game.world.npcs[n.id];
            } else {
                _Game.world.npcs[n.id].direction = n.dir;
                _Game.world.npcs[n.id].facing = n.dir;
                _Game.world.npcs[n.id].moved = 0;
                _Game.world.npcTile[Tile.key(n.x, n.y, n.f)] = n.id;
            }
        break;
        case "snap":
            var n = JSON.parse(message[1]);
            //snap user
            var point = _Game.world.user.lastPoint;
            if (n.x != point.x && n.y != point.y && n.f != point.f) {
                _Game.world.user.x = n.x;
                _Game.world.user.y = n.y
                _Game.world.user.floor = n.f;
            }
            break;
        case "face":
            var n = JSON.parse(message[1]);
            _Game.world.players[n.id].facing = n.dir;
            break;
        case "warp":
            var n = JSON.parse(message[1]);
            if (n.id) {
                _Game.world.players[n.id].x = n.x;
                _Game.world.players[n.id].y = n.y;
                _Game.world.players[n.id].floor = n.f;
                _Game.world.players[n.id].floor = n.f;
                _Game.world.players[n.id].moved = 0;
                _Game.world.players[n.id].direction = 0;
            } else {
                _Game.world.user.x = n.x;
                _Game.world.user.y = n.y;
                _Game.world.user.floor = n.f;
                _Game.world.user.moved = 0;
                _Game.world.user.direction = 0;
                //load tiles
                _Game.updateWorld(n.tiles);
                //load npcs
                for (var i = 0; i < n.npcs.length; i++) {
                    var npc = n.npcs[i].split(",");
                    var id = parseInt(npc[0]);
                    var x = parseInt(npc[1]);
                    var y = parseInt(npc[2]);
                    var f = parseInt(npc[3]);
                    var s = parseInt(npc[4]);
                    _Game.world.npcs[id] = new NPC(x, y, f, s);
                    _Game.world.npcTile[Tile.key(x, y, f)] = id;
                }
            }
            break;
        case "floor":
            var n = JSON.parse(message[1]);
            if (n.id) {
                _Game.world.players[n.id].floor = n.f;
                _Game.world.players[n.id].moved = 0;
                _Game.world.players[n.id].direction = 0;
            } else {
                _Game.world.user.floor = n.f;
                _Game.world.user.moved = 0;
                _Game.world.user.direction = 0;
            }
            break;
    }
    Module.doHook("message", {admin: false, "head": message[0], "body": message[1]});
}

function alphaComposite(mv, ov, a) {
    return (mv * a) + (ov * (1 - a));
}