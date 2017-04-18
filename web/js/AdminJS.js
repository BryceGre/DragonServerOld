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
 * AdminJS.js is the core game functions specific to /admin.html
 * For core game functions that are shared between admin and game, see Game.js
 */

var isAdmin = true; //let other scripts know this is admin
_Game.updateTime = 0; //statistics
// Game Variables
_Game.lastTime = $.now(); //last time for game loop
_Game.canvas; //game canvas
_Game.context; //game canvas context
_Game.curKey = 0; //current keyboard key being held down
// Debug Variables
_Game.frameCount = 0;
_Game.FPS = 0;
_Game.lastSecond = 0;
// Admin Variables
_Game.editX = 1000000000; //x location of admin map editor window
_Game.editY = 1000000000; //y location of admin map editor window
_Game.editFloor = 3; //floor of admin map editor window
_Game.tileX = 0; //x location of current tile
_Game.tileY = 0; //y location of current tile
_Game.gridW = 0; //width of map editor grid
_Game.gridH = 0; //height of map editor grid
//layers to hide in map editor
_Game.hide = {gr: false, m1: false, m2: false, ma: false, f1: false, f2: false, fa: false, li: false}

/**
 * Called when the page (not game) loads.
 */
_Game.onLoaded = function() {
    Module.doHook("game_load", {admin: true}); //do module hook
    //get the saved preferences
    _Game.gridW = _Game.getPref("GridW");
    _Game.gridH = _Game.getPref("GridH");
    
    //set up UI
    _Game.setupMenu();
    _Game.addContorls();

    //set up login form
    $("#login-form").dialog({autoOpen: false, height: 300, width: 350, modal: true, buttons: {"Log In": function() {
                var JSONObject = {"user": $("#name").val(), "pass": SHA256($("#password").val())}
                _Game.socket.send("login:" + JSON.stringify(JSONObject));
                $(this).dialog("close");
            }}});
    //connect to server
    _Game.connect("admin");
}

/**
 * onUpdate function of the game loop
 * Updates game logic and data
 * @param {float} elapsed time elapsed since end of last game loop
 */
_Game.onUpdate = function(elapsed) {
    _Game.updateTime += elapsed; //add elapsed time to update time
    var intervalTime = 1000 / FRAME_RATE; //ideal time for a frame
    //for each frame that was skipped until now
    while (_Game.updateTime > intervalTime) {
        Module.doHook("on_update", {admin: true}); //do module hook
        _Game.updateTime -= intervalTime; //decrement update time
    }
    //also do a hook for raw_update, which may be inconsistant
    Module.doHook("raw_update", {admin: true, elapsed: elapsed});
}

/**
 * onDraw function of the game loop
 * draws game data to canvas
 * @param {float} elapsed time elapsed since end of last game loop
 */
