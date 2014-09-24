/***********************************************/
/***** Properties ******************************/
/***********************************************/
Combat = {
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

/***********************************************/
/***** Server **********************************/
/***********************************************/
Combat.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Combat.server.onInit = function() {
    //hook into events here
    Module.addHook("npc_act");
};

//onHook: Called when an event (that this module is hooked into) is triggered
MapEditor.server.onHook = function(hook, args) {
    //argument "hook" contains which event has triggered
    if (hook === "npc_act") {
        var npc = Data.npcs[args.npc.id];
        if (npc) {
            if (npc.action == "attack") {
                var damage = 20;
                args.npc.health -= damage;
                //death is taken care of by the npc manager.
                var msg = new Object();
                msg.npc = args.npc.iid; //instanceID
                msg.dam = damage;
                Game.socket.sendRange("npc-damage:" + JSON.stringify(msg));
            }
        }
    }
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Combat.client = {
    /***** variables *****/
    sct : new Array(), //scrolling combat text
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Combat.client.onInit = function() {
        Data.npc_actions["attack"] = {name: "Attack"};
        Module.addHook("message");
        Module.addHook("on_update");
        Module.addHook("post_draw");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Combat.client.onHook = function(hook, args) {
    if (hook == "message") {
        if (args.head === "npc-damage") {
            var n = JSON.parse(args.body);
            var npc = Game.world.npcs[n.id];
            if (npc) {
                Combat.client.sct.push({
                    npc: npc,
                    num: n.dam,
                    col: "red",
                    y: 0
                });
            }
        }
    } else if (hook == "on_update") {
        var newSct = new Array();
        for (var key in Combat.client.sct) {
            var text = Combat.client.sct[key];
            text.y -= 1;
            if (text.y < TILE_SIZE) {
                newSct.push(text);
            }
        }
        Combat.client.sct = newSct;
    } else if (hook == "post_draw") {
        for (var key in Combat.client.sct) {
            var text = Combat.client.sct[key];
            if (text.npc.floor == Game.world.user.floor) {
                Game.context.fillStyle = text.col;
                Game.context.fillText(n.dam, Game.getTileX(text.npc.x), Game.getTileY(text.npc.y));
            }
        }
    }
}

/***** helper *****/