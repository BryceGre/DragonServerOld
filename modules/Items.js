/**********************/
/***** Properties *****/
/**********************/
var Items = {
    name: "Test Mod", //module name
    desc: "Module Template / Test.", //description
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
Items.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Items.server.onInit = function() {
    Module.addHook("server_start");
    Module.addHook("on_load"); //player loaded
}

//onHook: Called when an event (that this module is hooked into) is triggered
Items.server.onHook = function(hook, args) {
    //called when a player loads the world
    if (hook == "on_load") {
        var inventory = new Array();
        
        //query the 'characters' table for this player (ID = args.index)
        var character = Data.characters[args.index];
        //if character includes 'inv' column data
        if (character.inv) {
            //get inventory from database
            inventory = character.inv;
        } else {
            //put empty inventory into database
            character.inv = inventory;
        }
        
        var output = new Array();
        //for each item ID in the player's inventory
        for (var key in inventory) {
            //this is the item ID
            var id = inventory[key];
            //query the 'items' table for this item's data
            var item = Data.items[id];
            //add the item data to the output array
            output.push(item);
        }
        
        //get the outgoing load message
        var message = JSON.parse(args.msg);
        //add 'inv' to it
        message.inv = output;
        //put the outgoing load message
        args.msg = JSON.stringify(message);
    }
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Items.client = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Items.client.onInit = function() {
    Module.addHook("game_load");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Items.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        Items.client.createUI();
    }
}

/***** helper *****/
Items.client.createUI = function() {
    
}