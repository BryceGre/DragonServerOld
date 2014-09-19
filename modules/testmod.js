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
        var char1 = Data.characters[7];
        console.log("Char #1: " + JSON.stringify(char1));
        var name = char1.name;
        var char2 = Data.characters[name];
        console.log("Char '"+name+"': " + JSON.stringify(char2));
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
}

//onHook: Called when an event (that this module is hooked into) is triggered
testmod.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        console.log("Game loaded! So says TestMod!");
    }
}

/***** helper *****/