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
    //none for this module
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Combat.client.onInit = function() {
        Data.npc_actions["attack"] = {name: "Attack"};
        Module.addHook("message");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Combat.client.onHook = function(hook, args) {
    if (hook == "message") {
        if (args.head === "npc-damage") {
            
        }
    }
}

/***** helper *****/