/**********************/
/***** Properties *****/
/**********************/
ItemEditor = {
    name: "Test Mod", //module name
    desc: "Module Template / Test.", //description
    auth: "Darek", //author
    ver: "0.9.1", //version
    req: {
        //required dependencies
        Items: true
    },
    opt: {
    }
};

/***********************************************/
/***** Server **********************************/
/***********************************************/
ItemEditor.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
ItemEditor.server.onInit = function() {
    Module.addHook("server_start");
}


//onHook: Called when an event (that this module is hooked into) is triggered
ItemEditor.server.onHook = function(hook, args) {
    if (hook == "server_start") {

    }
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
ItemEditor.client = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
ItemEditor.client.onInit = function() {
    Module.addHook("game_load");
}

//onHook: Called when an event (that this module is hooked into) is triggered
ItemEditor.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        console.log("Game loaded! So says TestMod!");
    }
}

/***** helper *****/