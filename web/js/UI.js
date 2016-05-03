var _UI = new Object();
_UI.HUD = new Object();
var UI = _UI;

_UI.UI_Top = new Object();
_UI.VAL = new Object();
_UI.HUD.Images = new Object();
_UI.HUD.Drops = new Object();
_UI.HUD.Binds = new Object();
_UI.HUD.Translate = {x:0, y:0};
_UI.HUD.SaveStack = new Array();

_UI.NewWindow = function(id, title, width, height) {
    var newdiv =
            $('<div>', {
                'class': 'filler',
                'id': id,
                'title': title,
                'style': 'overflow-y:scroll'
            }).appendTo("#ui");

    _UI.UI_Top[id] = 0;
    
    var opaque = window.localStorage.getItem("ui-"+id+"-o");
    if (!opaque) { opaque = 10; }
    
    $(newdiv).dialog({
        autoOpen: false,
        resizable: false,
        dialogClass:'opaque-'+opaque,
        width: width,
        height: height,
        appendTo: "#ui",
        create: function() {
            //create transparency slider
            var slider = $('<div>', { 'style': 'display:inline-block;float:right;width:25%;right:16px;' });
            $(this).parents("div.ui-dialog").find("span.ui-dialog-title").after(slider);
            $(slider).slider({
                min: 1,
                max: 10,
                step: 1,
                value: opaque,
                slide: function(e,ui){
                    $(newdiv).dialog({
                        dialogClass:'opaque-'+ ui.value,
                    });
                    window.localStorage.setItem("ui-"+id+"-o", ui.value);
                }                
            });
        },
        dragStart: function() {
            $(this).dialog("moveToTop");
        },
        dragStop: function() {
            var offset = $(this).parents("div.ui-dialog").offset();
            window.localStorage.setItem("ui-"+id+"-x", offset.left);
            window.localStorage.setItem("ui-"+id+"-y", offset.top);
        },
        open: function() {
            var x = window.localStorage.getItem("ui-"+id+"-x");
            var y = window.localStorage.getItem("ui-"+id+"-y");
            if (x && y) {
                $(this).parents("div.ui-dialog").css({left : x+"px", top : y+"px"});
            }
        },
        close: function( event, ui ) {
            $("#menubutton").blur();
        }
    });

    return newdiv;
}

_UI.NewDiv = function(id, style) {
    var newdiv;
    if (typeof style === 'undefined') {
        newdiv =
                $('<div>', {
                    'id': id
                }).appendTo("#ui");
    } else {
        newdiv =
                $('<div>', {
                    'id': id,
                    'style': style
                }).appendTo("#ui");
    }

    return newdiv;
}

_UI.makeTabs = function(window, tabs) {
    var id = window.attr("id");
    var tabsdiv =
            $('<div>', {
                'id': id + '-tabs'
            }).appendTo(window);

    var tablist = "<ul>\n";
    for (var key in tabs) {
        tablist += "  <li data-key='" + key + "'><a href='#" + id + "-tabs-" + key + "'>" + tabs[key] + "</a></li>\n"
    }
    tablist += "</ul>";
    $(tabsdiv).html(tablist);

    _UI.UI_Top[id] = new Object();

    for (var key in tabs) {
        $('<div>', {
            'id': id + '-tabs-' + key
        }).appendTo(tabsdiv);

        _UI.UI_Top[id][key] = 0;
    }

    tabsdiv.tabs({});
}

_UI.getTab = function(window) {
    var id = window.attr("id");
    var active = $("#" + id + "-tabs").tabs("option", "active");
    return $("#" + id + "-tabs > ul > li").eq(active).data("key");
}

_UI.AddRaw = function(window, html, tab) {
    var id = window.attr("id");
    if (tab) {
        $("#" + id + "-tabs-" + tab).append(html);
    } else {
        $(window).append(html);
    }
}

