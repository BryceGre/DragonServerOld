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
var Progress = {
    name: "Progression", //module name
    desc: "Progression system including exp/levels/stats", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
	prefs: {
		formula_mod: 5,
		points_level: 2,
		stat_damage: "Strength",
		stat_armour: "Defense",
		stat_health: "Stamina",
		stat_evade: "Agility",
		stat_mana: "Intellect",
	}
};

Progress.calcLevel = function(exp) {
	return Math.floor((1.0 / Progress.prefs.formula_mod) * Math.sqrt(exp)) + 1;
}

Progress.calcPoints = function(lvl, stats) {
	var sum = 0;
	for (var key in stats) {
		sum += stats[key];
	}
	return 50 - sum + (lvl * Progress.prefs.points_level);
}

/***********************************************/
/***** Server **********************************/
/***********************************************/
Progress.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Progress.server.onInit = function() {
    Module.addHook("message");
	Module.addHook("on_load");
	Module.addHook("progress_gain");
	Module.addHook("combat-player-spd");
	Module.addHook("combat-player-mod");
	Module.addHook("combat-npc-mod");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Progress.server.onHook = function(hook, args) {
    if (hook == "message" && args.head == "progress") {
		if (args.index) {
			var stats = JSON.parse(args.body);
			var user = Data.characters[args.index];
			user.stats = stats;
		}
    }
	if (hook == "on_load") {
		if (args.index) {
			var user = Data.characters[args.index];
			
			//exp
			var exp = user.exp;
			if (!exp) exp = 0;
			
			//stats
			var stats = user.stats;
			if (!stats) {
				stats = {
					damage:10,
					armour:10,
					health:10,
					evade:10,
					mana:10,
				}
				user.stats = stats;
			}
			
			
			//append to message
			var msg = JSON.parse(args.msg);
			msg.progress = {
				exp: exp,
				stats: stats,
			}
			args.msg = JSON.stringify(msg);
		}
	}
	
	if (hook == "progress_gain" && args.exp > 0) {
		if (args.index) {
			var user = Data.characters[args.index];
			var exp = user.exp;
			
			if (!exp) exp = args.exp;
			else exp += args.exp;
			
			user.exp = exp;
			
			Game.socket.send("progress:" + exp);
			console.log("user exp: " + exp);
			return exp;
		}
	}
	
	if (hook == "combat-player-spd") {
		var user = Data.characters[args.index];
		var stats = user.stats;
		return (1 + (stats.evade / 100));
		
	}
	if (hook == "combat-player-mod") {
		var user = Data.characters[args.index];
		var stats = user.stats;
		return (1 + (stats.damage / 100));
		
	}
	if (hook == "combat-npc-mod") {
		var user = Data.characters[args.index];
		var stats = user.stats;
		return 1 / (1 + (stats.armour / 100));
	}
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Progress.client = {
    /***** variables *****/
    window:null,
	exp:0,
	stats: {
		damage:10,
		armour:10,
		health:10,
		evade:10,
		mana:10,
	},
	reset: {
		damage:10,
		armour:10,
		health:10,
		evade:10,
		mana:10,
	},
	points:0,
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Progress.client.onInit = function() {
	if (isAdmin) {
        return;
    } //only work for game
	
    Module.addHook("game_load");
    Module.addHook("message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Progress.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        Progress.client.createUI();
    } else if (hook == "message") {
        if (args.head == "progress") {
            this.exp = parseInt(args.body, 10);
			$("#stats-exp").text(this.exp);
			var level = Progress.calcLevel(this.exp);
			$("#stats-level").text(level);
			this.points = Progress.calcPoints(level, this.stats);
			$("#stats-points").text(this.points);
        } else if (args.head == "load") {
			var msg = JSON.parse(args.body);
			if (msg.progress) {
				console.log("Progress: Msg: " + JSON.stringify(msg.progress));
				this.exp = msg.progress.exp;
				$("#stats-exp").text(this.exp);
				console.log("Progress: Exp: "+ this.exp);
				
				$.extend(true, this.stats, msg.progress.stats);
				$.extend(true, this.reset, this.stats);
				console.log("Progress: Stats: " + JSON.stringify(this.stats));
				$("#stats-damage").text(Progress.prefs.stat_damage + ": " + this.stats.damage);
				$("#stats-armour").text(Progress.prefs.stat_armour + ": " + this.stats.armour);
				$("#stats-health").text(Progress.prefs.stat_health + ": " + this.stats.health);
				$("#stats-evade").text(Progress.prefs.stat_evade + ": " + this.stats.evade);
				$("#stats-mana").text(Progress.prefs.stat_mana + ": " + this.stats.mana);
				
				var level = Progress.calcLevel(this.exp);
				$("#stats-level").text(level);
				this.points = Progress.calcPoints(level, this.stats);
				$("#stats-points").text(this.points);
			}
		}
    }
}

/***** helper *****/
Progress.client.createUI = function() {
    //default transparency
    this.window = UI.NewWindow("stats", "Stats", "336px");
    
	UI.AddDiv(this.window, "level", "0", false, {"style": 'display:inline-block;float:right;margin:8px auto;'});
	UI.AddDiv(this.window, "level-label", "Level: ", false, {"style": 'display:block;margin:8px auto;height:16px;'});
	
    UI.AddRaw(this.window, "<div style='display:block;'><hr></div>");
	
	UI.AddDiv(this.window, "exp", "0", false, {"style": 'display:inline-block;float:right;margin:8px auto;'});
	UI.AddDiv(this.window, "exp-label", "Experience: ", false, {"style": 'display:block;margin:8px auto;height:16px;'});
	
    UI.AddRaw(this.window, "<div style='display:block;'><hr></div>");
	
	UI.AddDiv(this.window, "points", "0", false, {"style": 'display:inline-block;float:right;margin:8px auto;'});
	UI.AddDiv(this.window, "points-label", "Available: ", false, {"style": 'display:block;margin:8px auto;height:16px;'});
	
    UI.AddRaw(this.window, "<div style='display:block;'><hr></div>");
	
	UI.AddButton(this.window, "damage-add", "+", function() {
		if (Progress.client.points > 0) {
			Progress.client.points--;
			Progress.client.stats.damage++;
			$("#stats-points").text(Progress.client.points);
			$("#stats-damage").text(Progress.prefs.stat_damage + ": " + Progress.client.stats.damage);
		}
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});
	UI.AddDiv(this.window, "damage", Progress.prefs.stat_damage + ": ", false, {"style": 'display:block;margin:8px auto;height:24px;'});
	
	UI.AddButton(this.window, "armour-add", "+", function() {
		if (Progress.client.points > 0) {
			Progress.client.points--;
			Progress.client.stats.armour++;
			$("#stats-points").text(Progress.client.points);
			$("#stats-armour").text(Progress.prefs.stat_armour + ": " + Progress.client.stats.armour);
		}
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});
	UI.AddDiv(this.window, "armour", Progress.prefs.stat_armour + ": ", false, {"style": 'display:block;margin:8px auto;height:24px;'});
	
	UI.AddButton(this.window, "health-add", "+", function() {
		if (Progress.client.points > 0) {
			Progress.client.points--;
			Progress.client.stats.health++;
			$("#stats-points").text(Progress.client.points);
			$("#stats-health").text(Progress.prefs.stat_health + ": " + Progress.client.stats.health);
		}
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});
	UI.AddDiv(this.window, "health", Progress.prefs.stat_health + ": ", false, {"style": 'display:block;margin:8px auto;height:24px;'});
	
	UI.AddButton(this.window, "evade-add", "+", function() {
		if (Progress.client.points > 0) {
			Progress.client.points--;
			Progress.client.stats.evade++;
			$("#stats-points").text(Progress.client.points);
			$("#stats-evade").text(Progress.prefs.stat_evade + ": " + Progress.client.stats.evade);
		}
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});
	UI.AddDiv(this.window, "evade", Progress.prefs.stat_evade + ": ", false, {"style": 'display:block;margin:8px auto;height:24px;'});
	
	UI.AddButton(this.window, "mana-add", "+", function() {
		if (Progress.client.points > 0) {
			Progress.client.points--;
			Progress.client.stats.mana++;
			$("#stats-points").text(Progress.client.points);
			$("#stats-mana").text(Progress.prefs.stat_mana + ": " + Progress.client.stats.mana);
		}
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});
	UI.AddDiv(this.window, "mana", Progress.prefs.stat_mana + ": ", false, {"style": 'display:block;margin:8px auto;height:24px;'});
	
	UI.AddButton(this.window, "reset", "Reset", function() {
        $.extend(true, Progress.client.stats, Progress.client.reset);
		$("#stats-damage").text(Progress.prefs.stat_damage + ": " + Progress.client.stats.damage);
		$("#stats-armour").text(Progress.prefs.stat_armour + ": " + Progress.client.stats.armour);
		$("#stats-health").text(Progress.prefs.stat_health + ": " + Progress.client.stats.health);
		$("#stats-evade").text(Progress.prefs.stat_evade + ": " + Progress.client.stats.evade);
		$("#stats-mana").text(Progress.prefs.stat_mana + ": " + Progress.client.stats.mana);
		Progress.client.points = Progress.calcPoints(Progress.calcLevel(Progress.client.exp), Progress.client.stats);
		$("#stats-points").text(Progress.client.points);
    }, false, {"style": 'display:inline-block;float:right;margin:0px auto;'});
	
	UI.AddButton(this.window, "save", "Save", function() {
        Game.socket.send("progress:" + JSON.stringify(Progress.client.stats));
		$.extend(true, Progress.client.reset, Progress.client.stats);
    }, false, {"style": 'display:block;margin:0px auto;'});
	
    Game.menus["Stats"] = function() {
        $("#stats").dialog("open");
    };
}