//Global Variables
var HALF_SIZE = (TILE_SIZE / 2);
//Global Variable Buckets
var _Game = new Object();
var Game = _Game;
var _Data = new Object();
// Common Vars
_Game.gfx = new Object();
_Game.tilesets = new Array();
_Game.target = null;
_Game.select = null;
_Game.modules = new Object();
_Game.hooks = new Object();
_Game.menus = new Object();
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
 * Include functions Functions used to include additional scrips
 */

_Game.includeJS = function(name) {
    // $.getScript("js/"+name+".js", include_loaded)
    // .fail(function(jqxhr, settings, exception) {
    var script = document.createElement('script');
    script.src = "js/" + name + ".js";
    script.type = 'text/javascript';
    script.onload = _Game.include_loaded;
    script.onerror = function() {
        alert("Problem loading game scripts!");
    };
    document.head.appendChild(script);
    // });
    _Data.includes_requested++;
    $("#load-bar").progressbar("option", "max", _Data.includes_requested);
}

_Game.includeMod = function(name) {
    // $.getScript(url, include_loaded)
    // .fail(function(jqxhr, settings, exception) {
    var script = document.createElement('script');
    script.src = "modules/" + name + ".js";
    script.type = 'text/javascript';
    script.onload = _Game.module_loaded;
    script.onerror = function() {
        alert("Problem loading game module! Path: modules/" + folder + "/" + name + ".js");
    };
    document.head.appendChild(script);
    // });
    _Data.modules_requested++;
}

_Game.include_loaded = function() {
    _Data.includes_loaded++;
    $("#load-bar").progressbar("value", _Data.includes_loaded)
    if (_Data.includes_loaded == _Data.includes_requested) {
        console.log("Resources loaded, loading modules");
        for (var i = 0; i < ModuleList.length; i++) {
            _Game.includeMod(ModuleList[i]);
        }
        $("#load-text").text("Loading Modules...");
    }
}

_Game.module_loaded = function() {
    _Data.modules_loaded++;
    if (_Data.modules_loaded == _Data.modules_requested) {
        console.log("Modules loaded. Starting game");
        $("#load-dialog").dialog({ closeOnEscape: false }).dialog("close");
        
        _Game.canvas = $("#game")[0];
        _Game.context = _Game.canvas.getContext("2d");
        _Game.testcontext = $("#tiletest")[0].getContext("2d");
        
        _Game.setupConfig();
        _Game.module_onLoaded();
        _Game.onLoaded();
    }
}

_Game.loadResources = function() {
    for (var i = 0; i <= 9; i++) {
        _Game.tilesets[i] = _Game.loadImage("GFX/Tiles" + i + ".png");
    }
    
    _Game.target = _Game.loadImage("GFX/Target.png");
    _Game.select = _Game.loadImage("GFX/Select.png");

    for (var key in GFX) {
        _Game.gfx[key] = new Array();
        if (key == "UI") continue;
        for (var i = 1; i < GFX[key]; i++) {
            _Game.gfx[key][i] = _Game.loadImage("GFX/"+key+"/" + i + ".png");
        }
    }
}

_Game.loadImage = function(file) {
    var newImage = new Image();
    newImage.src = file;
    // newimage.onreadystatechange = include_loaded;
    newImage.onload = _Game.include_loaded;

    _Data.includes_requested++;
    $("#load-bar").progressbar("option", "max", _Data.includes_requested);
    return newImage;
}

_Game.connect = function(target) {
    _Game.socket = new WebSocket("ws://" + SERVER_IP + ":" + SERVER_PORT + "/" + target);

    _Game.socket.onopen = function() {
        console.log("Connected!");
        $("#login-form").dialog("open");
    }

    _Game.socket.onmessage = function(e) {
        if (DEBUG) {
            console.log("DEBUG: Message Recieved: " + e.data);
        }
        _Game.onMessage(e.data);
    }

    _Game.socket.onclose = function() {
        console.log("Disconnected!");
        alert("Disconnected!");
        location.reload();
    }
}

_Game.setupConfig = function() {
    // setup globals
    $("#game")[0].width = CLIENT_WIDTH;
    $("#game")[0].height = CLIENT_HEIGHT;
    
    $("#HUD")[0].width = CLIENT_WIDTH;
    $("#HUD")[0].height = CLIENT_HEIGHT;

    // setup prefs
    if (_Game.getPref("FillScreen")) {
        $("#game").css("width", "100%");
        $("#game").css("height", "100%");
        $("#HUD").css("width", "100%");
        $("#HUD").css("height", "100%");
    }
}

_Game.setPref = function(pref, val) {
    localStorage.setItem(pref, JSON.stringify(val));
}

_Game.getPref = function(pref) {
    return JSON.parse(localStorage.getItem(pref));
}

$(document).ready(function() {
    $("#load-dialog").dialog({closeOnEscape: false, autoOpen: true});
    $("#load-bar").progressbar();
    
    _Game.loadResources();
    
    _Game.includeJS("Game");
    _Game.includeJS("Player");
    _Game.includeJS("World");
    _Game.includeJS("UI");
    _Game.includeJS("SHA");
    _Game.includeJS("Module");
    _Game.includeJS("Data");
    
    $.get("/layout.xml", function(data) {
        _Game.HUD = $(data);
        _Game.include_loaded();
    });
    _Data.includes_requested++;
    
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