_UI.AddDiv = function(window, name, content, tab, attr) {
    var id = window.attr("id");
    if (attr) {
        attr['id'] = id + "-" + name;
        if (typeof attr['style'] === 'undefined') {
            attr['style'] = 'display:block;margin:4px 0px;overflow:scroll;';
        }
    } else {
        var attr = {
            'id': id + "-" + name,
            'style': 'display:block;margin:4px 0px;overflow:scroll;'
        };
    }
    if (tab) {
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<div>', attr).appendTo(window);
    }
    
    $(newdiv).append(content);
    _UI.MakeTooltip(newdiv);
    
    return newdiv;
}

_UI.AddIcon = function(window, name, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<canvas>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<canvas>', attr).appendTo(window);
    }
    
    _UI.MakeTooltip(newdiv);
    newdiv[0].setImage = function(img, x, y, width, height) {
        if (x === undefined)
            x = 0;
        if (y === undefined)
            y = 0;
        if (width === undefined)
            width = img.width;
        if (height === undefined)
            height = img.height;
        var ctx = this.getContext("2d");
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.drawImage(img, x, y, width, height, 0, 0, this.width, this.height);
    }
    newdiv.setImage = function(img, x, y, width, height) {
        this[0].setImage(img, x, y, width, height);
    }
    newdiv[0].clearImage = function() {
        var ctx = this.getContext("2d");
        ctx.fillRect(0, 0, this.width, this.height);
    }
    newdiv.clearImage = function() {
        this[0].clearImage();
    }
    
    return newdiv;
}

_UI.AddInput = function(window, name, value, func, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<input>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<input>', attr).appendTo(window);
    }
    
    $(newdiv).val(value);
    $(newdiv).change(func);
    _UI.MakeTooltip(newdiv);
    
    return newdiv;
}

_UI.AddArea = function(window, name, value, func, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<textarea>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<textarea>', attr).appendTo(window);
    }
    
    $(newdiv).val(value);
    $(newdiv).change(func);
    _UI.MakeTooltip(newdiv);
    
    return newdiv;
}

_UI.AddSlider = function(window, name, min, max, func, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    var slider = {
        min: min,
        max: max,
        range: "min",
        slide: func,
        stop: function(event, ui) { ui.handle.blur(); }
    };

    if (tab) {
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<div>', attr).appendTo(window);
    }
    
    $(newdiv).slider(slider);
    _UI.MakeTooltip(newdiv);

    return newdiv;
}

_UI.AddSpinner = function(window, name, options, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<input>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<input>', attr).appendTo(window);
    }
    
    _UI.VAL[$(newdiv).attr("id")] = function() {
        if (arguments.length == 0) {
            return parseFloat(_UI.ORIG_VAL.apply($(newdiv)));
        } else if (arguments.length == 1) {
            return parseFloat(_UI.ORIG_VAL.apply($(newdiv), arguments));
        } else if (arguments[1]) {
            return $(newdiv).val(arguments[0] + " " + arguments[1]);
        }
    }
    
    if (options.value !== undefined) {
        $(newdiv).spinner(options).val(options.value);
    } else if (options.min !== undefined && options.min > 0) {
        $(newdiv).spinner(options).val(options.min);
    } else if (options.max !== undefined && options.max < 0) {
        $(newdiv).spinner(options).val(options.max);
    } else {
        $(newdiv).spinner(options).val(0);
    }
    _UI.MakeTooltip(newdiv);
    
    return newdiv;
}

_UI.AddButton = function(window, name, title, func, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);

    if (tab) {
        var newdiv = $('<button>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<button>', attr).appendTo(window);
    }
    
    $(newdiv).text(title);
    $(newdiv).button().click(func);
    _UI.MakeTooltip(newdiv);

    return newdiv;
}

_UI.AddRadio = function(window, name, buttons, vertical, checked, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<div>', attr).appendTo(window);
    }

    for (var key in buttons) {
        if (key == checked) {
            $(newdiv).append("<input type='radio' id='" + id + "-" + name + "-" + key + "' value='" + key + "' name='" + id + "-" + name + "' checked='checked' /><label for='" + id + "-" + name + "-" + key + "'>" + buttons[key] + "</label>");
        } else {
            $(newdiv).append("<input type='radio' id='" + id + "-" + name + "-" + key + "' value='" + key + "' name='" + id + "-" + name + "' /><label for='" + id + "-" + name + "-" + key + "'>" + buttons[key] + "</label>");
        }
    }
    
    if (vertical) {
        $(newdiv).buttonsetv();
    } else {
        $(newdiv).buttonset();
    }
    _UI.MakeTooltip(newdiv);

    return newdiv;
}

