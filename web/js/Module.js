var Module = new Object();
var ADD = 0;
var AVG = 1;
var MAX = 2;
var MIN = 3;
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

Module.removeHook = function(hook, module) {
    if (!module) {
        module = Module.lastMod;
    }
    if (!module) {
        return;
    }
    if (_Game.hooks[hook]) {
        var index = _Game.hooks[hook].indexOf(item);
        if (index >= 0) {
            _Game.hooks[hook].splice(index, 1);
        }
    }
}

Module.doHook = function(hook, args, ret) {
    if (!args) {
        args = new Object();
    }
    args.index = _Game.userID;
    if (!ret) {
        ret = ADD;
    }
    
    //re-create characters
    Data.characters = new Object();
    Data.characters[_Game.userID] = _Game.world.user;
    $.extend(Data.characters, _Game.world.players);
    Data.npcs = new Object();
    $.extend(Data.npcs, _Game.world.npcs);
    
    var sum = 0;
    if (ret == MIN) sum = Number.MAX_VALUE;
    if (ret == MAX) sum = Number.MIN_VALUE;
    var num = 0;
    for (key in _Game.hooks[hook]) {
        _Game.context.save();
        var prevMod = Module.lastMod;
        Module.lastMod = _Game.hooks[hook][key];
        var result = _Game.hooks[hook][key].client.onHook(hook, args);
        if (!isNaN(parseFloat(result))) {
            if (ret == MAX) {
                if (result > sum) sum = result;
            } else if (ret == MIN) {
                if (result < sum) sum = result;
            } else {
                sum += result;
            }
            num++;
        }
        Module.lastMod = prevMod;
        _Game.context.restore();
    }
    if (ret == AVG) return (sum / num);
    return sum;
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