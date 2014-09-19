_Game.userID = 0;

//User is the local player
function User(x, y, floor, sprite) {
    this.direction = 0;
    this.facing = 0;
    this.nextDir = 0;
    this.moved = 0;
    this.lastOffset = 0;
    this.sprinting = false;
    this.command = 0;
    this.x = parseInt(x);
    this.y = parseInt(y);
    this.floor = parseInt(floor);
    this.lastPoint = new Point(this.x, this.y, this.floor);
    this.sprite = parseInt(sprite);

    this.getSpriteOffset = getSpriteOffset;

    this.resetLastPoint = resetLastPoint;
    function resetLastPoint() {
        this.lastPoint = new Point(this.x, this.y, this.floor);
    }

    this.move = move;
    function move() {
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
            if (!_Game.currMusic || _Game.currMusic.getAttribute('src') != "audio/Music/"+playerTile.music+".mp3") {
                if (_Game.nextMusic === false) {
                    $(_Game.currMusic).animate({volume: 0}, 1000, "swing", function() {
                        _Game.currMusic.setAttribute('src', _Game.nextMusic);
                        _Game.currMusic.volume = 1;
                        _Game.currMusic.play();
                        _Game.nextMusic = false;
                    });
                    _Game.nextMusic = "audio/Music/"+playerTile.music+".mp3";
                }
            }
            if (_Game.nextMusic) {
                _Game.nextMusic = "audio/Music/"+playerTile.music+".mp3";
            }
        }
    }
}

//A Player is any player other than the local user
function Player(id, x, y, floor, sprite) {
    this.direction = 0;
    this.facing = 0;
    this.moved = 0;
    this.lastOffset = 0;
    this.sprinting = false;
    this.command = 0;
    this.id = parseInt(id);
    this.x = parseInt(x);
    this.y = parseInt(y);
    this.floor = parseInt(floor);
    this.lastPoint = new Point(this.x, this.y, this.floor);
    this.sprite = parseInt(sprite);

    this.getSpriteOffset = getSpriteOffset;
    
    this.resetLastPoint = resetLastPoint;
    function resetLastPoint() {
        this.lastPoint = new Point(this.x, this.y, this.floor);
    }
}

function NPC(x, y, floor, sprite) {
    this.direction = 0;
    this.facing = 0;
    this.moved = 0;
    this.lastOffset = 0;
    this.x = parseInt(x);
    this.y = parseInt(y);
    this.floor = parseInt(floor);
    this.lastPoint = new Point(this.x, this.y, this.floor);
    this.sprite = parseInt(sprite);

    this.getSpriteOffset = getSpriteOffset;
    
    this.resetLastPoint = resetLastPoint;
    function resetLastPoint() {
        this.lastPoint = new Point(this.x, this.y, this.floor);
    }
}

/** "this" must have the following data members: 
 this.facing
 this.moved
 this.lastOffset   */
function getSpriteOffset() {
    if (this.facing != 0) {
        var offset = 0;
        if (this.facing == 37) { //left
            offset = 7 * 32;
        } else if (this.facing == 38) { //up
            offset = 1 * 32;
        } else if (this.facing == 39) { //right
            offset = 10 * 32;
        } else if (this.facing == 40) { //down
            offset = 4 * 32;
        }
        var stage = Math.floor(this.moved / 8);
        if (stage == 1) {
            offset -= 32;
        } else if (stage == 3) {
            offset += 32;
        }
        this.lastOffset = offset;
    }
    return this.lastOffset
}