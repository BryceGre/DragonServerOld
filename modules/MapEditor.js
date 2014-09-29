/* Copyright (c) 2014, Bryce Gregerson
 * All rights reserved.
 *
 * Redistribution and use in source form, with or without modification,
 * are permitted provided that the above copyright notice and this list
 * of conditions are retained.
 */

var DEFAULT_TILE = "0000.......";

/***********************************************/
/***** Properties ******************************/
/***********************************************/
var MapEditor = {
    name: "Map Editor", //module name
    desc: "A simple graphical map editor.", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
    req: {
        //required dependencies
    },
    opt: {
        //options
    }
};

/***********************************************/
/***** Server **********************************/
/***********************************************/
MapEditor.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
MapEditor.server.onInit = function() {
    //hook into events here
    Module.addHook("admin_message");
};

//onHook: Called when an event (that this module is hooked into) is triggered
MapEditor.server.onHook = function(hook, args) {
    //argument "hook" contains which event has triggered
    if (hook === "admin_message") {
        if (args.head === "savemap") {
            var data = JSON.parse(args.body);
            var tiles = data.tiles;
            for (var i = 0; i < tiles.length; i++) {
                var tile = tiles[i].split(",");
                var x = parseInt(tile[0]); //TODO: base-36
                var y = parseInt(tile[1]); //TODO: base-36
                var floor = parseInt(tile[2]);
                var oldtile = Game.getTile(x, y, floor);
                if (oldtile === null) {
                    var newtile = new Tile(x, y, floor, tile[3], tile[4], tile[5]);
                    Game.setTile(x, y, floor, newtile);
                    //spawn npc if new npc is placed here
                    if (newtile.attr1 == 6 || newtile.attr2 == 6) {
                        if (newtile.attr1 == 6) {
                            Game.spawnNPC(newtile, parseInt(newtile.a1data));
                        } else {
                            Game.spawnNPC(newtile, parseInt(newtile.a2data));
                        }
                    }
                } else {
                    //hold old data
                    var oldAttr1 = oldtile.attr1;
                    var oldA1data = oldtile.a1data;
                    var oldAttr2 = oldtile.attr2;
                    var oldA2data = oldtile.a2data;
                    //update tile
                    oldtile.data = tile[3];
                    oldtile.a1data = tile[4];
                    oldtile.a2data = tile[5];
                    //check for a change in NPCs
                    if (oldtile.attr1 == 6 || oldtile.attr2 == 6 || oldAttr1 == 6 || oldAttr2 == 6) {
                        if (oldtile.attr1 == 6 && oldAttr1 == 6) {
                            if (oldA1data != oldtile.a1data) {
                                Game.respawnAllNpcs(); //Npc ID changed for attr1
                            }
                        } else if (oldtile.attr2 == 6 && oldAttr2 == 6) {
                            if (oldA2data != oldtile.a2data) {
                                Game.respawnAllNpcs(); //Npc ID changed for attr2
                            }
                        } else if (oldtile.attr1 == 6 || oldAttr1 == 6) {
                            Game.respawnAllNpcs(); //Npc added/removed from attr1
                        } else if (oldtile.attr2 == 6 || oldAttr2 == 6) {
                            Game.respawnAllNpcs(); //Npc added/removed from attr2
                        }
                    }
                }
            }
        }
    }
};

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/

