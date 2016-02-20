var DEFAULT_TILE = "0000.......";

_Game.world = new Object();
var World = _Game.world;

_Game.world.user = null;
_Game.world.players = new Object();
_Game.world.npcs = new Object();
_Game.world.npcTile = new Object();
_Game.world.tiles = new Object();

// format for tiles:tile1;tile2;tile3;...;tilen
_Game.updateWorld = function(tiles) {
    // format for tile: x,y,floor,aammsxyy.sxyy.sxyy.sxyy.sxyy.sxyy.sxyy.sxyy,a1data,a2data
    for (t in tiles) {
        var n = tiles[t].split(",");
        var x = parseInt(n[0]); //TODO: base-36
        var y = parseInt(n[1]); //TODO: base-36
        var f = parseInt(n[2]);
        
        var newTile = new Tile(x, y, f, n[3], n[4], n[5], true);
        newTile.redraw();
    }
}

_Game.setTile = function(x, y, floor, tile) {
    if (!_Game.world.tiles[floor]) {
        _Game.world.tiles[floor] = new Object();
        _Game.world.tiles[floor].size = 0;
    }
    if (!_Game.world.tiles[floor][x]) {
        _Game.world.tiles[floor].size++;
        _Game.world.tiles[floor][x] = new Object();
        _Game.world.tiles[floor][x].size = 0;
    }
    if (tile) {
        _Game.world.tiles[floor][x].size++;
        _Game.world.tiles[floor][x][y] = tile;
    } else if (_Game.world.tiles[floor][x][y]) {
        delete _Game.world.tiles[floor][x][y];
        _Game.world.tiles[floor][x].size--;
        if (_Game.world.tiles[floor][x].size == 0) {
            delete _Game.world.tiles[floor][x];
            _Game.world.tiles[floor].size--;
            if (_Game.world.tiles[floor].size == 0)
                delete _Game.world.tiles[floor];
        }
    }
}

_Game.getTile = function(x, y, floor) {
    if (!_Game.world.tiles[floor]) {
        return false;
    }
    if (!_Game.world.tiles[floor][x]) {
        return false;
    }
    if (!_Game.world.tiles[floor][x][y]) {
        return false;
    }
    return _Game.world.tiles[floor][x][y];
}

