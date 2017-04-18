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
 * World.js contains functions for working with the map, specifically tiles.
 */

var DEFAULT_TILE = "0000......."; //blank tile with no data

_Game.world = new Object(); //World object
var World = _Game.world;

_Game.world.user = null; //current user in world
_Game.world.players = new Object(); //players in world
_Game.world.npcs = new Object(); //npcs in world
_Game.world.npcTile = new Object(); //tiles containing npcs
_Game.world.tiles = new Object(); //tiles in world

/**
 * Update the current world map with tiles from the server
 * @param {String} tiles the list of tiles from the server
 */
_Game.updateWorld = function(tiles) {
    //format for tiles:tile1;tile2;tile3;...;tilen
    for (t in tiles) {
        //format for tile: x,y,floor,aammsxyy.sxyy.sxyy.sxyy.sxyy.sxyy.sxyy.sxyy,a1data,a2data
        var n = tiles[t].split(",");
        var x = parseInt(n[0]); //TODO: base-36
        var y = parseInt(n[1]); //TODO: base-36
        var f = parseInt(n[2]);
        
        var newTile = new Tile(x, y, f, n[3], n[4], n[5], true); //create the tile
        newTile.redraw(); //cache the tile
    }
}

/**
 * Set the tile at a given position
 * @param {Number} x the x position of the tile
 * @param {Number} y the y position of the tile
 * @param {Number} floor the floor of the tile
 * @param {Tile} tile the tile to put at this position. Omit to remove tile.
 */
_Game.setTile = function(x, y, floor, tile) {
    //make sure floor exists in cache
    if (!_Game.world.tiles[floor]) {
        _Game.world.tiles[floor] = new Object();
        _Game.world.tiles[floor].size = 0;
    }
    //make sure column exists in cache
    if (!_Game.world.tiles[floor][x]) {
        _Game.world.tiles[floor].size++;
        _Game.world.tiles[floor][x] = new Object();
        _Game.world.tiles[floor][x].size = 0;
    }
    //put tile in cell
    if (tile) {
        //add the tile here
        _Game.world.tiles[floor][x].size++;
        _Game.world.tiles[floor][x][y] = tile;
    } else if (_Game.world.tiles[floor][x][y]) {
        //remove the old tile here
        delete _Game.world.tiles[floor][x][y];
        _Game.world.tiles[floor][x].size--;
        //remove column from cache if it is empty
        if (_Game.world.tiles[floor][x].size == 0) {
            delete _Game.world.tiles[floor][x];
            _Game.world.tiles[floor].size--;
            //remove floor from cache if it is empty
            if (_Game.world.tiles[floor].size == 0)
                delete _Game.world.tiles[floor];
        }
    }
}

/**
 * Get the tile at a given position
 * @param {Number} x the x position of the tile
 * @param {Number} y the y position of the tile
 * @param {Number} floor the floor of the tile
 * @param {Tile} tile the tile at this position, or false if no tile is there
 */
_Game.getTile = function(x, y, floor) {
    //make sure floor exists in cache
    if (!_Game.world.tiles[floor]) {
        return false;
    }
    //make sure column exists in cache
    if (!_Game.world.tiles[floor][x]) {
        return false;
    }
    //make sure cell exists in cache
    if (!_Game.world.tiles[floor][x][y]) {
        return false;
    }
    //return tile in cell
    return _Game.world.tiles[floor][x][y];
}

// note that the x and y attributes are the positions on the tilesheet, not the positions on the map
/**
 * Tile class, representing a single tile.
 * @param {type} x the x position of the tile
 * @param {type} y the y position of the tile
 * @param {type} floor the floor of the tile
 * @param {type} data the tile's data
 * @param {type} a1d the tile's attribute1'2 data
 * @param {type} a2d the tile's attribute2's data
 * @param {type} skipDraw true to skip caching the tile image, omit to draw.
 * @returns {Tile} a new Tile object
 */
