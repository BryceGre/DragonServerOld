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
var Shops = {
    name: "Shops", //module name
    desc: "Shops to buy and sell items.", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
    req: {
        Items : true
    },
    opt: {
    }
};

/***********************************************/
/***** Server **********************************/
/***********************************************/
Shops.server = {
    /***** variables *****/
	currShop : new Object(),
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Shops.server.onInit = function() {
	Module.addHook("npc_act");
	Module.addHook("message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Shops.server.onHook = function(hook, args) {
    if (hook === "npc_act") {
        var npc = Data.npcs[args.npc.id];
        if (npc) {
			if (npc.action == "shop") {
				var msg = new Object();
				msg.items = {};
				msg.costs = {};
				var list = Data.items.listAll();
				var data = npc.data;
				for (var key in data) {
					var item = data[key].item;
					var cost = data[key].cost;
					if (list[item]) {
						msg.items[key] = new Object();
						msg.items[key].id = item;
						msg.items[key].name = list[item].name;
						msg.items[key].tool = list[item].tool;
						msg.items[key].icon = list[item].icon;
						
						msg.costs[key] = new Object();
						if (list[cost]) {
							msg.costs[key].id = cost;
							msg.costs[key].name = list[cost].name;
							msg.costs[key].tool = list[cost].tool;
							msg.costs[key].icon = list[cost].icon;
							msg.costs[key].count = data[key].count;
						} else {
							msg.costs[key].id = 1;
							msg.costs[key].name = "";
							msg.costs[key].tool = "";
							msg.costs[key].icon = 1;
							msg.costs[key].count = 0;
						}
					}
				}
				Game.socket.send("shop:" + JSON.stringify(msg));
				this.currShop[args.index] = msg;
			}
		}
	} else if (hook == "message") {
		if (args.head === "buy") {
			var key = parseInt(args.body);
			if (this.currShop[args.index]) {
				var item = this.currShop[args.index].items[key];
				var cost = this.currShop[args.index].costs[key];
				if (item) {
					var user = Data.characters[args.index];
					var inv = user.inv;
					//if character does't include 'inv' column data
					if (!inv) {
						//put empty inventory into database
						inv = new Array();
					}
					//keep track of whether or not the inventory has changed
					var changed = false;
					//remove cost from inventory
					if (cost.count == 0) {
						changed = true;
					} else {
						for (var i=0; i<inv.length; i++) {
							if (typeof inv[i] === 'object') {
								if (inv[i].id == cost.id && inv[i].count >= cost.count) {
									inv[i].count -= cost.count;
									if (inv[i].count == 0)
										inv.splice(i, 1);
									changed = true;
									break;
								}
							} else {
								if (inv[i] == cost.id) {
									inv.splice(i, 1);
									changed = true;
									break;
								}
							}
						}
					}
					//if the user can afford the cost
					if (changed) {
						changed = false;
						//add the item to the user's inventory
						if (Data.items[item.id].stack) {
							for (var i=0; i<inv.length; i++) {
								if (typeof inv[i] === 'object') {
									if (inv[i].id == item.id) {
										inv[i].count += 1;
										changed = true;
									}
								}
							}
							if (changed === false) {
								inv.push({id: item.id, count: 1});
								changed = true;
							}
						} else {
							inv.push(item.id);
							changed = true;
						}
					}
					
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
		} else if (args.head === "move") {
			//player moved
			this.currShop[args.index] = null;
		}
	}
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Shops.client = {
    /***** variables *****/
	itemData : new Object(),
	shop : {
		window: null,
	},
	npcEditor : {
		currData: new Object(),
		currList: new Array(),
		divCount: 0,
	},
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Shops.client.onInit = function() {
	Data.npc_actions["shop"] = {name: "Shop"};
	if (isAdmin) {
		Module.addHook("npc_editor_data");
		Module.addHook("npc_editor_save");
	} else {
		Module.addHook("game_load");
	}
	Module.addHook("message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Shops.client.onHook = function(hook, args) {
    if (isAdmin && hook === "npc_editor_data") {
		if (args.action == "shop") {
			Shops.client.npcEditor.currData = args.data;
			Shops.client.npcEditor.createUI(args.window);
		}
	} else if (isAdmin && hook === "npc_editor_save") {
		if (args.action == "shop") {
			var data = args.data;
			
			var count = 0;
			for (var i = 0; i < Shops.client.npcEditor.divCount; i++) {
				if (!Shops.client.npcEditor.currList[i].del) {
					data[count] = Shops.client.npcEditor.currList[i];
					count++;
				}
			}
			
			args.data = data;
		}
	}
	if (hook == "game_load") {
		Shops.client.shop.createUI();
    } else if (hook == "message") {
		if (args.head === "load") {
			var msg = JSON.parse(args.body);
			if (isAdmin) {
				if (msg.items) {
					$.extend(true, this.itemData, msg.items);
				}
			} else {
				
			}
		} else if (args.head === "shop") {
			var win = Shops.client.shop.window;
			$(win).empty();
			var msg = JSON.parse(args.body);
			for (var key in msg.items) {
				var i = key;
				var id = msg.items[i].id;
				if (msg.items[i].icon === null || msg.costs[i].icon === null) continue;
				var newDiv = UI.AddDiv(win, ""+i, "", false, {"style": 'display:block;height:32px;margin:4px auto;'});
				var tooltip = "<b>" + msg.items[i].name + "</b><br>" + msg.items[i].tool;
				var aicon = UI.AddIcon(newDiv, "aicon", false, {"width": '32px', "height": '32px', "style": 'display:inline-block;float:left;width:32px;height:32px;', "title": tooltip});
				aicon.setImage(Game.gfx.Items[msg.items[i].icon], 0, 0, 32, 32);
				UI.AddDiv(newDiv, "text", msg.items[i].name, false, {"style": 'display:inline-block;float:left;height:16px;width:96px;overflow:hidden;margin:8px auto;', "title": tooltip});
				UI.AddButton(newDiv, "buy", "Buy", function(i, div, e) {
					Game.socket.send("buy:" + i);
				}.bind(this, i, newDiv), false, {"style": 'display:inline-block;float:right;height:32px;'});
				var tooltip2 = "<b>" + msg.costs[i].name + "</b><br>" + msg.costs[i].tool;
				UI.AddDiv(newDiv, "count", "x" +  msg.costs[i].count, false, {"style": 'display:inline-block;float:right;height:16px;margin:8px auto;', "title": tooltip2});
				var iicon = UI.AddIcon(newDiv, "iicon", false, {"width": '32px', "height": '32px', "style": 'display:inline-block;float:right;width:32px;height:32px;', "title": tooltip2});
				iicon.setImage(Game.gfx.Items[msg.costs[i].icon], 0, 0, 32, 32);
				UI.AddDiv(newDiv, "desc", "Cost:", false, {"style": 'display:inline-block;float:right;height:16px;margin:8px;'});
			}
			$("#shop").dialog("open");
		} else if (args.head === "snap") {
			//player began to move
			$("#shop").dialog("close");
		}
	}
}

/***** helper *****/
Shops.client.shop.createUI = function() {
	this.window = UI.NewWindow("shop", "Shop", "336px");
}

Shops.client.npcEditor.createUI = function(win) {
	this.currList = new Array();
	this.divCount = 0;
	
	var addData = function(e, item, cost, count) {
		if (e)
			e.preventDefault();
		if (!item) item = 1;
		if (!cost) cost = 1;
		if (!count) count = 0;
		
		var i = Shops.client.npcEditor.divCount;
		Shops.client.npcEditor.currList[i] = new Object();
		
		var newDiv = UI.AddDiv(win, ""+i, "", false, {"style": 'display:block;margin:4px auto;'});
		
		var iicon = null;
		UI.AddSpinner(newDiv, "item", {value: item, min: 1, spin: function(event, ui) {
            Shops.client.npcEditor.currList[i].item = ui.value;
			
			if (Shops.client.itemData[ui.value] && Shops.client.itemData[ui.value].icon) {
				iicon.setImage(Game.gfx.Items[Shops.client.itemData[ui.value].icon], 0, 0, 32, 32);
				iicon.attr("title", "<b>" + Shops.client.itemData[ui.value].name + "</b><br>" + Shops.client.itemData[ui.value].tool + "");
			} else {
				iicon.clearImage();
				iicon.attr("title", "");
			}
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;width:32px;'});
		Shops.client.npcEditor.currList[i].item = item;
		
		iicon = UI.AddIcon(newDiv, "iicon", false, {"width": '16px', "height": '16px', "style": 'display:inline-block;width:20px;height:20px;margin:auto 4px;', "title": ""});
		if (Shops.client.itemData[item] && Shops.client.itemData[item].icon) {
			iicon.setImage(Game.gfx.Items[Shops.client.itemData[item].icon], 0, 0, 32, 32);
			iicon.attr("title", "<b>" + Shops.client.itemData[item].name + "</b><br>" + Shops.client.itemData[item].tool + "");
		} else {
			iicon.clearImage();
			iicon.attr("title", "");
		}
		
		var cicon = null;
		UI.AddSpinner(newDiv, "cost", {value: cost, min: 1, spin: function(event, ui) {
            Shops.client.npcEditor.currList[i].cost = ui.value;
			
			if (Shops.client.itemData[ui.value] && Shops.client.itemData[ui.value].icon) {
				cicon.setImage(Game.gfx.Items[Shops.client.itemData[ui.value].icon], 0, 0, 32, 32);
				cicon.attr("title", "<b>" + Shops.client.itemData[ui.value].name + "</b><br>" + Shops.client.itemData[ui.value].tool + "");
			} else {
				cicon.clearImage();
				cicon.attr("title", "");
			}
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;width:32px;'});
		Shops.client.npcEditor.currList[i].cost = cost;
		
		cicon = UI.AddIcon(newDiv, "cicon", false, {"width": '16px', "height": '16px', "style": 'display:inline-block;width:20px;height:20px;margin:auto 4px;', "title": ""});
		if (Shops.client.itemData[cost] && Shops.client.itemData[cost].icon) {
			cicon.setImage(Game.gfx.Items[Shops.client.itemData[cost].icon], 0, 0, 32, 32);
			cicon.attr("title", "<b>" + Shops.client.itemData[cost].name + "</b><br>" + Shops.client.itemData[cost].tool + "");
		} else {
			cicon.clearImage();
			cicon.attr("title", "");
		}
		
		UI.AddSpinner(newDiv, "count", {value: count, min: 0, spin: function(event, ui) {
            Shops.client.npcEditor.currList[i].count = ui.value;
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;width:32px;'});
		Shops.client.npcEditor.currList[i].count = count;
		
		UI.AddButton(newDiv, "del", "x", function(i, e) {
			$(newDiv).remove();
			Shops.client.npcEditor.currList[i].del = true;
		}.bind(this, i), false, {'style': 'display:inline-block;float:right;'});
		
		Shops.client.npcEditor.divCount++;
	};
	UI.AddButton(win, "add", "+", addData, false, {"style": 'display:block;width:20%;margin:4px 0px;'});
	UI.AddDiv(win, "info", "Item", false, {"style": 'display:inline-block;width:104px'});
	UI.AddDiv(win, "info", "Cost", false, {"style": 'display:inline-block;width:104px'});
	UI.AddDiv(win, "info", "Amnt", false, {"style": 'display:inline-block;width:32px'});
    
	for (var key in this.currData) {
		addData(null, this.currData[key].item, this.currData[key].cost, this.currData[key].count);
	}
}