/* Copyright (c) 2014, Bryce Gregerson
 * All rights reserved.
 *
 * Redistribution and use in source form, with or without modification,
 * are permitted provided that the above copyright notice and this list
 * of conditions are retained.
 */

/***********************************************/
/***** Properties ******************************/
/***********************************************/
var NpcEditor = {
    name: "NPC Editor", //module name
    desc: "A simple editor for Non-Player Characters.", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
    req: {
        //required dependencies
    },
    opt: {
        //options
    }
};

/***********************************************/
/***** Server **********************************/
/***********************************************/
NpcEditor.server = {
    currNpc: 1,
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
NpcEditor.server.onInit = function() {
    //hook into events here
    Module.addHook("admin_message");
};

//onHook: Called when an event (that this module is hooked into) is triggered
NpcEditor.server.onHook = function(hook, args) {
    //argument "hook" contains which event has triggered
    if (hook === "admin_message") {
        if (args.head === "savenpc") {
            var data = JSON.parse(args.body);

            var npc = Data.npcs[this.currNpc];
            //note: we use putAll to reduce the number of database calls
            npc.putAll(data);
            //note: the following works as well, but results in 4 UPDATE calls
            /*
             * npc.name = data.name;
             * npc.sprite = data.sprite;
             * npc.action = data.action;
             * npc.behavior = data.behavior;
             */
        } else if (args.head === "loadnpc") {
            this.currNpc = parseInt(args.body);

            //note: retrieving the npc caches it's data temporarily, so calling
            //indivisual propeties does NOT result in more SELECT calls.
            var npc = Data.npcs[this.currNpc];
            if (npc.name === null) {
                npc.name = "";
            }
            if (npc.sprite === null) {
                npc.sprite = 1;
            }
            if (npc.action === null) {
                npc.action = "none";
            }
            if (npc.behavior === null) {
                npc.behavior = [];
            }

            Game.socket.send("loadnpc:" + JSON.stringify(npc));
        } else if (args.head === "npcnames") {
            //retrieve a list of names of npcs. Example: names[id] == "guy"
            var names = Data.npcs.list("name");

            Game.socket.send("npcnames:" + JSON.stringify(names));
        }
    }
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
NpcEditor.client = {
    /***** variables *****/
    window: null,
    currName: "",
    currSprite: 1,
    currAction: "none",
    currBehavior: new Array(),
    currNpc: 1,
    npcNames: new Object(),
    ctx: null,
    changed: false,
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
NpcEditor.client.onInit = function(isAdmin) {
    if (!isAdmin) {
        return;
    } //only work for admin
    
    Module.addHook("game_load");
    Module.addHook("message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
NpcEditor.client.onHook = function(hook, args) {
    if (hook === "game_load") {
        //game loaded, create the UI
        NpcEditor.client.createUI();
    } else if (hook === "message") {
        if (args.admin === true && args.head === "loadnpc") {
            var data = JSON.parse(args.body);
            this.currName = data.name;
            this.currSprite = data.sprite;
            this.currAction = data.action;
            this.currBehavior = data.behavior
			this.npcNames[this.currNpc] = this.currName;
            this.updateFields();
        } else if (args.admin === true && args.head === "npcnames") {
            $.extend(this.npcNames, JSON.parse(args.body));
            NpcEditor.client.loadNpc();
        }
    }
}

/***** helper *****/
NpcEditor.client.loadNpc = function() {
    Game.socket.send("loadnpc:" + this.currNpc);
}
NpcEditor.client.loadNames = function() {
    Game.socket.send("npcnames");
}

NpcEditor.client.updateFields = function() {
    $("#npc-editor-npc").val(this.currNpc, this.npcNames[this.currNpc]);
    $("#npc-editor-name").val(this.currName);
    $("#npc-editor-sprite").val(this.currSprite);
    $("#npc-editor-action").val(this.currAction);
    $("#npc-editor-action").trigger("chosen:updated");
    $("#npc-editor-behavior").val(this.currBehavior);
    $("#npc-editor-behavior").trigger("chosen:updated");
    NpcEditor.client.ctx.fillRect(0, 0, 96, 96);
    var sprite = Game.gfx.Sprites[this.currSprite];
    var w = Math.floor(sprite.width / 4);
    var h = Math.floor(sprite.height / 4);
    NpcEditor.client.ctx.drawImage(sprite, 0, 0, w, h, 0, 0, w, h);
}

NpcEditor.client.createUI = function() {
    this.window = UI.NewWindow("npc-editor", "NPC Editor", "336px");
    
    UI.AddDiv(this.window, "npc-label", "NPC ID: ", false, {"style": 'display:inline-block;float:left;margin:8px auto;'});
    UI.AddSpinner(this.window, "npc", {min: 1, stop: function() {
            var value = $("#npc-editor-npc").val();
            $("#npc-editor-npc").val(value, NpcEditor.client.npcNames[value]);
        }
    }, false, {"style": 'display:inline-block;float:left;margin:4px auto;'});
    UI.AddButton(this.window, "npc-edit", "Edit NPC", function() {
        if (NpcEditor.client.changed) {
            if (confirm("Any unsaved changes to the current NPC will be lost!")) {
                NpcEditor.client.currNpc = $("#npc-editor-npc").val();
                NpcEditor.client.loadNpc();
                NpcEditor.client.changed = false;
            } else {
                $("#npc-editor-npc").val(NpcEditor.client.currNpc, NpcEditor.client.npcNames[NpcEditor.client.currNpc]);
            }
        } else {
            NpcEditor.client.currNpc = $("#npc-editor-npc").val();
            NpcEditor.client.loadNpc();
        }
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});

    UI.AddRaw(this.window, "<div style='display:block;'><hr></div>");

    UI.AddRaw(this.window, "<canvas id='npc-editor-preview' width='96px' height='96px' style='display:inline-block;float:right;width:45%;'></canvas>");
    this.ctx = $("#npc-editor-preview")[0].getContext("2d");
    this.ctx.fillRect(0, 0, 128, 128);

    UI.AddDiv(this.window, "name-label", "Name: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddInput(this.window, "name", "", function() {
        NpcEditor.client.currName = $("#npc-editor-name").val();
        NpcEditor.client.changed = true;
    }, false, {"style": 'display:block;width:45%;margin:4px 0px;'});

    UI.AddDiv(this.window, "sprite-label", "Sprite: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window, "sprite", {min: 1, max: GFX.Sprites, spin: function(event, ui) {
            NpcEditor.client.currSprite = ui.value;
            NpcEditor.client.changed = true;
            NpcEditor.client.ctx.fillRect(0, 0, 96, 96);
            var sprite = Game.gfx.Sprites[NpcEditor.client.currSprite];
            var w = Math.floor(sprite.width / 4);
            var h = Math.floor(sprite.height / 4);
            NpcEditor.client.ctx.drawImage(sprite, 0, 0, w, h, 0, 0, w, h);
        }
    }, false, {"style": 'display:block;width:40%;margin:4px 0px;'});

    var actions = new Object();
    for (key in Data.npc_actions) {
        actions[key] = Data.npc_actions[key].name;
    }
    UI.AddDiv(this.window, "action-label", "Action: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddCombobox(this.window, "action", {width: "45%"}, actions, function() {
        NpcEditor.client.currAction = $("#npc-editor-action").val();
        NpcEditor.client.changed = true;
    }, false, {"style": 'display:block;margin:4px 0px;'});

    var behaviors = new Object();
    for (key in Data.npc_behaviors) {
        behaviors[key] = Data.npc_behaviors[key].name;
    }
    UI.AddDiv(this.window, "behavior-label", "Behaviors: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddCombobox(this.window, "behavior", {width: "100%"}, behaviors, function() {
        NpcEditor.client.currBehavior = $("#npc-editor-behavior").val() || [];
        NpcEditor.client.changed = true;
    }, false, {"style": 'display:block;margin:4px 0px;', "multiple": "multiple"});

    UI.AddButton(this.window, "save", "Save", function(e) {
        e.preventDefault();
        var JSONObject = new Object();
        JSONObject.name = NpcEditor.client.currName;
        JSONObject.sprite = NpcEditor.client.currSprite;
        JSONObject.action = NpcEditor.client.currAction;
        JSONObject.behavior = NpcEditor.client.currBehavior;
        Game.socket.send("savenpc:" + JSON.stringify(JSONObject));
        //update npc name
        NpcEditor.client.npcNames[NpcEditor.client.currNpc] = NpcEditor.client.currName;
        $("#npc-editor-npc").val(NpcEditor.client.currNpc, NpcEditor.client.currName);
    }, false, {'style': 'display:block;float:right;'});

    Game.menus["NPC Editor"] = function() {
        $("#npc-editor").dialog("open");
        NpcEditor.client.currNpc = 1;
        NpcEditor.client.loadNames();
    };
}