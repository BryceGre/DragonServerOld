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
 * UI.js contains functions for the creation of UI windows and HUD elements.
 * Use of this class allows the future move away from jQuery UI without breaking modules.
 */

var _UI = new Object(); //UI object
_UI.HUD = new Object(); //HUD object
var UI = _UI;

_UI.UI_Top = new Object();
_UI.VAL = new Object();
_UI.HUD.Images = new Object(); //HUD Image Elements
_UI.HUD.Drops = new Object(); //HUD Drop Areas
_UI.HUD.Binds = new Object(); //HUD Key Bindings
_UI.HUD.Translate = {x:0, y:0}; //HUD Transform Position
_UI.HUD.SaveStack = new Array(); //HUD Transform Stack

/**
 * Create a new UI Window.
 * @param {String} id the id to give the window
 * @param {String} title the window's title
 * @param {Number} width the window's width
 * @param {Number} height the window's height
 * @returns {jQuery|Object} object representing the new window
 */
_UI.NewWindow = function(id, title, width, height) {
    //create the window's div element
    var newdiv =
            $('<div>', {
                'class': 'filler',
                'id': id,
                'title': title,
                'style': 'overflow-y:scroll'
            }).appendTo("#ui");

    //save UI_Top
    _UI.UI_Top[id] = 0;
    
    //remember window's transparency slider value
    var opaque = window.localStorage.getItem("ui-"+id+"-o");
    if (!opaque) { opaque = 10; }
    
    //create a dialog from the div element
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

    //return window div
    return newdiv;
}

/**
 * Create a new div element in the UI div
 * @param {String} id the id to give the div
 * @param {Object} style CSS style values to give the new div
 * @returns {jQuery|Object} an object representing the new div
 */
_UI.NewDiv = function(id, style) {
    var newdiv;
    
    //create the new div
    if (typeof style === 'undefined') {
        //no style
        newdiv =
                $('<div>', {
                    'id': id
                }).appendTo("#ui");
    } else {
        //style given
        newdiv =
                $('<div>', {
                    'id': id,
                    'style': style
                }).appendTo("#ui");
    }
    
    //return the new div
    return newdiv;
}

/**
 * Take a window (made with UI.newWindow) and give it tabs.
 * @param {jQuery|Object} window the window to give tabs to
 * @param {Object} tabs an array representing the tabs (tabs[key]=name)
 */
_UI.makeTabs = function(window, tabs) {
    var id = window.attr("id"); //get id of window
    //create a div to contain the tabs
    var tabsdiv =
            $('<div>', {
                'id': id + '-tabs'
            }).appendTo(window);
    //set up jQuery-comptatable tab list
    var tablist = "<ul>\n";
    for (var key in tabs) {
        tablist += "  <li data-key='" + key + "'><a href='#" + id + "-tabs-" + key + "'>" + tabs[key] + "</a></li>\n"
    }
    tablist += "</ul>";
    //add the tab list to the container div
    $(tabsdiv).html(tablist);

    //save a UI_Top for each tab
    _UI.UI_Top[id] = new Object();

    //make the divs for each tab
    for (var key in tabs) {
        $('<div>', {
            'id': id + '-tabs-' + key
        }).appendTo(tabsdiv);

        _UI.UI_Top[id][key] = 0;
    }

    //call the jQuery function to create the tabss
    tabsdiv.tabs({});
}

/**
 * Get the key for the active tab in the given window
 * @param {jQuery|Object} window the window containing the tabs
 * @returns {String} the "key" of the active tab (passed in UI.makeTabs)
 */
_UI.getTab = function(window) {
    var id = window.attr("id"); //get window ID
    var active = $("#" + id + "-tabs").tabs("option", "active"); //get active tab
    return $("#" + id + "-tabs > ul > li").eq(active).data("key"); //return key
}

/**
 * Add a raw element to a window
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} html the HTML of the element to add
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 */
_UI.AddRaw = function(window, html, tab) {
    var id = window.attr("id"); //get window ID
    if (tab) {
        //tab given, add element to tab
        $("#" + id + "-tabs-" + tab).append(html);
    } else {
        //add element to window
        $(window).append(html);
    }
}

/**
 * Add a div element to a window
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name of the new div
 * @param {String} content the content to add to the ne div 
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new div
 * @returns {jQuery|Object} an object representing the new div
 */