MapEditor.client = {
    /***** variables *****/
    attrAction: new Object(),
    window: null,
    currFloor: 0,
    currSet: 0,
    currTileX: 0,
    currMultiX: 1,
    currTileY: 0,
    currMultiY: 1,
    currAuto: false,
    currMusic: 1,
    testMusic: null,
    prevAttr: 0,
    currAttrData: "",
    tilesChanged: new Object(),
    history: new Array(),
    draggingSel: false,
    draggingTile: false,
    draggingClear: false,
    draggingAttr: false,
    draggingMusic: false,
    draggingPos: false,
    canSelTile: false
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
MapEditor.client.onInit = function(isAdmin) {
    if (!isAdmin) {
        return;
    } //only work for admin
    
    Module.addHook("game_load");
    Module.addHook("post_draw_tile");
}

//onHook: Called when an event (that this module is hooked into) is triggered
MapEditor.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        //game loaded, create the UI
        MapEditor.client.createUI();
    } else if (hook === "post_draw_tile") {
        var music = args.tile.music;
        if (MapEditor.client.draggingMusic && MapEditor.client.draggingPos) {
            var mus = MapEditor.client.draggingMusic;
            var pos = MapEditor.client.draggingPos;
            if (args.x >= Math.min(mus.x, pos.x) && args.x <= Math.max(mus.x, pos.x) && args.y >= Math.min(mus.y, pos.y) && args.y <= Math.max(mus.y, pos.y)) {
                music = $("#map-editor-track").val();
            }
        }
        if (music > 0) {
            var active = UI.getTab(MapEditor.client.window);
            if (active == 3) {
                //music
                if (music > 0) {
                    var r = 0;
                    var g = 0;
                    var b = 0;
                    switch (music % 6) {
                        case 0:
                            r = 1 - ((Math.floor(music / 6) % 10) * 0.1);
                            break;
                        case 1:
                            r = 1 - ((Math.floor(music / 6) % 10) * 0.1);
                            g = 1 - ((Math.floor(music / 6 / 10) % 10) * 0.1);
                            break;
                        case 2:
                            g = 1 - ((Math.floor(music / 6) % 10) * 0.1);
                            break;
                        case 3:
                            g = 1 - ((Math.floor(music / 6) % 10) * 0.1);
                            b = 1 - ((Math.floor(music / 6 / 10) % 10) * 0.1);
                            break;
                        case 4:
                            b = 1 - ((Math.floor(music / 6) % 10) * 0.1);
                            break;
                        case 5:
                            r = 1 - ((Math.floor(music / 6 / 10) % 10) * 0.1);
                            b = 1 - ((Math.floor(music / 6) % 10) * 0.1);
                            break;
                    }

                    var destsize = TILE_SIZE - (2 * (Game.editFloor - args.floor));
                    var destx = ((args.x - Game.editX) * destsize) + (Game.canvas.width / 2);
                    var desty = ((args.y - Game.editY) * destsize) + (Game.canvas.height / 2);

                    Game.context.fillStyle = "rgb("+(r*255)+","+(g*255)+","+(b*255)+")";
                    Game.context.globalAlpha = 0.5;
                    Game.context.fillRect(destx, desty, destsize, destsize);
                    Game.context.globalAlpha = 1.0;
                }
            }
        }
    }
};

/***** helper *****/
MapEditor.client.placeTile = function(x, y) {
    var changed = new Object();

    outerloop:
            for (var ix = 0; ix < MapEditor.client.currMultiX; ix++) {
        for (var iy = 0; iy < MapEditor.client.currMultiY; iy++) {
            var point = new Point((x + ix), (y + iy), Game.editFloor);

            // for history
            var oldTile = Game.getTile(point.x, point.y, point.floor);
            changed[point.getKey()] = new Object();
            changed[point.getKey()].x = point.x;
            changed[point.getKey()].y = point.y;
            changed[point.getKey()].floor = point.floor;
            if (oldTile) {
                changed[point.getKey()].tile = oldTile.deepCopy();
            } else {
                changed[point.getKey()].tile = new Tile(point.x, point.y, point.floor, DEFAULT_TILE);
            }

            // for saving
            if (!MapEditor.client.tilesChanged[point.getKey()]) {
                MapEditor.client.tilesChanged[point.getKey()] = point;
            }

            MapEditor.client.updateTile(point.x, point.y, point.floor, MapEditor.client.currSet, (MapEditor.client.currTileX + ix), (MapEditor.client.currTileY + iy));

            if (MapEditor.client.currAuto == true) {
                break outerloop;
            }
        }
    }

    // if dragging, merge this with the other tiles changed in the drag
    if (MapEditor.client.draggingTile) {
        var old = MapEditor.client.history.pop();
        $.extend(changed, old); // merge the two objects
    }
    MapEditor.client.history.push(changed);
    console.log("placed tile: x:" + x + ", y:" + y);
};

MapEditor.client.placeAttr = function(x, y, which) {
    var point = new Point(x, y, Game.editFloor);

    //for saving
    if (!MapEditor.client.tilesChanged[point.getKey()]) {
        MapEditor.client.tilesChanged[point.getKey()] = point;
    }

    var tile = Game.getTile(x, y, Game.editFloor);
    if (!tile) {
        tile = new Tile(x, y, Game.editFloor, DEFAULT_TILE);
        Game.setTile(x, y, Game.editFloor, tile);
    }
    if (which === 1) {
        tile.attr1 = $('input:checked', '#map-editor-attributes').val() + "";
        tile.a1data = MapEditor.client.currAttrData;
    } else {
        tile.attr2 = $('input:checked', '#map-editor-attributes').val() + "";
        tile.a2data = MapEditor.client.currAttrData;
    }
};

