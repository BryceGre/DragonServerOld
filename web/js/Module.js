var Module = new Object();
Module.lastMod = false;

Module.addHook = function(hook, module) {
    if (!module) {
        module = Module.lastMod;
    }
    if (!module) {
        return;
    }
    if (!_Game.hooks[hook])
        _Game.hooks[hook] = new Array();
    _Game.hooks[hook].push(module);
}

Module.doHook = function(hook, args) {
    if (!args) {
        args = new Object();
    }
    args.index = _Game.userID;
    
    //re-create characters
    Data.characters = new Object();
    Data.characters[_Game.userID] = _Game.world.user;
    $.extend(Data.characters, _Game.world.players);
    
    for (key in _Game.hooks[hook]) {
        Module.lastMod = _Game.hooks[hook][key];
        _Game.hooks[hook][key].client.onHook(hook, args);
    }
}

_Game.module_onLoaded = function() {
    //store data for ease of access
    Data.npcs = _Game.world.npcs;
    
    //merge data
    for (var i = 0; i < ModuleList.length; i++) {
        var module = window[ModuleList[i]];
        delete module.server; //free up memory
        
        Module.lastMod = module;
        module.client.onInit(isAdmin);
    }
}