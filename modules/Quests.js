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
var Quests = {
    name: "Quests", //module name
    desc: "Quests for the players to embark on. Also dialog.", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
};

//if we are on the client
if (typeof Server === "undefined" || Server !== true) {
	//setup quest actions datastructure
	//note, we're not adding to the data structure, we're creating it
	//so in order to ensure it is created before onInit, we must create it out here
	Data.quest_actions = {
		none: {name: "None"},
		kill: {name: "Kill"},
	};
};

Quests.Quest = function() {
	this.name = ""; //quest name
	this.preq = 0; //prerequisite quest (0 for none)
	this.stxt = ""; //starting dialog text
	this.etxt = ""; //ending dialog text
	this.rexp = 0; //reward exp
	this.action = "none"; //quest action type
	
	this.data = {};
}

/***********************************************/
/***** Server **********************************/
/***********************************************/
Quests.server = {
    /***** variables *****/
	currDialog : new Object(),
	tagged : new Object(),
	editor : {
		currQuest: 1,
	},
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Quests.server.onInit = function() {
	Module.addHook("admin_on_load");
    Module.addHook("on_load"); //player loaded
	Module.addHook("npc_act");
	Module.addHook("npc_die"); //npc die
	Module.addHook("message");
    Module.addHook("admin_message");
    Module.addHook("quest_text");
}


//onHook: Called when an event (that this module is hooked into) is triggered
Quests.server.onHook = function(hook, args) {
    //called when a player loads the world
    if (hook == "on_load") {
		if (args.index) {
			var user = Data.characters[args.index];
			//get the outgoing load message
			var msg = JSON.parse(args.msg);
			if (user.quest) {
				msg.quest = user.quest;
			} else {
				msg.quest = null;
			}
			args.msg = JSON.stringify(msg);
		}
	} else if (hook == "admin_message") {
        if (args.head === "savequest") {
			//save a quest to the database
            var data = JSON.parse(args.body);
			
            var quest = Data.quests[Quests.server.editor.currQuest];
            //note: we use putAll to reduce the number of database calls
            quest.putAll(data);
        } else if (args.head === "loadquest") {
			//load a quest from the database
            Quests.server.editor.currQuest = parseInt(args.body);
			
            var quest = Data.quests[Quests.server.editor.currQuest];
            if (quest.name === null) {
				quest = new Quests.Quest();
			}
			
            Game.socket.send("loadquest:" + JSON.stringify(quest));
        }
	//called when the admin interface is loaded
    } else if (hook === "admin_on_load") {
		//get the outgoing load message
		var msg = JSON.parse(args.msg);
		//fill it with quest data
		msg.quests = {};
		var list = Data.quests.listAll();
		for (var key in list) {
			msg.quests[key] = new Object();
			msg.quests[key].name = list[key].name;
		}
		//put the outgoing load message
		args.msg = JSON.stringify(msg);
	} else if (hook === "npc_act") {
        var npc = Data.npcs[args.npc.id];
        if (npc) {
            if (npc.action == "attack") {
				//tag npc
				if (!this.tagged[args.npc.iid]) this.tagged[args.npc.iid] = new Object();
				this.tagged[args.npc.iid][args.index] = true;
			} else if (npc.action == "quest") {
				var msg;
				var user = Data.characters[args.index];
				var data = npc.data;
				//if user is on a quest
				if (user.quest) {
					var quest = user.quest;
					//for each quest the npc gives
					for (var key in data) {
						if (key != "dialog") {
							//if npc ends the quest the user is on
							if (data[key].quest == quest.id && data[key].end) {
								//check end requirements
								var done = true;
								for (var i in quest.data) {
									if (quest.data[i].count > 0)
										done = false;
								}
								if (done) {
									var complete = user.quests;
									if (!complete) complete = new Array();
									complete.push(quest.id);
									user.quests = complete;
									var qdata = Data.quests[quest.id];
									msg = new Object();
									msg.button = "Done";
									msg.title = qdata.name;
									msg.text = qdata.etxt;
									Game.socket.send("dialog:" + JSON.stringify(msg));
									Game.socket.send("quest:null");
									Module.doHook("progress_gain", {index:args.index, exp:qdata.rexp});
									user.quest = null;
									return;
								}
								break;
							}
						}
					}
				} else {
					var quests = Data.quests.listAll();
					//for each quest the npc gives
					for (var key in data) {
						if (key != "dialog") {
							var complete = user.quests;
							if (!complete) complete = new Array();
							else if (complete.indexOf(data[key].quest) > -1) continue;
							var qdata = quests[data[key].quest];
							//if the npc starts the quest and the user meets the prerequisite
							if (data[key].beg && (qdata.preq == 0 || complete.indexOf(qdata.preq) > -1)) {
								msg = new Object();
								msg.button = "Accept";
								msg.title = qdata.name;
								msg.text = qdata.stxt;
								Game.socket.send("dialog:" + JSON.stringify(msg));
								this.currDialog[args.index] = data[key].quest;
								return;
							}
						}
					}
				}
				msg = new Object();
				msg.button = "Close";
				msg.title = "";
				msg.text = data.dialog;
				Game.socket.send("dialog:" + JSON.stringify(msg));
			}
		}
	} else if (hook === "npc_die") {
		if (this.tagged[args.npc.iid]) {
			var msg = null;
			var chars = Data.characters.listAll();
			for (var key in this.tagged[args.npc.iid]) {
				var user = chars[key];
				var quest = user.quest;
				if (quest.action == "kill") {
					for (var i in quest.data) {
						if (quest.data[i].npc == args.npc.id && quest.data[i].count > 0) {
							quest.data[i].count = quest.data[i].count - 1;
						}
					}
					//send update quest message to client
					quest.text = "";
					Module.doHook("quest_text", {index:args.index, quest:quest});
					Game.socket.sendTo(key, "quest:" + JSON.stringify(quest));
					//update database
					user.quest = quest;
				}
			}
			delete this.tagged[args.npc.iid];
		}
	} else if (hook === "message") {
		if (args.head === "dialog") {
			if (this.currDialog[args.index]) {
				var user = Data.characters[args.index];
				if (!(user.quest)) {
					var id = this.currDialog[args.index];
					var qdata = Data.quests[id];
					var quest = new Object();
					quest.id = id;
					quest.name = qdata.name;
					quest.action = qdata.action;
					quest.data = qdata.data;
					quest.text = "";
					Module.doHook("quest_text", {index:args.index, quest:quest});
					//send update quest message to client
					Game.socket.send("quest:" + JSON.stringify(quest));
					//update database
					user.quest = quest;
				}
			}
			this.currDialog[args.index] = null;
		} else if (args.head === "move") {
			//player moved
			this.currDialog[args.index] = null;
		}
	} else if (hook === "quest_text") {
		var quest = args.quest;
		quest.text += "I need to kill: <br>";
		var npcs = Data.npcs.listAll();
		if (quest.action == "kill") {
			for (var key in quest.data) {
				var npc = npcs[quest.data[key].npc];
				quest.text += quest.data[key].count + " more " + npc.name + "s\n";
			}
		}
	}
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Quests.client = {
    /***** variables *****/
	questData : new Object(),
	dialog : {
		window: null,
	},
	quests : {
		window: null,
	},
	editor : {
		window: null,
		data: null,
		currQuest: 1,
		currObject: new Quests.Quest(),
		changed: false,
	},
	questEditor : {
		currData: new Object(),
		currList: new Array(),
		divCount: 0,
	},
	npcEditor : {
		currData: new Object(),
		currList: new Array(),
		divCount: 0,
	},
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Quests.client.onInit = function() {
	Data.npc_actions["quest"] = {name: "Dialog"};
	if (isAdmin) {
		Module.addHook("npc_editor_data");
		Module.addHook("npc_editor_save");
		Module.addHook("quest_editor_data");
		Module.addHook("quest_editor_save");
	}
    Module.addHook("game_load"); //when the game loads
    Module.addHook("message"); //when a message is recieved
}

//onHook: Called when an event (that this module is hooked into) is triggered
Quests.client.onHook = function(hook, args) {
    if (isAdmin && hook == "game_load") {
		//createQuestEditor UI
        Quests.client.editor.createUI();
    } else if (isAdmin && hook === "npc_editor_data") {
		if (args.action == "quest") {
			Quests.client.npcEditor.currData = args.data;
			Quests.client.npcEditor.createUI(args.window);
		}
	} else if (isAdmin && hook === "npc_editor_save") {
		if (args.action == "quest") {
			var data = args.data;
			
			data.dialog = Quests.client.npcEditor.currData.dialog;
			
			var count = 0;
			for (var i = 0; i < Quests.client.npcEditor.divCount; i++) {
				if (!Quests.client.npcEditor.currList[i].del) {
					data[count] = Quests.client.npcEditor.currList[i];
					count++;
				}
			}
			
			args.data = data;
		}
	} else if (isAdmin && hook === "quest_editor_data") {
		if (args.action == "kill") {
			Quests.client.questEditor.currData = args.data;
			Quests.client.questEditor.createUI(args.window);
		}
	} else if (isAdmin && hook === "quest_editor_save") {
		if (args.action == "kill") {
			var data = args.data;
			
			var count = 0;
			for (var i = 0; i < Quests.client.questEditor.divCount; i++) {
				if (!Quests.client.questEditor.currList[i].del) {
					data[count] = Quests.client.questEditor.currList[i];
					count++;
				}
			}
			
			args.data = data;
		}
	} else if (hook == "game_load") {
		Quests.client.dialog.createUI();
		Quests.client.quests.createUI();
	} else if (hook == "message") {
		if (args.head === "load") {
			var msg = JSON.parse(args.body);
			if (isAdmin) {
				if (msg.quests) {
					$.extend(true, this.questData, msg.quests);
				}
			} else {
				this.quests.update(msg.quest);
			}
		} else if (args.head === "dialog") {
			this.dialog.show(JSON.parse(args.body));
		} else if (args.head === "quest") {
			this.quests.update(JSON.parse(args.body));
		} else if (args.head === "snap") {
			//player began to move
			$("#dialog").dialog("close");
		}
		if (args.admin === true && args.head === "loadquest") {
			var quest = JSON.parse(args.body);
			$.extend(true, Quests.client.editor.currObject, quest);
            Quests.client.editor.updateFields();
		}
	}
}

/***** helper *****/

Quests.client.dialog.createUI = function() {
	this.window = UI.NewWindow("dialog", "Dialog", "336px");
}

Quests.client.dialog.show = function(msg) {
	this.window.empty();
	UI.AddDiv(this.window, "title", "<h2>" + msg.title + "</h2>", false, {"style": 'display:block;margin:4px auto;height:32px;'});
	UI.AddDiv(this.window, "text", msg.text.replace(/\n/g, "<br />"), false, {"style": 'display:block;margin:4px auto;'});
    UI.AddButton(this.window, "button", msg.button, function(e) {
        e.preventDefault();
        Game.socket.send("dialog");
		$("#dialog").dialog("close");
    }, false, {'style': 'display:block;float:right;'});
	$("#dialog").dialog("open");
}

Quests.client.quests.createUI = function() {
	this.window = UI.NewWindow("quests", "Quest Log", "336px");
	
    Game.menus["Quest Log"] = function() {
        $("#quests").dialog("open");
    };
}

Quests.client.quests.update = function(quest) {
	this.window.empty();
	UI.AddDiv(this.window, "title", "<h2>Current Quest</h2>", false, {"style": 'display:block;margin:4px auto;height:32px;'});
	if (quest) {
		UI.AddDiv(this.window, "name", "<h3>" + quest.name + "</h3>", false, {"style": 'display:block;margin:4px auto;height:24px;'});
		UI.AddDiv(this.window, "text", quest.text.replace(/\n/g, "<br />"), false, {"style": 'display:block;margin:4px auto;'});
	} else {
		UI.AddDiv(this.window, "text", "No current quest... go find one!", false, {"style": 'display:block;margin:4px auto;'});
	}
}

Quests.client.editor.loadQuest = function() {
    Game.socket.send("loadquest:" + this.currQuest);
}

Quests.client.editor.updateFields = function() {
	if (Quests.client.questData[this.currQuest])
		$("#quest-editor-quest").val(this.currQuest, Quests.client.questData[this.currQuest].name);
	else
		$("#quest-editor-quest").val(this.currQuest);
    $("#quest-editor-name").val(this.currObject.name);
	$("#quest-editor-preq").val(this.currObject.preq);
	$("#quest-editor-stxt").val(this.currObject.stxt);
	$("#quest-editor-etxt").val(this.currObject.etxt);
	$("#quest-editor-rexp").val(this.currObject.rexp);
    $("#quest-editor-action").val(this.currObject.action);
    $("#quest-editor-action").trigger("chosen:updated");
	$(this.data).empty();
	Module.doHook("quest_editor_data", {window: this.data, action: this.currObject.action, data: this.currObject.data});
}

Quests.client.editor.createUI = function() {
    this.window = UI.NewWindow("quest-editor", "Quest Editor", "336px");
	
    UI.AddDiv(this.window, "quest-label", "Quest ID: ", false, {"style": 'display:inline-block;float:left;margin:8px auto;'});
    UI.AddSpinner(this.window, "quest", {min: 1, stop: function() {
            var value = $("#quest-editor-quest").val();
			if (Quests.client.questData[value])
				$("#quest-editor-quest").val(value, Quests.client.questData[value].name);
			else
				$("#quest-editor-quest").val(value);
        }
    }, false, {"style": 'display:inline-block;float:left;margin:4px auto;'});
	$("#quest-editor-quest").parent(".ui-spinner").css("width", "128px");
	
    UI.AddButton(this.window, "quest-edit", "Edit Quest", function() {
		if (Quests.client.editor.changed) {
            if (confirm("Any unsaved changes to the current Quest will be lost!")) {
                Quests.client.editor.currQuest = $("#quest-editor-quest").val();
                Quests.client.editor.loadQuest();
                Quests.client.editor.changed = false;
            } else {
                $("#quest-editor-quest").val(Quests.client.editor.currQuest, Quests.client.questData[Quests.client.editor.currQuest].name);
            }
        } else {
            Quests.client.editor.currQuest = $("#quest-editor-quest").val();
            Quests.client.editor.loadQuest();
        }
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});

    UI.AddRaw(this.window, "<div style='display:block;'><hr></div>");
	
    UI.AddDiv(this.window, "name-label", "Name: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddInput(this.window, "name", "", function() {
        Quests.client.editor.currObject.name = $("#quest-editor-name").val();
        Quests.client.editor.changed = true;
    }, false, {"style": 'display:block;margin:4px 0px;'});
	
    UI.AddDiv(this.window, "preq-label", "Prerequisite Quest (0 for none): ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddSpinner(this.window, "preq", {min: 0, stop: function() {
            var value = $("#quest-editor-preq").val();
			Quests.client.editor.currObject.preq = value;
			if (value == 0) 
				$("#quest-editor-preq").val(value, "None");
			else if (Quests.client.questData[value])
				$("#quest-editor-preq").val(value, Quests.client.questData[value].name);
			else
				$("#quest-editor-preq").val(value);
        }
    }, false, {"style": 'display:block;margin:4px auto;'});
	
    UI.AddDiv(this.window, "stxt-label", "Start Dialog: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddArea(this.window, "stxt", "", function() {
        Quests.client.editor.currObject.stxt = $("#quest-editor-stxt").val();
        Quests.client.editor.changed = true;
    }, false, {"style": 'display:block;width:90%;margin:4px 0px;'});
	
    UI.AddDiv(this.window, "etxt-label", "End Dialog: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddArea(this.window, "etxt", "", function() {
        Quests.client.editor.currObject.etxt = $("#quest-editor-etxt").val();
        Quests.client.editor.changed = true;
    }, false, {"style": 'display:block;width:90%;margin:4px 0px;'});
	
    UI.AddDiv(this.window, "rexp-label", "Reward Exp: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddSpinner(this.window, "rexp", {min: 0, stop: function() {
			Quests.client.editor.currObject.rexp = $("#quest-editor-rexp").val();
		}
    }, false, {"style": 'display:block;margin:4px auto;'});
	
    var actions = new Object();
    for (key in Data.quest_actions) {
        actions[key] = Data.quest_actions[key].name;
    }
    UI.AddDiv(this.window, "action-label", "Action: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
    UI.AddCombobox(this.window, "action", {width: "70%"}, actions, function() {
        Quests.client.editor.currObject.action = $("#quest-editor-action").val();
		Quests.client.editor.currObject.data = {};
		$(Quests.client.editor.data).empty();
		Module.doHook("quest_editor_data", {window: Quests.client.editor.data, action: Quests.client.editor.currObject.action, data: Quests.client.editor.currObject.data});
        Quests.client.editor.changed = true;
    }, false, {"style": 'display:block;margin:4px 0px;'});
	
	this.data = UI.AddDiv(this.window, "data", "", false, {"style": 'display:block;margin:4px auto;'});
	Module.doHook("quest_editor_data", {window: this.data, action: this.currObject.action, data: this.currObject.data});
	
    UI.AddButton(this.window, "save", "Save", function(e) {
        e.preventDefault();
		var msg = $.extend(true, msg, Quests.client.editor.currObject);
		Module.doHook("quest_editor_save", {window: Quests.client.editor.data, action: Quests.client.editor.currObject.action, data: msg.data});
        Game.socket.send("savequest:" + JSON.stringify(msg));
		//update quest data
		Quests.client.questData[Quests.client.editor.currQuest] = new Object();
        Quests.client.questData[Quests.client.editor.currQuest].name = Quests.client.editor.currObject.name;
		//revert changed
        Quests.client.editor.changed = false;
        //update quest field
        $("#quest-editor-quest").val(Quests.client.editor.currQuest, Quests.client.editor.currObject.name);
    }, false, {'style': 'display:block;float:right;'});
	
    Game.menus["Quest Editor"] = function() {
        $("#quest-editor").dialog("open");
        Quests.client.editor.currQuest = 1;
        Quests.client.editor.loadQuest();
    };
}