MapEditor.client.placeMusic = function(x, y) {
    var point = new Point(x, y, Game.editFloor);
    
    //for saving
    if (!MapEditor.client.tilesChanged[point.getKey()]) {
        MapEditor.client.tilesChanged[point.getKey()] = point;
    }
    
    var tile = Game.getTile(x, y, Game.editFloor);
    if (!tile) {
        tile = new Tile(x, y, Game.editFloor, DEFAULT_TILE);
        Game.setTile(x, y, Game.editFloor, tile);
    }
    
    tile.music = $("#map-editor-track").val();
}

MapEditor.client.clearTile = function(x, y) {
    var point = new Point(x, y, Game.editFloor);

    // for history
    var changed = new Object();
    var oldTile = Game.getTile(x, y, Game.editFloor);
    if (oldTile) {
        changed[point.getKey()] = new Object();
        changed[point.getKey()].x = x;
        changed[point.getKey()].y = y;
        changed[point.getKey()].floor = Game.editFloor;
        changed[point.getKey()].tile = oldTile.deepCopy();
    }
    // if dragging, merge this with the other tiles cleared in the drag
    if (MapEditor.client.draggingClear) {
        var old = MapEditor.client.history.pop();
        $.extend(changed, old); // merge the two objects
    }
    MapEditor.client.history.push(changed);

    // for saving
    if (!MapEditor.client.tilesChanged[point.getKey()]) {
        MapEditor.client.tilesChanged[point.getKey()] = point;
    }

    // set the tile
    MapEditor.client.updateTile(x, y, Game.editFloor, 0, 0, 0);
    console.log("cleared tile: x:" + x + ", y:" + y);
};

MapEditor.client.clearAttr = function(x, y, which) {
    var point = new Point(x, y, Game.editFloor);

    if (!MapEditor.client.tilesChanged[point.getKey()]) {
        MapEditor.client.tilesChanged[point.getKey()] = point;
    }

    var tile = Game.getTile(x, y, Game.editFloor);
    if (!tile) {
        tile = new Tile(x, y, Game.editFloor, DEFAULT_TILE);
        Game.setTile(x, y, Game.editFloor, tile);
    }
    if (which === 1) {
        tile.attr1 = "0";
    } else {
        tile.attr2 = "0";
    }
};

MapEditor.client.updateTile = function(x, y, floor, destSet, destTileX, destTileY) {

    var tile = Game.getTile(x, y, floor);
    if (!tile) {
        tile = new Tile(x, y, floor, DEFAULT_TILE);
        Game.setTile(x, y, floor, tile);
    }
    var chain;
    console.log("updaing tile: " + $('input:checked', '#map-editor-layers').val());

    switch ($('input:checked', '#map-editor-layers').val()) {
        case "gr":
            if (tile.grs > 9)
                chain = true;
            tile.grs = destSet;
            tile.grx = destTileX;
            tile.gry = destTileY;
            break;
        case "m1":
            if (tile.m1s > 9)
                chain = true;
            tile.m1s = destSet;
            tile.m1x = destTileX;
            tile.m1y = destTileY;
            break;
        case "m2":
            if (tile.m2s > 9)
                chain = true;
            tile.m2s = destSet;
            tile.m2x = destTileX;
            tile.m2y = destTileY;
            break;
        case "ma":
            if (tile.mas > 9)
                chain = true;
            tile.mas = destSet;
            tile.max = destTileX;
            tile.may = destTileY;
            break;
        case "f1":
            if (tile.f1s > 9)
                chain = true;
            tile.f1s = destSet;
            tile.f1x = destTileX;
            tile.f1y = destTileY;
            break;
        case "f2":
            if (tile.f2s > 9)
                chain = true;
            tile.f2s = destSet;
            tile.f2x = destTileX;
            tile.f2y = destTileY;
            break;
        case "fa":
            if (tile.fas > 9)
                chain = true;
            tile.fas = destSet;
            tile.fax = destTileX;
            tile.fay = destTileY;
            break;
        case "li":
            tile.lis = destSet;
            tile.lix = destTileX;
            tile.liy = destTileY;
            break;
    }
    tile.redraw(chain);
};


