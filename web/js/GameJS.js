var isAdmin = false;
_Game.gameTime = 0;
// Game Variables
_Game.updateTime = 0;
_Game.lastTime = $.now();
_Game.canvas;
_Game.context;
_Game.testcontext;
_Game.layers = null;
_Game.floors = new Array(9);
_Game.size = 0;
_Game.curKey = 0;
_Game.tileWorker = null;
// Debug Variables
_Game.frameCount = 0;
_Game.FPS = 0;
_Game.lastSecond = 0;
_Game.doReDraw = false;

_Game.onLoaded = function() {
    Module.doHook("game_load", {admin: false});
    
    _Game.setupMenu();
    
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
        _Game.reDrawDoor(_Game.world.players[n.id]);
    }
    
    var npcs = entities.npcs;
    for (var i = 0; i < npcs.length; i++) {
        var n = npcs[i].split(",");
        var id = parseInt(n[0]);
        var x = parseInt(n[1]);
        var y = parseInt(n[2]);
        var f = parseInt(n[3]);
        var s = parseInt(n[4]);
        
        _Game.world.npcs[id] = new NPC(n[5], x, y, f, s);
        _Game.world.npcTile[Tile.key(x, y, f)] = id;
    }
    
    _Game.updateWorld(entities.tiles);
    _Game.initDraw();
    //_Game.reDraw();
    _Game.doReDraw = true;
    
    var playerTile = _Game.getTile(_Game.world.user.x, _Game.world.user.y, _Game.world.user.floor);
    if (playerTile && playerTile.music > 0) {
        Game.playMusic(playerTile.music);
    }
    Module.doHook("world_load", {});
}