Quests.client.questEditor.createUI = function(win) {
	this.currList = new Array();
	this.divCount = 0;
	
    UI.AddDiv(win, "label", "NPCs: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	
	var addData = function(e, npc, count) {
		if (e)
			e.preventDefault();
		if (!npc) npc = 1;
		if (!count) count = 0;
		
		var i = Quests.client.questEditor.divCount;
		Quests.client.questEditor.currList[i] = new Object();
		
		var newDiv = UI.AddDiv(win, ""+i, "", false, {"style": 'display:block;margin:4px auto;'});
		
		UI.AddSpinner(newDiv, "npc", {value: npc, min: 1, spin: function(event, ui) {
            Quests.client.questEditor.currList[i].npc = ui.value;
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;width:64px;'});
		Quests.client.questEditor.currList[i].npc = npc;
		
		UI.AddSpinner(newDiv, "count", {value: count, min: 0, spin: function(event, ui) {
            Quests.client.questEditor.currList[i].count = ui.value;
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;margin-left:8px;width:32px;'});
		Quests.client.questEditor.currList[i].count = count;
		
		UI.AddButton(newDiv, "del", "x", function(i, e) {
			$(newDiv).remove();
			Quests.client.questEditor.currList[i].del = true;
		}.bind(this, i), false, {'style': 'display:inline-block;float:right;'});
		
		Quests.client.questEditor.divCount++;
	};
	UI.AddButton(win, "add", "+", addData, false, {"style": 'display:block;width:20%;margin:4px 0px;'});
	UI.AddDiv(win, "info", "NPC", false, {"style": 'display:inline-block;width:96px'});
	UI.AddDiv(win, "info", "Count", false, {"style": 'display:inline-block;width:64px'});
    
	for (var key in this.currData) {
		addData(null, this.currData[key].npc, this.currData[key].count);
	}
}

Quests.client.npcEditor.createUI = function(win) {
	this.currList = new Array();
	this.divCount = 0;
	
    UI.AddDiv(win, "label", "Dialog: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	UI.AddArea(win, "dialog", this.currData.dialog, function() {
        Quests.client.npcEditor.currData.dialog = $("#npc-editor-data-dialog").val();
    }, false, {"style": 'display:block;width:90%;margin:4px 0px;'});
	
    UI.AddDiv(win, "label", "Quests: ", false, {"style": 'display:block;margin:4px auto;height:16px;'});
	
	var addData = function(e, quest, beg, end) {
		if (e)
			e.preventDefault();
		if (!quest) quest = 1;
		if (!beg) beg = false;
		if (!end) end = false;
		
		var i = Quests.client.npcEditor.divCount;
		Quests.client.npcEditor.currList[i] = new Object();
		
		var newDiv = UI.AddDiv(win, ""+i, "", false, {"style": 'display:block;margin:4px auto;'});
		
		UI.AddSpinner(newDiv, "quest", {value: quest, min: 1, spin: function(event, ui) {
            Quests.client.npcEditor.currList[i].quest = ui.value;
        }}, false, {"style": 'display:inline-block;margin-bottom:8px;width:32px;'});
		Quests.client.npcEditor.currList[i].quest = quest;
		
		UI.AddCheckbox(newDiv, "beg", "Begin", beg, function(e) {
			if ($("#npc-editor-data-"+i+"-beg-check").prop('checked')) {
				Quests.client.npcEditor.currList[i].beg = true;
			} else {
				Quests.client.npcEditor.currList[i].beg = false;
			}
		}, false, {'style': 'display:inline-block;margin:auto 4px;'});
		Quests.client.npcEditor.currList[i].quest.beg = beg;
		
		UI.AddCheckbox(newDiv, "end", "End", end, function(e) {
			if ($("#npc-editor-data-"+i+"-end-check").prop('checked')) {
				Quests.client.npcEditor.currList[i].end = true;
			} else {
				Quests.client.npcEditor.currList[i].end = false;
			}
		}, false, {'style': 'display:inline-block;margin:auto 4px;'});
		Quests.client.npcEditor.currList[i].quest.end = end;
		
		UI.AddButton(newDiv, "del", "x", function(i, e) {
			$(newDiv).remove();
			Quests.client.npcEditor.currList[i].del = true;
		}.bind(this, i), false, {'style': 'display:inline-block;float:right;'});
		
		Quests.client.npcEditor.divCount++;
	};
	UI.AddButton(win, "add", "+", addData, false, {"style": 'display:block;width:20%;margin:4px 0px;'});
	UI.AddDiv(win, "info", "Quest", false, {"style": 'display:inline-block;width:104px'});
    
	for (var key in this.currData) {
		if (key != "dialog")
			addData(null, this.currData[key].quest, this.currData[key].beg, this.currData[key].end);
	}
}