_Game.onDraw = function(elapsed) {
    var nowTime = $.now();
    //clear the canvas
    _Game.context.clearRect(0, 0, _Game.canvas.width, _Game.canvas.height);

    //get the middle of the canvas
    var middleX = (_Game.canvas.width / 2);
    var middleY = (_Game.canvas.height / 2);
    var night = 0; //TODO: re-add day/night cycle
    //do pre_draw module hook
    Module.doHook("pre_draw", {admin: true, elapsed: elapsed});

    // Draw objects under player
    for (var f = 0; f <= _Game.editFloor; f++) { //for each floor below the player
        var destsize = TILE_SIZE - (2 * (_Game.editFloor - f)); //destination size (lower floors are smaller)
        //for each tile to draw
        for (var x = (_Game.editX - DRAW_DISTANCE); x < (_Game.editX + DRAW_DISTANCE); x++) {
            var destx = ((x - _Game.editX) * destsize) + middleX; //x destination of this tile
            for (var y = (_Game.editY - DRAW_DISTANCE); y < (_Game.editY + DRAW_DISTANCE); y++) {
                var desty = ((y - _Game.editY) * destsize) + middleY; //y destination of this tile
                var tile = _Game.getTile(x, y, f) //get the tile at this location
                if (tile) {
                    //do the pre_draw_tile module hook
                    Module.doHook("pre_draw_tile", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});

                    // draw ground
                    if ((!_Game.hide.gr) && (tile.grs != 0 || tile.grx != 0 || tile.gry != 0)) {
                        _Game.context.drawImage(tile.gr, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                    }
                    Module.doHook("draw_gr", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw mask 1
                    if ((!_Game.hide.m1) && (tile.m1s != 0 || tile.m1x != 0 || tile.m1y != 0)) {
                        _Game.context.drawImage(tile.m1, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                    }
                    Module.doHook("draw_m1", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw mask 2
                    if ((!_Game.hide.m2) && (tile.m2s != 0 || tile.m2x != 0 || tile.m2y != 0)) {
                        _Game.context.drawImage(tile.m2, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                    }
                    Module.doHook("draw_m2", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw mask anim
                    if (Math.floor(nowTime / 1000) % 2 == 0) {
                        if ((!_Game.hide.ma) && (tile.mas != 0 || tile.max != 0 || tile.may != 0)) {
                            _Game.context.drawImage(tile.ma, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                        }
                        Module.doHook("draw_ma", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    }
                    // draw fringe 1
                    if ((!_Game.hide.f1) && (tile.f1s != 0 || tile.f1x != 0 || tile.f1y != 0)) {
                        _Game.context.drawImage(tile.f1, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                    }
                    Module.doHook("draw_f1", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw fringe 2
                    if ((!_Game.hide.f2) && (tile.f2s != 0 || tile.f2x != 0 || tile.f2y != 0)) {
                        _Game.context.drawImage(tile.f2, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                    }
                    Module.doHook("draw_f2", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw fringe anim
                    if (Math.floor(nowTime / 1000) % 2 == 0) {
                        if ((!_Game.hide.fa) && (tile.fas != 0 || tile.fax != 0 || tile.fay != 0)) {
                            _Game.context.drawImage(tile.fa, night, 0, TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                        }
                        Module.doHook("draw_fa", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    }
                    Module.doHook("draw_f1", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                    // draw lights
                    if ((!_Game.hide.li) && (tile.lis != 0 || tile.lix != 0 || tile.liy != 0)) {
                        _Game.context.globalAlpha = 0.5;
                        _Game.context.drawImage(_Game.tilesets[tile.lis], (tile.lix * TILE_SIZE), (tile.liy * TILE_SIZE), TILE_SIZE, TILE_SIZE, destx, desty, destsize, destsize);
                        _Game.context.globalAlpha = 1.0;
                    }

                    //draw attributes
                    if (f == _Game.editFloor) {
                        if (tile.attr1 !== 0) {
                            var attr = Data.map_attr[tile.attr1];
                            if (attr) {
                                _Game.context.save();
                                _Game.context.fillStyle = attr.color;
                                _Game.context.fillText(attr.display, destx + 4, desty + 12);
                                _Game.context.restore();
                            }
                        }
                        if (tile.attr2 !== 0) {
                            var attr = Data.map_attr[tile.attr2];
                            if (attr) {
                                _Game.context.save();
                                _Game.context.fillStyle = attr.color;
                                _Game.context.fillText(attr.display, destx + HALF_SIZE + 4, desty + HALF_SIZE + 12);
                                _Game.context.restore();
                            }
                        }
                    }
                    //do the post_draw_tile module hook
                    Module.doHook("post_draw_tile", {admin: true, "x": x, "y": y, "floor": f, "tile": tile});
                }
            }
        }
    }
    //do the post_draw module hook
    Module.doHook("post_draw", {admin: true, elapsed: elapsed});

    //draw the grid onto the canvas
    for (var x = (_Game.editX - DRAW_DISTANCE); x < (_Game.editX + DRAW_DISTANCE); x++) {
        var destx = ((x - _Game.editX) * TILE_SIZE) + middleX;
        if (((x - 1000000000) % _Game.gridW) == 0) {
            _Game.context.beginPath();
            _Game.context.dashedLine(destx, 0, destx, _Game.canvas.height, [8, 8]);
            _Game.context.strokeStyle = "red";
            _Game.context.lineWidth = 1;
            _Game.context.stroke();
        } else {
            _Game.context.beginPath();
            _Game.context.dashedLine(destx, 0, destx, _Game.canvas.height, [2, 2]);
            _Game.context.strokeStyle = "green";
            _Game.context.lineWidth = 0.5;
            _Game.context.stroke();
        }
    }
    for (var y = (_Game.editY - DRAW_DISTANCE); y < (_Game.editY + DRAW_DISTANCE); y++) {
        var desty = ((y - _Game.editY) * TILE_SIZE) + middleY;
        if (((y - 1000000000) % _Game.gridH) == 0) {
            _Game.context.beginPath();
            _Game.context.dashedLine(0, desty, _Game.canvas.width, desty, [8, 8]);
            _Game.context.strokeStyle = "red";
            _Game.context.lineWidth = 1;
            _Game.context.stroke();
        } else {
            _Game.context.beginPath();
            _Game.context.dashedLine(0, desty, _Game.canvas.width, desty, [2, 2]);
            _Game.context.strokeStyle = "green";
            _Game.context.lineWidth = 0.5;
            _Game.context.stroke();
        }
    }
    
    // keep track of the last second and _Game.FPS even if not debugging.
    _Game.frameCount++;
    var nowSecond = Math.floor(nowTime / 1000);
    if (nowSecond > _Game.lastSecond) {
        _Game.FPS = _Game.frameCount;
        _Game.frameCount = 0;
        _Game.lastSecond = nowSecond;
    }
    
    //draw debug information, if DEBUG is enabled
    _Game.context.fillStyle = "Black";
    if (DEBUG) {
        _Game.drawDebug();
    }
    //also draw information about the admin's current location
    _Game.context.fillText("Tile X: " + (_Game.tileX - 1000000000), middleX - 64, 10);
    _Game.context.fillText("Tile Y: " + (_Game.tileY - 1000000000), middleX - 64, 20);
    _Game.context.fillText("Floor: " + _Game.editFloor, middleX - 64, 30);
}

/**
 * Draw debug information to the upper-left of the screen
 */
_Game.drawDebug = function() {
    _Game.context.fillText("FPS: " + _Game.FPS, 0, 10);
    _Game.context.fillText("Edit X: " + (_Game.editX - 1000000000), 0, 20);
    _Game.context.fillText("Edit Y: " + (_Game.editY - 1000000000), 0, 30);
    _Game.context.fillText("Edit Floor: " + _Game.editFloor, 0, 40);
}

/**
 * Handle a keyboard keyDown event
 * @param {type} e event data
 */
_Game.keyDown = function(e) {
    //check to make sure that the user isn't typing text
    if ($(":focus").length > 0 && $(":focus").prop("tagName") == "INPUT") {
        var type = $(":focus").attr('type');
        //anything text entry where the user may want to back up via arrow keys
        if (type == "input" || type == "date" || type == "datetime" || type == "time" || type == "email" || type == "number" || type == "search" || type == "tel" || type == "url") {
            //user is typing text, don't process key events
            return;
        }
    }
    //if the key pressed in an arrow key
    if (e.which >= 37 && e.which <= 40) {
        e.preventDefault(); //prevent page scrolling
        if (e.which == 37) { // left
            if (_Game.editX > 0) {
                _Game.editX--;
            }
        } else if (e.which == 38) { // up
            if (_Game.editY > 0) {
                _Game.editY--;
            }
        } else if (e.which == 39) { // right
            if (_Game.editX < 2000000000) {
                _Game.editX++;
            }
        } else if (e.which == 40) { // down
            if (_Game.editY < 2000000000) {
                _Game.editY++;
            }
        }
        //send move message
        var JSONObject = {"x": _Game.editX, "y": _Game.editY, "dir": e.which};
        _Game.socket.send("move:" + JSON.stringify(JSONObject));
    }
    //do key_down module hook
    Module.doHook("key_down", {admin: true, key: e.which});
}

/**
 * Handle a keyboard keyUp event
 * @param {type} e event data
 */
_Game.keyUp = function(e) {
    //check to make sure that the user isn't typing text
    if ($(":focus").length > 0) {
        if ($(":focus").prop("tagName") == "INPUT") {
            //user is typing text, don't process key events
            return;
        }
    }
    //if the key pressed in an arrow key
    if (e.which >= 37 && e.which <= 40) {
        e.preventDefault(); //prevent scrolling
    }
    //do key_up module hook
    Module.doHook("key_up", {admin: true, key: e.which});
}

/**
 * handle a canvas onClick event
 * @param {type} e event data
 */
_Game.onClick = function(e) {
    _UI.HideMenu(); //hide any open menu
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
                _Game.socket.send("load");
            } else {
                // failure
                alert("Incorrect login information");
                $("#login-form").dialog("open");
            }
            break;
        case "load":
            console.log("Loading game");
            //send tile data to the world
            _Game.updateWorld(JSON.parse(message[1]).tiles);
            //load the game
            _Game.loadGame();

            //create move move event
            $("#game").mousemove(function(e) {
                _Game.tileX = _Game.getClickedX(e);
                _Game.tileY = _Game.getClickedY(e);
            });
            break;
        case "more":
            console.log("Loading more");
            //send tile data to the world
            _Game.updateWorld(JSON.parse(message[1]).tiles);
            break;
    }
    //do message module hook
    Module.doHook("message", {admin: true, "head": message[0], "body": message[1]});
}

/**
 * Add on-screen controls to the game window
 */
_Game.addContorls = function() {
    //floor slider
    $("#control-floor").slider({min: 0, max: 9, range: "min", value: _Game.editFloor, slide: function(event, ui) {
            _Game.editFloor = ui.value;
            $("#control-ftext").text("Floor: " + ui.value);
        }, stop: function(event, ui) {
            ui.handle.blur();
    }});
    $("#control-ftext").text("Floor: " + _Game.editFloor);

    //warp input x and y
    $("#control-warp-x").val(_Game.editX - 1000000000);
    $("#control-warp-y").val(_Game.editY - 1000000000);
    //warp button
    $("#control-warp-go").button().click(function(e) {
        e.preventDefault();
        _Game.editX = parseInt($("#control-warp-x").val()) + 1000000000;
        _Game.editY = parseInt($("#control-warp-y").val()) + 1000000000;
        var JSONObject = {"x": _Game.editX, "y": _Game.editY, };
        _Game.socket.send("warp:" + JSON.stringify(JSONObject));
    });
    
    //grid size x and y
    $("#control-grid-w").val(_Game.gridW);
    $("#control-grid-h").val(_Game.gridH);
    //grid set button
    $("#control-grid-go").button().click(function(e) {
        e.preventDefault();
        _Game.gridW = ($("#control-grid-w").val());
        _Game.gridH = ($("#control-grid-h").val());
        _Game.setPref("GridW", _Game.gridW);
        _Game.setPref("GridH", _Game.gridH);
    });

    //check boxes to show/hide layers
    $("#control-hide-gr").click(function(e) {
        _Game.hide.gr = this.checked;
    });
    $("#control-hide-m1").click(function(e) {
        _Game.hide.m1 = this.checked;
    });
    $("#control-hide-m2").click(function(e) {
        _Game.hide.m2 = this.checked;
    });
    $("#control-hide-ma").click(function(e) {
        _Game.hide.ma = this.checked;
    });
    $("#control-hide-f1").click(function(e) {
        _Game.hide.f1 = this.checked;
    });
    $("#control-hide-f2").click(function(e) {
        _Game.hide.f2 = this.checked;
    });
    $("#control-hide-fa").click(function(e) {
        _Game.hide.fa = this.checked;
    });
    $("#control-hide-li").click(function(e) {
        _Game.hide.li = this.checked;
    });
}

/**
 * Get the x location on the screen in pixels from a tile x position
 * @param {type} x the x position of the tile
 * @returns {Number} the x location relative to the canvas's upper-left
 */
_Game.getTileX = function(x) {
    var tileX = ((x - _Game.editX) * TILE_SIZE) + (_Game.canvas.width / 2);
    return Math.floor(tileX);
}

/**
 * Get the y location on the screen in pixels from a tile x position
 * @param {type} y the y position of the tile
 * @returns {Number} the y location relative to the canvas's upper-left
 */
_Game.getTileY = function(y) {
    var tileY = ((y - _Game.editY) * TILE_SIZE) + (_Game.canvas.height / 2);
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
    return _Game.editX + Math.floor((((e.pageX - $("#game").offset().left) - middleX) / tileRatio) / TILE_SIZE);
}

/**
 * Get the tile y position from a mouse even on the screen
 * @param {type} e the mouse event on the screen
 * @returns {Number} the clicked tile's y position
 */
_Game.getClickedY = function(e) {
    var middleY = ($("#game").height() / 2);
    var tileRatio = $("#game").height() / CLIENT_HEIGHT;
    return _Game.editY + Math.floor((((e.pageY - $("#game").offset().top) - middleY) / tileRatio) / TILE_SIZE);
}