function Tile(x, y, floor, data, a1d, a2d, skipDraw) {
    //tile position
    this.x = x;
    this.y = y;
    this.floor = floor;
    //tile attributs (not attirbute data)
    this.attr1 = parseInt(data.substr(0, 1), 36);
    this.attr2 = parseInt(data.substr(1, 1), 36);
    this.music = parseInt(data.substr(2, 2), 36);
    
    //split the layer data of the tile
    var datas = data.substring(4).split(".");
    
    if (datas[0].length > 0) {
        //ground layer data
        this.grs = parseInt(datas[0].substr(0, 1), 36);
        this.grx = parseInt(datas[0].substr(1, 1), 36);
        this.gry = parseInt(datas[0].substr(2, 2), 36);
    } else { this.grs = 0; this.grx = 0; this.gry = 0; }
    if (datas[1].length > 0) {
        //mask1 layer data
        this.m1s = parseInt(datas[1].substr(0, 1), 36);
        this.m1x = parseInt(datas[1].substr(1, 1), 36);
        this.m1y = parseInt(datas[1].substr(2, 2), 36);
    } else { this.m1s = 0; this.m1x = 0; this.m1y = 0; }
    if (datas[2].length > 0) {
        //mask2 layer data
        this.m2s = parseInt(datas[2].substr(0, 1), 36);
        this.m2x = parseInt(datas[2].substr(1, 1), 36);
        this.m2y = parseInt(datas[2].substr(2, 2), 36);
    } else { this.m2s = 0; this.m2x = 0; this.m2y = 0; }
    if (datas[3].length > 0) {
        //mask animation layer data
        this.mas = parseInt(datas[3].substr(0, 1), 36);
        this.max = parseInt(datas[3].substr(1, 1), 36);
        this.may = parseInt(datas[3].substr(2, 2), 36);
    } else { this.mas = 0; this.max = 0; this.may = 0; }
    if (datas[4].length > 0) {
        //fringe1 layer data
        this.f1s = parseInt(datas[4].substr(0, 1), 36);
        this.f1x = parseInt(datas[4].substr(1, 1), 36);
        this.f1y = parseInt(datas[4].substr(2, 2), 36);
    } else { this.f1s = 0; this.f1x = 0; this.f1y = 0; }
    if (datas[5].length > 0) {
        //fringe2 layer data
        this.f2s = parseInt(datas[5].substr(0, 1), 36);
        this.f2x = parseInt(datas[5].substr(1, 1), 36);
        this.f2y = parseInt(datas[5].substr(2, 2), 36);
    } else { this.f2s = 0; this.f2x = 0; this.f2y = 0; }
    if (datas[6].length > 0) {
        //fringe animation layer data
        this.fas = parseInt(datas[6].substr(0, 1), 36);
        this.fax = parseInt(datas[6].substr(1, 1), 36);
        this.fay = parseInt(datas[6].substr(2, 2), 36);
    } else { this.fas = 0; this.fax = 0; this.fay = 0; }
    if (datas[7].length > 0) {
        //light layer data (for night, TODO: day/night cycle)
        this.lis = parseInt(datas[7].substr(0, 1), 36);
        this.lix = parseInt(datas[7].substr(1, 1), 36);
        this.liy = parseInt(datas[7].substr(2, 2), 36);
    } else { this.lis = 0; this.lix = 0; this.liy = 0; }
    
    //record whether or not each layer is set
    this.gre = (this.grs != 0 || this.grx != 0 || this.gry != 0);
    this.m1e = (this.m1s != 0 || this.m1x != 0 || this.m1y != 0);
    this.m2e = (this.m2s != 0 || this.m2x != 0 || this.m2y != 0);
    this.mae = (this.mas != 0 || this.max != 0 || this.may != 0);
    this.f1e = (this.f1s != 0 || this.f1x != 0 || this.f1y != 0);
    this.f2e = (this.f2s != 0 || this.f2x != 0 || this.f2y != 0);
    this.fae = (this.fas != 0 || this.fax != 0 || this.fay != 0);
    
    //set attribute1 data
    if (a1d !== undefined) {
        this.a1data = a1d;
    }
    //set attribute2 data
    if (a2d !== undefined) {
        this.a2data = a2d;
    }
    
    //create cached images for each layer
    this.gr = document.createElement('canvas');
    this.gr.width = TILE_SIZE; this.gr.height = TILE_SIZE;
    this.m1 = document.createElement('canvas');
    this.m1.width = TILE_SIZE; this.m1.height = TILE_SIZE;
    this.m2 = document.createElement('canvas');
    this.m2.width = TILE_SIZE; this.m2.height = TILE_SIZE;
    this.ma = document.createElement('canvas');
    this.ma.width = TILE_SIZE; this.ma.height = TILE_SIZE;
    this.f1 = document.createElement('canvas');
    this.f1.width = TILE_SIZE; this.f1.height = TILE_SIZE;
    this.f2 = document.createElement('canvas');
    this.f2.width = TILE_SIZE; this.f2.height = TILE_SIZE;
    this.fa = document.createElement('canvas');
    this.fa.width = TILE_SIZE; this.fa.height = TILE_SIZE;
    
    this.li = document.createElement('canvas');
    this.li.width = TILE_SIZE; this.li.height = TILE_SIZE;
    
    //draw the tile (if skipDraw is omitted)
    if (skipDraw === undefined) {
        Tile.drawTile(this);
    }
    
    //add redraw function to Tile object
    this.redraw = redraw;
    /**
     * ReDraw the tile's cached image data
     * @param {Boolean} force_chain true to redraw adjacent tiles, omite to redraw only this tile
     */
    function redraw(force_chain) {
        Tile.drawTile(this); //redraw this tile
        if (force_chain !== undefined) {
            //redraw adjacent tiles. This is needed for autotiles.
            Tile.drawTile(_Game.getTile(this.x-1, this.y-1, this.floor), false);
            Tile.drawTile(_Game.getTile(this.x, this.y-1, this.floor), false);
            Tile.drawTile(_Game.getTile(this.x+1, this.y-1, this.floor), false);
            Tile.drawTile(_Game.getTile(this.x+1, this.y, this.floor), false);
            Tile.drawTile(_Game.getTile(this.x+1, this.y+1, this.floor), false);
            Tile.drawTile(_Game.getTile(this.x, this.y+1, this.floor), false);
            Tile.drawTile(_Game.getTile(this.x-1, this.y+1, this.floor), false);
            Tile.drawTile(_Game.getTile(this.x-1, this.y, this.floor), false);
        }
    }

    //add toData function to Tile object
    this.toData = toData;
    /**
     * Get a concise string representing this Tile object
     * @returns {String} a string representation of this Tile
     */
    function toData() {
        var out = ""; //out string
        //encode attirbutes
        out += this.attr1.toString(36) + "" + this.attr2.toString(36) + "" + zeroPad(this.music.toString(36), 2);
        //encode ground, if it is set
        if (this.grs > 0 || this.grx > 0 || this.gry > 0) {
            out += this.grs.toString(36) + "" + this.grx.toString(36) + "" + zeroPad(this.gry.toString(36), 2);
        } out += "."; //delimiter
        //encode mask1, if it is set
        if (this.m1s > 0 || this.m1x > 0 || this.m1y > 0) {
            out += this.m1s.toString(36) + "" + this.m1x.toString(36) + "" + zeroPad(this.m1y.toString(36), 2);
        } out += "."; //delimiter
        //encode mask2, if it is set
        if (this.m2s > 0 || this.m2x > 0 || this.m2y > 0) {
            out += this.m2s.toString(36) + "" + this.m2x.toString(36) + "" + zeroPad(this.m2y.toString(36), 2);
        } out += "."; //delimiter
        //encode mask anim, if it is set
        if (this.mas > 0 || this.max > 0 || this.may > 0) {
            out += this.mas.toString(36) + "" + this.max.toString(36) + "" + zeroPad(this.may.toString(36), 2);
        } out += "."; //delimiter
        //encode fringe1, if it is set
        if (this.f1s > 0 || this.f1x > 0 || this.f1y > 0) {
            out += this.f1s.toString(36) + "" + this.f1x.toString(36) + "" + zeroPad(this.f1y.toString(36), 2);
        } out += "."; //delimiter
        //encode fringe2, if it is set
        if (this.f2s > 0 || this.f2x > 0 || this.f2y > 0) {
            out += this.f2s.toString(36) + "" + this.f2x.toString(36) + "" + zeroPad(this.f2y.toString(36), 2);
        } out += "."; //delimiter
        //encode fringe anim, if it is set
        if (this.fas > 0 || this.fax > 0 || this.fay > 0) {
            out += this.fas.toString(36) + "" + this.fax.toString(36) + "" + zeroPad(this.fay.toString(36), 2);
        } out += "."; //delimiter
        //encode light, if it is set
        if (this.lis > 0 || this.lix > 0 || this.liy > 0) {
            out += this.lis.toString(36) + "" + this.lix.toString(36) + "" + zeroPad(this.liy.toString(36), 2);
        }
        //return encoded tile
        return out;
    }

    //add deepCopy function to Tile object
    this.deepCopy = deepCopy;
    /**
     * Create a deep copy of this Tile object
     * @returns {Tile} a new Tile object that is identical to this object
     */
    function deepCopy() {
        return $.extend(true, {}, this);
    }
    
    //finally, set the new tile to its position in the world
    _Game.setTile(x, y, floor, this);
}

