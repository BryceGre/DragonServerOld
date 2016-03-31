/* Copyright (c) 2014, Bryce Gregerson
 * All rights reserved.
 *
 * Redistribution and use in source form, with or without modification,
 * are permitted provided that the above copyright notice and this list
 * of conditions are retained.
 */

/**********************/
/***** Properties *****/
/**********************/
var Items = {
    name: "Items", //module name
    desc: "Items, Inventory, and Eqipment.", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
    req: {
        //required dependencies
    },
    opt: {
        Combat:true
    }
};

if (typeof Server === "undefined" || Server !== true) {
	Data.item_actions = {
		none: {name: "None"},
		equip: {name: "Equip"},
	};
};

Items.Item = function() {
	this.name = ""; //name
	this.icon = 1; //icon
	this.tool = ""; //tooltip
	this.action = "none";
	
	this.data = {};
};

Items.EquipData = function() {
	this.hp = 0; //player HP mod
	this.mp = 0; //player MP mod
	this.stats = {} //stat mods
}

/***********************************************/
/***** Server **********************************/
/***********************************************/
Items.server = {
    /***** variables *****/
	editor : {
		currItem: 1,
	},
	drops : new Object(),
	key : function(object) {
		return object.x + "." + object.y + "." + object.floor;
	},
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Items.server.onInit = function() {
	Module.addHook("admin_on_load"); //admin loaded
    Module.addHook("on_load"); //player loaded
	Module.addHook("npc_die"); //npc die
    Module.addHook("combat-add"); //bonus damage
	Module.addHook("tile_act"); //pickup item
	Module.addHook("message");
    Module.addHook("admin_message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Items.server.onHook = function(hook, args) {
    //called when a player loads the world
    if (hook == "on_load") {
        //query the 'characters' table for this player (ID = args.index)
        var user = Data.characters[args.index];
        //if character does't include 'inv' column data
        if (!user.inv) {
            //put empty inventory into database
            user.inv = new Array();
        }
		if (!user.equip) {
			user.equip = new Object();
		}
        
        //get the outgoing load message
        var msg = JSON.parse(args.msg);
		var ilist = Data.items.listAll();
		//get inventory info and store it in the outgoing message
		msg.inv = [];
		var inv = user.inv;
		for (var i=0; i<inv.length; i++) {
			if (inv[i] && ilist[inv[i]] && ilist[inv[i]].name) {
				msg.inv[i] = new Object();
				msg.inv[i].id = inv[i];
				msg.inv[i].name = ilist[inv[i]].name;
				msg.inv[i].tool = ilist[inv[i]].tool;
				msg.inv[i].icon = ilist[inv[i]].icon;
			}
		}
		//get equipment info and store it in the outgoing message
		msg.equip = {};
		var equip = user.equip;
		for (var key in equip) {
			if (equip[key] && ilist[equip[key]] && ilist[equip[key]].name) {
				msg.equip[key] = new Object();
				msg.equip[key].id = equip[key];
				msg.equip[key].name = ilist[equip[key]].name;
				msg.equip[key].tool = ilist[equip[key]].tool;
				msg.equip[key].icon = ilist[equip[key]].icon;
			}
		}
        //put the outgoing load message
        args.msg = JSON.stringify(msg);
    } else if (hook === "admin_on_load") {
		var msg = JSON.parse(args.msg);
		msg.items = {};
		var list = Data.items.listAll();
		for (var key in list) {
			msg.items[key] = new Object();
			msg.items[key].name = list[key].name;
			msg.items[key].tool = list[key].tool;
			msg.items[key].icon = list[key].icon;
		}
		args.msg = JSON.stringify(msg);
	} else if (hook == "npc_die") {
        var npc = Data.npcs[args.npc.id];
        if (npc) {
			var drop = new Array();
			var data = npc.data;
			for (var key in data) {
				var item = data[key].item;
				var chance = data[key].chance;
				var count = data[key].count;
				if (Math.random() < chance)
					//drop.push({item: item, count: count});
					drop.push(item);
			}
			this.drops[this.key(args.npc)] = drop;
		}
	} else if (hook == "message") {
		if (args.head === "useitem") {
			var data = JSON.parse(args.body);
			var msg = new Object();
			//make sure item exists
			if (Data.items.containsID(data.id)) {
				var item = Data.items[data.id];
				//TODO: use item
			}
		}
	} else if (hook == "admin_message") {
        if (args.head === "saveitem") {
            var data = JSON.parse(args.body);
			
            var item = Data.items[Items.server.editor.currItem];
            //note: we use putAll to reduce the number of database calls
            item.putAll(data);
        } else if (args.head === "loaditem") {
            Items.server.editor.currItem = parseInt(args.body);
			
            var item = Data.items[Items.server.editor.currItem];
            if (item.name === null) {
				item = new Items.Item();
			}
			
            Game.socket.send("loaditem:" + JSON.stringify(item));
        }
	} else if (hook == "combat-add") {
        //query the 'characters' table for this player (ID = args.index)
        var user = Data.characters[args.index];
		if (user) {
			if (user.equip) {
				var equip = user.equip;
				var ilist = Data.items.listAll();
				
				for (var key in equip) {
					if (equip[key] && ilist[equip[key]]) {
						var item = ilist[equip[key]];
						//todo: equipment stats
					}
				}
			}
		}
    } else if (hook == "tile_act") {
		//query the 'characters' table for this player (ID = args.index)
		var user = Data.characters[args.index];
		var inv = user.inv;
		//if character does't include 'inv' column data
		if (!inv) {
			//put empty inventory into database
			inv = new Array();
		}
		//keep track of whether or not the inventory has changed
		var changed = false;
		//check for "item" attribute on tile
		var id = false;
		if (args.tile.attr1 == 8) {
			id = parseInt(args.tile.a1data);
		} else if (args.tile.attr2 == 8) {
			id = parseInt(args.tile.a2data);
		}
		//if tile has item attribute
		if (id) {
			//add item to player's inventory
			inv.push(id);
			changed = true;
		}
		//if an npc died here
		var drop = this.drops[this.key(args.tile)];
		if (drop) {
			//for each item the npc has dropped
			for (var i=0; i<drop.length; i++) {
				//add item to player's inventory
				inv.push(drop[i]);
			}
			delete this.drops[this.key(args.tile)];
			changed = true;
		}
		//if the user's inventory has been updated
		if (changed) {
			//get inventory info
			var msg = new Array();
			var ilist = Data.items.listAll();
			for (var i=0; i<inv.length; i++) {
				//make sure the item exists
				if (inv[i] && ilist[inv[i]] && ilist[inv[i]].name) {
					//store it in the outgoing message
					msg[i] = new Object();
					msg[i].id = inv[i];
					msg[i].name = ilist[inv[i]].name;
					msg[i].tool = ilist[inv[i]].tool;
					msg[i].icon = ilist[inv[i]].icon;
				}
			}
			//be sure to assign the updated array to the database row
			user.inv = inv;
			Game.socket.send("inv:" + JSON.stringify(msg));
		}
	}
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Items.client = {
    /***** variables *****/
    //none for this module
	itemData: new Object(),
	inventory: {
		window: null,
	},
	editor : {
		window: null,
		data: null,
		currItem: 1,
		currObject: new Items.Item(),
		icon: null,
		changed: false,
	},
	npcEditor : {
		window: null,
		currData: new Object(),
		currList: new Array(),
		divCount: 0,
	},
	dropImg : null,
	drops : new Object(),
	key : function(object) {
		return object.x + "." + object.y + "." + object.floor;
	},
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Items.client.onInit = function() {
	Data.map_attr["8"] = {
		name: "Item Spawn",
		display: "I",
		color: "yellow",
	}
	this.dropImg = new Image();
	this.dropImg.src = "GFX/Drop.png";
	if (isAdmin) {
		Module.addHook("npc_editor_data");
		Module.addHook("npc_editor_save");
	} else {
		Module.addHook("post_draw_mask");
		Module.addHook("item_use");
		Module.addHook("npc_die");
		Module.addHook("act");
	}
    Module.addHook("game_load");
	Module.addHook("message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Items.client.onHook = function(hook, args) {
    if (isAdmin && hook == "game_load") {
        Items.client.editor.createUI();
	} else if (isAdmin && hook === "npc_editor_data") {
		if (args.action == "attack") {
			Items.client.npcEditor.currData = args.data;
			Items.client.npcEditor.createUI(args.window);
		}
	} else if (isAdmin && hook === "npc_editor_save") {
		if (args.action == "attack") {
			var data = args.data;
			
			var count = 0;
			for (var i = 0; i < Items.client.npcEditor.divCount; i++) {
				if (!Items.client.npcEditor.currList[i].del) {
					data[count] = Items.client.npcEditor.currList[i];
					count++;
				}
			}
			
			args.data = data;
		}
    } else if (hook == "game_load") {
		Items.client.inventory.createUI();
	} else if (hook == "message") {
		if (args.head === "load") {
			var msg = JSON.parse(args.body);
			if (isAdmin) {
				if (msg.items) {
					$.extend(true, this.itemData, msg.items);
				}
			} else {
				if (msg.inv) {
					for (var i=0; i<msg.inv.length; i++) {
						var tooltip = "<b>" + msg.inv[i].name + "</b><br>" + msg.inv[i].tool;
						var canvas = UI.AddDrag(Items.client.inventory.window, "item"+i, "item_use", {slot:i, id:msg.inv[i].id}, false, {"style": 'display:inline-block;width:20%;', "title": tooltip});
						canvas.attr("width", '32px');
						canvas.attr("height", '32px');
						var ctx = canvas[0].getContext("2d");
						ctx.clearRect(0, 0, 32, 32);
						ctx.drawImage(Game.gfx.Items[msg.inv[i].icon], 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
					}
				}
				if (msg.equip) {
					//TODO: Eqipment
				}
			}
		} else if (args.head === "inv") {
			$(Items.client.inventory.window).empty();
			var inv = JSON.parse(args.body);
			for (var i=0; i<inv.length; i++) {
				var tooltip = "<b>" + inv[i].name + "</b><br>" + inv[i].tool;
				var canvas = UI.AddDrag(Items.client.inventory.window, "item"+i, "item_use", {slot:i, id:inv[i].id}, false, {"style": 'display:inline-block;width:20%;', "title": tooltip});
				canvas.attr("width", '32px');
				canvas.attr("height", '32px');
				var ctx = canvas[0].getContext("2d");
				ctx.clearRect(0, 0, 32, 32);
				ctx.drawImage(Game.gfx.Items[inv[i].icon], 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
			}
		}
		if (args.admin === true && args.head === "loaditem") {
			var item = JSON.parse(args.body);
			$.extend(true, Items.client.editor.currObject, item);
            Items.client.editor.updateFields();
        }
	} else if (hook == "item_use") {
		console.log("item use: " + args.id);
		var data = new Object();
		data.id = args.id;
		data.slot = args.slot;
		if (Game.world.user.target == null) {
			data.target = null;
			data.tid = 0;
		} else if (Game.world.user.target.npc) {
			data.target = "npc";
			data.tid = Game.world.user.target.id;
		} else if (Game.world.user.target.player) {
			data.target = "player";
			data.tid = Game.world.user.target.id;
		}
		Game.socket.send("useitem:" + JSON.stringify(data));
	} else if (hook == "npc_die") {
		this.drops[this.key(args.npc)] = {
			x : args.npc.x,
			y : args.npc.y,
			floor : args.npc.floor,
		}
	} else if (hook == "act") {
		var x = World.user.x;
		var y = World.user.y;
		var floor = World.user.floor;
		//find the tile that the user is facing
		if (args.dir == 37) //left
			x -= 1;
		else if (args.dir == 38) //up
			y -= 1;
		else if (args.dir == 39) //right
			x += 1;
		else if (args.dir == 40) //down
			y += 1;
		//record tile location
		var obj = {
			x : x,
			y : y,
			floor : floor,
		};
		console.log(this.key(obj));
		//check if there is a drop there
		if (this.drops[this.key(obj)])
			//delete the drop if it's there
			delete this.drops[this.key(obj)];
	} else if (hook == "post_draw_mask") {
		for (var key in this.drops) {
			var sp = this.dropImg;
			var tx = Game.getCanvasX(this.drops[key].x);
			var ty = Game.getCanvasY(this.drops[key].y);
			if (World.user.floor == this.drops[key].floor)
				Game.context.drawImage(sp, tx, ty, TILE_SIZE, TILE_SIZE);
		}
	}
}

/***** helper *****/
Items.client.inventory.createUI = function() {
    this.window = UI.NewWindow("items", "Inventory", "336px");
	
    Game.menus["Backpack"] = function() {
        $("#items").dialog("open");
    };
}

Items.client.editor.loadItem = function() {
    Game.socket.send("loaditem:" + this.currItem);
}

Items.client.editor.updateFields = function() {
	if (Items.client.itemData[this.currItem])
		$("#item-editor-item").val(this.currItem, Items.client.itemData[this.currItem].name);
	else
		$("#item-editor-item").val(this.currItem);
    $("#item-editor-name").val(this.currObject.name);
	$("#item-editor-icon").val(this.currObject.icon);
    sprite = Game.gfx.Items[this.currObject.icon];
    Items.client.editor.icon.setImage(sprite, 0, 0, 32, 32);
	$("#item-editor-tooltip").val(this.currObject.tool);
    $("#item-editor-action").val(this.currObject.action);
    $("#item-editor-action").trigger("chosen:updated");
	$(this.data).empty();
	Module.doHook("item_editor_data", {window: this.data, action: this.currObject.action, data: this.currObject.data});
}

Items.client.editor.createUI = function() {
    this.window = UI.NewWindow("item-editor", "Item Editor", "336px");
	
    UI.AddDiv(this.window, "item-label", "Item ID: ", false, {"style": 'display:inline-block;float:left;margin:8px auto;'});
    UI.AddSpinner(this.window, "item", {min: 1, stop: function() {
            var value = $("#item-editor-item").val();
			if (Items.client.itemData[value])
				$("#item-editor-item").val(value, Items.client.itemData[value].name);
			else
				$("#item-editor-item").val(value);
        }
    }, false, {"style": 'display:inline-block;float:left;margin:4px auto;'});
    UI.AddButton(this.window, "item-edit", "Edit Item", function() {
		if (Items.client.editor.changed) {
            if (confirm("Any unsaved changes to the current Item will be lost!")) {
                Items.client.editor.currItem = $("#item-editor-item").val();
                Items.client.editor.loadItem();
                Items.client.editor.changed = false;
            } else {
                $("#item-editor-item").val(Items.client.editor.currItem, Items.client.itemData[Items.client.editor.currItem].name);
            }
        } else {
            Items.client.editor.currItem = $("#item-editor-item").val();
            Items.client.editor.loadItem();
        }
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});

    UI.AddRaw(this.window, "<div style='display:block;'><hr></div>");
	
	this.icon = UI.AddIcon(this.window, "image", false, {"width": '32px', "height": '32px', "style": 'display:inline-block;float:right;width:64px;height:64px;'});
	this.icon.clearImage();
	
    UI.AddDiv(this.window, "name-label", "Name: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddInput(this.window, "name", "", function() {
        Items.client.editor.currObject.name = $("#item-editor-name").val();
        Items.client.editor.changed = true;
    }, false, {"style": 'display:block;width:48%;margin:4px 0px;'});
	
	UI.AddDiv(this.window, "icon-label", "Icon: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddSpinner(this.window, "icon", {min: 1, max: GFX.Items, spin: function(event, ui) {
            Items.client.editor.currObject.icon = ui.value;
            Items.client.editor.changed = true;
            var sprite = Game.gfx.Items[Items.client.editor.currObject.icon];
			if (sprite) {
				Items.client.editor.icon.setImage(sprite, 0, 0, 32, 32);
			} else {
				Items.client.editor.icon.clearImage();
			}
        }
    }, false, {"style": 'display:block;width:70%;margin:4px 0px;'});
	
    UI.AddDiv(this.window, "tooltip-label", "Tooltip: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddArea(this.window, "tooltip", "", function() {
        Items.client.editor.currObject.tool = $("#item-editor-tooltip").val();
        Items.client.editor.changed = true;
    }, false, {"style": 'display:block;width:75%;margin:4px 0px;'});
	
    var actions = new Object();
    for (key in Data.item_actions) {
        actions[key] = Data.item_actions[key].name;
    }
    UI.AddDiv(this.window, "action-label", "Action: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddCombobox(this.window, "action", {width: "45%"}, actions, function() {
        Items.client.editor.currObject.action = $("#item-editor-action").val();
		Items.client.editor.currObject.data = {};
		$(Items.client.editor.data).empty();
		Module.doHook("item_editor_data", {window: Items.client.editor.data, action: Items.client.editor.currObject.action, data: Items.client.editor.currObject.data});
        Items.client.editor.changed = true;
    }, false, {"style": 'display:block;margin:4px 0px;'});
	
	this.data = UI.AddDiv(this.window, "data", "", false, {"style": 'display:block;margin:4px auto;'});
	Module.doHook("item_editor_data", {window: this.data, action: this.currObject.action, data: this.currObject.data});
	
    UI.AddButton(this.window, "save", "Save", function(e) {
        e.preventDefault();
		var msg = $.extend(true, msg, Items.client.editor.currObject);
		Module.doHook("item_editor_save", {window: Items.client.editor.data, action: Items.client.editor.currObject.action, data: msg.data});
        Game.socket.send("saveitem:" + JSON.stringify(msg));
		//update item data
		Items.client.itemData[Items.client.editor.currItem] = new Object();
        Items.client.itemData[Items.client.editor.currItem].name = Items.client.editor.currObject.name;
		Items.client.itemData[Items.client.editor.currItem].tool = Items.client.editor.currObject.tool;
		Items.client.itemData[Items.client.editor.currItem].icon = Items.client.editor.currObject.icon;
		//revert changed
        Items.client.editor.changed = false;
        //update item field
        $("#item-editor-item").val(Items.client.editor.currItem, Items.client.editor.currObject.name);
    }, false, {'style': 'display:block;float:right;'});

    Game.menus["Item Editor"] = function() {
        $("#item-editor").dialog("open");
        Items.client.editor.currItem = 1;
        Items.client.editor.loadItem();
    };
}

Items.client.npcEditor.createUI = function(win) {
	this.currList = new Array();
	this.divCount = 0;
	
	var addData = function(e, item, chance, count) {
		if (e)
			e.preventDefault();
		if (!item) item = 1;
		if (!chance) chance = 0;
		if (!count) count = 0;
		
		var i = Items.client.npcEditor.divCount;
		Items.client.npcEditor.currList[i] = new Object();
		
		var newDiv = UI.AddDiv(win, ""+i, "", false, {"style": 'display:block;margin:4px auto;'});
		
		var iicon = null;
		UI.AddSpinner(newDiv, "item", {value: item, min: 1, spin: function(event, ui) {
            Items.client.npcEditor.currList[i].item = ui.value;
			
			if (Items.client.itemData[ui.value] && Items.client.itemData[ui.value].icon) {
				iicon.setImage(Game.gfx.Items[Items.client.itemData[ui.value].icon], 0, 0, 32, 32);
				iicon.attr("title", "<b>" + Items.client.itemData[ui.value].name + "</b><br>" + Items.client.itemData[ui.value].tool + "");
			} else {
				iicon.clearImage();
				iicon.attr("title", "");
			}
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;width:32px;'});
		Items.client.npcEditor.currList[i].item = item;
		
		iicon = UI.AddIcon(newDiv, "iicon", false, {"width": '16px', "height": '16px', "style": 'display:inline-block;width:20px;height:20px;margin:auto 16px auto 4px;', "title": ""});
		if (Items.client.itemData[item] && Items.client.itemData[item].icon) {
			iicon.setImage(Game.gfx.Items[Items.client.itemData[item].icon], 0, 0, 32, 32);
			iicon.attr("title", "<b>" + Items.client.itemData[item].name + "</b><br>" + Items.client.itemData[item].tool + "");
		} else {
			iicon.clearImage();
			iicon.attr("title", "");
		}
		
		UI.AddSpinner(newDiv, "chance", {value: (chance * 100), min: 0, max: 100, spin: function(event, ui) {
            Items.client.npcEditor.currList[i].chance = (ui.value / 100);
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;margin-left:8px;width:32px;'});
        Items.client.npcEditor.currList[i].chance = chance;
		
		UI.AddSpinner(newDiv, "count", {value: count, min: 0, spin: function(event, ui) {
            Items.client.npcEditor.currList[i].count = ui.value;
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;margin-left:8px;width:32px;'});
		Items.client.npcEditor.currList[i].count = count;
		
		UI.AddButton(newDiv, "del", "x", function(i, e) {
			$(newDiv).remove();
			Items.client.npcEditor.currList[i].del = true;
		}.bind(this, i), false, {'style': 'display:inline-block;float:right;'});
		
		Items.client.npcEditor.divCount++;
	};
	UI.AddButton(win, "add", "+", addData, false, {"style": 'display:block;width:20%;margin:4px 0px;'});
	UI.AddDiv(win, "info", "Item", false, {"style": 'display:inline-block;width:104px'});
	UI.AddDiv(win, "info", "Chance", false, {"style": 'display:inline-block;width:64px'});
	UI.AddDiv(win, "info", "Amnt", false, {"style": 'display:inline-block;width:32px'});
    
	for (var key in this.currData) {
		addData(null, this.currData[key].item, this.currData[key].chance, this.currData[key].count);
	}
}