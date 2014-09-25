//Game Variables
_Game.lastTime = $.now();
_Game.canvas;
_Game.context;
_Game.testcontext;
_Game.currMusic = false;
_Game.nextMusic = false;

_Game.loadGame = function() {
    $(document).keydown(_Game.keyDown);
    $(document).keyup(_Game.keyUp);

    setInterval(_Game.gameLoop, 10);

    _Game.socket.send("loaded");
}

_Game.gameLoop = function() {
    var nowTime = $.now();
    var elapsed = nowTime - _Game.lastTime;
    _Game.lastTime = $.now();
    _Game.onUpdate(elapsed);
    _Game.onDraw(elapsed);
}

_Game.playMusic = function(id) {
    if (!_Game.currMusic) {
        //no music object, create and play
        _Game.currMusic = new Audio("SFX/Music/"+id+".mp3");
        _Game.currMusic.loop = true;
        _Game.currMusic.play();
    } else if (_Game.nextMusic) {
        //music is fading out, set next music
        _Game.nextMusic = "SFX/Music/"+id+".mp3";
    } else if (_Game.currMusic.getAttribute('src') != "SFX/Music/"+id+".mp3") {
        //music is different from what is playing, fade out and set next music
        $(_Game.currMusic).animate({volume: 0}, 1000, "swing", _Game.onFadeMusic);
        _Game.nextMusic = "SFX/Music/"+id+".mp3";
    }
}

_Game.stopMusic = function() {
    if (_Game.currMusic) {
        if (!_Game.nextMusic) {
            $(_Game.currMusic).animate({volume: 0}, 1000, "swing", _Game.onFadeMusic);
        }
        _Game.nextMusic = false;
    }
}

_Game.onFadeMusic = function() {
    if (_Game.nextMusic) {
        _Game.currMusic.setAttribute('src', _Game.nextMusic);
        _Game.currMusic.volume = 1;
        _Game.currMusic.play();
        _Game.nextMusic = false;
    } else {
        _Game.currMusic.pause();
        _Game.currMusic = false;
    }
}

_Game.setupMenu = function() {
    for (var key in _Game.menus) {
        $("#menu").append("<li><a href='#'>" + key + "</a></li>");
    }

    var selected = function(event, ui) {
        _Game.menus[ui.item.text()]();
        $(this).hide("slide", {direction: "down"}, 500);
    }

    $("#menubutton").button({icons: {primary: "ui-icon-gear", secondary: "ui-icon-triangle-1-n"}}).click(function() {
        $("#menu").toggle("slide", {direction: "down"}, 500);
        return false;
    });
    $("#menu").menu({select: selected}).hide();

    $('body').click(function() {
        $("#menu").hide("slide", {direction: "down"}, 500);
    });
}

_Game.getTileX = function(x) {
    var tileX = ((x - _Game.world.user.x) * TILE_SIZE) + (_Game.canvas.width / 2);
    if (_Game.world.user.direction != 0) {
        if (_Game.world.user.direction == 37) { // left
            tileX -= (TILE_SIZE - _Game.world.user.moved);
        } else if (_Game.world.user.direction == 39) { // right
            tileX += (TILE_SIZE - _Game.world.user.moved);
        }
    }
    return tileX;
}

_Game.getTileY = function(y) {
    var tileY = ((y - _Game.world.user.y) * TILE_SIZE) + (_Game.canvas.height / 2);
    if (_Game.world.user.direction != 0) {
        if (_Game.world.user.direction == 38) { // up
            tileY -= (TILE_SIZE - _Game.world.user.moved);
        } else if (_Game.world.user.direction == 40) { // down
            tileY += (TILE_SIZE - _Game.world.user.moved);
        }
    }
    return tileY;
}

_Game.getClickedX = function(e) {
    var middleX = ($("#game").width() / 2);
    var tileRatio = $("#game").width() / CLIENT_WIDTH;
    return _Game.editX + Math.floor((((e.pageX - $("#game").offset().left) - middleX) / tileRatio) / TILE_SIZE);
}

_Game.getClickedY = function(e) {
    var middleY = ($("#game").height() / 2);
    var tileRatio = $("#game").height() / CLIENT_HEIGHT;
    return _Game.editY + Math.floor((((e.pageY - $("#game").offset().top) - middleY) / tileRatio) / TILE_SIZE);
}