MapEditor.client.createUI = function() {
    //Create UI here.
    this.window = UI.NewWindow("map-editor", "Map Editor", "331px");

    UI.makeTabs(this.window, {1: "Tiles", 2: "Attirbutes", 3: "Music"});

    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ***** Tab 1: Tiles ******
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/

    var layersDiv = UI.AddRadio(this.window, "layers", {"gr": "Ground", "m1": "Mask 1", "m2": "Mask 2", "ma": "Mask A", "li": "Light", "f1": "Fringe 1", "f2": "Fringe 2", "fa": "Fringe A"}, false, "gr", 1, {"style": "text-align:right;display:block;margin:4px 0px;"});
    $("label", layersDiv).each(function(index) {
        $(this).width("25%");
        switch ($(this).attr("for")) {
            case "map-editor-layers-ma":
                $(this).addClass("ui-corner-right");
                break;
            case "map-editor-layers-li":
                $(this).addClass("ui-corner-left");
                break;
        }
    });

    UI.AddCheckbox(this.window, "autotile", "AutoTile", false, function(e) {
        if ($("#map-editor-autotile-check").is(':checked')) {
            MapEditor.client.currAuto = true;
            MapEditor.client.currMultiX = 3;
            MapEditor.client.currMultiY = 4;
            MapEditor.client.currSet += 10;
        } else {
            MapEditor.client.currAuto = false;
            MapEditor.client.currMultiX = 1;
            MapEditor.client.currMultiY = 1;
            MapEditor.client.currSet -= 10;
        }
        $("#map-editor-selector").css("left", (MapEditor.client.currTileX * TILE_SIZE));
        $("#map-editor-selector").css("top", (MapEditor.client.currTileY * TILE_SIZE));
        $("#map-editor-selector").css("width", (MapEditor.client.currMultiX * 32) - 2);
        $("#map-editor-selector").css("height", (MapEditor.client.currMultiY * 32) - 2);
    }, 1, {'style': 'display:block;margin:0px auto;width:96px;'});

    UI.AddSlider(this.window, "tile-slider", 0, 9, function(event, ui) {
        $("#map-editor-tileset").empty();
        $("#map-editor-tileset").append(Game.tilesets[ui.value]);
        if (MapEditor.client.currAuto) {
            MapEditor.client.currSet = ui.value + 10;
        } else {
            MapEditor.client.currSet = ui.value;
        }
    }, 1);

    UI.AddDiv(this.window, "tilearea", "", 1, {'style': 'position:relative;display:block;margin:4px 0px;overflow:scroll;height:256px;'}).append(UI.NewDiv("map-editor-selector", "position:absolute;border:1px solid red;width:30px;height:30px;")).append(UI.NewDiv("map-editor-tileset"));

    UI.AddButton(this.window, "tile-undo", "Undo", function(e) {
        e.preventDefault();
        var last = MapEditor.client.history.pop();
        for (tile in last) {
            Game.setTile(last[tile].x, last[tile].y, last[tile].floor, last[tile].tile);
            last[tile].tile.redraw(true);
        }
    }, 1, {'style': 'display:inline-block;'});

    UI.AddButton(this.window, "tile-save", "Save", function(e) {
        e.preventDefault();
        var send = "";
        var JSONObject = new Object();
        JSONObject.tiles = new Array();
        for (key in MapEditor.client.tilesChanged) {
            var point = MapEditor.client.tilesChanged[key];
            send = point.x + "," + point.y + "," + point.floor + ",";
            var tile = Game.getTile(point.x, point.y, point.floor);
            send += tile.toData();
            send += ",";
            if (tile.a1data) {
                send += tile.a1data;
            }
            send += ",";
            if (tile.a2data) {
                send += tile.a2data;
            }
            JSONObject.tiles.push(send);
        }
        Game.socket.send("savemap:" + JSON.stringify(JSONObject));
        MapEditor.client.tilesChanged = new Object();
    }, 1, {'style': 'display:inline-block;float:right;'});

    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ** Tab 2: Attirbutes ***
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
    //actions to be performed on attribute clicks
    this.attrAction[2] = function() {
        UI.NewPrompt("Attribute Properties", {"X": {"type": "number", "min": "-1000000000", "max": "1000000000", "value": Game.editX - 1000000000}, "Y": {"type": "number", "min": "-1000000000", "max": "1000000000", "value": Game.editY - 1000000000}, "Floor": {"type": "number", "min": "0", "max": "9", "value": Game.editFloor}}, function(fields) {
            MapEditor.client.currAttrData = (parseInt(fields["X"]) + 1000000000) + "." + (parseInt(fields["Y"]) + 1000000000) + "." + fields["Floor"];
        });
    };
    this.attrAction[3] = function() {
        UI.NewPrompt("Attribute Properties", {"Floor": {"type": "number", "min": "0", "max": "9", "value": Game.editFloor}}, function(fields) {
            MapEditor.client.currAttrData = "" + fields["Floor"];
        });
    }
    this.attrAction[6] = function() {
        UI.NewPrompt("Attribute Properties", {"NPC-ID": {"type": "number", "min": "1", "max": "9999", "value": Game.editFloor}}, function(fields) {
            MapEditor.client.currAttrData = "" + fields["NPC-ID"];
        });
    }
    // attr only needs key-name pairs for Radio creation
    var attr = new Object();
    for (key in Data.map_attr) {
        attr[key] = Data.map_attr[key].name;
    }
    // add the radio
    var attrDiv = UI.AddRadio(this.window, "attributes", attr, true, "0", 2);
    // modify the width
    $("label", attrDiv).each(function(index) {
        $(this).width("50%");
    });
    //run attribute acton on click
    $("input", attrDiv).each(function(index) {
        $(this).click(function() {
            MapEditor.client.currAttrData = "";
            var action = MapEditor.client.attrAction[$(this).val()];
            if (action) {
                action();
            }
        });
    });

    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ** Tab 3: Music ***
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/

    MapEditor.client.testMusic = new Audio("SFX/Music/1.mp3");
    MapEditor.client.testMusic.loop = true;
    MapEditor.client.testMusic.play();
    MapEditor.client.testMusic.pause();

    UI.AddSpinner(this.window, "track", {min: 0, max: SFX.Music, spin: function(event, ui) {
            MapEditor.client.currMusic = ui.value;
            if (!MapEditor.client.testMusic.paused && MapEditor.client.testMusic.currentTime) {
                MapEditor.client.testMusic.setAttribute('src', "SFX/Music/" + ui.value + ".mp3");
                MapEditor.client.testMusic.play();
            } else {
                MapEditor.client.testMusic.setAttribute('src', "SFX/Music/" + ui.value + ".mp3");
            }
        }
    }, 3, {"style": 'display:inline-block;margin:4px 0px;'});

    $("#map-editor-track").val(1);

    var newdiv = UI.AddButton(this.window, "play", "play", function(e) {
    }, 3, {'style': 'display:inline-block;float:right;'});
    $(newdiv).button({
        text: false,
        label: "play",
        icons: {
            primary: "ui-icon-play"
        }
    }).click(function() {
        var options;
        if ($(this).text() === "play") {
            MapEditor.client.testMusic.play();
            options = {
                label: "pause",
                icons: {
                    primary: "ui-icon-pause"
                }
            };
        } else {
            MapEditor.client.testMusic.pause();
            options = {
                label: "play",
                icons: {
                    primary: "ui-icon-play"
                }
            };
        }
        $(this).button("option", options);
    });

    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ******** Events *********
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
    $("#map-editor-tileset").append(Game.tilesets[0]);

    $("#map-editor-tileset").mouseover(function(e) {
        MapEditor.client.canSelTile = true;
    });
    $("#map-editor-tileset").mouseout(function(e) {
        MapEditor.client.canSelTile = false;
    });
    $("#map-editor-selector").mouseover(function(e) {
        MapEditor.client.canSelTile = true;
    });
    $("#map-editor-selector").mouseout(function(e) {
        MapEditor.client.canSelTile = false;
    });

    $("#map-editor-tilearea").mousedown(function(e) {
        if (!MapEditor.client.canSelTile) {
            return false;
        }
        MapEditor.client.currTileX = Math.floor((e.pageX - $("#map-editor-tileset").offset().left) / TILE_SIZE);
        MapEditor.client.currTileY = Math.floor((e.pageY - $("#map-editor-tileset").offset().top) / TILE_SIZE);
        if (MapEditor.client.currAuto == false) {
            MapEditor.client.currMultiX = 1;
            MapEditor.client.currMultiY = 1;
        }
        $("#map-editor-selector").css("left", (MapEditor.client.currTileX * TILE_SIZE));
        $("#map-editor-selector").css("top", (MapEditor.client.currTileY * TILE_SIZE));
        $("#map-editor-selector").css("width", (MapEditor.client.currMultiX * 32) - 2);
        $("#map-editor-selector").css("height", (MapEditor.client.currMultiY * 32) - 2);
        MapEditor.client.draggingSel = true;
        return false;
    });

    $("#map-editor-tilearea").mousemove(function(e) {
        if (MapEditor.client.draggingSel) {
            var x = Math.floor((e.pageX - $("#map-editor-tileset").offset().left) / TILE_SIZE);
            var y = Math.floor((e.pageY - $("#map-editor-tileset").offset().top) / TILE_SIZE);
            if (MapEditor.client.currAuto == false) {
                MapEditor.client.currMultiX = (x - MapEditor.client.currTileX) + 1;
                MapEditor.client.currMultiY = (y - MapEditor.client.currTileY) + 1;
            } else {
                MapEditor.client.currTileX = x;
                MapEditor.client.currTileY = y;
            }
            $("#map-editor-selector").css("width", (MapEditor.client.currMultiX * 32) - 2);
            $("#map-editor-selector").css("height", (MapEditor.client.currMultiY * 32) - 2);
        }
        return false;
    });

    $("#map-editor-tilearea").mouseup(function(e) {
        MapEditor.client.draggingSel = false;
        return false;
    });

    $("#game").bind('contextmenu', function(e) {
        return false;
    });

    $("#game").mousedown(function(e) {
        if ($("#map-editor").dialog("isOpen")) {
            var active = UI.getTab(MapEditor.client.window);
            var x = Game.getClickedX(e);
            var y = Game.getClickedY(e);
            
            MapEditor.client.draggingPos = new Point(x, y, Game.editFloor);
            
            if (x < 0 || y < 0 || x > 2147483647 || y > 2147483647) {
                return;
            }
            
            if (active === 1) {
                if (event.which === 1) {
                    MapEditor.client.placeTile(x, y);
                    MapEditor.client.draggingTile = new Point(x, y, Game.editFloor);
                } else if (event.which === 3) {
                    MapEditor.client.clearTile(x, y);
                    MapEditor.client.draggingClear = new Point(x, y, Game.editFloor);
                }
            } else if (active === 2) {
                MapEditor.client.placeAttr(x, y, event.which);
                MapEditor.client.draggingAttr = new Point(x, y, Game.editFloor);
                MapEditor.client.draggingAttr.which = event.which;
            } else if (active === 3) {
                MapEditor.client.draggingMusic = new Point(x, y, Game.editFloor);
            }

            e.preventDefault();
            return false;
        }
    });

    $("#game").mousemove(function(e) {
        if ($("#map-editor").dialog("isOpen")) {
            var x = Game.getClickedX(e);
            var y = Game.getClickedY(e);
            
            MapEditor.client.draggingPos = new Point(x, y, Game.editFloor);
            
            if (MapEditor.client.draggingTile) {
                var point = MapEditor.client.draggingTile;
                if (point.x !== x || point.y !== y) {
                    MapEditor.client.placeTile(x, y);
                    point.x = x;
                    point.y = y;
                }
            } else if (MapEditor.client.draggingClear) {
                var point = MapEditor.client.draggingClear;
                if (point.x !== x || point.y !== y) {
                    MapEditor.client.clearTile(x, y);
                    point.x = x;
                    point.y = y;
                }
            } else if (MapEditor.client.draggingAttr) {
                var point = MapEditor.client.draggingAttr;
                if (point.x !== x || point.y !== y) {
                    MapEditor.client.placeAttr(x, y, point.which);
                    point.x = x;
                    point.y = y;
                }
            }
            return false;
        }
    });

    $("#game").mouseup(function(e) {
        if ($("#map-editor").dialog("isOpen")) {
            var x = Game.getClickedX(e);
            var y = Game.getClickedY(e);
            
            MapEditor.client.draggingTile = false;
            MapEditor.client.draggingClear = false;
            MapEditor.client.draggingAttr = false;
            
            if (MapEditor.client.draggingMusic) {
                var point = MapEditor.client.draggingMusic;
                for (var tX = Math.min(point.x, x); tX <= Math.max(point.x, x); tX++) {
                    for (var tY = Math.min(point.y, y); tY <= Math.max(point.y, y); tY++) {
                        MapEditor.client.placeMusic(tX, tY);
                    }
                }
            }
            MapEditor.client.draggingMusic = false;
            
            MapEditor.client.draggingPos = false;
            return false;
        }
    });

    $("#game").mouseout(function(e) {
        if ($("#map-editor").dialog("isOpen")) {
            MapEditor.client.draggingTile = false;
            MapEditor.client.draggingClear = false;
            MapEditor.client.draggingAttr = false;
            MapEditor.client.draggingMusic = false;
            return false;
        }
    });

    // add the map editor to the menu
    Game.menus["Map Editor"] = function() {
        $("#map-editor").dialog("open");
    };
};