_Game.initDraw = function() {
    _Game.size = TILE_SIZE * (DRAW_DISTANCE * 2);
    
    for (var f = 0; f < 10; f++) {
        if (!_Game.floors[f]) {
            _Game.floors[f] = document.createElement("canvas");
            _Game.floors[f].width = _Game.size;
            _Game.floors[f].height = _Game.size;
            _Game.floors[f].changed = false;
        }
    }
    
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
                    //_Game.reDraw();
                    _Game.doReDraw = true;
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
    
    if (_Game.doReDraw) {
        _Game.doReDraw = false;
        _Game.reDraw();
    }
    
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
    var destx = middleX - (TILE_SIZE * DRAW_DISTANCE);
    var desty = middleY - (TILE_SIZE * DRAW_DISTANCE);
    
    Module.doHook("pre_draw", {admin: false, elapsed: elapsed});
    
    // Draw lower floors
    for (var f = 0; f < _Game.world.user.floor; f++) {
        //todo: scale
        var scale = 1-((_Game.world.user.floor - f) * 0.05);
        var newx = (_Game.canvas.width / 2) + (offsetX - (TILE_SIZE * DRAW_DISTANCE)) * scale;
        var newy = (_Game.canvas.height / 2) + (offsetY - (TILE_SIZE * DRAW_DISTANCE)) * scale;
        
        _Game.context.drawImage(_Game.floors[f], newx, newy, _Game.size * scale, _Game.size * scale);
    }
    
    // Draw objects under player
    Module.doHook("pre_draw_mask", {admin: false});
    // draw mask 1
    _Game.context.drawImage(_Game.layers.m1, destx, desty);
    // draw make anim
    if (Math.floor(nowTime / 1000) % 2 == 0) {
        _Game.context.drawImage(_Game.layers.ma, destx, desty);
    }
    Module.doHook("post_draw_mask", {admin: false});
    
    //draw target indicator below all characters
    if (_Game.world.user.target) {
        var targetX = ((_Game.world.user.target.x - _Game.world.user.x) * TILE_SIZE) + middleX;
        var targetY = ((_Game.world.user.target.y - _Game.world.user.y) * TILE_SIZE) + middleY;
        if (_Game.world.user.target.direction != 0) {
            if (_Game.world.user.target.direction == 37) { // left
                targetX += (TILE_SIZE - _Game.world.user.target.moved);
            } else if (_Game.world.user.target.direction == 38) { // up
                targetY += (TILE_SIZE - _Game.world.user.target.moved);
            } else if (_Game.world.user.target.direction == 39) { // right
                targetX -= (TILE_SIZE - _Game.world.user.target.moved);
            } else if (_Game.world.user.target.direction == 40) { // down
                targetY -= (TILE_SIZE - _Game.world.user.target.moved);
            }
        }
        _Game.context.drawImage(_Game.target, 0, 0, TILE_SIZE, TILE_SIZE, targetX, targetY, TILE_SIZE, TILE_SIZE);
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
    Module.doHook("pre_draw_fringe", {admin: false});
    // draw fringe 1
    _Game.context.drawImage(_Game.layers.f1, destx, desty);
    // draw fringe anim
    if (Math.floor(nowTime / 1000) % 2 == 0) {
        _Game.context.drawImage(_Game.layers.fa, destx, desty);
    }
    Module.doHook("post_draw_fringe", {admin: false});

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
    _Game.context.fillText("Player Stats: " + _Game.stats.player, 0, 60);
    _Game.context.fillText("Q-Tree Stats: " + _Game.stats.tree, 0, 70);
}

_Game.reDraw = function() {
    //var hours = new Date(_Game.gameTime).getUTCHours();
    //var night = 0;
    //day is between 6:00am and 6:00pm //TODO: configurable times
    //if (hours <= 6 || hours >= 18) {
        //night = TILE_SIZE;
    //}
    
    var destx, desty;
    var minx = (_Game.world.user.x - DRAW_DISTANCE)
    var maxx = (_Game.world.user.x + DRAW_DISTANCE);
    var miny = (_Game.world.user.y - DRAW_DISTANCE);
    var maxy = (_Game.world.user.y + DRAW_DISTANCE);
    
    var ctx_m1, ctx_ma, ctx_f1, ctx_fa;
    
    var now = $.now();
    for (var f = 0; f <= _Game.world.user.floor; f++) {
        if (f < _Game.world.user.floor) {
            if (_Game.floors[f].changed) {
                _Game.floors[f].getContext("2d").clearRect(0, 0, _Game.size, _Game.size);
                _Game.floors[f].changed = false;
            }
            ctx_m1 = _Game.floors[f].getContext("2d");
            ctx_ma = ctx_m1;
            ctx_f1 = ctx_m1;
            ctx_fa = ctx_m1;
        } else {
            ctx_m1 = _Game.layers.m1.getContext("2d");
            ctx_m1.clearRect(0, 0, _Game.size, _Game.size);
            ctx_ma = _Game.layers.ma.getContext("2d");
            ctx_ma.clearRect(0, 0, _Game.size, _Game.size);
            ctx_f1 = _Game.layers.f1.getContext("2d");
            ctx_f1.clearRect(0, 0, _Game.size, _Game.size);
            ctx_fa = _Game.layers.fa.getContext("2d");
            ctx_fa.clearRect(0, 0, _Game.size, _Game.size);
        }
        if (_Game.world.tiles[f]) {
            _Game.floors[f].changed = true;
            destx = 0;
            for (var x = minx; x < maxx; x++) {
                if (_Game.world.tiles[f][x]) {
                    desty = 0;
                    for (var y = miny; y < maxy; y++) {
                        var tile = _Game.world.tiles[f][x][y];
                        if (tile) {
                            // draw mask2 + mask1 + ground
                            if (tile.m2e && !_Game.isHideDoor(x, y, f)) {
                                ctx_m1.drawImage(tile.m2, destx, desty);
                            // draw mask1 + ground
                            } else if (tile.m1e) {
                                ctx_m1.drawImage(tile.m1, destx, desty);
                            //draw ground
                            } else if (tile.gre) {
                                ctx_m1.drawImage(tile.gr, destx, desty);
                            }
                            // draw mask anim.
                            if (tile.mae) {
                                ctx_ma.drawImage(tile.ma, destx, desty);
                            }
                            // draw fringe2 + fringe1
                            if (tile.f2e && !_Game.isHideRoof(x, y, f)) {
                                ctx_f1.drawImage(tile.f2, destx, desty);
                            // draw fringe1
                            } else if (tile.f1e) {
                                ctx_f1.drawImage(tile.f1, destx, desty);
                            }
                            // draw fringe anim
                            if (tile.fae) {
                                ctx_fa.drawImage(tile.fa, destx, desty);
                            }
                        }
                        desty += TILE_SIZE;
                    }
                }
                destx += TILE_SIZE;
            }
        }
    }
    console.log("reDraw time: " + ($.now() - now));
    
    for (var f = _Game.world.user.floor+1; f < 10; f++) {
        if (_Game.floors[f].changed) {
            _Game.floors[f].getContext("2d").clearRect(0, 0, _Game.size, _Game.size);
            _Game.floors[f].changed = false;
        }
    }
}

_Game.reDrawDoor = function(a, b, c) {
    var destx, desty;
    var minx, maxx, miny, maxy;
    var f;
    var tile;
    
    if (b === undefined || c === undefined) {
        f = a.lastPoint.floor;
        tile = _Game.getTile(a.x, a.y, a.floor);
        if (tile.attr1 == 5 || tile.attr2 == 5) {
            if (a.lastDoor == true)
                return;
            a.lastDoor = true;
            minx = (a.x - 1)
            maxx = (a.x + 1);
            miny = (a.y - 1);
            maxy = (a.y + 1);
        } else {
            if (a.lastDoor == false)
                return;
            a.lastDoor = false;
            minx = (a.lastPoint.x - 1)
            maxx = (a.lastPoint.x + 1);
            miny = (a.lastPoint.y - 1);
            maxy = (a.lastPoint.y + 1);
        }
    } else {
        minx = (a - 1)
        maxx = (a + 1);
        miny = (b - 1);
        maxy = (b + 1);
        f = c;
        tile = _Game.getTile(a, b, c);
    }
    if (_Game.world.user.floor != f)
        return;
    if (_Game.world.tiles[f]) {
        
        console.log("reDrawDoor");

        var ctx_m1 = _Game.layers.m1.getContext("2d");
        desty = (DRAW_DISTANCE + (miny - _Game.world.user.y)) * TILE_SIZE;
        destx = (DRAW_DISTANCE + (minx - _Game.world.user.x)) * TILE_SIZE;
        
        ctx_m1.clearRect(destx, desty, TILE_SIZE*3, TILE_SIZE*3);
        
        for (var x = minx; x <= maxx; x++) {
            if (_Game.world.tiles[f][x]) {
                desty = (DRAW_DISTANCE + (miny - _Game.world.user.y)) * TILE_SIZE;
                for (var y = miny; y <= maxy; y++) {
                    var tile = _Game.world.tiles[f][x][y];
                    if (tile) {
                        // draw mask2 + mask1 + ground
                        if (tile.m2e && !_Game.isHideDoor(x, y, f)) {
                            ctx_m1.drawImage(tile.m2, destx, desty);
                        // draw mask1 + ground
                        } else if (tile.m1e) {
                            ctx_m1.drawImage(tile.m1, destx, desty);
                        //draw ground
                        } else if (tile.gre) {
                            ctx_m1.drawImage(tile.gr, destx, desty);
                        }
                    }
                    desty += TILE_SIZE;
                }
            }
            destx += TILE_SIZE;
        }
    }
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

_Game.onClick = function(e) {
    _UI.HideMenu();
    _Game.world.user.target = null;
    var x = _Game.getClickedX(e);
    var y = _Game.getClickedY(e);
    
    for (key in _Game.world.players) {
        if (_Game.world.players[key].floor == _Game.world.user.floor) {
            if (_Game.world.players[key].x == x && _Game.world.players[key].y == y) {
                _Game.world.user.target = _Game.world.players[key];
                return;
            }
        }
    }
    for (key in _Game.world.npcs) {
        if (_Game.world.npcs[key].floor == _Game.world.user.floor) {
            if (_Game.world.npcs[key].x == x && _Game.world.npcs[key].y == y) {
                _Game.world.user.target = _Game.world.npcs[key];
                return;
            }
        }
    }
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
            if (!_Game.world.players[n.id]) {
                _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
                _Game.reDrawDoor(_Game.world.players[n.id]);
            }
            break;
        case "leave":
            var n = parseInt(message[1]);
            var x = _Game.world.players[n].x;
            var y = _Game.world.players[n].y;
            var f = _Game.world.players[n].floor;
            delete _Game.world.players[n];
            _Game.reDrawDoor(x, y, f);
            break;
        case "more":
            var n = JSON.parse(message[1]);
            //load tiles
            var now = $.now();
            _Game.updateWorld(n.tiles);
            console.log("more tiime: " + ($.now() - now));
            //load players
            var players = n.players;
            for (var i = 0; i < players.length; i++) {
                var n = players[i];
                _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
                _Game.reDrawDoor(_Game.world.players[n.id]);
            }
            //load npcs
            for (var i = 0; i < n.npcs.length; i++) {
                var npc = n.npcs[i].split(",");
                var id = parseInt(npc[0]);
                var x = parseInt(npc[1]);
                var y = parseInt(npc[2]);
                var f = parseInt(npc[3]);
                var s = parseInt(npc[4]);
                _Game.world.npcs[id] = new NPC(npc[5], x, y, f, s);
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            }
            break;
        case "move":
            var n = JSON.parse(message[1]);
            if (!_Game.world.players[n.id]) {
                _Game.world.players[n.id] = new Player(n.id, n.n, n.x, n.y, n.f, n.s);
                _Game.reDrawDoor(_Game.world.players[n.id]);
            } else {
                _Game.world.players[n.id].resetLastPoint();
                _Game.world.players[n.id].x = n.x;
                _Game.world.players[n.id].y = n.y;
                _Game.world.players[n.id].floor = n.f;
                _Game.reDrawDoor(_Game.world.players[n.id]);
            }
            _Game.world.players[n.id].direction = n.dir;
            _Game.world.players[n.id].facing = n.dir;
            _Game.world.players[n.id].moved = 0;
            
            _Game.stats.player = n.stats.p;
            _Game.stats.tree = n.stats.t;
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
                    _Game.world.npcs[id] = new NPC(npc[5], x, y, f, s);
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
                _Game.reDrawDoor(_Game.world.players[n.id]);
                _Game.world.players[n.id].resetLastPoint();
                _Game.world.players[n.id].lastDoor = false;
                _Game.reDrawDoor(_Game.world.players[n.id]);
            } else {
                _Game.world.user.floor = n.f;
                _Game.world.user.moved = 0;
                _Game.world.user.direction = 0;
            }
            break;
        case "npc-move":
            var n = JSON.parse(message[1]);
            
            var npc = n.npc.split(",");
            var id = parseInt(npc[0]);
            var x = parseInt(npc[1]);
            var y = parseInt(npc[2]);
            var f = parseInt(npc[3]);
            var s = parseInt(npc[4]);
            
            if (!_Game.world.npcs[id]) {
                _Game.world.npcs[id] = new NPC(npc[5], x, y, f, s);
            } else {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[id].x, _Game.world.npcs[id].y, _Game.world.npcs[id].floor)];
                _Game.world.npcs[id].resetLastPoint();
                _Game.world.npcs[id].x = x;
                _Game.world.npcs[id].y = y;
                _Game.world.npcs[id].floor = f;
            }
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
            if (del) {
                delete _Game.world.npcs[id];
            } else {
                _Game.world.npcs[id].direction = n.dir;
                _Game.world.npcs[id].facing = n.dir;
                _Game.world.npcs[id].moved = 0;
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            }
            break;
        case "npc-die":
            var id = parseInt(message[1]);
            if (_Game.world.npcs[id]) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[id].x, _Game.world.npcs[id].y, _Game.world.npcs[id].floor)];
                delete _Game.world.npcs[id];
            }
            break;
        case "npc-res":
            var npc = message[1].split(",");
            var id = parseInt(npc[0]);
            var x = parseInt(npc[1]);
            var y = parseInt(npc[2]);
            var f = parseInt(npc[3]);
            var s = parseInt(npc[4]);
            if (!_Game.world.npcs[id]) {
                //spawn npc
                _Game.world.npcs[id] = new NPC(npc[5], x, y, f, s);
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            } else {
                //move npc back to spawn
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[id].x, _Game.world.npcs[id].y, _Game.world.npcs[id].floor)];
                _Game.world.npcs[id].resetLastPoint();
                _Game.world.npcs[id].x = x;
                _Game.world.npcs[id].y = y;
                _Game.world.npcs[id].floor = f;
                _Game.world.npcTile[Tile.key(x, y, f)] = id;
            }
            break;
    }
    Module.doHook("message", {admin: false, "head": message[0], "body": message[1]});
}

