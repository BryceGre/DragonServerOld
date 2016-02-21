var _UI = new Object();
var UI = _UI;

_UI.UI_Top = new Object();
_UI.VAL = new Object();
_UI.Images = new Object();
_UI.Drops = new Object();
_UI.Translate = {x:0, y:0};
_UI.SaveStack = new Array();

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
    
    $(newdiv).spinner(options);
    
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
            console.log("result: field: '" + field + "' result: '" + results[field]) + "'";
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
    console.log("left+"+tileX+" top+"+tileY);
    
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

_UI.initLayout = function() {
    console.log("init layout");
    $("#HUD").droppable({
        drop: function(event, ui) {
            for (var key in _UI.Drops) {
                //_UI.Drops[key]
            }
            //ui.draggable
        }
    });
    _UI.canvas = $("#HUD")[0];
    _UI.context = _UI.canvas.getContext("2d");
    
    var requests = 0;
    var complete = 0;
    
    _Game.HUD.find('[src]').each(function() {
        var src = $(this).attr('src');
        _UI.Images[src] = new Image();
        _UI.Images[src].onload = function() {
            complete++;
            if (complete == requests)
                _UI.reDraw();
        }
        _UI.Images[src].onerror = function() {
            console.error("Unable to load HUD image: " + src);
            complete++;
            if (complete == requests)
                _UI.reDraw();
        }
        requests++;
        _UI.Images[src].src = src;
    });
    if (requests == 0)
        _UI.reDraw();
}

_UI.getHUDById = function(id) {
    return _Game.HUD.find('#'+id);
}

_UI.reDraw = function() {
    _UI.Translate.x = 0;
    _UI.Translate.y = 0;
    _UI.context.clearRect(0, 0, _UI.canvas.width, _UI.canvas.height);
    _Game.HUD.find("layout").children().each(function () {
        _UI.reDrawChild($(this), _UI.canvas.width, _UI.canvas.height);
    });
}

_UI.reDrawChild = function(child, width, height) {
    _UI.transform.save();
    console.log("child: <" + child.prop("tagName") + " id='" + child.attr('id') + "' />");
    
    if (child.prop("tagName") == "div" || child.prop("tagName") == "drop") {
        var dx = child.attr('x') || 0;
        var dy = child.attr('y') || 0;
        if (child.prop("tagName") == "div") {
            var dw = child.attr('width') || (width - dx);
            var dh = child.attr('height') || (height - dx);
        } else {
            var dw = TILE_SIZE;
            var dh = TILE_SIZE;
            var id = child.attr('id');
            _UI.registerDrop(id, dx, dy, dw, dh);
        }
        var color = child.attr('color') || null;
        if (color) {
            _UI.context.fillStyle = color;
            _UI.context.fillRect(dx,dy,dw,dh);
        }
        var src = child.attr('src') || null;
        if (src) {
            _UI.context.drawImage(_UI.Images[src], dx, dy, dw, dh);
        }
        _UI.transform.translate(dx, dy);
        width = dw;
        height = dh;
    } else if (child.prop("tagName") == "anchor") {
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
        _UI.transform.translate(x, y);
    }
    
    child.children().each(function() {
        _UI.reDrawChild($(this), width, height);
    });
    
    _UI.transform.restore();
}

_UI.registerDrop = function(id, x, y, w, h) {
    var tr = _UI.transform.get();
    x += tr.x;
    y += tr.y;
    _UI.Drops[id] = {x:x, y:y, w:w, h:h};
}

_UI.transform = new Object();
_UI.transform.translate = function(x, y) {
    _UI.context.translate(x, y);
    _UI.Translate.x += x;
    _UI.Translate.y += y;
}
_UI.transform.save = function() {
    _UI.context.save();
    _UI.SaveStack.push(jQuery.extend({}, _UI.Translate));
}
_UI.transform.restore = function() {
    _UI.context.restore();
    _UI.Translate = _UI.SaveStack.pop();
}
_UI.transform.get = function() {
    return _UI.Translate;
}