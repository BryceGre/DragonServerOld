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
 * Common.js class contains common core functions and has methods of loading other requires files.
 * Common.js will load in the other .js files (aside from AdminJS.js and GameJS.js).
 */

//Global Variables
var HALF_SIZE = (TILE_SIZE / 2); //half tile size
//Global Variable Buckets
var _Game = new Object();
var Game = _Game;
var _Data = new Object();
// Common Vars
_Game.gfx = new Object(); //list of all game graphics objects
_Game.tilesets = new Array(); //array of image objects that are tilesets
_Game.target = null; //target image
_Game.select = null; //selected image
_Game.modules = new Object(); //list of all modules
_Game.hooks = new Object(); //list of module hooks
_Game.menus = new Object(); //list of items for the game menu
// Include Vars
_Data.includes_requested = 0;
_Data.includes_loaded = 0;
_Data.modules_requested = 0;
_Data.modules_loaded = 0;
// Socket Vars
_Game.socket;
// Game Vars
_Game.isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0));

/*
 * Include an additional .js script file from the js/ directory.
 * @param {String} name the filename of the script file to include (minus the .js)
 */
_Game.includeJS = function(name) {
    // $.getScript("js/"+name+".js", include_loaded)
    // .fail(function(jqxhr, settings, exception) {
    //create new script element
    var script = document.createElement('script');
    script.src = "js/" + name + ".js"; //script filename
    script.type = 'text/javascript'; //script type
    script.onload = _Game.include_loaded; //mark as loaded when loaded
    script.onerror = function() { //error loading script
        //die here since all game scripts are needed
        alert("Problem loading game scripts!");
    };
    //append new element to document
    document.head.appendChild(script);
    // });
    //update progress
    _Data.includes_requested++;
    $("#load-bar").progressbar("option", "max", _Data.includes_requested);
}

/**
 * Include a module script file from the modules/ directory.
 * @param {String} name the filename of the module to include (minus the .js)
 */
_Game.includeMod = function(name) {
    // $.getScript(url, include_loaded)
    // .fail(function(jqxhr, settings, exception) {
    //create new script element
    var script = document.createElement('script');
    script.src = "modules/" + name + ".js"; //script filename
    script.type = 'text/javascript'; //script type
    script.onload = _Game.module_loaded; //mark as loaded when loaded
    script.onerror = function() { //error loading script
        alert("Problem loading game module! Path: modules/" + folder + "/" + name + ".js");
        _Game.module_loaded(); //continue without module
    };
    //append new element to document
    document.head.appendChild(script);
    // });
    //update progress
    _Data.modules_requested++;
}

/**
 * Function that is run after a single include (script, image, audio, etc.) is loaded.
 */
_Game.include_loaded = function() {
    //update progress
    _Data.includes_loaded++;
    $("#load-bar").progressbar("value", _Data.includes_loaded)
    //check if everything is loaded
    if (_Data.includes_loaded == _Data.includes_requested) {
        //everything is loaded
        console.log("Resources loaded, loading modules");
        //load modules now
        for (var i = 0; i < ModuleList.length; i++) {
            _Game.includeMod(ModuleList[i]);
        }
        $("#load-text").text("Loading Modules...");
    }
}

/**
 * Function that is run after a single module is loaded.
 */
_Game.module_loaded = function() {
    //update progress
    _Data.modules_loaded++;
    //check if everything is loaded
    if (_Data.modules_loaded == _Data.modules_requested) {
        //everything is loaded
        console.log("Modules loaded. Starting game");
        //close loading dialog
        $("#load-dialog").dialog({ closeOnEscape: false }).dialog("close");
        //set up canvas
        _Game.canvas = $("#game")[0];
        _Game.context = _Game.canvas.getContext("2d");
        _Game.testcontext = $("#tiletest")[0].getContext("2d");
        //set up game
        _Game.setupConfig();
        _Game.module_onLoaded();
        _Game.onLoaded();
    }
}

/**
 * Function that loads all game resources (script, image, audio, etc.) from the server.
 */
_Game.loadResources = function() {
    //load all 9 tilesets
    for (var i = 0; i <= 9; i++) {
        _Game.tilesets[i] = _Game.loadImage("GFX/Tiles" + i + ".png");
    }
    
    //load targt and selected images
    _Game.target = _Game.loadImage("GFX/Target.png");
    _Game.select = _Game.loadImage("GFX/Select.png");

    //search all graphics folders
    for (var key in GFX) {
        //get graphics folder
        _Game.gfx[key] = new Array();
        //don't load UI folder
        if (key == "UI") continue;
        //load all images from this folder
        for (var i = 1; i < GFX[key]; i++) {
            _Game.gfx[key][i] = _Game.loadImage("GFX/"+key+"/" + i + ".png");
        }
    }
}

