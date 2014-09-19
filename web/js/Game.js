//Game Variables
_Game.lastTime = $.now();
_Game.canvas;
_Game.context;
_Game.testcontext;

_Game.loadGame = function() {
    _Game.canvas = $("#game")[0];
    _Game.context = _Game.canvas.getContext("2d");
    _Game.testcontext = $("#tiletest")[0].getContext("2d");

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