_UI.AddCheckbox = function(window, name, label, checked, func, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<div>', attr).appendTo(window);
    }
    
    if (checked) {
        $(newdiv).append("<input type='checkbox' id='" + id + "-" + name + "-check' checked='checked' /><label for='" + id + "-" + name + "-check'>" + label + "</label>");
    } else {
        $(newdiv).append("<input type='checkbox' id='" + id + "-" + name + "-check' /><label for='" + id + "-" + name + "-check'>" + label + "</label>");
    }
    
    $(newdiv).buttonset().change(func);
    _UI.MakeTooltip(newdiv);
    
    return newdiv;
}

_UI.AddCombobox = function(window, name, options, members, func, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<select>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<select>', attr).appendTo(window);
    }
    
    for (var key in members) {
        $(newdiv).append("<option value='" + key + "'>" + members[key] + "</option>");
    }
    
    $(newdiv).chosen(options).change(func);
    _UI.MakeTooltip(newdiv);

    return newdiv;
}

_UI.AddDrag = function(window, name, hook, args, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<canvas>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<canvas>', attr).appendTo(window);
    }
    
    $(newdiv).draggable({
        appendTo: "#ui",
        stack: "div",
        helper: function() {
            var helper = $("<img>");
            helper.attr("src", newdiv[0].toDataURL());
            helper.data("hook", hook);
            helper.data("args", args);
            _UI.HUD.scaleWidth(helper);
            return helper;
        },
        cursorAt: { left: (TILE_SIZE/2), top: (TILE_SIZE/2) },
        stop: _UI.HUD.onDragStop,
        zIndex: 9999,
    });
    _UI.MakeTooltip(newdiv);

    return newdiv;
}