_UI.AddDiv = function(window, name, content, tab, attr) {
    var id = window.attr("id"); //get window ID
    if (attr) {
        //attributes given
        attr['id'] = id + "-" + name;
        if (typeof attr['style'] === 'undefined') {
            //no style given, use default style
            attr['style'] = 'display:block;margin:4px 0px;overflow:scroll;';
        }
    } else {
        //no attributes given
        var attr = {
            'id': id + "-" + name,
            'style': 'display:block;margin:4px 0px;overflow:scroll;'
        };
    }
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<div>', attr).appendTo(window);
    }
    $(newdiv).append(content);
    
    //make a tooltip for the new div
    _UI.MakeTooltip(newdiv);
    
    //return the new div
    return newdiv;
}

/**
 * Add an Icon (canvas) element to a window. Call setImage() on the returned object to set the icon.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new  element
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element, with a setImage() function
 */
_UI.AddIcon = function(window, name, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<canvas>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<canvas>', attr).appendTo(window);
    }
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);
    
    /**
     * Function to draw an image onto the new canvas element
     * @param {Image} img the HTMLL Image object to draw
     * @param {Number} x the x position to draw the image (or 0 if omitted)
     * @param {Number} y the y position to draw the image (or 0 if omitted)
     * @param {Number} width the width to draw the image (or img.width if omitted)
     * @param {Number} height the height to draw the image (or img.height if omitted)
     */
    newdiv[0].setImage = function(img, x, y, width, height) {
        if (x === undefined)
            x = 0; //no x given
        if (y === undefined)
            y = 0; //no y given
        if (width === undefined)
            width = img.width; //no width given
        if (height === undefined)
            height = img.height; //no height given
        //get canvas context
        var ctx = this.getContext("2d");
        //clear the canvas
        ctx.fillRect(0, 0, this.width, this.height);
        //draw the image
        ctx.drawImage(img, x, y, width, height, 0, 0, this.width, this.height);
    }
    //jQuery mirror of setImage function
    newdiv.setImage = function(img, x, y, width, height) {
        this[0].setImage(img, x, y, width, height);
    }
    /**
     * Clear the current image from the canvas
     */
    newdiv[0].clearImage = function() {
        var ctx = this.getContext("2d");
        ctx.fillRect(0, 0, this.width, this.height);
    }
    //jQuery mirror of clearImage function
    newdiv.clearImage = function() {
        this[0].clearImage();
    }
    
    //return the new element
    return newdiv;
}