/**
 * Load a single image file.
 * @param {String} file the full filename of the image to load
 * @returns {Image} the loaded Image object
 */
_Game.loadImage = function(file) {
    //create a new image object
    var newImage = new Image(); //image object
    newImage.src = file; //image src
    // newimage.onreadystatechange = include_loaded;
    newImage.onload = _Game.include_loaded; //mark as loaded when loaded
    newImage.onerror = function() { //error loading image
        console.log("error loading " + file);
        _Game.include_loaded(); //continue without image
    };
    //update progress
    _Data.includes_requested++;
    $("#load-bar").progressbar("option", "max", _Data.includes_requested);
    //return new Image object
    return newImage;
}

/**
 * Connect to server via WebSocket.
 * @param {String} target the target path. Can be "admin" or "client"
 */
_Game.connect = function(target) {
    //create socket object
    _Game.socket = new WebSocket("ws://" + SERVER_IP + ":" + SERVER_PORT + "/" + target);

    //on connection open
    _Game.socket.onopen = function() {
        console.log("Connected!");
        //show login form
        $("#login-form").dialog("open");
    }

    //on message recieved
    _Game.socket.onmessage = function(e) {
        if (DEBUG) {
            console.log("DEBUG: Message Recieved: " + e.data);
        }
        //forward to game function
        _Game.onMessage(e.data);
    }

    //on connection close
    _Game.socket.onclose = function() {
        console.log("Disconnected!");
        alert("Disconnected!");
        //reload page to reset
        location.reload();
    }
}

/**
 * Load and set up the user configuration data.
 */
_Game.setupConfig = function() {
    // setup globals
    $("#game")[0].width = CLIENT_WIDTH;
    $("#game")[0].height = CLIENT_HEIGHT;
    // also for HUD
    $("#HUD")[0].width = CLIENT_WIDTH;
    $("#HUD")[0].height = CLIENT_HEIGHT;

    // setup prefs (user settings)
    if (_Game.getPref("FillScreen")) {
        $("#game").css("width", "100%");
        $("#game").css("height", "100%");
        $("#HUD").css("width", "100%");
        $("#HUD").css("height", "100%");
    }
}

/**
 * Set a user preference.
 * @param {String} pref the preference name
 * @param {Object} val the value to set
 */
_Game.setPref = function(pref, val) {
    localStorage.setItem(pref, JSON.stringify(val));
}

/**
 * Get a user preference.
 * @param {String} pref the preference name
 * @returns {Array|Object} the value of the pref
 */
_Game.getPref = function(pref) {
    return JSON.parse(localStorage.getItem(pref));
}

/**
 * Start everything here
 */
$(document).ready(function() {
    //show load dialog with progress bar
    $("#load-dialog").dialog({closeOnEscape: false, autoOpen: true});
    $("#load-bar").progressbar();
    
    //load resources
    _Game.loadResources();
    
    //load scripts
    _Game.includeJS("Game");
    _Game.includeJS("Player");
    _Game.includeJS("World");
    _Game.includeJS("UI");
    _Game.includeJS("SHA");
    _Game.includeJS("Module");
    _Game.includeJS("Data");
    
    //load HUD layout
    $.get("/layout.xml", function(data) {
        _Game.HUD = $(data);
        _Game.include_loaded();
    });
    _Data.includes_requested++;
    
    //load user prefs
    for (var key in InitPrefs) {
        if (_Game.getPref(key) === null) {
            _Game.setPref(key, InitPrefs[key]);
        }
    }
});

var _CP = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
if (_CP.lineTo) {
    _CP.dashedLine = function(x, y, x2, y2, da) {
        if (!da)
            da = [10, 5];
        this.save();
        var dx = (x2 - x), dy = (y2 - y);
        var len = Math.sqrt(dx * dx + dy * dy);
        var rot = Math.atan2(dy, dx);
        this.translate(x, y);
        this.moveTo(0, 0);
        this.rotate(rot);
        var dc = da.length;
        var di = 0, draw = true;
        x = 0;
        while (len > x) {
            x += da[di++ % dc];
            if (x > len)
                x = len;
            draw ? this.lineTo(x, 0) : this.moveTo(x, 0);
            draw = !draw;
        }
        this.restore();
    }
}

(function($) {
    // plugin buttonset vertical
    $.fn.buttonsetv = function() {
        $(':radio', this).wrap('<div style="margin: 1px"/>');
        $(':checkbox', this).wrap('<div style="margin: 1px"/>');
        $(this).buttonset();
        $('label:first', this).removeClass('ui-corner-left').addClass('ui-corner-top');
        $('label:last', this).removeClass('ui-corner-right').addClass('ui-corner-bottom');
    };
})(jQuery);