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
var Combat = {
    name: "Basic Combat", //module name
    desc: "Simple combat via interacting with hostile NPCs.", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
    req: {
        //required dependencies
    },
    opt: {
        
    }
};

Combat.Effect = function() {
	this.dur = 0; //effect duration
	this.hps = 0; //health per second
	this.mps = 0; //mana per second
	this.dd = 100; //damage done mod (%)
	this.dt = 100; //damage taken mod (%)
	this.mhp = 0; //max health mod
	this.mmp = 0; //max mana mod
	this.stun = false; //stun, true or false
	this.script = ""; //custom scripts / sec
};

Combat.Ability = function() {
	this.name = ""; //name
	this.anim = 1; //animation
	this.icon = 1; //icon
	this.cool = 0; //cooldown
	this.range = 1; //range
	this.tool = ""; //tooltip
	this.php = 0; //player HP mod
	this.pmp = 0; //player MP mod
	this.thp = 0; //target HP mod
	this.tmp = 0; //target MP mod
	this.script = ""; //custom script
	
	this.p = new Combat.Effect(); //player effect
	this.t = new Combat.Effect(); //target effect
};

/***********************************************/
/***** Server **********************************/
/***********************************************/
Combat.server = {
    /***** variables *****/
	editor : {
		currAbility: 1,
	}
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Combat.server.onInit = function() {
    //hook into events here
    Module.addHook("npc_act");
    Module.addHook("admin_message");
};

//onHook: Called when an event (that this module is hooked into) is triggered
Combat.server.onHook = function(hook, args) {
    //argument "hook" contains which event has triggered
    if (hook === "npc_act") {
        var npc = Data.npcs[args.npc.id];
        if (npc) {
            if (npc.action == "attack") {
                var base = 21;
                var mod = Module.doHook("combat-mod", {base:base}, AVG);
                var add = Module.doHook("combat-add", {base:base}, ADD);
                base = base + add;
                if (mod > 0) base = base * mod;
                var damage = base - Math.floor(base/20) + Math.floor(Math.random()*((base/10)+1));
                args.npc.health -= damage;
                Module.doHook("combat-damage", {base:base, mod:mod, add:add, damage:damage, npc:args.npc});
                //death is taken care of by the npc manager.
                var msg = new Object();
                msg.npc = args.npc.iid; //instanceID
                msg.dam = damage;
				//but we should send a progress update
				if (args.npc.health <= 0) {
					var newxp = npc.exp;
					if (!newxp) newxp = 10;
					Module.doHook("progress_gain", {index:args.index, exp:newxp});
				}
                Game.socket.sendRange("npc-damage:" + JSON.stringify(msg));
            }
        }
    }
    if (hook === "admin_message") {
        if (args.head === "saveability") {
            var data = JSON.parse(args.body);
			
            var ability = Data.abilities[Combat.server.editor.currAbility];
            //note: we use putAll to reduce the number of database calls
            ability.putAll(data);
        } else if (args.head === "loadability") {
            Combat.server.editor.currAbility = parseInt(args.body);
			
            var ability = Data.abilities[Combat.server.editor.currAbility];
            if (ability.name === null) {
				ability = new Combat.Ability();
			}
			
            Game.socket.send("loadability:" + JSON.stringify(ability));
        } else if (args.head === "abilitynames") {
            //retrieve a list of names of abilities. Example: names[id] == "guy"
            var names = Data.abilities.list("name");
			
            Game.socket.send("abilitynames:" + JSON.stringify(names));
        }
	}
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Combat.client = {
    /***** variables *****/
	editor : {
		window: null,
		window2: null,
		currAbility: 1,
		currObject: new Combat.Ability(),
		abilityNames: new Object(),
		ctx: null,
		ctx2: null,
		changed: false,
		frame: 0,
		count: 0,
	},
	abilities : {
		window: null,
	},
    sct : new Array(), //scrolling combat text
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Combat.client.onInit = function() {
	Data.npc_actions["attack"] = {name: "Attack"};
	if (isAdmin) {
		
	} else {
		Module.addHook("post_draw");
		Module.addHook("ability_cast");
	}
	Module.addHook("on_update");
	Module.addHook("game_load");
	Module.addHook("message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Combat.client.onHook = function(hook, args) {
	if (isAdmin && hook === "game_load") {
		Combat.client.editor.createUI();
	} else if (hook == "game_load") {
		Combat.client.abilities.createUI();
	} else if (hook == "ability_cast") {
		console.log("ability cast: " + args.id);
    } else if (hook == "message") {
        if (args.head === "npc-damage") {
            var n = JSON.parse(args.body);
            var npc = Game.world.npcs[n.npc];
            if (npc) {
                Combat.client.sct.push({
                    npc: npc,
                    num: n.dam,
                    col: "red",
                    y: 0
                });
            }
        }
		if (args.admin === true && args.head === "loadability") {
			var ability = JSON.parse(args.body);
			$.extend(true, Combat.client.editor.currObject, ability);
			Combat.client.editor.abilityNames[Combat.client.editor.currAbility] = ability.name;
            Combat.client.editor.updateFields();
        } else if (args.admin === true && args.head === "abilitynames") {
            $.extend(Combat.client.editor.abilityNames, JSON.parse(args.body));
            Combat.client.editor.loadAbility();
        }
    } else if (hook == "on_update") {
        var newSct = new Array();
        for (var key in Combat.client.sct) {
            var text = Combat.client.sct[key];
            text.y += 1;
            if (text.y < TILE_SIZE) {
                newSct.push(text);
            }
        }
        Combat.client.sct = newSct;
		if (isAdmin) {
			Combat.client.editor.count++;
			if (Combat.client.editor.count >= 10) {
				Combat.client.editor.frame++;
				if (Combat.client.editor.frame >= 12)
					Combat.client.editor.frame = 0;
				var sprite = Game.gfx.Spells[Combat.client.editor.currObject.anim];
				if (sprite) {
					Combat.client.editor.ctx.fillRect(0, 0, 96, 96);
					var w = Math.floor(sprite.width / 12);
					var h = Math.floor(sprite.height);
					var x = Combat.client.editor.frame * w;
					Combat.client.editor.ctx.drawImage(sprite, x, 0, w, h, 0, 0, w, h);
				}
				Combat.client.editor.count = 0;
			}
		}
    } else if (hook == "post_draw") {
        for (var key in Combat.client.sct) {
            var text = Combat.client.sct[key];
            if (text.npc.floor == Game.world.user.floor) {
                Game.context.fillStyle = text.col;
                Game.context.fillText(text.num, Game.getTileX(text.npc.x), Game.getTileY(text.npc.y)-text.y);
            }
        }
    }
}

/***** helper *****/
Combat.client.editor.loadAbility = function() {
    Game.socket.send("loadability:" + this.currAbility);
}
Combat.client.editor.loadNames = function() {
    Game.socket.send("abilitynames");
}

Combat.client.editor.updateFields = function() {
    $("#ability-editor-ability").val(this.currAbility, this.abilityNames[this.currAbility]);
    $("#ability-editor-name").val(this.currObject.name);
    $("#ability-editor-animation").val(this.currObject.anim);
    Combat.client.editor.ctx.fillRect(0, 0, 96, 96);
    var sprite = Game.gfx.Spells[this.currObject.anim];
    var w = Math.floor(sprite.width / 12);
    var h = Math.floor(sprite.height);
    Combat.client.editor.ctx.drawImage(sprite, 0, 0, w, h, 0, 0, w, h);
	$("#ability-editor-icon").val(this.currObject.icon);
    Combat.client.editor.ctx2.fillRect(0, 0, 32, 32);
    sprite = Game.gfx.Icons[this.currObject.icon];
    Combat.client.editor.ctx2.drawImage(sprite, 0, 0, 32, 32, 0, 0, 32, 32);
	$("#ability-editor-tooltip").val(this.currObject.tool);
	$("#ability-editor-effects-cooldown").val(this.currObject.cool);
	$("#ability-editor-effects-range").val(this.currObject.range);
	$("#ability-editor-effects-php").val(this.currObject.php);
	$("#ability-editor-effects-pmp").val(this.currObject.pmp);
	$("#ability-editor-effects-thp").val(this.currObject.thp);
	$("#ability-editor-effects-tmp").val(this.currObject.tmp);
	$("#ability-editor-effects-p-duration").val(this.currObject.p.dur);
	$("#ability-editor-effects-p-hps").val(this.currObject.p.hps);
	$("#ability-editor-effects-p-mps").val(this.currObject.p.mps);
	$("#ability-editor-effects-p-dd").val(this.currObject.p.dd);
	$("#ability-editor-effects-p-dt").val(this.currObject.p.dt);
	$("#ability-editor-effects-p-stun").prop("checked", this.currObject.p.stun);
	$("#ability-editor-effects-t-duration").val(this.currObject.t.dur);
	$("#ability-editor-effects-t-hps").val(this.currObject.t.hps);
	$("#ability-editor-effects-t-mps").val(this.currObject.t.mps);
	$("#ability-editor-effects-t-dd").val(this.currObject.t.dd);
	$("#ability-editor-effects-t-dt").val(this.currObject.t.dt);
	$("#ability-editor-effects-t-stun").prop("checked", this.currObject.t.stun);
}

Combat.client.editor.createUI = function() {
    this.window = UI.NewWindow("ability-editor", "Ability Editor", "336px");
    
    UI.AddDiv(this.window, "ability-label", "Ability ID: ", false, {"style": 'display:inline-block;float:left;margin:8px auto;'});
    UI.AddSpinner(this.window, "ability", {min: 1, stop: function() {
            var value = $("#ability-editor-ability").val();
            $("#ability-editor-ability").val(value, Combat.client.editor.abilityNames[value]);
        }
    }, false, {"style": 'display:inline-block;float:left;margin:4px auto;'});
    UI.AddButton(this.window, "ability-edit", "Edit", function() {
        if (Combat.client.editor.changed) {
            if (confirm("Any unsaved changes to the current Ability will be lost!")) {
                Combat.client.editor.currAbility = $("#ability-editor-ability").val();
                Combat.client.editor.loadAbility();
                Combat.client.editor.changed = false;
            } else {
                $("#ability-editor-ability").val(Combat.client.editor.currAbility, Combat.client.editor.abilityNames[Combat.client.editor.currAbility]);
            }
        } else {
            Combat.client.editor.currAbility = $("#ability-editor-ability").val();
            Combat.client.editor.loadAbility();
        }
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});

    UI.AddRaw(this.window, "<div style='display:block;'><hr></div>");

    UI.AddRaw(this.window, "<canvas id='ability-editor-preview' width='96px' height='96px' style='display:inline-block;float:right;width:45%;'></canvas>");
    this.ctx = $("#ability-editor-preview")[0].getContext("2d");
    this.ctx.fillRect(0, 0, 128, 128);

    UI.AddDiv(this.window, "name-label", "Name: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddInput(this.window, "name", "", function() {
        Combat.client.editor.currObject.name = $("#ability-editor-name").val();
        Combat.client.editor.changed = true;
    }, false, {"style": 'display:block;width:48%;margin:4px 0px;'});

    UI.AddDiv(this.window, "animation-label", "Animation: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window, "animation", {min: 1, max: GFX.Spells, spin: function(event, ui) {
            Combat.client.editor.currObject.anim = ui.value;
            Combat.client.editor.changed = true;
            Combat.client.editor.ctx.fillRect(0, 0, 96, 96);
            var sprite = Game.gfx.Spells[Combat.client.editor.currObject.anim];
			if (sprite) {
				var w = Math.floor(sprite.width / 12);
				var h = Math.floor(sprite.height);
				Combat.client.editor.ctx.drawImage(sprite, 0, 0, w, h, 0, 0, w, h);
			}
        }
    }, false, {"style": 'display:block;width:45%;margin:4px 0px;'});

    UI.AddDiv(this.window, "icon-label", "Icon: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window, "icon", {min: 1, max: GFX.Icons, spin: function(event, ui) {
            Combat.client.editor.currObject.icon = ui.value;
            Combat.client.editor.changed = true;
            Combat.client.editor.ctx2.fillRect(0, 0, 32, 32);
            var sprite = Game.gfx.Icons[Combat.client.editor.currObject.icon];
			if (sprite) {
				Combat.client.editor.ctx2.drawImage(sprite, 0, 0, 32, 32, 0, 0, 32, 32);
			}
        }
    }, false, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
    UI.AddRaw(this.window, "<canvas id='ability-editor-image' width='32px' height='32px' style='display:inline-block;float:right;width:20%;'></canvas>");
    this.ctx2 = $("#ability-editor-image")[0].getContext("2d");
    this.ctx2.fillRect(0, 0, 32, 32);
	
    UI.AddDiv(this.window, "tooltip-label", "Tooltip: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddArea(this.window, "tooltip", "", function() {
        Combat.client.editor.currObject.tool = $("#ability-editor-tooltip").val();
        Combat.client.editor.changed = true;
    }, false, {"style": 'display:block;width:75%;margin:4px 0px;'});
	
	this.window2 = UI.AddDiv(this.window, "effects", "", false, {"style": 'display:block;margin:4px auto;'});
	
    UI.makeTabs(this.window2, {1: "Ability", 2: "Player", 3: "Target"});
	
    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ***** Tab 1: Ability ******
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
	
	UI.AddDiv(this.window2, "label", "<i>Ability effects when cast:</i>", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
	
	UI.AddDiv(this.window2, "cooldown-label", "Cooldown: (seconds)", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "cooldown", {min: 0, max: 86400, spin: function(event, ui) {
            Combat.client.editor.currObject.cool = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 1, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "range-label", "Range: (tiles)", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "range", {min: 0, max: DRAW_DISTANCE, spin: function(event, ui) {
            Combat.client.editor.currObject.range = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 1, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "label2", "<i>(use negative to decrease)</i>", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
	
	UI.AddDiv(this.window2, "php-label", "Player HP Mod: (on cast)", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "php", {min: -99999999, max: 99999999, spin: function(event, ui) {
            Combat.client.editor.currObject.php = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 1, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "pmp-label", "Player MP Mod: (on cast)", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "pmp", {min: -999999999, max: 999999999, spin: function(event, ui) {
            Combat.client.editor.currObject.pmp = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 1, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "thp-label", "Target HP Mod: (on cast)", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "thp", {min: -999999999, max: 999999999, spin: function(event, ui) {
            Combat.client.editor.currObject.thp = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 1, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "tmp-label", "Target MP Mod: (on cast)", 1, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "tmp", {min: -999999999, max: 999999999, spin: function(event, ui) {
            Combat.client.editor.currObject.tmp = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 1, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ***** Tab 2: Player ******
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
	 
	UI.AddDiv(this.window2, "p-label", "<i>Player effect over time:</i>", 2, {"style": 'display:block;margin:4px auto;height:16px;'});
	
	UI.AddDiv(this.window2, "p-duration-label", "Duration: (seconds)", 2, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "p-duration", {min: 0, max: 86400, spin: function(event, ui) {
            Combat.client.editor.currObject.p.dur = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 2, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "p-hps-label", "HP Mod: (per sec)", 2, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "p-hps", {min: -999999999, max: 999999999, spin: function(event, ui) {
            Combat.client.editor.currObject.p.hps = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 2, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "p-mps-label", "MP Mod: (per sec)", 2, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "p-mps", {min: -999999999, max: 999999999, spin: function(event, ui) {
            Combat.client.editor.currObject.p.mps = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 2, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "p-dd-label", "Damage Done: (%)", 2, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "p-dd", {min: 0, max: 1000, spin: function(event, ui) {
            Combat.client.editor.currObject.p.dd = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 2, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "p-dt-label", "Damage Taken: (%)", 2, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "p-dt", {min: 0, max: 1000, spin: function(event, ui) {
            Combat.client.editor.currObject.p.dt = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 2, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "p-stun-label", "Stun: (on or off)", 2, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddCheckbox(this.window2, "p-stun", "Stun", false, function(event, ui) {
		if ($("#ability-editor-effects-p-stun-check").prop('checked')) {
			Combat.client.editor.currObject.p.stun = true;
		} else {
			Combat.client.editor.currObject.p.stun = false;
		}
		Combat.client.editor.changed = true;
    }, 2, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ***** Tab 3: Target ******
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
	
	UI.AddDiv(this.window2, "t-label", "<i>Target effect over time:</i>", 3, {"style": 'display:block;margin:4px auto;height:16px;'});
	
	UI.AddDiv(this.window2, "t-duration-label", "Duration: (seconds)", 3, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "t-duration", {min: 0, max: 86400, spin: function(event, ui) {
            Combat.client.editor.currObject.t.dur = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 3, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "t-hps-label", "HP Mod: (per sec)", 3, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "t-hps", {min: -999999999, max: 999999999, spin: function(event, ui) {
            Combat.client.editor.currObject.t.hps = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 3, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "t-mps-label", "MP Mod: (per sec)", 3, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "t-mps", {min: -999999999, max: 999999999, spin: function(event, ui) {
            Combat.client.editor.currObject.t.mps = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 3, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "t-dd-label", "Damage Done: (%)", 3, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "t-dd", {min: 0, max: 1000, spin: function(event, ui) {
            Combat.client.editor.currObject.t.dd = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 3, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "t-dt-label", "Damage Taken: (%)", 3, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window2, "t-dt", {min: 0, max: 1000, spin: function(event, ui) {
            Combat.client.editor.currObject.t.dt = ui.value;
            Combat.client.editor.changed = true;
        }
    }, 3, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
	UI.AddDiv(this.window2, "t-stun-label", "Stun: (on or off)", 3, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddCheckbox(this.window2, "t-stun", "Stun", false, function(event, ui) {
		if ($("#ability-editor-effects-t-stun-check").prop('checked')) {
			Combat.client.editor.currObject.t.stun = true;
		} else {
			Combat.client.editor.currObject.t.stun = false;
		}
		Combat.client.editor.changed = true;
    }, 3, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
    /***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************
     * ***** End Tabs ******
     **************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
	
    UI.AddButton(this.window, "save", "Save", function(e) {
        e.preventDefault();
        Game.socket.send("saveability:" + JSON.stringify(Combat.client.editor.currObject));
        //update ability name
        Combat.client.editor.abilityNames[Combat.client.editor.currAbility] = Combat.client.editor.currObject.name;
        $("#ability-editor-ability").val(Combat.client.editor.currAbility, Combat.client.editor.currObject.name);
    }, false, {'style': 'display:block;float:right;'});

    Game.menus["Ability Editor"] = function() {
        $("#ability-editor").dialog("open");
        Combat.client.editor.currAbility = 1;
        Combat.client.editor.loadNames();
    };
}

Combat.client.abilities.createUI = function() {
    this.window = UI.NewWindow("abilities", "Ability List", "336px");
	
	function buildFunc(c) {
		return 
	}
    
	for (var i=1; i<=5; i++) {
		var canvas = UI.AddDrag(this.window, "ability"+i, "ability_cast", {id:i}, false, {"style": 'display:inline-block;width:20%;'});
		canvas.attr("width", '32px');
		canvas.attr("height", '32px');
		var ctx = canvas[0].getContext("2d");
		ctx.clearRect(0, 0, 32, 32);
		ctx.drawImage(Game.gfx.Icons[i], 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
	}
	
    Game.menus["Abilities"] = function() {
        $("#abilities").dialog("open");
    };
}