// note that the x and y attributes are the positions on the tilesheet, not the positions on the map
function Tile(x, y, floor, data, a1d, a2d, skipDraw) {
    this.x = x;
    this.y = y;
    this.floor = floor;
    
    this.attr1 = parseInt(data.substr(0, 1), 36);
    this.attr2 = parseInt(data.substr(1, 1), 36);
    this.music = parseInt(data.substr(2, 2), 36);
    
    var datas = data.substring(4).split(".");
    
    if (datas[0].length > 0) {
        this.grs = parseInt(datas[0].substr(0, 1), 36);
        this.grx = parseInt(datas[0].substr(1, 1), 36);
        this.gry = parseInt(datas[0].substr(2, 2), 36);
    } else { this.grs = 0; this.grx = 0; this.gry = 0; }
    if (datas[1].length > 0) {
        this.m1s = parseInt(datas[1].substr(0, 1), 36);
        this.m1x = parseInt(datas[1].substr(1, 1), 36);
        this.m1y = parseInt(datas[1].substr(2, 2), 36);
    } else { this.m1s = 0; this.m1x = 0; this.m1y = 0; }
    if (datas[2].length > 0) {
        this.m2s = parseInt(datas[2].substr(0, 1), 36);
        this.m2x = parseInt(datas[2].substr(1, 1), 36);
        this.m2y = parseInt(datas[2].substr(2, 2), 36);
    } else { this.m2s = 0; this.m2x = 0; this.m2y = 0; }
    if (datas[3].length > 0) {
        this.mas = parseInt(datas[3].substr(0, 1), 36);
        this.max = parseInt(datas[3].substr(1, 1), 36);
        this.may = parseInt(datas[3].substr(2, 2), 36);
    } else { this.mas = 0; this.max = 0; this.may = 0; }
    if (datas[4].length > 0) {
        this.f1s = parseInt(datas[4].substr(0, 1), 36);
        this.f1x = parseInt(datas[4].substr(1, 1), 36);
        this.f1y = parseInt(datas[4].substr(2, 2), 36);
    } else { this.f1s = 0; this.f1x = 0; this.f1y = 0; }
    if (datas[5].length > 0) {
        this.f2s = parseInt(datas[5].substr(0, 1), 36);
        this.f2x = parseInt(datas[5].substr(1, 1), 36);
        this.f2y = parseInt(datas[5].substr(2, 2), 36);
    } else { this.f2s = 0; this.f2x = 0; this.f2y = 0; }
    if (datas[6].length > 0) {
        this.fas = parseInt(datas[6].substr(0, 1), 36);
        this.fax = parseInt(datas[6].substr(1, 1), 36);
        this.fay = parseInt(datas[6].substr(2, 2), 36);
    } else { this.fas = 0; this.fax = 0; this.fay = 0; }
    if (datas[7].length > 0) {
        this.lis = parseInt(datas[7].substr(0, 1), 36);
        this.lix = parseInt(datas[7].substr(1, 1), 36);
        this.liy = parseInt(datas[7].substr(2, 2), 36);
    } else { this.lis = 0; this.lix = 0; this.liy = 0; }
    
    this.gre = (this.grs != 0 || this.grx != 0 || this.gry != 0);
    this.m1e = (this.m1s != 0 || this.m1x != 0 || this.m1y != 0);
    this.m2e = (this.m2s != 0 || this.m2x != 0 || this.m2y != 0);
    this.mae = (this.mas != 0 || this.max != 0 || this.may != 0);
    this.f1e = (this.f1s != 0 || this.f1x != 0 || this.f1y != 0);
    this.f2e = (this.f2s != 0 || this.f2x != 0 || this.f2y != 0);
    this.fae = (this.fas != 0 || this.fax != 0 || this.fay != 0);
    
    if (a1d !== undefined) {
        this.a1data = a1d;
    }
    if (a2d !== undefined) {
        this.a2data = a2d;
    }
    
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
    
    if (skipDraw === undefined) {
        Tile.drawTile(this);
    }
    
    this.redraw = redraw;
    function redraw(force_chain) {
        Tile.drawTile(this);
        if (force_chain !== undefined) {
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

    this.toData = toData;
    function toData() {
        var out = "";
        out += this.attr1.toString(36) + "" + this.attr2.toString(36) + "" + zeroPad(this.music.toString(36), 2);
        if (this.grs > 0 || this.grx > 0 || this.gry > 0) {
            out += this.grs.toString(36) + "" + this.grx.toString(36) + "" + zeroPad(this.gry.toString(36), 2);
        } out += ".";
        if (this.m1s > 0 || this.m1x > 0 || this.m1y > 0) {
            out += this.m1s.toString(36) + "" + this.m1x.toString(36) + "" + zeroPad(this.m1y.toString(36), 2);
        } out += ".";
        if (this.m2s > 0 || this.m2x > 0 || this.m2y > 0) {
            out += this.m2s.toString(36) + "" + this.m2x.toString(36) + "" + zeroPad(this.m2y.toString(36), 2);
        } out += ".";
        if (this.mas > 0 || this.max > 0 || this.may > 0) {
            out += this.mas.toString(36) + "" + this.max.toString(36) + "" + zeroPad(this.may.toString(36), 2);
        } out += ".";
        if (this.f1s > 0 || this.f1x > 0 || this.f1y > 0) {
            out += this.f1s.toString(36) + "" + this.f1x.toString(36) + "" + zeroPad(this.f1y.toString(36), 2);
        } out += ".";
        if (this.f2s > 0 || this.f2x > 0 || this.f2y > 0) {
            out += this.f2s.toString(36) + "" + this.f2x.toString(36) + "" + zeroPad(this.f2y.toString(36), 2);
        } out += ".";
        if (this.fas > 0 || this.fax > 0 || this.fay > 0) {
            out += this.fas.toString(36) + "" + this.fax.toString(36) + "" + zeroPad(this.fay.toString(36), 2);
        } out += ".";
        if (this.lis > 0 || this.lix > 0 || this.liy > 0) {
            out += this.lis.toString(36) + "" + this.lix.toString(36) + "" + zeroPad(this.liy.toString(36), 2);
        }
        
        return out;
    }

    this.deepCopy = deepCopy;
    function deepCopy() {
        return $.extend(true, {}, this);
    }
    
    _Game.setTile(x, y, floor, this);
}

Tile.key = function(x, y, floor) {
    if (x instanceof Tile) {
        // passed Tile object as first param, assume no other params
        return Tile.key(x.x, x.y, x.floor);
    } else {
        // passed values for params
        return x + "." + y + "." + floor;
    }
}

Tile.drawTile = function(tile, chain) {
    if (tile) {
        if (tile.lis != 0 || tile.lix != 0 || tile.liy != 0) {
            var ctx = tile.li.getContext("2d");
            ctx.clearRect(0, 0, tile.li.width, tile.li.height);
            ctx.drawImage(_Game.tilesets[tile.lis], (tile.lix * TILE_SIZE), (tile.liy * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
        }

        //Module.doHook("pre_draw", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw ground
        var ctx = tile.gr.getContext("2d");
        ctx.clearRect(0, 0, tile.gr.width, tile.gr.height);
        if (tile.gre) {
            if (tile.grs > 9) {
                Tile.autoTile(tile, ctx, "gr", chain);
            } else {
                ctx.drawImage(_Game.tilesets[tile.grs], (tile.grx * TILE_SIZE), (tile.gry * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_gr", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw mask 1
        var ctx = tile.m1.getContext("2d");
        ctx.clearRect(0, 0, tile.m1.width, tile.m1.height);
        ctx.drawImage(tile.gr, 0, 0);
        if (tile.m1e) {
            if (tile.m1s > 9) {
                Tile.autoTile(tile, ctx, "m1", chain);
            } else {
                ctx.drawImage(_Game.tilesets[tile.m1s], (tile.m1x * TILE_SIZE), (tile.m1y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_m1", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw mask 2
        if (tile.m2e) {
            var ctx = tile.m2.getContext("2d");
            ctx.clearRect(0, 0, tile.m2.width, tile.m2.height);
            ctx.drawImage(tile.m1, 0, 0);
            if (tile.m2s > 9) {
                Tile.autoTile(tile, ctx, "m2", chain);
            } else {
                ctx.drawImage(_Game.tilesets[tile.m2s], (tile.m2x * TILE_SIZE), (tile.m2y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_m2", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw mask anim.
        if (tile.mae) {
            var ctx = tile.ma.getContext("2d");
            ctx.clearRect(0, 0, tile.ma.width, tile.ma.height);
            if (tile.mas > 9) {
                Tile.autoTile(tile, ctx, "ma", chain);
            } else {
                ctx.drawImage(_Game.tilesets[tile.mas], (tile.max * TILE_SIZE), (tile.may * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_ma", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw fringe 1
        var ctx = tile.f1.getContext("2d");
        ctx.clearRect(0, 0, tile.f1.width, tile.f1.height);
        if (tile.f1e) {
            if (tile.f1s > 9) {
                Tile.autoTile(tile, ctx, "f1", chain);
            } else {
                ctx.drawImage(_Game.tilesets[tile.f1s], (tile.f1x * TILE_SIZE), (tile.f1y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_f1", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw fringe 2
        if (tile.f2e) {
            var ctx = tile.f2.getContext("2d");
            ctx.clearRect(0, 0, tile.f2.width, tile.f2.height);
            ctx.drawImage(tile.f1, 0, 0);
            if (tile.f2s > 9) {
                Tile.autoTile(tile, ctx, "f2", chain);
            } else {
                ctx.drawImage(_Game.tilesets[tile.f2s], (tile.f2x * TILE_SIZE), (tile.f2y * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx, true);
        }
        //Module.doHook("draw_f2", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
        // draw fringe anim.
        if (tile.fae) {
            var ctx = tile.fa.getContext("2d");
            ctx.clearRect(0, 0, tile.fa.width, tile.fa.height);
            if (tile.fas > 9) {
                Tile.autoTile(tile, ctx, "fa", chain);
            } else {
                ctx.drawImage(_Game.tilesets[tile.fas], (tile.fax * TILE_SIZE), (tile.fay * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
            }
            //Tile.copyNight(tile, ctx);
        }
        //Module.doHook("draw_fa", {admin: false, "x": tile.x, "y": tile.y, "floor": tile.floor, "tile": tile});
    }
}

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

Tile.autoTile = function(tile, ctx, layer, chain) {
    if (tile) {
        var upper = _Game.getTile(tile.x, tile.y-1, tile.floor);
        var right = _Game.getTile(tile.x+1, tile.y, tile.floor);
        var lower = _Game.getTile(tile.x, tile.y+1, tile.floor);
        var left = _Game.getTile(tile.x-1, tile.y, tile.floor);
        var id = 0;
        if (matchTile(tile, upper, layer)) {
            id += 1;
        }
        if (matchTile(tile, right, layer)) {
            id += 2;
        }
        if (matchTile(tile, lower, layer)) {
            id += 4;
        }
        if (matchTile(tile, left, layer)) {
            id += 8;
        }
        
        switch(id) {
            case 0:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], (tile[layer+"x"] * TILE_SIZE), (tile[layer+"y"] * TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 1:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+3) * TILE_SIZE), (TILE_SIZE / 2), TILE_SIZE, 0, 0, (TILE_SIZE / 2), TILE_SIZE);
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2.5) * TILE_SIZE), ((tile[layer+"y"]+3) * TILE_SIZE), (TILE_SIZE / 2), TILE_SIZE, (TILE_SIZE / 2), 0, (TILE_SIZE / 2), TILE_SIZE);
                break;
            case 2:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+1) * TILE_SIZE), TILE_SIZE, (TILE_SIZE / 2), 0, 0, TILE_SIZE, (TILE_SIZE / 2));
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+3.5) * TILE_SIZE), TILE_SIZE, (TILE_SIZE / 2), 0, (TILE_SIZE / 2), TILE_SIZE, (TILE_SIZE / 2));
                break;
            case 3:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+3)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 4:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+1) * TILE_SIZE), (TILE_SIZE / 2), TILE_SIZE, 0, 0, (TILE_SIZE / 2), TILE_SIZE);
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2.5) * TILE_SIZE), ((tile[layer+"y"]+1) * TILE_SIZE), (TILE_SIZE / 2), TILE_SIZE, (TILE_SIZE / 2), 0, (TILE_SIZE / 2), TILE_SIZE);
                break;
            case 5:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+2) * TILE_SIZE), (TILE_SIZE / 2), TILE_SIZE, 0, 0, (TILE_SIZE / 2), TILE_SIZE);
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2.5) * TILE_SIZE), ((tile[layer+"y"]+2) * TILE_SIZE), (TILE_SIZE / 2), TILE_SIZE, (TILE_SIZE / 2), 0, (TILE_SIZE / 2), TILE_SIZE);
                break;
            case 6:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+1)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 7:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+0) * TILE_SIZE), ((tile[layer+"y"]+2)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 8:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2) * TILE_SIZE), ((tile[layer+"y"]+1) * TILE_SIZE), TILE_SIZE, (TILE_SIZE / 2), 0, 0, TILE_SIZE, (TILE_SIZE / 2));
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2) * TILE_SIZE), ((tile[layer+"y"]+3.5) * TILE_SIZE), TILE_SIZE, (TILE_SIZE / 2), 0, (TILE_SIZE / 2), TILE_SIZE, (TILE_SIZE / 2));
                break;
            case 9:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2) * TILE_SIZE), ((tile[layer+"y"]+3)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 10:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+1) * TILE_SIZE), ((tile[layer+"y"]+1) * TILE_SIZE), TILE_SIZE, (TILE_SIZE / 2), 0, 0, TILE_SIZE, (TILE_SIZE / 2));
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+1) * TILE_SIZE), ((tile[layer+"y"]+3.5) * TILE_SIZE), TILE_SIZE, (TILE_SIZE / 2), 0, (TILE_SIZE / 2), TILE_SIZE, (TILE_SIZE / 2));
                break;
            case 11:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+1) * TILE_SIZE), ((tile[layer+"y"]+3)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 12:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2) * TILE_SIZE), ((tile[layer+"y"]+1)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 13:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2) * TILE_SIZE), ((tile[layer+"y"]+2)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 14:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+1) * TILE_SIZE), ((tile[layer+"y"]+1)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
            case 15:
                ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+1) * TILE_SIZE), ((tile[layer+"y"]+2)* TILE_SIZE), TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
                break;
        }
        
        var upper_left = _Game.getTile(tile.x-1, tile.y-1, tile.floor);
        var upper_right = _Game.getTile(tile.x+1, tile.y-1, tile.floor);
        var lower_right = _Game.getTile(tile.x+1, tile.y+1, tile.floor);
        var lower_left = _Game.getTile(tile.x-1, tile.y+1, tile.floor);
        
        if (matchTile(tile, upper, layer) && matchTile(tile, left, layer) && !matchTile(tile, upper_left, layer)) {
            ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2) * TILE_SIZE), ((tile[layer+"y"]+0) * TILE_SIZE), (TILE_SIZE / 2), (TILE_SIZE / 2), 0, 0, (TILE_SIZE / 2), (TILE_SIZE / 2));
        }
        if (matchTile(tile, upper, layer) && matchTile(tile, right, layer) && !matchTile(tile, upper_right, layer)) {
            ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2.5) * TILE_SIZE), ((tile[layer+"y"]+0) * TILE_SIZE), (TILE_SIZE / 2), (TILE_SIZE / 2), (TILE_SIZE / 2), 0, (TILE_SIZE / 2), (TILE_SIZE / 2));
        }
        if (matchTile(tile, lower, layer) && matchTile(tile, right, layer) && !matchTile(tile, lower_right, layer)) {
            ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2.5) * TILE_SIZE), ((tile[layer+"y"]+0.5) * TILE_SIZE), (TILE_SIZE / 2), (TILE_SIZE / 2), (TILE_SIZE / 2), (TILE_SIZE / 2), (TILE_SIZE / 2), (TILE_SIZE / 2));
        }
        if (matchTile(tile, lower, layer) && matchTile(tile, left, layer) && !matchTile(tile, lower_left, layer)) {
            ctx.drawImage(_Game.tilesets[tile[layer+"s"]-10], ((tile[layer+"x"]+2) * TILE_SIZE), ((tile[layer+"y"]+0.5) * TILE_SIZE), (TILE_SIZE / 2), (TILE_SIZE / 2), 0, (TILE_SIZE / 2), (TILE_SIZE / 2), (TILE_SIZE / 2));
        }
        
        if (chain === undefined) {
            Tile.drawTile(upper_left, false);
            Tile.drawTile(upper, false);
            Tile.drawTile(upper_right, false);
            Tile.drawTile(right, false);
            Tile.drawTile(lower_right, false);
            Tile.drawTile(lower, false);
            Tile.drawTile(lower_left, false);
            Tile.drawTile(left, false);
        }
    }
}

function matchTile(tile1, tile2, layer) {
    if (tile1 && tile2) {
        if (tile1[layer+"s"] == tile2[layer+"s"] && tile1[layer+"x"] == tile2[layer+"x"] && tile1[layer+"y"] == tile2[layer+"y"]) {
            return true;
        }
    }
}

function Point(x, y, floor) {
    this.x = x;
    this.y = y;
    this.floor = floor;

    this.getKey = getKey;
    function getKey() {
        return this.x + "," + this.y + "," + this.floor;
    }
}

function zeroPad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}