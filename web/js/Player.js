_Game.userID = 0;

function Character(name, x, y, floor, sprite) {
    this.direction = 0;
    this.facing = 0;
    this.moved = 0;
    this.lastOffset = {x:0,y:0};
    this.x = parseInt(x);
    this.y = parseInt(y);
    this.floor = parseInt(floor);
    this.lastPoint = new Point(this.x, this.y, this.floor);
    this.name = name;
    this.sprite = parseInt(sprite);
    this.target = null;
    this.lastDoor = false;
}

Character.prototype.resetLastPoint = function() {
    this.lastPoint = new Point(this.x, this.y, this.floor);
}

Character.prototype.getSpriteOffset = function() {
    if (this.facing != 0) {
        var offset = new Object();
        var width = Math.floor(_Game.gfx.Sprites[this.sprite].width / 4);
        var height = Math.floor(_Game.gfx.Sprites[this.sprite].height / 4);
        if (this.facing == 37) { //left
            offset.y = 1 * height;
        } else if (this.facing == 38) { //up
            offset.y = 3 * height;
        } else if (this.facing == 39) { //right
            offset.y = 2 * height;
        } else if (this.facing == 40) { //down
            offset.y = 0 * height;
        }
        var stage = Math.floor(this.moved / (TILE_SIZE / 4));
        offset.x = stage * width;
        this.lastOffset = offset;
    }
    return this.lastOffset
}

//User is the local player
function User(name, x, y, floor, sprite) {
    Character.call(this, name, x, y, floor, sprite);
    
    this.nextDir = 0;
    this.sprinting = false;
    this.command = 0;
    this.user = true;
}

//A Player is any player other than the local user
function Player(id, name, x, y, floor, sprite) {
    Character.call(this, name, x, y, floor, sprite);
    
    this.sprinting = false;
    this.command = 0;
    this.id = parseInt(id);
    this.player = true;
}

function NPC(id, name, x, y, floor, sprite) {
    Character.call(this, name, x, y, floor, sprite);
    this.id = parseInt(id);
    this.npc = true;
}

User.prototype = Object.create(Character.prototype);
User.prototype.constructor = User;
Player.prototype = Object.create(Character.prototype);
Player.prototype.constructor = Player;
NPC.prototype = Object.create(Character.prototype);
NPC.prototype.constructor = NPC;

User.prototype.move = function() {
    //update user position
    this.resetLastPoint();
    if (this.direction == 37) { // left
        this.x--;
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].x > this.x + DRAW_DISTANCE) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor)];
                delete _Game.world.npcs[key];
            }
        }
    } else if (this.direction == 38) { // up
        this.y--;
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].y > this.y + DRAW_DISTANCE) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor)];
                delete _Game.world.npcs[key];
            }
        }
    } else if (this.direction == 39) { // right
        this.x++;
        for (key in _Game.world.npcs) {
            if (_Game.world.npcs[key].x < this.x - DRAW_DISTANCE) {
                delete _Game.world.npcTile[Tile.key(_Game.world.npcs[key].x, _Game.world.npcs[key].y, _Game.world.npcs[key].floor)];
                delete _Game.world.npcs[key];
            }
        }
    } else if (this.direction == 40) { // down
        this.y++;
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
        Game.playMusic(playerTile.music);
    }
}