/**
 * Add an Input element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {String} value the default text to place in the element
 * @param {Function} func the function to call when the input is changed
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddInput = function(window, name, value, func, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<input>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<input>', attr).appendTo(window);
    }
    
    $(newdiv).val(value); //set default value
    $(newdiv).change(func); //set function to trigger on change
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);
    
    //return the new element
    return newdiv;
}

/**
 * Add a TextArea element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {String} value the default text to place in the element
 * @param {Function} func the function to call when the input is changed
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddArea = function(window, name, value, func, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<textarea>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<textarea>', attr).appendTo(window);
    }
    
    $(newdiv).val(value); //set default value
    $(newdiv).change(func); //set function to trigger on change
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);
    
    //return the new element
    return newdiv;
}

/**
 * Add a Slider element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {Number} min the minimum value for the slider
 * @param {Number} max the maximum value for the slider
 * @param {Function} func the function to call when the slider is changed
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddSlider = function(window, name, min, max, func, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    //set jQuery slider params
    var slider = {
        min: min,
        max: max,
        range: "min",
        slide: func,
        stop: function(event, ui) { ui.handle.blur(); }
    };

    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<div>', attr).appendTo(window);
    }
    
    $(newdiv).slider(slider); //make the new slider
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);

    //return the new element
    return newdiv;
}

/**
 * Add a Spinner element to a window. (see jqueryui.com/spinner)
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {Object} options jquery options for this element
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddSpinner = function(window, name, options, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<input>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<input>', attr).appendTo(window);
    }
    
    //code to allow spinners to have suffixes (eg "8 meters", "9 meters", etc.)
    _UI.VAL[$(newdiv).attr("id")] = function() {
        if (arguments.length == 0) {
            return parseFloat(_UI.ORIG_VAL.apply($(newdiv)));
        } else if (arguments.length == 1) {
            return parseFloat(_UI.ORIG_VAL.apply($(newdiv), arguments));
        } else if (arguments[1]) {
            return $(newdiv).val(arguments[0] + " " + arguments[1]);
        }
    }
    
    //set the default value
    if (options.value !== undefined) {
        //value given in options
        $(newdiv).spinner(options).val(options.value);
    } else if (options.min !== undefined && options.min > 0) {
        //no value given, but a min is given that is positive
        $(newdiv).spinner(options).val(options.min);
    } else if (options.max !== undefined && options.max < 0) {
        //no value given, but a max is given that is negative
        $(newdiv).spinner(options).val(options.max);
    } else {
        //default value to 0
        $(newdiv).spinner(options).val(0);
    }
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);
    
    //return the new element
    return newdiv;
}

/**
 * Add a Button element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {String} title the label for the button
 * @param {Function} func the function to call when the button is pressed
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddButton = function(window, name, title, func, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes

    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<button>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<button>', attr).appendTo(window);
    }
    
    $(newdiv).text(title); //set the button's label
    $(newdiv).button().click(func); //set the click function
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);

    //return the new element
    return newdiv;
}

/**
 * Add a Radio element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {Object} buttons an array representing the buttons (buttons[key]=name)
 * @param {Boolean} vertical true if the radio should be vertical instead of horizontal
 * @param {String} checked the key of the button to be checked by default
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddRadio = function(window, name, buttons, vertical, checked, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<div>', attr).appendTo(window);
    }

    //make the options for the radio
    for (var key in buttons) {
        if (key == checked) {
            //default option, included checked attribute
            $(newdiv).append("<input type='radio' id='" + id + "-" + name + "-" + key + "' value='" + key + "' name='" + id + "-" + name + "' checked='checked' /><label for='" + id + "-" + name + "-" + key + "'>" + buttons[key] + "</label>");
        } else {
            $(newdiv).append("<input type='radio' id='" + id + "-" + name + "-" + key + "' value='" + key + "' name='" + id + "-" + name + "' /><label for='" + id + "-" + name + "-" + key + "'>" + buttons[key] + "</label>");
        }
    }
    
    //create the buttonset
    if (vertical) {
        $(newdiv).buttonsetv();
    } else {
        $(newdiv).buttonset();
    }
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);

    //return the new element
    return newdiv;
}

/**
 * Add a Checkbox element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {String} label the label for the checkbox
 * @param {Boolean} checked true if the checkbox should be checked by default
 * @param {Function} func the function to call when the button is clicked
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddCheckbox = function(window, name, label, checked, func, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<div>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<div>', attr).appendTo(window);
    }
    
    //add checkbox to element
    if (checked) {
        $(newdiv).append("<input type='checkbox' id='" + id + "-" + name + "-check' checked='checked' /><label for='" + id + "-" + name + "-check'>" + label + "</label>");
    } else {
        $(newdiv).append("<input type='checkbox' id='" + id + "-" + name + "-check' /><label for='" + id + "-" + name + "-check'>" + label + "</label>");
    }
    
    //set the change function
    $(newdiv).buttonset().change(func);
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);
    
    //return the new element
    return newdiv;
}

/**
 * Add a Combobox element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {Object} options custom jQuery options to give this element
 * @param {Object} members an array representing the options (options[key]=name)
 * @param {Function} func the function to call when the value is changed
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddCombobox = function(window, name, options, members, func, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<select>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<select>', attr).appendTo(window);
    }
    
    //add members to element
    for (var key in members) {
        $(newdiv).append("<option value='" + key + "'>" + members[key] + "</option>");
    }
    
    //set up element
    $(newdiv).chosen(options).change(func);
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);

    //return the new element
    return newdiv;
}

/**
 * Add a draggable canvas element to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {String} hook hook to attach to element when dragging
 * @param {Object} args args to attach to element when dragging
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddDrag = function(window, name, hook, args, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attributes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<canvas>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<canvas>', attr).appendTo(window);
    }
    
    //set up draggable element
    $(newdiv).draggable({
        appendTo: "#ui", //when dragged, append to base UI div
        stack: "div", //show above all other divs
        helper: function() { //attach data to dragged item
            var helper = $("<img>");
            helper.attr("src", newdiv[0].toDataURL());
            helper.data("hook", hook);
            helper.data("args", args);
            _UI.HUD.scaleWidth(helper);
            return helper;
        },
        cursorAt: { left: (TILE_SIZE/2), top: (TILE_SIZE/2) }, //drag from center
        stop: _UI.HUD.onDragStop, //function to be called on drag stop
        zIndex: 9999, //show above all other elements
    });
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);

    //return the new element
    return newdiv;
}

/**
 * Add a slot to drop draggable canvas elements to a window.
 * @param {jQuery|Object} window the window to add the element to
 * @param {String} name the name to give the new element
 * @param {Function} func function to call when element is dropped
 * @param {String} tab the key of the tab to add the element to (if UI.makeTabs was called on the given window)
 * @param {Object} attr a collection of attributes to give to the new element
 * @returns {jQuery|Object} an object representing the new element
 */