_UI.AddDrop = function(window, name, func, tab, attr) {
    var id = window.attr("id");
    attr = _UI.FixAttr(id + "-" + name, attr);
    
    if (tab) {
        var newdiv = $('<canvas>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        var newdiv = $('<canvas>', attr).appendTo(window);
    }
    
    $(newdiv).droppable({
        drop: func,
    });
    _UI.MakeTooltip(newdiv);

    return newdiv;
}

_UI.FixAttr = function(id, attr) {
    if (attr) {
        attr['id'] = id;
        if (typeof attr['style'] === 'undefined') {
            attr['style'] = 'display:block;margin:4px 0px;';
        }
    } else {
        attr = {
            'id': id,
            'style': 'display:block;margin:4px 0px;'
        };
    }
    return attr;
}

_UI.MakeTooltip = function(newdiv) {
    if ($(newdiv).attr('title') !== undefined) {
        $(newdiv).tooltip({
            content: function () {
                return this.getAttribute("title");
            },
            track: true,
        });
    }
    return newdiv;
}

_UI.NewPrompt = function(title, fields, func, width, height) {
    var id = "ui-prompt";
    if ($("#" + id).length) {
        //old dialog exists, remove it.
        $("#" + id).dialog('destroy');
        $("#" + id).remove();
    }
    var newdiv =
            $('<div>', {
                'class': 'filler',
                'id': id,
                'title': title
            }).appendTo("#ui");

    for (var field in fields) {
        $(newdiv).append("<span>" + field + ":</span>");
        var newInput = "<input id='" + id + "-" + field + "'";
        for (var key in fields[field]) {
            newInput += " " + key + "='" + fields[field][key] + "'";
        }
        $(newdiv).append(newInput + " /><br>");
    }

    if ((typeof width === 'undefined') && (typeof height === 'undefined')) {
        $("#" + id).dialog({
            autoOpen: true,
            resizable: false,
            modal: true,
            buttons: {
                "Ok": onSubmit
            },
            close: function() { $(this).dialog('destroy').remove(); }
        });
    } else {
        if (typeof width === 'undefined') {
            $("#" + id).dialog({
                autoOpen: true,
                resizable: false,
                modal: true,
                height: height,
                buttons: {
                    "Ok": onSubmit
                },
                close: function() { $(this).dialog('destroy').remove(); }
            });
        } else if (typeof height === 'undefined') {
            $("#" + id).dialog({
                autoOpen: true,
                resizable: false,
                modal: true,
                width: width,
                buttons: {
                    "Ok": onSubmit
                },
                close: function() { $(this).dialog('destroy').remove(); }
            });
        } else {
            $("#" + id).dialog({
                autoOpen: true,
                resizable: false,
                modal: true,
                width: width,
                height: height,
                buttons: {
                    "Ok": onSubmit
                },
                close: function() { $(this).dialog('destroy').remove(); }
            });
        }
    }

    function onSubmit() {
        var results = new Object();
        for (var field in fields) {
            results[field] = $("#" + id + "-" + field).val();
        }
        func(results);
        $(this).dialog('close');
    }
    
    return newdiv;
}
_UI.ORIG_VAL = $.fn.val;

_UI.AddToMenu = function(title, hook, args) {
    var id = "ui-menu";
    if ($("#" + id).length) {
        var newdiv = $('<li>', {
            'id': id
        }).appendTo("#ui-menu");
        
        $(newdiv).text(title);
        
        if (typeof hook !== 'function') {
            hook = function() {
                Module.doHook(hook, args);
            }
        }
        $(newdiv).click(function() {
            _UI.HideMenu();
            hook();
        });
    }
}

_UI.ShowMenu = function(x, y, floor) {
    var id = "ui-menu";
    if ($("#" + id).length) {
        //old menu exists, remove it.
        $("#" + id).menu('destroy');
        $("#" + id).remove();
    }
    var newdiv = $('<ul>', {
        'id': id,
        'style': "position:absolute"
    }).appendTo("#ui");
    
    Module.doHook("contextmenu", {x:x, y:y, floor:floor});
    
    var tileX = _Game.getPageX(x+1);
    var tileY = _Game.getPageY(y+1);
    $(newdiv).menu();
    $(newdiv).position({
        my: "left top",
        at: "left+"+tileX+" top+"+tileY,
        of: "#"+id
    });
    $(newdiv).show();
    
    return newdiv;
}

_UI.HideMenu = function() {
    var id = "ui-menu";
    if ($("#" + id).length) {
        //old menu exists, remove it.
        $("#" + id).menu('destroy');
        $("#" + id).remove();
    }
}

$.fn.val = function () {
    if (typeof _UI.VAL[$(this).attr("id")] != "undefined") {
        return _UI.VAL[$(this).attr("id")].apply(this, arguments);
    } else {
        return _UI.ORIG_VAL.apply(this, arguments);
    }
};

_UI.keyDown = function(e) {
    if (_UI.HUD.Binds[e.which]) {
        var pref = _Game.getPref("drop-" + _UI.HUD.Binds[e.which]);
        if (pref) {
            Module.doHook(pref.hook, pref.args);
        }
    }
}

_UI.HUD.init = function() {
    console.log("init layout");
    
    _UI.canvas = $("#HUD")[0];
    _UI.context = _UI.canvas.getContext("2d");
    
    //allow dragging of drops on action bars
    $("#HUD").draggable({
        appendTo: "#ui",
        //stack: "div",
        zIndex: 1001,
        helper: function(e) {
            var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
            var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
            var key = _UI.HUD.findDrop(x, y);
            if (key) {
                var pref = _Game.getPref("drop-" + key);
                if (pref) {
                    //create helper
                    var helper = $("<img>");
                    helper.attr("src", pref.image);
                    helper.data("hook", pref.hook);
                    helper.data("args", pref.args);
                    _UI.HUD.scaleWidth(helper);
                    
                    //remove from bar
                    _Game.HUD.find("#" + key).attr('src', _UI.HUD.Drops[key].oldsrc);
                    _Game.setPref("drop-" + key, null);
                    _UI.HUD.reDraw();
                    
                    return helper;
                }
            }
            return $("<div>");
        },
        cursorAt: { left: (TILE_SIZE/2), top: (TILE_SIZE/2) },
        stop: _UI.HUD.onDragStop,
    });
    
    $(_UI.canvas).on("click", function(e) {
        var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
        var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
        var key = _UI.HUD.findDrop(x, y);
        if (key) {
            var pref = _Game.getPref("drop-" + key);
            if (pref) {
                Module.doHook(pref.hook, pref.args);
            }
            return false;
        } else {
            return _Game.onClick(e);
        }
    });
    $(_UI.canvas).on("contextmenu", function(e) {
        var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
        var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
        var key = _UI.HUD.findDrop(x, y);
        if (key) {
            var pref = _Game.getPref("drop-" + key);
            if (pref) {
               _Game.HUD.find("#" + key).attr('src', _UI.HUD.Drops[key].oldsrc);
               _Game.setPref("drop-" + key, null);
                _UI.HUD.reDraw();
            }
            return false;
        } else {
            return _Game.onMenu(e);
        }
    });
    
    var requests = 0;
    var complete = 0;
    _Game.HUD.find('[src]').each(function() {
        var src = $(this).attr('src');
        if (src.lastIndexOf("data:image", 0) !== 0) {
            _UI.HUD.Images[src] = new Image();
            _UI.HUD.Images[src].onload = function() {
                complete++;
                if (complete == requests)
                    _UI.HUD.reDraw();
            }
            _UI.HUD.Images[src].onerror = function() {
                console.error("Unable to load HUD image: " + src);
                complete++;
                if (complete == requests)
                    _UI.HUD.reDraw();
            }
            requests++;
            _UI.HUD.Images[src].src = src;
        }
    });
    if (requests == 0)
        _UI.HUD.reDraw();
}

_UI.HUD.get = function(id) {
    return _Game.HUD.find(id);
}

_UI.HUD.reDraw = function() {
    _UI.HUD.Translate.x = 0;
    _UI.HUD.Translate.y = 0;
    _UI.context.clearRect(0, 0, _UI.canvas.width, _UI.canvas.height);
    _Game.HUD.find("layout").children().each(function () {
        _UI.HUD.reDrawChild($(this), _UI.canvas.width, _UI.canvas.height);
    });
}

_UI.HUD.reDrawChild = function(child, width, height) {
    _UI.HUD.transform.save();
    
    if (child.prop("tagName").toLowerCase() == "div" || child.prop("tagName").toLowerCase() == "drop") {
        var dx = parseInt(child.attr('x')) || 0;
        var dy = parseInt(child.attr('y')) || 0;
        if (child.prop("tagName").toLowerCase() == "div") {
            var dw = parseInt(child.attr('width')) || (width - dx);
            var dh = parseInt(child.attr('height')) || (height - dx);
        } else {
            var dw = TILE_SIZE;
            var dh = TILE_SIZE;
            _UI.HUD.initDrop(child);
        }
        var color = child.attr('color') || null;
        if (color) {
            _UI.context.fillStyle = color;
            _UI.context.fillRect(dx,dy,dw,dh);
        }
        var src = child.attr('src') || null;
        if (src) {
            if (_UI.HUD.Images[src]) {
                _UI.context.drawImage(_UI.HUD.Images[src], dx, dy, dw, dh);
            } else if (src.lastIndexOf("data:image", 0) === 0) {
                var img = new Image();
                img.src = src;
                _UI.context.drawImage(img, dx, dy, dw, dh);
            } 
        }
        _UI.HUD.transform.translate(dx, dy);
        width = dw;
        height = dh;
    } else if (child.prop("tagName").toLowerCase() == "text") {
        var x = parseInt(child.attr('x')) || 0;
        var y = parseInt(child.attr('y')) || 0;
        var text = child.text() || "";
        var size = child.attr('size') || "12px";
        var font = child.attr('font') || "Arial";
        var color =  child.attr('color') || "black";
        var align =  child.attr('align') || "left";
        _UI.context.font = size + " " + font;
        _UI.context.fillStyle = color;
        _UI.context.textAlign = align;
        _UI.context.fillText(text, x, y);
    } else if (child.prop("tagName").toLowerCase() == "anchor") {
        var x = 0;
        var y = 0;
        switch(child.attr('x')) {
            case "left":
                x = 0;
                break;
            case "center":
                x = (width / 2);
                break;
            case "right":
                x = width;
                break;
        }
        switch(child.attr('y')) {
            case "top":
                y = 0;
                break;
            case "middle":
                y = (height / 2);
                break;
            case "bottom":
                y = height;
                break;
        }
        _UI.HUD.transform.translate(x, y);
    }
    
    child.children().each(function() {
        _UI.HUD.reDrawChild($(this), width, height);
    });
    
    _UI.HUD.transform.restore();
}

_UI.HUD.findDrop = function(x, y) {
    var drop = null;
    for (var key in _UI.HUD.Drops) {
        if (_UI.HUD.Drops[key].left < x && _UI.HUD.Drops[key].top < y) {
            if (_UI.HUD.Drops[key].right > x && _UI.HUD.Drops[key].bottom > y) {
                if (drop == null) {
                    drop = key;
                } else if (_UI.HUD.Drops[key].zindex > _UI.HUD.Drops[drop].zindex) {
                    drop = key;
                }
            }
        }
    }
    return drop;
}

_UI.HUD.initDrop = function(drop) {
    var id = drop.attr('id');
    if (!_UI.HUD.Drops[id]) {
        var x = parseInt(drop.attr('x')) || 0;
        var y = parseInt(drop.attr('y')) || 0;
        var z = parseInt(drop.attr('z')) || 0;
        var w = TILE_SIZE;
        var h = TILE_SIZE;
        
        var tr = _UI.HUD.transform.get();
        x += tr.x;
        y += tr.y;
        w += x;
        h += y;
        _UI.HUD.Drops[id] = {left:x, top:y, right:w, bottom:h, zindex:z};
        
        //also restore image from saved drops
        _UI.HUD.Drops[id].oldsrc = drop.attr('src');
        var pref = _Game.getPref("drop-" + id);
        if (pref) {
            drop.attr('src', pref.image);
        }
        
        var key = parseInt(drop.attr('key')) || 0;
        if (!_UI.HUD.Binds[key])
            _UI.HUD.Binds[key] = id;
    }
}

_UI.HUD.transform = new Object();
_UI.HUD.transform.translate = function(x, y) {
    _UI.context.translate(x, y);
    _UI.HUD.Translate.x += x;
    _UI.HUD.Translate.y += y;
}
_UI.HUD.transform.save = function() {
    _UI.context.save();
    _UI.HUD.SaveStack.push(jQuery.extend({}, _UI.HUD.Translate));
}
_UI.HUD.transform.restore = function() {
    _UI.context.restore();
    _UI.HUD.Translate = _UI.HUD.SaveStack.pop();
}
_UI.HUD.transform.get = function() {
    return _UI.HUD.Translate;
}

_UI.HUD.scaleWidth = function(element) {
    var width =  element[0].width  * ($("#game").width()  / CLIENT_WIDTH );
    var height = element[0].height * ($("#game").height() / CLIENT_HEIGHT);
    element.width (width );
    element.height(height);
}

_UI.HUD.onDragStop = function(e, ui) {
    if (ui.helper.prop("tagName").toLowerCase() == "img") {
        var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
        var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
        var key = _UI.HUD.findDrop(x, y);
        if (key) {
            _Game.HUD.find("#" + key).attr('src', ui.helper.attr('src'));
            _Game.setPref("drop-" + key, {image: ui.helper.attr('src'), hook: ui.helper.data("hook"), args: ui.helper.data("args")});
            _UI.HUD.reDraw();
        }
    }
}