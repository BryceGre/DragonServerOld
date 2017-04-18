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
 * Game.js is the core game functions that are shared between /admin.html and /game.html
 * For core game functions that are specific to game, see GameJS.js
 * For core game functions that are specific to admin, see AdminJS.js
 */

//Game Variables
_Game.lastTime = $.now(); //last update time
_Game.canvas; //game canvas
_Game.context; //game canvas context
_Game.testcontext;
_Game.currMusic = false; //current music playing
_Game.nextMusic = false; //next music (if transitioning)
_Game.userX = 0; //user x location
_Game.userY = 0; //user y location
_Game.stats = new Object(); //status info

/**
 * Load the game system.
 * Called after all data (images, music, etc.) is loaded from server.
 */
_Game.loadGame = function() {
    //set key listeners
    $(document).keydown(_Game.keyDown);
    $(document).keyup(_Game.keyUp);
    //set canvas click listeners
    $(_Game.canvas).on("click", _Game.onClick);
    $(_Game.canvas).on("contextmenu", _Game.onMenu);
    
    //set up game loop
    //setInterval(_Game.gameLoop, 1000 / FRAME_RATE);
    window.requestAnimationFrame(_Game.gameLoop);

    //notify server that game is loaded. 
    _Game.socket.send("loaded");
}

/**
 * Core game loop that runs every animation frame.
 */
_Game.gameLoop = function() {
    //set next loop call
    window.requestAnimationFrame(_Game.gameLoop);
    
    //calculate time since last loop
    var nowTime = $.now();
    var elapsed = nowTime - _Game.lastTime;
    _Game.lastTime = $.now();
    
    //execute onUpdate
    _Game.onUpdate(elapsed);
    //execute onDraw
    _Game.onDraw(elapsed);
}

/**
 * Play a music file for the user.
 * @param {type} id the id of the music file
 */
_Game.playMusic = function(id) {
    if (!_Game.currMusic) {
        //no music object, create and play
        _Game.currMusic = new Audio("SFX/Music/"+id+".mp3");
        _Game.currMusic.loop = true;
        _Game.currMusic.volume = 0.25;
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

/**
 * Stop playing the current music for the user
 */
_Game.stopMusic = function() {
    if (_Game.currMusic) {
        //game music is playing
        if (!_Game.nextMusic) {
            //no next music, fade out current music
            $(_Game.currMusic).animate({volume: 0}, 1000, "swing", _Game.onFadeMusic);
        }
        //cancel next music
        _Game.nextMusic = false;
    }
}

/**
 * Called after the currently playing music fades out
 */
_Game.onFadeMusic = function() {
    if (_Game.nextMusic) {
        //next music exists, play it.
        _Game.currMusic.setAttribute('src', _Game.nextMusic);
        _Game.currMusic.volume = 0.25;
        _Game.currMusic.play();
        _Game.nextMusic = false;
    } else {
        //no next music, stop playing.
        _Game.currMusic.pause();
        _Game.currMusic = false;
    }
}

/**
 * Called when the user right-clicks the canvas.
 * @param {ClickEvent} e the ClickEvent object for the mouse click
 */
_Game.onMenu = function(e) {
    _UI.ShowMenu(_Game.getClickedX(e), _Game.getClickedY(e), _Game.world.user.floor);
    return false;
}

/**
 * Create and set up the game menu in the lower-right corner.
 */
_Game.setupMenu = function() {
    //append menu items (from core files and modules)
    for (var key in _Game.menus) {
        $("#menu").append("<li><a href='#'>" + key + "</a></li>");
    }

    //set selected event listener
    var selected = function(event, ui) {
        _Game.menus[ui.item.text()](); //execute event for this menu item
        $(this).hide("slide", {direction: "down"}, 500); //close menu
    }

    //create the menu button in the HTML
    $("#menubutton").button({icons: {primary: "ui-icon-gear", secondary: "ui-icon-triangle-1-n"}}).click(function() {
        $("#menu").toggle("slide", {direction: "down"}, 500);
        $("#menubutton").blur();
        return false;
    });
    //create the menu itself in the HTML
    $("#menu").menu({select: selected}).hide();

    //close menu when anything outside the menu is clicked
    $('body').click(function() {
        $("#menu").hide("slide", {direction: "down"}, 500);
    });
}

/**
 * Converts a tile x position to page coordinates.
 * @param {Number} x the x of the tile tile to convert to the page coordinates
 * @returns {Number} the x page coordinate of the tile
 */
_Game.getPageX = function(x) {
    var tileRatio = ($("#game").width() / CLIENT_WIDTH);
    return (_Game.getTileX(x) * tileRatio) + $("#game").offset().left;
}

/**
 * Converts a tile y position to page coordinates.
 * @param {Number} y the y of the tile tile to convert to the page coordinates
 * @returns {Number} the y page coordinate of the tile
 */
_Game.getPageY = function(y) {
    var tileRatio = ($("#game").height() / CLIENT_HEIGHT);
    return (_Game.getTileY(y) * tileRatio) + $("#game").offset().top;
}