_UI.AddDrop = function(window, name, func, tab, attr) {
    var id = window.attr("id"); //get window ID
    attr = _UI.FixAttr(id + "-" + name, attr); //fix up attribbutes
    
    if (tab) {
        //tab given, add element to tab
        var newdiv = $('<canvas>', attr).appendTo("#" + id + "-tabs-" + tab);
    } else {
        //add element to window
        var newdiv = $('<canvas>', attr).appendTo(window);
    }
    
    //set up droppable element
    $(newdiv).droppable({
        drop: func, //call func on drop
    });
    
    //make a tooltip for the new element
    _UI.MakeTooltip(newdiv);

    //return the new element
    return newdiv;
}

/**
 * Take given ID and attribute list and make sure they don't clash.
 * @param {String} id the ID
 * @param {Object} attr a list of attributes
 * @returns {Object} an object containing the attributes with ID as 'id' and guarenteed set 'style'
 */
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

/**
 * Take an element's "title" attribute and put it in a tooltip to appear on hover.
 * @param {jQuery|Object} newdiv the div to add the tooltip to
 * @returns {jQuery|Object} the same newdiv object
 */
_UI.MakeTooltip = function(newdiv) {
    if ($(newdiv).attr('title') !== undefined) {
        $(newdiv).tooltip({
            content: function () {
                return this.getAttribute("title");
            },
            track: true,
        });
    }
    
    //return the new element
    return newdiv;
}

/**
 * Create a new window that appears over all others and must be dealt with.
 * @param {String} title the title of the window
 * @param {Object} fields the input fields to put in the window (fields[name][attr]=value)
 * @param {Function} func function to call with results
 * @param {Number} width the width of the dialog, or omit for default
 * @param {Number} height the height of the dialog, or omit for default
 * @returns {jQuery|Object} the new element that represents the prompt
 */
