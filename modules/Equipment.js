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
var Equipment = {
    name: "Equipmet", //module name
    desc: "Allows equipping of items", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
    req: {
        Items:true
    },
    opt: {
    }
};

/***********************************************/
/***** Server **********************************/
/***********************************************/
Equipment.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Equipment.server.onInit = function() {
    Module.addHook("server_start");
}


//onHook: Called when an event (that this module is hooked into) is triggered
Equipment.server.onHook = function(hook, args) {
    if (hook == "server_start") {
        
    }
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Equipment.client = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Equipment.client.onInit = function() {
    Module.addHook("game_load");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Equipment.client.onHook = function(hook, args) {
    if (hook == "game_load") {
    }
}

/***** helper *****/