_Game.getTileX = function(x) {
    var tileX = ((x - _Game.world.user.x) * TILE_SIZE) + (_Game.canvas.width / 2);
    if (_Game.world.user.direction != 0) {
        if (_Game.world.user.direction == 37) { // left
            tileX -= TILE_SIZE - _Game.world.user.moved;
        } else if (_Game.world.user.direction == 39) { // right
            tileX += TILE_SIZE - _Game.world.user.moved;
        }
    }
    return Math.floor(tileX);
}

_Game.getTileY = function(y) {
    var tileY = ((y - _Game.world.user.y) * TILE_SIZE) + (_Game.canvas.height / 2);
    if (_Game.world.user.direction != 0) {
        if (_Game.world.user.direction == 38) { // up
            tileY -= TILE_SIZE - _Game.world.user.moved;
        } else if (_Game.world.user.direction == 40) { // down
            tileY += TILE_SIZE - _Game.world.user.moved;
        }
    }
    return Math.floor(tileY);
}

_Game.getClickedX = function(e) {
    var middleX = ($("#game").width() / 2);
    var tileRatio = $("#game").width() / CLIENT_WIDTH;
    return _Game.world.user.x + Math.floor((((e.pageX - $("#game").offset().left) - middleX) / tileRatio) / TILE_SIZE);
}

_Game.getClickedY = function(e) {
    var middleY = ($("#game").height() / 2);
    var tileRatio = $("#game").height() / CLIENT_HEIGHT;
    return _Game.world.user.y + Math.floor((((e.pageY - $("#game").offset().top) - middleY) / tileRatio) / TILE_SIZE);
}

function alphaComposite(mv, ov, a) {
    return (mv * a) + (ov * (1 - a));
}