/**
 * Get a unique key for a given tile
 * @param {Number|Tile} x the tile, or the x position of the tile, to get a key for
 * @param {Number} y the y position of the tile to get a key for (if x is not a Tile)
 * @param {Number} floor the floor of the tile to get a key for (if x is not a Tile)
 * @returns {String} a unique key for the given tile
 */
Tile.key = function(x, y, floor) {
    if (x instanceof Tile) {
        // passed Tile object as first param, assume no other params
        return Tile.key(x.x, x.y, x.floor);
    } else {
        // passed values for params
        return x + "." + y + "." + floor;
    }
}

/**
 * Static function to draw a given tile
 * @param {type} tile the tile to draw
 * @param {type} chain true to chain to adjacent tiles, omite otherwise
 */
Tile.drawTile = function(tile, chain) {
    if (tile) {
        /*if (tile.lis != 0 || tile.lix != 0 || tile.liy != 0) {
            var ctx = tile.li.getContext("2d");
            ctx.clearRect(0, 0, tile.li.width, tile.li.height);
            ctx.drawImage(_Game.tilesets[tile.lis], (tile.lix * TILE_SIZE), (tile.liy * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
        }*/

        //Module.doHook("pre_draw", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw ground
        if (tile.gre) {
            //ready the cached canvas
            var ctx = tile.gr.getContext("2d");
            ctx.clearRect(0, 0, tile.gr.width, tile.gr.height);
            //check for autotile
            if (tile.grs > 9) {
                //autotile detected, use custom function
                Tile.autoTile(tile, ctx, "gr", chain);
            } else {
                //no autotile, draw tile normally
                ctx.drawImage(_Game.tilesets[tile.grs], (tile.grx * TILE_SIZE), (tile.gry * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_gr", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw mask 1
        if (tile.m1e) {
            //ready the cached canvas
            var ctx = tile.m1.getContext("2d");
            ctx.clearRect(0, 0, tile.m1.width, tile.m1.height);
            //for ease of drawing, include mask tiles below this one
            if (tile.gre)       ctx.drawImage(tile.gr, 0, 0);
            //check for autotile
            if (tile.m1s > 9) {
                //autotile detected, use custom function
                Tile.autoTile(tile, ctx, "m1", chain);
            } else {
                //no autotile, draw tile normally
                ctx.drawImage(_Game.tilesets[tile.m1s], (tile.m1x * TILE_SIZE), (tile.m1y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_m1", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw mask 2
        if (tile.m2e) {
            //ready the cached canvas
            var ctx = tile.m2.getContext("2d");
            ctx.clearRect(0, 0, tile.m2.width, tile.m2.height);
            //for ease of drawing, include mask tiles below this one
            if (tile.m1e)       ctx.drawImage(tile.m1, 0, 0);
            else if (tile.gre)  ctx.drawImage(tile.gr, 0, 0);
            //check for autotile
            if (tile.m2s > 9) {
                //autotile detected, use custom function
                Tile.autoTile(tile, ctx, "m2", chain);
            } else {
                //no autotile, draw tile normally
                ctx.drawImage(_Game.tilesets[tile.m2s], (tile.m2x * TILE_SIZE), (tile.m2y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_m2", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw mask anim.
        if (tile.mae) {
            //ready the cached canvas
            var ctx = tile.ma.getContext("2d");
            ctx.clearRect(0, 0, tile.ma.width, tile.ma.height);
            //check for autotile
            if (tile.mas > 9) {
                //autotile detected, use custom function
                Tile.autoTile(tile, ctx, "ma", chain);
            } else {
                //no autotile, draw tile normally
                ctx.drawImage(_Game.tilesets[tile.mas], (tile.max * TILE_SIZE), (tile.may * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_ma", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw fringe 1
        if (tile.f1e) {
            //ready the cached canvas
            var ctx = tile.f1.getContext("2d");
            ctx.clearRect(0, 0, tile.f1.width, tile.f1.height);
            //check for autotile
            if (tile.f1s > 9) {
                //autotile detected, use custom function
                Tile.autoTile(tile, ctx, "f1", chain);
            } else {
                //no autotile, draw tile normally
                ctx.drawImage(_Game.tilesets[tile.f1s], (tile.f1x * TILE_SIZE), (tile.f1y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_f1", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw fringe 2
        if (tile.f2e) {
            //ready the cached canvas
            var ctx = tile.f2.getContext("2d");
            ctx.clearRect(0, 0, tile.f2.width, tile.f2.height);
            //for ease of drawing, include fringe tiles below this one
            if (tile.f1e)       ctx.drawImage(tile.f1, 0, 0);
            //check for autotile
            if (tile.f2s > 9) {
                //autotile detected, use custom function
                Tile.autoTile(tile, ctx, "f2", chain);
            } else {
                //no autotile, draw tile normally
                ctx.drawImage(_Game.tilesets[tile.f2s], (tile.f2x * TILE_SIZE), (tile.f2y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx, true);
        }
        //Module.doHook("draw_f2", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw fringe anim.
        if (tile.fae) {
            //ready the cached canvas
            var ctx = tile.fa.getContext("2d");
            ctx.clearRect(0, 0, tile.fa.width, tile.fa.height);
            //check for autotile
            if (tile.fas > 9) {
                //autotile detected, use custom function
                Tile.autoTile(tile, ctx, "fa", chain);
            } else {
                //no autotile, draw tile normally
                ctx.drawImage(_Game.tilesets[tile.fas], (tile.fax * TILE_SIZE), (tile.fay * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx); //TODO: day/night cycle
        }
        //Module.doHook("draw_fa", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
    }
}

/**
 * Copy the tile, and adjust for night by darkening pixels not lit by the light layer
 * @param {type} tile the tile to copy
 * @param {type} ctx the tile's canvas context
 * @param {type} ignore true to ignore the light layer
 */
Tile.copyNight = function(tile, ctx, ignore) {
    var imgData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    var lightData = tile.li.getContext("2d").getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    for (var i = 0, len = imgData.data.length; i < len; i += 4) {
        var light = 0.5;
        
        if (tile.lis != 0 || tile.lix != 0 || tile.liy != 0) {
            var min = Math.min(lightData.data[i], lightData.data[i+1], lightData.data[i+2], lightData.data[i+3]);
            if (ignore) {
                min = 0;
            }
            light = 0.5 - (min / 255 / 2); //0 is day, 0.5 is night, 1 is pitch-black
        }
        light *= 1.5; //make things a little darker
        
        imgData.data[i] = (((32 * imgData.data[i]) / 255) * light) + (imgData.data[i] * (1 - light));
        imgData.data[i+1] = (((32 * imgData.data[i+1]) / 255) * light) + (imgData.data[i+1] * (1 - light));
        imgData.data[i+2] = (((128 * imgData.data[i+2]) / 255) * light) + (imgData.data[i+2] * (1 - light));
    }
    ctx.putImageData(imgData, TILE_SIZE, 0);
}

/**
 * Draw an autotile for the given tile layer.
 * Autotiles allow rapid map creation, but are very complex to process.
 * This is because autotiles may consist of multiple pieces of different tiles.
 * In addition, the pices to draw are dependent on the adjacent tiles.
 * @param {type} tile the tile to process
 * @param {type} ctx the canvas context to draw upon
 * @param {type} layer the layer to consier for autotiling
 * @param {type} chain whether or not to chain to nearby autotiles
 */
Tile.autoTile = function(tile, ctx, layer, chain) {
    if (tile) {
        //get adjacent tiles
        var upper = _Game.getTile(tile.x, tile.y-1, tile.floor);
        var right = _Game.getTile(tile.x+1, tile.y, tile.floor);
        var lower = _Game.getTile(tile.x, tile.y+1, tile.floor);
        var left = _Game.getTile(tile.x-1, tile.y, tile.floor);
        //id for switch statement
        var id = 0;
        //check if adjacent tiles are of the same autotile
        var mt_u = matchTile(tile, upper, layer);
        var mt_r = matchTile(tile, right, layer);
        var mt_d = matchTile(tile, lower, layer);
        var mt_l = matchTile(tile, left, layer);
        
        //calculate id depending on which adjacent tiles are same autotile
        if (mt_u) {
            id += 1;
        }
        if (mt_r) {
            id += 2;
        }
        if (mt_d) {
            id += 4;
        }
        if (mt_l) {
            id += 8;
        }
        
        //get the autotile position
        var set = _Game.tilesets[tile[layer+"s"]-10];
        var tx = tile[layer+"x"];
        var ty = tile[layer+"y"];
        
        switch(id) {
            case 0: //no adjacent same autotiles
                //only required 1 piece
                ctx.drawImage(set, (tx * TILE_SIZE), (ty * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 1: //upper tile is same autotile
                //requires drawing of 2 pieces
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+3) * TILE_SIZE), HALF_SIZE, TILE_SIZE, 0, 0, HALF_SIZE, TILE_SIZE);
                ctx.drawImage(set, ((tx+2.5) * TILE_SIZE), ((ty+3) * TILE_SIZE), HALF_SIZE, TILE_SIZE, HALF_SIZE, 0, HALF_SIZE, TILE_SIZE);
                break;
            case 2: //right tile is same autotile
                //requires drawing of 2 pieces
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+1) * TILE_SIZE), TILE_SIZE, HALF_SIZE, 0, 0, TILE_SIZE, HALF_SIZE);
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+3.5) * TILE_SIZE), TILE_SIZE, HALF_SIZE, 0, HALF_SIZE, TILE_SIZE, HALF_SIZE);
                break;
            case 3: //right and upper tiles are same autotile
                //only required 1 piece
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+3)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 4: //lower tile is same autotile
                //requires drawing of 2 pieces
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+1) * TILE_SIZE), HALF_SIZE, TILE_SIZE, 0, 0, HALF_SIZE, TILE_SIZE);
                ctx.drawImage(set, ((tx+2.5) * TILE_SIZE), ((ty+1) * TILE_SIZE), HALF_SIZE, TILE_SIZE, HALF_SIZE, 0, HALF_SIZE, TILE_SIZE);
                break;
            case 5: //lower and upper tiles are same autotile
                //requires drawing of 2 pieces
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+2) * TILE_SIZE), HALF_SIZE, TILE_SIZE, 0, 0, HALF_SIZE, TILE_SIZE);
                ctx.drawImage(set, ((tx+2.5) * TILE_SIZE), ((ty+2) * TILE_SIZE), HALF_SIZE, TILE_SIZE, HALF_SIZE, 0, HALF_SIZE, TILE_SIZE);
                break;
            case 6: //lower and right tiles are same autotile
                //only required 1 piece
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+1)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 7: //lower, right, and upper tiles are same autotile
                //only required 1 piece
                ctx.drawImage(set, ((tx+0) * TILE_SIZE), ((ty+2)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 8: //left is same autotile
                //requires drawing of 2 pieces
                ctx.drawImage(set, ((tx+2) * TILE_SIZE), ((ty+1) * TILE_SIZE), TILE_SIZE, HALF_SIZE, 0, 0, TILE_SIZE, HALF_SIZE);
                ctx.drawImage(set, ((tx+2) * TILE_SIZE), ((ty+3.5) * TILE_SIZE), TILE_SIZE, HALF_SIZE, 0, HALF_SIZE, TILE_SIZE, HALF_SIZE);
                break;
            case 9: //left and upper tiles are same autotiles
                //only required 1 piece
                ctx.drawImage(set, ((tx+2) * TILE_SIZE), ((ty+3)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 10: //left and right tiles are same autotiles
                //requires drawing of 2 pieces
                ctx.drawImage(set, ((tx+1) * TILE_SIZE), ((ty+1) * TILE_SIZE), TILE_SIZE, HALF_SIZE, 0, 0, TILE_SIZE, HALF_SIZE);
                ctx.drawImage(set, ((tx+1) * TILE_SIZE), ((ty+3.5) * TILE_SIZE), TILE_SIZE, HALF_SIZE, 0, HALF_SIZE, TILE_SIZE, HALF_SIZE);
                break;
            case 11: //left, right, and upper tiles are same autotiles
                //only required 1 piece
                ctx.drawImage(set, ((tx+1) * TILE_SIZE), ((ty+3)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 12: //left and lower tiles are same autotiles
                //only required 1 piece
                ctx.drawImage(set, ((tx+2) * TILE_SIZE), ((ty+1)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 13:  //left, lower, and upper tiles are same autotiles
                //only required 1 piece
                ctx.drawImage(set, ((tx+2) * TILE_SIZE), ((ty+2)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 14:  //left, lower, and right tiles are same autotiles
                //only required 1 piece
                ctx.drawImage(set, ((tx+1) * TILE_SIZE), ((ty+1)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 15: //left, lower, right, and upper are same autotiles
                //only required 1 piece
                ctx.drawImage(set, ((tx+1) * TILE_SIZE), ((ty+2)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
        }
        
        //get diagonal adjacent tiles
        var upper_left = _Game.getTile(tile.x-1, tile.y-1, tile.floor);
        var upper_right = _Game.getTile(tile.x+1, tile.y-1, tile.floor);
        var lower_right = _Game.getTile(tile.x+1, tile.y+1, tile.floor);
        var lower_left = _Game.getTile(tile.x-1, tile.y+1, tile.floor);
        //check if diagonal adjacent tiles are of the same autotile
        var mt_ul = matchTile(tile, upper_left, layer);
        var mt_ur = matchTile(tile, upper_right, layer);
        var mt_dr = matchTile(tile, lower_right, layer);
        var mt_dl = matchTile(tile, lower_left, layer);
        
        if (mt_u) {
            //upper tile is same autotile
            if (mt_l && !mt_ul) { //left is same autotile, but upper-left is not
                //draw another piece on top
                ctx.drawImage(set, ((tx+2) * TILE_SIZE), ((ty+0) * TILE_SIZE), HALF_SIZE, HALF_SIZE, 0, 0, HALF_SIZE, HALF_SIZE);
            }
            if (mt_r && !mt_ur) { //right is same autotile, but upper-right is not
                //draw another piece on top
                ctx.drawImage(set, ((tx+2.5) * TILE_SIZE), ((ty+0) * TILE_SIZE), HALF_SIZE, HALF_SIZE, HALF_SIZE, 0, HALF_SIZE, HALF_SIZE);
            }
        }
        if (mt_d) {
            //lower tile is same autotile
            if (mt_r && !mt_dr) { //right is same autotile, but lower-right is not
                //draw another piece on top
                ctx.drawImage(set, ((tx+2.5) * TILE_SIZE), ((ty+0.5) * TILE_SIZE), HALF_SIZE, HALF_SIZE, HALF_SIZE, HALF_SIZE, HALF_SIZE, HALF_SIZE);
            }
            if (mt_l && !mt_dl) { //left is same autotile, but lower-left is not
                //draw another piece on top
                ctx.drawImage(set, ((tx+2) * TILE_SIZE), ((ty+0.5) * TILE_SIZE), HALF_SIZE, HALF_SIZE, 0, HALF_SIZE, HALF_SIZE, HALF_SIZE);
            }
        }
        
        //chain to adjacent children, if needed.
        if (chain === undefined) {
            if (mt_ul) Tile.drawTile(upper_left, false);
            if (mt_u)  Tile.drawTile(upper, false);
            if (mt_ur) Tile.drawTile(upper_right, false);
            if (mt_r)  Tile.drawTile(right, false);
            if (mt_dr) Tile.drawTile(lower_right, false);
            if (mt_d)  Tile.drawTile(lower, false);
            if (mt_dl) Tile.drawTile(lower_left, false);
            if (mt_l)  Tile.drawTile(left, false);
        }
    }
}

/**
 * Check whether or not two tiles use the same image/autotile
 * @param {type} tile1 the first tile to check
 * @param {type} tile2 the secon tile to check
 * @param {type} layer the layer of the tile to check
 * @returns {Boolean} true if both tiles use the same image/autotile, false otherwise
 */
function matchTile(tile1, tile2, layer) {
    if (tile1 && tile2) {
        if (tile1[layer+"s"] == tile2[layer+"s"] && tile1[layer+"x"] == tile2[layer+"x"] && tile1[layer+"y"] == tile2[layer+"y"]) {
            return true;
        }
    }
    return false;
}

/**
 * Point class for holding x, y, and floor values
 * @param {type} x the x position of the point
 * @param {type} y the y position of the point
 * @param {type} floor the floor of the point
 * @returns {Point} a new Point object
 */
function Point(x, y, floor) {
    this.x = x;
    this.y = y;
    this.floor = floor;

    //add the getKey function to this point
    this.getKey = getKey;
    /**
     * Get a unqiue key representing this point
     * @returns {String} a unique key representing this point
     */
    function getKey() {
        return this.x + "," + this.y + "," + this.floor;
    }
}

/**
 * Pad a number with zeroes so that the resulting string is of a given length
 * @param {type} num the number to pad
 * @param {type} size the length of the string
 * @returns {String} a string containing num of length size padded with 0s
 */
function zeroPad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}