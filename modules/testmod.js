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
var testmod = {
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
testmod.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
testmod.server.onInit = function() {
    Module.addHook("server_start");
}


//onHook: Called when an event (that this module is hooked into) is triggered
testmod.server.onHook = function(hook, args) {
    if (hook == "server_start") {
        console.log("Server booted! So says TestMod!");
    }
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
testmod.client = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
testmod.client.onInit = function() {
    Module.addHook("game_load");
    Module.addHook("contextmenu");
}

//onHook: Called when an event (that this module is hooked into) is triggered
testmod.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        console.log("Game loaded! So says TestMod!");
    } else if (hook == "contextmenu") {
        UI.AddToMenu("test", function() {alert("test");});
    }
}

/***** helper *****/