_UI.NewPrompt = function(title, fields, func, width, height) {
    var id = "ui-prompt"; //only one promt at a time
    
    //check for older dialogs
    if ($("#" + id).length) {
        //old dialog exists, remove it.
        $("#" + id).dialog('destroy');
        $("#" + id).remove();
    }
    //create the dialog div
    var newdiv =
            $('<div>', {
                'class': 'filler',
                'id': id,
                'title': title
            }).appendTo("#ui");

    //add input fields to dialog
    //example: fields = { "name": {"type":"text", "value":"name here"}, "pass": {"type":"password", "length":30} 
    for (var field in fields) {
        $(newdiv).append("<span>" + field + ":</span>");
        var newInput = "<input id='" + id + "-" + field + "'";
        for (var key in fields[field]) {
            newInput += " " + key + "='" + fields[field][key] + "'";
        }
        $(newdiv).append(newInput + " /><br>");
    }

    //create dialog
    if ((typeof width === 'undefined') && (typeof height === 'undefined')) {
        //default width, height
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
            //height given
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
            //width given
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
            //width and height given
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

    //onSubmit dialog function
    function onSubmit() {
        //store results in object
        var results = new Object();
        for (var field in fields) {
            results[field] = $("#" + id + "-" + field).val();
        }
        //call results function
        func(results);
        //close the dialog
        $(this).dialog('close');
    }
    
    //return the new element
    return newdiv;
}
_UI.ORIG_VAL = $.fn.val;

/**
 * Add a new element to the right-click menu.
 * @param {type} title the label of the new item
 * @param {type} hook the hook to call when the item is clicked
 * @param {type} args the args to pass to the hook when clicked
 */
_UI.AddToMenu = function(title, hook, args) {
    var id = "ui-menu"; //menu element id
    
    //make sure menu exists
    if ($("#" + id).length) {
        //create new list element
        var newdiv = $('<li>', {
            'id': id
        }).appendTo("#ui-menu");
        
        //set new element's label
        $(newdiv).text(title);
        
        //set module hook
        if (typeof hook !== 'function') {
            hook = function() {
                Module.doHook(hook, args);
            }
        }
        
        //register click function
        $(newdiv).click(function() {
            _UI.HideMenu();
            hook();
        });
    }
}

/**
 * Show the right-click menu.
 * @param {type} x the x position of the right-clicked tile
 * @param {type} y the y position of the right-clicked tile
 * @param {type} floor the floor of the right-clicked tile
 * @returns {jQuery|Object} new right-click menu element
 */
_UI.ShowMenu = function(x, y, floor) {
    var id = "ui-menu"; //menu element id
    
    //make sure menu exists
    if ($("#" + id).length) {
        //old menu exists, remove it.
        $("#" + id).menu('destroy');
        $("#" + id).remove();
    }
    //make a blank list of options.
    //use UI.AddToMenu to add elements
    var newdiv = $('<ul>', {
        'id': id,
        'style': "position:absolute"
    }).appendTo("#ui");
    
    //do module hook
    Module.doHook("contextmenu", {x:x, y:y, floor:floor});
    
    //get clicked-tile page location
    var tileX = _Game.getPageX(x+1);
    var tileY = _Game.getPageY(y+1);
    //create menu
    $(newdiv).menu();
    //position menu
    $(newdiv).position({
        my: "left top",
        at: "left+"+tileX+" top+"+tileY,
        of: "#"+id
    });
    //show menu
    $(newdiv).show();
    
    //return the new element
    return newdiv;
}

/**
 * Hide the right-click menu.
 */
_UI.HideMenu = function() {
    var id = "ui-menu"; //menu element id
    //
    //make sure menu exists
    if ($("#" + id).length) {
        //old menu exists, remove it.
        $("#" + id).menu('destroy');
        $("#" + id).remove();
    }
}

//value of spinner changed
//this code allows for spinner suffixes (eg "8 meters", "9 meters", etc.)
$.fn.val = function () {
    if (typeof _UI.VAL[$(this).attr("id")] != "undefined") {
        return _UI.VAL[$(this).attr("id")].apply(this, arguments);
    } else {
        return _UI.ORIG_VAL.apply(this, arguments);
    }
};

/**
 * Check key presses for key binds
 * @param {type} e the MouseEvent of the key press
 */
_UI.keyDown = function(e) {
    //check for key bind
    if (_UI.HUD.Binds[e.which]) {
        //key is bound, get the bind
        var pref = _Game.getPref("drop-" + _UI.HUD.Binds[e.which]);
        if (pref) {
            //bind exists, do the associated module hook
            Module.doHook(pref.hook, pref.args);
        }
    }
}

/**
 * Initialize the HUD (Heads-Up Display), a canvas that overlays the game.
 */
_UI.HUD.init = function() {
    console.log("init layout");
    
    //get HUD canvas and context
    _UI.canvas = $("#HUD")[0];
    _UI.context = _UI.canvas.getContext("2d");
    
    //make the entire canvas draggable and droppable on itself.
    //We can then create areas and deal with drag and drop events in our own code.
    //Note that we use this for action bars, so each draggable slot is also droppable.
    $("#HUD").draggable({
        appendTo: "#ui",
        //stack: "div",
        zIndex: 1001,
        helper: function(e) { //runs when an object starts to be dragged.
            //get position on canvas of the cursor when the drag is started
            var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
            var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
            //check if there is a slot here to drag/drop an element
            var key = _UI.HUD.findDrop(x, y);
            if (key) {
                //slot exists, check if there is an item/spell/etc. slotted here.
                var pref = _Game.getPref("drop-" + key);
                if (pref) {
                    //something is slotted here, create helper image that follows the cursor
                    var helper = $("<img>"); //image element to drag
                    helper.attr("src", pref.image); //image element data
                    helper.data("hook", pref.hook); //module hook on drop
                    helper.data("args", pref.args); //module args on drop
                    _UI.HUD.scaleWidth(helper); //scale width of helper so that it streches like the canvas
                    
                    //remove the item/spell/etc. from the slot
                    _Game.HUD.find("#" + key).attr('src', _UI.HUD.Drops[key].oldsrc); //remove the image from slot.
                    _Game.setPref("drop-" + key, null); //remove item/spell/etc. from slot
                    _UI.HUD.reDraw(); //redraw the HUD
                    
                    return helper; //return the helper
                }
            }
            return $("<div>"); //return the new div.
        },
        cursorAt: { left: (TILE_SIZE/2), top: (TILE_SIZE/2) },
        stop: _UI.HUD.onDragStop, //when the dragging object is dropped anywhere.
    });
    
    //function to use/cast an item/spell/etc. if a slot is clicked on the HUD.
    $(_UI.canvas).on("click", function(e) {
        //get position on canvas of the cursor
        var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
        var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
        //check if there is a slot here
        var key = _UI.HUD.findDrop(x, y);
        if (key) {
            //slot exists, check if there is an item/spell/etc. slotted here.
            var pref = _Game.getPref("drop-" + key);
            if (pref) {
                //something is slotted here, use/cast it by calling it's hook
                Module.doHook(pref.hook, pref.args);
            }
            return false; //don't propagate event
        } else {
            //nothing slotted here, use the game's onClick in place of the HUD's onClick.
            //the HUD is overlaying the game, so the game won't get the event otherwise.
            return _Game.onClick(e);
        }
    });
    
    //function to remove an item/spell/etc if a slot is right-clicked on the HUD.
    $(_UI.canvas).on("contextmenu", function(e) {
        //get position on canvas of the cursor
        var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
        var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
        //check if there is a slot here
        var key = _UI.HUD.findDrop(x, y);
        if (key) {
            //slot exists, check if there is an item/spell/etc. slotted here.
            var pref = _Game.getPref("drop-" + key);
            if (pref) {
                //something is slotted here, remove it from the slot
               _Game.HUD.find("#" + key).attr('src', _UI.HUD.Drops[key].oldsrc); //remove the image from slot.
               _Game.setPref("drop-" + key, null); //remove item/spell/etc. from slot
                _UI.HUD.reDraw(); //redraw the HUD
            }
            return false; //don't propagate event
        } else {
            //nothing slotted here, use the game's onClick in place of the HUD's onClick.
            //the HUD is overlaying the game, so the game won't get the event otherwise.
            return _Game.onMenu(e);
        }
    });
    
    //load the HUD images into the image list
    var requests = 0; //total requests
    var complete = 0; //complete requests
    //for each element on the HUD that has an 'src' attribute
    _Game.HUD.find('[src]').each(function() {
        var src = $(this).attr('src'); //get the src
        //check if the src links to image data
        if (src.lastIndexOf("data:image", 0) !== 0) {
            //src links to image data, load the image object
            _UI.HUD.Images[src] = new Image();
            _UI.HUD.Images[src].onload = function() {
                complete++;
                if (complete == requests)
                    _UI.HUD.reDraw(); //all images loaded
            }
            _UI.HUD.Images[src].onerror = function() {
                console.error("Unable to load HUD image: " + src);
                complete++;
                if (complete == requests)
                    _UI.HUD.reDraw(); //all images loaded
            }
            requests++;
            _UI.HUD.Images[src].src = src;
        }
    });
    if (requests == 0)
        _UI.HUD.reDraw(); //no images to load
}

/**
 * Get a HUD element from an id
 * @param {String} id the id to find
 * @returns {jQuery|Object} the element found
 */
_UI.HUD.get = function(id) {
    return _Game.HUD.find(id); //forward to Game.HUD object
}

/**
 * Re-Draw the HUD.
 */
_UI.HUD.reDraw = function() {
    _UI.HUD.Translate.x = 0; //reset translate x
    _UI.HUD.Translate.y = 0; //reset translate y
    //clear the HUD canvas
    _UI.context.clearRect(0, 0, _UI.canvas.width, _UI.canvas.height);
    //reDraw each element onto the HUD canvas.
    //note that this works similar to the DOM
    //each element has an x, y, width, height
    //meaning each element has it's own sub-area of the canvas
    //and each element's child is positioned within it's parent's sub-area
    _Game.HUD.find("layout").children().each(function () {
        _UI.HUD.reDrawChild($(this), _UI.canvas.width, _UI.canvas.height);
    });
}

/**
 * Re-Draw an element of the HUD.
 * For an example of how to use these elements, check layout.xml
 * @param {jQuery|Object} child the child to re-draw
 * @param {Number} width the width of the child
 * @param {Number} height the height of the child
 * @returns {undefined}
 */
_UI.HUD.reDrawChild = function(child, width, height) {
    _UI.HUD.transform.save(); //push canvas transform stack
    
    //check type of child
    if (child.prop("tagName").toLowerCase() == "div" || child.prop("tagName").toLowerCase() == "drop") {
        //child is a container
        //get x and y of child
        var dx = parseInt(child.attr('x')) || 0;
        var dy = parseInt(child.attr('y')) || 0;
        //get width and height of child
        if (child.prop("tagName").toLowerCase() == "div") {
            //div element's have specific width and height attributes
            var dw = parseInt(child.attr('width')) || (width - dx);
            var dh = parseInt(child.attr('height')) || (height - dx);
        } else {
            //drop elements are always the tile size
            var dw = TILE_SIZE;
            var dh = TILE_SIZE;
            //also initialize the drop area
            _UI.HUD.initDrop(child);
        }
        //fill the area with a color, if given
        var color = child.attr('color') || null;
        if (color) {
            _UI.context.fillStyle = color;
            _UI.context.fillRect(dx,dy,dw,dh);
        }
        //load the area's image if it has an src attribute
        var src = child.attr('src') || null;
        if (src) {
            //has src attribute
            if (_UI.HUD.Images[src]) {
                //image object exists, use it
                _UI.context.drawImage(_UI.HUD.Images[src], dx, dy, dw, dh);
            } else if (src.lastIndexOf("data:image", 0) === 0) {
                //image data exists, create an image object from it
                var img = new Image();
                img.src = src;
                _UI.context.drawImage(img, dx, dy, dw, dh);
            } 
        }
        //move to the new x, y, width, heigh (for the children)
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
        //child is an anchor (used to align elements easily)
        //start at (0,0) by default
        var x = 0;
        var y = 0;
        //check x attribute
        switch(child.attr('x')) {
            case "left": //align to left
                x = 0;
                break;
            case "center": //align to center
                x = (width / 2);
                break;
            case "right": //align to right
                x = width;
                break;
        }
        //check y attribute
        switch(child.attr('y')) {
            case "top": //align to top
                y = 0;
                break;
            case "middle": //align to middle
                y = (height / 2);
                break;
            case "bottom": //align to bottom
                y = height;
                break;
        }
        //translate to the new point
        _UI.HUD.transform.translate(x, y);
    }
    
    //reDraw all of the element's children
    child.children().each(function() {
        _UI.HUD.reDrawChild($(this), width, height);
    });
    
    _UI.HUD.transform.restore(); //pop canvas transform stack
}

/**
 * Find a drop area based on a given x and y position
 * @param {Number} x the x position to check
 * @param {Number} y the y position to check
 * @returns {String} the HUD object's key (use UI.HUD.Drops[key]) if a drop is found, null otherwise
 */
_UI.HUD.findDrop = function(x, y) {
    var drop = null;
    //for each element in UI.HUD.Drops
    for (var key in _UI.HUD.Drops) {
        //check min bounds
        if (_UI.HUD.Drops[key].left < x && _UI.HUD.Drops[key].top < y) {
            //check max bounds
            if (_UI.HUD.Drops[key].right > x && _UI.HUD.Drops[key].bottom > y) {
                //drop exists here
                if (drop == null) {
                    //first drop found at this location, set it
                    drop = key;
                } else if (_UI.HUD.Drops[key].zindex > _UI.HUD.Drops[drop].zindex) {
                    //another drop found, check its zindex
                    drop = key;
                }
            }
        }
    }
    return drop; //return the key
}

/**
 * Initialize a drop area to saved values and to accept drops.
 * @param {jQuery|Object} drop the drop element to initalize
 */
_UI.HUD.initDrop = function(drop) {
    var id = drop.attr('id'); //get drop id
    if (!_UI.HUD.Drops[id]) {
        //drop exists at this id, get dimensions
        var x = parseInt(drop.attr('x')) || 0;
        var y = parseInt(drop.attr('y')) || 0;
        var z = parseInt(drop.attr('z')) || 0;
        var w = TILE_SIZE;
        var h = TILE_SIZE;
        
        //account for transform from parents
        //we need the upper-left of the canvas,
        //not the upper-left of the parent element
        var tr = _UI.HUD.transform.get();
        x += tr.x;
        y += tr.y;
        w += x;
        h += y;
        //record data
        _UI.HUD.Drops[id] = {left:x, top:y, right:w, bottom:h, zindex:z};
        
        //also restore image from saved drops
        _UI.HUD.Drops[id].oldsrc = drop.attr('src');
        var pref = _Game.getPref("drop-" + id);
        if (pref) {
            //something is saved here, restore it
            drop.attr('src', pref.image);
        }
        
        //record any keybindings, so whatever is dropped here can be activated by keyboard
        var key = parseInt(drop.attr('key')) || 0;
        if (!_UI.HUD.Binds[key])
            _UI.HUD.Binds[key] = id;
    }
}

//set up the UI.HUD.Transform object, as a stack for the element positions.
//note that this works similar to the DOM
//each element has an x, y, width, height
//meaning each element has it's own sub-area of the canvas
//and each element's child is positioned within it's parent's sub-area
_UI.HUD.transform = new Object();
/**
 * Translate from current position by given x and y values
 * @param {Number} x the amount to translate horizontally
 * @param {Number} y the amount to translate vertically
 */
_UI.HUD.transform.translate = function(x, y) {
    //translate on the canvas
    _UI.context.translate(x, y);
    //translate in saved transformation
    _UI.HUD.Translate.x += x;
    _UI.HUD.Translate.y += y;
}
/**
 * Save the current translaton position to the stack.
 */
_UI.HUD.transform.save = function() {
    //save the canvas transformation stack
    _UI.context.save();
    //save the saved transformation to the stack
    _UI.HUD.SaveStack.push(jQuery.extend({}, _UI.HUD.Translate));
}
/**
 * Restore the previous translation position from the stack.
 */
_UI.HUD.transform.restore = function() {
    //restore the canvas transformation stack
    _UI.context.restore();
    //restore the saved transformation from the stack
    _UI.HUD.Translate = _UI.HUD.SaveStack.pop();
}
/**
 * Get the saved transformation object.
 * @returns {UI.HUD.Translate|Object} the transformation object
 */
_UI.HUD.transform.get = function() {
    return _UI.HUD.Translate;
}

/**
 * Scale a given element to match a scaled canvas.
 * @param {jQuery|Object} element the element to scale
 */
_UI.HUD.scaleWidth = function(element) {
    //get scaled width and height
    var width =  element[0].width  * ($("#game").width()  / CLIENT_WIDTH );
    var height = element[0].height * ($("#game").height() / CLIENT_HEIGHT);
    //set element's scaled width and height
    element.width (width );
    element.height(height);
}

/**
 * Event called when a dragged element is dropped (anywhere).
 * @param {Object} e the event object
 * @param {Object} ui the object being dragged
 */
_UI.HUD.onDragStop = function(e, ui) {
    //make sure we're dragging the correct thing
    if (ui.helper.prop("tagName").toLowerCase() == "img") {
        //get position on canvas of the cursor
        var x = (e.pageX - $("#game").offset().left) * (CLIENT_WIDTH  / $("#game").width() );
        var y = (e.pageY - $("#game").offset().top ) * (CLIENT_HEIGHT / $("#game").height());
        //check if there is a slot here
        var key = _UI.HUD.findDrop(x, y);
        if (key) {
            //slot exists, drop dragged element into slot
            _Game.HUD.find("#" + key).attr('src', ui.helper.attr('src'));
            _Game.setPref("drop-" + key, {image: ui.helper.attr('src'), hook: ui.helper.data("hook"), args: ui.helper.data("args")});
            _UI.HUD.reDraw(); //redraw canvas
        }
    }
}