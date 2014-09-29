//Game Variables
_Game.lastTime = $.now();
_Game.canvas;
_Game.context;
_Game.testcontext;
_Game.currMusic = false;
_Game.nextMusic = false;
_Game.userX = 0;
_Game.userY = 0;

_Game.loadGame = function() {
    $(document).keydown(_Game.keyDown);
    $(document).keyup(_Game.keyUp);
    $(_Game.canvas).on("click", _Game.onClick);
    $(_Game.canvas).on("contextmenu", _Game.onMenu);

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

_Game.onClick = function(e) {
    _UI.HideMenu();
}

_Game.onMenu = function(e) {
    _UI.ShowMenu(_Game.getClickedX(e), _Game.getClickedY(e), _Game.world.user.floor);
    return false;
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

_Game.getPageX = function(x) {
    var tileRatio = ($("#game").width() / CLIENT_WIDTH);
    return (_Game.getTileX(x) * tileRatio) + $("#game").offset().left;
}

_Game.getPageY = function(y) {
    var tileRatio = ($("#game").height() / CLIENT_HEIGHT);
    return (_Game.getTileY(y) * tileRatio) + $("#game").offset().top;
}