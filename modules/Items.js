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
    prefs : {
		slots : {
			head : {
				name: "Head",
				file: "EquipHead.png",
			},
			body : {
				name: "Upper Body",
				file: "EquipBody.png",
			},
			legs : {
				name: "Lower Body",
				file: "EquipLegs.png",
			},
			main : {
				name: "Main Hand",
				file: "EquipMain.png",
			},
			off : {
				name: "Off Hand",
				file: "EquipOff.png",
			},
		}
	}
};

//if we are on the client
if (typeof Server === "undefined" || Server !== true) {
	//setup item action datastructure
	//note, we're not adding to the data structure, we're creating it
	//so in order to ensure it is created before onInit, we must create it out here
	Data.item_actions = {
		none: {name: "None"},
		equip: {name: "Equip"},
	};
};

//item data strcture
Items.Item = function() {
	this.name = ""; //name
	this.icon = 1; //icon
	this.tool = ""; //tooltip
	this.stack = false; //stackable
	this.action = "none";
	
	this.data = {};
};

/***********************************************/
/***** Server **********************************/
/***********************************************/
Items.server = {
    /***** variables *****/
	editor : {
		currItem: 1,
	},
	drops : new Object(),
	//tile key function
	key : function(object) {
		return object.x + "." + object.y + "." + object.floor;
	},
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Items.server.onInit = function() {
	Module.addHook("admin_on_load"); //admin loaded
    Module.addHook("on_load"); //player loaded
    Module.addHook("on_more"); //more loaded
	Module.addHook("on_enter"); //player enter
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
		var chars = Data.characters.listAll();
        var user = chars[args.index];
		//get a list of all the items
		var ilist = Data.items.listAll();
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
		//get inventory info and store it in the outgoing message
		msg.inv = [];
		var inv = user.inv;
		for (var i=0; i<inv.length; i++) {
			if (inv[i]) {
				var id = inv[i];
				if (typeof inv[i] === 'object') {
					id = inv[i].id;
				}
				if (ilist[id] && ilist[id].name) {
					msg.inv[i] = new Object();
					msg.inv[i].id = id;
					msg.inv[i].name = ilist[id].name;
					msg.inv[i].tool = ilist[id].tool;
					msg.inv[i].icon = ilist[id].icon;
					if (typeof inv[i] === 'object') {
						msg.inv[i].count = inv[i].count;
					}
				}
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
				msg.equip[key].sprite = ilist[equip[key]].data.sprite;
			}
		}
		//get equipment of nearby players and store it in the outgoing message
		var players = msg.players;
		for (var i=0; i<players.length; i++) {
			players[i].equip = new Array();
			var player = chars[players[i].id];
			if (player.equip) {
				for (var key in player.equip) {
					if (ilist[player.equip[key]])
						players[i].equip.push(ilist[player.equip[key]].data.sprite);
				}
			}
		}
        //put the outgoing load message
        args.msg = JSON.stringify(msg);
	//called when a player loads more of the world
    } else if (hook == "on_more") {
        //query the 'characters' table for this player (ID = args.index)
		var chars = Data.characters.listAll();
		//get a list of all the items
		var ilist = Data.items.listAll();
        //get the outgoing load message
        var msg = JSON.parse(args.msg);
		//get equipment of new players and store it in the outgoing message
		var players = msg.players;
		for (var i=0; i<players.length; i++) {
			players[i].equip = new Array();
			var player = chars[players[i].id];
			if (player.equip) {
				for (var key in player.equip) {
					if (ilist[player.equip[key]])
						players[i].equip.push(ilist[player.equip[key]].data.sprite);
				}
			}
		}
        //put the outgoing load message
        args.msg = JSON.stringify(msg);
	//called when another player enters nearby (log-in or warp)
	} else if (hook === "on_enter") {
        //query the 'characters' table for this player (ID = args.index)
		var user = Data.characters[args.index];
		//get a list of all the items
		var ilist = Data.items.listAll();
        //get the outgoing load message
        var msg = JSON.parse(args.msg);
		//get equipment of the entering player and store it in the outgoing message
		msg.equip = new Array();
		if (user.equip) {
			for (var key in user.equip) {
				if (ilist[user.equip[key]])
					msg.equip.push(ilist[user.equip[key]].data.sprite);
			}
		}
        //put the outgoing load message
        args.msg = JSON.stringify(msg);
	//called when the admin interface is loaded
    } else if (hook === "admin_on_load") {
		//get the outgoing load message
		var msg = JSON.parse(args.msg);
		//fill it with item data
		msg.items = {};
		var list = Data.items.listAll();
		for (var key in list) {
			msg.items[key] = new Object();
			msg.items[key].name = list[key].name;
			msg.items[key].tool = list[key].tool;
			msg.items[key].icon = list[key].icon;
		}
		//put the outgoing load message
		args.msg = JSON.stringify(msg);
	//when an NPC dies
	} else if (hook == "npc_die") {
		//get information about the NPC
        var npc = Data.npcs[args.npc.id];
        if (npc) {
			//create an array of drops
			var drop = new Array();
			var data = npc.data;
			//for each possible drop
			for (var key in data) {
				var item = data[key].item;
				//if the item is dropped
				if (Math.random() < data[key].chance) {
					//add the item to the array of drops
					if (Data.items[item].stack) {
						//stackable drop
						drop.push({id: item, count: data[key].count});
					} else {
						//not stackable drop
						for (var i=0; i<data[key].count; i++) {
							drop.push(item);
						}
					}
				}
			}
			//record the drops for this tile
			this.drops[this.key(args.npc)] = drop;
		}
	} else if (hook == "message") {
		if (args.head === "equip") {
			//equip an item to a slot
			var data = JSON.parse(args.body);
			var user = Data.characters[args.index];
			var list = Data.items.listAll();
			var msg = new Object();
			
			//make sure the user has inventory and equipment data
			var inv = user.inv;
			if (!inv) inv = new Array();
			var equip = user.equip
			if (!equip) equip = new Object();
			
			//get the id of the item to be equipped based on the inventory slot
			var id = inv[data.slot];
			if (typeof inv[data.slot] === 'object') {
				id = inv[data.slot].id;
			}
			//get the item
			var item = list[id];
			//make sure that the item can be equipped to this slot
			if (item.action === "equip" && item.data.slot == data.to) {
				//equip this item and un-equip any item that was equipped in that slot
				var temp = equip[data.to];
				equip[data.to] = inv.splice(data.slot, 1)[0];
				if (temp) inv.push(temp);
				//send an updated inventory message to the client
				msg.inv = [];
				for (var i=0; i<inv.length; i++) {
					if (inv[i]) {
						var id = inv[i];
						if (typeof inv[i] === 'object') {
							id = inv[i].id;
						}
						if (list[id] && list[id].name) {
							msg.inv[i] = new Object();
							msg.inv[i].id = id;
							msg.inv[i].name = list[id].name;
							msg.inv[i].tool = list[id].tool;
							msg.inv[i].icon = list[id].icon;
							if (typeof inv[i] === 'object') {
								msg.inv[i].count = inv[i].count;
							}
						}
					}
				}
				//send an updated equipment message to the client
				msg.equip = {};
				var id = equip[data.to];
				if (typeof equip[data.to] === 'object') {
					id = equip[data.to].id;
				}
				msg.equip[data.to] = new Object();
				msg.equip[data.to].id = id;
				msg.equip[data.to].name = list[id].name;
				msg.equip[data.to].tool = list[id].tool;
				msg.equip[data.to].icon = list[id].icon;
				msg.equip[data.to].sprite = list[id].data.sprite;
				if (typeof equip[data.to] === 'object') {
					msg.equip[data.to].count = equip[data.to].count;
				}
				Game.socket.send("equip:" + JSON.stringify(msg));
				
				var omsg = new Object();
				omsg.id = args.index;
				omsg.equip = new Array();
				for (var key in equip) {
					if (list[equip[key]])
						omsg.equip.push(list[equip[key]].data.sprite);
				}
				Game.socket.sendRangeOther("oequip:" + JSON.stringify(omsg))
			}
			//update the database
			user.inv = inv;
			user.equip = equip;
		} else if (args.head === "unequip") {
			//unequip whatever item is in a slot
			var slot = args.body;
			var user = Data.characters[args.index];
			var list = Data.items.listAll();
			var msg = new Object();
			
			//make sure the user has inventory and equipment data
			var inv = user.inv;
			if (!inv) inv = new Array();
			var equip = user.equip
			if (!equip) equip = new Object();
			
			//if the slot is equipped
			if (equip[slot]) {
				//move the item to the player's inventory
				inv.push(equip[slot]);
				equip[slot] = null;
				//send an updated inventory and equip message to the client
				msg.inv = [];
				for (var i=0; i<inv.length; i++) {
					if (inv[i]) {
						var id = inv[i];
						if (typeof inv[i] === 'object') {
							id = inv[i].id;
						}
						if (list[id] && list[id].name) {
							msg.inv[i] = new Object();
							msg.inv[i].id = id;
							msg.inv[i].name = list[id].name;
							msg.inv[i].tool = list[id].tool;
							msg.inv[i].icon = list[id].icon;
							if (typeof inv[i] === 'object') {
								msg.inv[i].count = inv[i].count;
							}
						}
					}
				}
				msg.equip = {};
				msg.equip[slot] = null;
				Game.socket.send("equip:" + JSON.stringify(msg));
				
				var omsg = new Object();
				omsg.id = args.index;
				omsg.equip = new Array();
				for (var key in equip) {
					if (list[equip[key]])
						omsg.equip.push(list[equip[key]].data.sprite);
				}
				Game.socket.sendRangeOther("oequip:" + JSON.stringify(omsg))
				
				//update the database
				user.inv = inv;
				user.equip = equip;
			}
		}
	} else if (hook == "admin_message") {
        if (args.head === "saveitem") {
			//save an item to the database
            var data = JSON.parse(args.body);
			
            var item = Data.items[Items.server.editor.currItem];
            //note: we use putAll to reduce the number of database calls
            item.putAll(data);
        } else if (args.head === "loaditem") {
			//load an item from the database
            Items.server.editor.currItem = parseInt(args.body);
			
            var item = Data.items[Items.server.editor.currItem];
            if (item.name === null) {
				item = new Items.Item();
			}
			
            Game.socket.send("loaditem:" + JSON.stringify(item));
        }
	//called when the player attacks
	} else if (hook == "combat-add") {
        //query the 'characters' table for this player (ID = args.index)
        var user = Data.characters[args.index];
		if (user) {
			if (user.equip) {
				//add the stats from each item to the combat data
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
	//called when the player acts on a tile
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
			if (Data.items[id].stack) {
				for (var i=0; i<inv.length; i++) {
					if (typeof inv[i] === 'object') {
						if (inv[i].id == id) {
							inv[i].count += 1;
							changed = true;
						}
					}
				}
				if (changed === false) {
					inv.push({id: id, count: 1});
					changed = true;
				}
			} else {
				inv.push(id);
				changed = true;
			}
		}
		//if an npc died here
		var drop = this.drops[this.key(args.tile)];
		if (drop) {
			//for each item the npc has dropped
			for (var n=0; n<drop.length; n++) {
				changed = false;
				//add item to player's inventory
				if (typeof drop[n] === 'object') {
					for (var i=0; i<inv.length; i++) {
						if (typeof inv[i] === 'object') {
							if (inv[i].id == drop[n].id) {
								inv[i].count += drop[n].count;
								changed = true;
								break;
							}
						}
					}
					if (changed === false) {
						inv.push({id: drop[n].id, count: drop[n].count});
						changed = true;
					}
				} else {
					inv.push(drop[n]);
					changed = true;
				}
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
				if (inv[i]) {
					var id = inv[i];
					if (typeof inv[i] === 'object') {
						id = inv[i].id;
					}
					if (ilist[id] && ilist[id].name) {
						msg[i] = new Object();
						msg[i].id = id;
						msg[i].name = ilist[id].name;
						msg[i].tool = ilist[id].tool;
						msg[i].icon = ilist[id].icon;
						if (typeof inv[i] === 'object') {
							msg[i].count = inv[i].count;
						}
					}
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
	equipment: {
		window: null,
	},
	equipped : new Object(),
	editor : {
		window: null,
		data: null,
		currItem: 1,
		currObject: new Items.Item(),
		icon: null,
		changed: false,
	},
	itemEditor : {
		window: null,
		currData: {
			slot: Object.keys(Items.prefs.slots)[0],
			sprite: 1,
		},
		ctx: null,
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
	//add an item spawn attribute to the map
	Data.map_attr["8"] = {
		name: "Item Spawn",
		display: "I",
		color: "yellow",
	}
	//create an image object for drops
	this.dropImg = new Image();
	this.dropImg.src = "GFX/Drop.png";
	//add hooks
	if (isAdmin) {
		Module.addHook("npc_editor_data"); //Loading NPC in NPCEditor
		Module.addHook("npc_editor_save"); //Saving NPC in NPCEditor
		Module.addHook("item_editor_data"); //Loading item in ItemEditor
		Module.addHook("item_editor_save"); //Saving item in ItemEditor
	} else {
		Module.addHook("post_draw_mask"); //After the Mask layer is drawn
		Module.addHook("pre_draw_fringe"); //Before the fringe layer is drawn
		Module.addHook("item_use"); //when an item is used (from the actionbar)
		Module.addHook("npc_die"); //when an NPC dies
		Module.addHook("act"); //when the user presses the act key
	}
    Module.addHook("game_load"); //when the game loads
	Module.addHook("message"); //when a message is recieved
}

//onHook: Called when an event (that this module is hooked into) is triggered
Items.client.onHook = function(hook, args) {
    if (isAdmin && hook == "game_load") {
		//create ItemEditor UI
        Items.client.editor.createUI();
	} else if (isAdmin && hook === "npc_editor_data") {
		//create NPCEditor data for "attack" action
		if (args.action == "attack") {
			Items.client.npcEditor.currData = args.data;
			Items.client.npcEditor.createUI(args.window);
		}
	} else if (isAdmin && hook === "npc_editor_save") {
		//save NPCEditor data for "attack" action
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
	} else if (isAdmin && hook === "item_editor_data") {
		//create ItemEditor data for "equip" action
		if (args.action == "equip") {
			Items.client.itemEditor.currData = args.data;
			Items.client.itemEditor.createUI(args.window);
		}
	} else if (isAdmin && hook === "item_editor_save") {
		//save ItemEditor data for "equip" action
		if (args.action == "equip") {
			$.extend(true, args.data, Items.client.itemEditor.currData);
		}
    } else if (hook == "game_load") {
		//create the inventory and equipment UIs
		Items.client.inventory.createUI();
		Items.client.equipment.createUI();
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
						ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
						ctx.drawImage(Game.gfx.Items[msg.inv[i].icon], 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
						if (msg.inv[i].count) {
							ctx.fillStyle = "red";
							ctx.fillText(msg.inv[i].count, 0, 10);
						}
					}
				}
				if (msg.equip) {
					var slots = Items.prefs.slots;
					for (var key in slots) {
						var i = key;
						var img = new Image();
						img.onload = function(i, img) {
							$("#equip-" + i)[0].getContext("2d").drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
							if (msg.equip[i]) {
								this.equipped[i] = msg.equip[i];
								var tooltip = "<b>" + msg.equip[i].name + "</b><br>" + msg.equip[i].tool;
								var canvas = $("#equip-" + i);
								canvas.attr("title", tooltip);
								UI.MakeTooltip(canvas);
								var ctx = canvas[0].getContext("2d");
								ctx.drawImage(Game.gfx.Items[msg.equip[i].icon], 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
							}
						}.bind(this, i, img);
						img.src = "GFX/UI/"+slots[i].file;
					}
				}
				for (var i=0; i<msg.players.length; i++) {
					Game.world.players[msg.players[i].id].equip = msg.players[i].equip;
				}
			}
		} else if (args.head === "more") {
			if (!isAdmin) {
				var msg = JSON.parse(args.body);
				for (var i=0; i<msg.players.length; i++) {
					Game.world.players[msg.players[i].id].equip = msg.players[i].equip;
				}
			}
		} else if (args.head === "enter") {
			var msg = JSON.parse(args.body);
			Game.world.players[msg.id].equip = msg.equip;
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
				if (inv[i].count) {
					ctx.fillStyle = "red";
					ctx.fillText(inv[i].count, 0, 10);
				}
			}
		} else if (args.head === "equip") {
			var msg = JSON.parse(args.body);
			if (msg.inv) {
				$(Items.client.inventory.window).empty();
				for (var i=0; i<msg.inv.length; i++) {
					var tooltip = "<b>" + msg.inv[i].name + "</b><br>" + msg.inv[i].tool;
					var canvas = UI.AddDrag(Items.client.inventory.window, "item"+i, "item_use", {slot:i, id:msg.inv[i].id}, false, {"style": 'display:inline-block;width:20%;', "title": tooltip});
					canvas.attr("width", '32px');
					canvas.attr("height", '32px');
					var ctx = canvas[0].getContext("2d");
					ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
					ctx.drawImage(Game.gfx.Items[msg.inv[i].icon], 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
					if (msg.inv[i].count) {
						ctx.fillStyle = "red";
						ctx.fillText(msg.inv[i].count, 0, 10);
					}
				}
			}
			if (msg.equip) {
				for (var key in msg.equip) {
					var i = key;
					var img = new Image();
					img.onload = function(i, img) {
						this.equipped[i] = msg.equip[i];
						var canvas = $("#equip-" + i);
						canvas[0].getContext("2d").clearRect(0, 0, TILE_SIZE, TILE_SIZE);
						canvas[0].getContext("2d").drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
						if (msg.equip[i]) {
							var tooltip = "<b>" + msg.equip[i].name + "</b><br>" + msg.equip[i].tool;
							canvas.attr("title", tooltip);
							UI.MakeTooltip(canvas);
							var ctx = canvas[0].getContext("2d");
							ctx.drawImage(Game.gfx.Items[msg.equip[i].icon], 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
						} else {
							canvas.attr("title", Items.prefs.slots[i].name);
							UI.MakeTooltip(canvas);
						}
					}.bind(this, i, img);
					img.src = "GFX/UI/"+Items.prefs.slots[i].file;
				}
			}
		} else if (args.head === "oequip") {
			var msg = JSON.parse(args.body);
			Game.world.players[msg.id].equip = msg.equip;
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
		//draw drops
		for (var key in this.drops) {
			var sp = this.dropImg;
			var tx = Game.getCanvasX(this.drops[key].x);
			var ty = Game.getCanvasY(this.drops[key].y);
			if (World.user.floor == this.drops[key].floor)
				Game.context.drawImage(sp, tx, ty, TILE_SIZE, TILE_SIZE);
		}
	} else if (hook == "pre_draw_fringe") {
		//draw paperdoll on user
		for (var key in this.equipped) {
			if (this.equipped[key]) {
				var ps = Game.gfx.Paperdoll[this.equipped[key].sprite];
				var os = World.user.getSpriteOffset();
				var sw = Math.floor(ps.width  / 4);
				var sh = Math.floor(ps.height / 4);
				var us = Game.gfx.Sprites[World.user.sprite];
				var tw = Math.floor(us.width  / 4);
				var th = Math.floor(us.height / 4);
				var tx = Game.getCanvasX(World.user.x) - _Game.getMovedX(World.user) - ((tw/2) - (TILE_SIZE/2));
				var ty = Game.getCanvasY(World.user.y) - _Game.getMovedY(World.user) - (th - TILE_SIZE);
				Game.context.drawImage(ps, os.x, os.y, sw, sh, tx, ty, tw, th);
			}
		}
		//draw paperdoll on other players
		for (var id in Game.world.players) {
			var player = Game.world.players[id];
			if (player.equip) {
				for (var i=0; i<player.equip.length; i++) {
					if (player.equip[i]) {
						var ps = Game.gfx.Paperdoll[player.equip[i]];
						var os = player.getSpriteOffset();
						var sw = Math.floor(ps.width  / 4);
						var sh = Math.floor(ps.height / 4);
						var us = Game.gfx.Sprites[player.sprite];
						var tw = Math.floor(us.width  / 4);
						var th = Math.floor(us.height / 4);
						var tx = Game.getCanvasX(player.x) - _Game.getMovedX(player) - ((tw/2) - (TILE_SIZE/2));
						var ty = Game.getCanvasY(player.y) - _Game.getMovedY(player) - (th - TILE_SIZE);
						Game.context.drawImage(ps, os.x, os.y, sw, sh, tx, ty, tw, th);
					}
				}
			}
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

Items.client.equipment.createUI = function() {
    this.window = UI.NewWindow("equip", "Equipment", "336px");
	
	var slots = Items.prefs.slots;
	for (var key in slots) {
		var i = key;
		var canvas = UI.AddDrop(this.window, key, function(i, e, ui) {
			Game.socket.send("equip:" + JSON.stringify({to:i, slot:ui.helper.data("args").slot}));
		}.bind(this, i), false, {"style": 'display:inline-block;width:20%;'});
		canvas.attr("width", '32px');
		canvas.attr("height", '32px');
		canvas.on("contextmenu", function(i, e) {
			Game.socket.send("unequip:" + i);
			return false;
		}.bind(this, i));
	}
	
    Game.menus["Equipment"] = function() {
        $("#equip").dialog("open");
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
    $("#item-editor-stack-check").prop("checked", this.currObject.stack);
    $("#item-editor-stack").buttonset("refresh");
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
	
	UI.AddCheckbox(this.window, "stack", "Stackable", false, function(e) {
        if ($("#item-editor-stack-check").prop('checked')) {
            Items.client.editor.currObject.stack = true;
        } else {
            Items.client.editor.currObject.stack = false;
        }
    }, false, {'style': 'display:block;margin:0px auto;'});
	
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

Items.client.itemEditor.createUI = function(win) {
    var slots = new Object();
	if (!this.currData.sprite)
		this.currData.sprite = 1;
	
    UI.AddRaw(win, "<canvas id='item-editor-data-preview' width='96px' height='96px' style='display:inline-block;float:right;width:45%;'></canvas>");
    this.ctx = $("#item-editor-data-preview")[0].getContext("2d");
	this.ctx.fillRect(0, 0, 96, 96);
	var sprite = Game.gfx.Sprites[1];
	var w = Math.floor(sprite.width / 4);
	var h = Math.floor(sprite.height / 4);
	this.ctx.drawImage(sprite, 0, 0, w, h, 0, 0, w, h);
	var sprite2 = Game.gfx.Paperdoll[Items.client.itemEditor.currData.sprite];
	var w2 = Math.floor(sprite2.width / 4);
	var h2 = Math.floor(sprite2.height / 4);
	this.ctx.drawImage(sprite2, 0, 0, w2, h2, 0, 0, w, h);
	
	for (var key in Items.prefs.slots) {
		slots[key] = Items.prefs.slots[key].name;
	}
    UI.AddDiv(win, "slot-label", "Slot: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    var slot = UI.AddCombobox(win, "slot", {width: "45%"}, slots, function() {
        Items.client.itemEditor.currData.slot = $("#item-editor-data-slot").val();
    }, false, {"style": 'display:block;margin:4px 0px;'});
	slot.val(Items.client.itemEditor.currData.slot);
	slot.trigger("chosen:updated");
	
    UI.AddDiv(win, "sprite-label", "Paperdoll: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddSpinner(win, "sprite", {value: this.currData.sprite, min: 1, max: GFX.Paperdoll, spin: function(event, ui) {
		Items.client.itemEditor.currData.sprite = ui.value;
		Items.client.itemEditor.ctx.fillRect(0, 0, 96, 96);
		var sprite = Game.gfx.Sprites[1];
		var w = Math.floor(sprite.width / 4);
		var h = Math.floor(sprite.height / 4);
		Items.client.itemEditor.ctx.drawImage(sprite, 0, 0, w, h, 0, 0, w, h);
		var sprite2 = Game.gfx.Paperdoll[Items.client.itemEditor.currData.sprite];
		var w2 = Math.floor(sprite2.width / 4);
		var h2 = Math.floor(sprite2.height / 4);
		Items.client.itemEditor.ctx.drawImage(sprite2, 0, 0, w2, h2, 0, 0, w, h);
    }}, false, {"style": 'display:block;width:45%;margin:4px 0px;'});
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