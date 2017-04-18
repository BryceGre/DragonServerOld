/*Copyright 2016 Bryce Gregerson

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/

/**
 * Module.js provides functions needed to load, run, and hook game modules.
 */

var Module = new Object();
//multiple return type modifiers values
var ADD = 0;
var AVG = 1;
var MAX = 2;
var MIN = 3;
//last mod to be used
Module.lastMod = false;

/**
 * Add a hook to a module
 * @param {String} hook the name of the hook
 * @param {String} module the module to hook into, or omit for current module
 */
Module.addHook = function(hook, module) {
    if (!module) {
        //no module given, use current module
        module = Module.lastMod;
    }
    if (!module) {
        //no module, don't continue
        return;
    }
    //register module to hook
    if (!_Game.hooks[hook])
        _Game.hooks[hook] = new Array();
    _Game.hooks[hook].push(module);
}

/**
 * Remove a hook from a module
 * @param {String} hook the name of the hook
 * @param {String} module the module to unhook from, or omit for current module
 */
Module.removeHook = function(hook, module) {
    if (!module) {
        //no module given, use current module
        module = Module.lastMod;
    }
    if (!module) {
        //no module, don't continue
        return;
    }
    //unregister module from hook
    if (_Game.hooks[hook]) {
        var index = _Game.hooks[hook].indexOf(item);
        if (index >= 0) {
            _Game.hooks[hook].splice(index, 1);
        }
    }
}

/**
 * Execute a hook (run all modules's "ohHook()" methods with that hook).
 * @param {String} hook the name of the hook
 * @param {Object} args arguments to supply to the "onHook()" methods, or omit for only index
 * @param {Number} ret the multiple return type modifier (ADD/MUL/AVG/MAX/MIN) to use, or omit for ADD
 * @returns {Number} the sum/product/average/maximum/minimum of all return values from executing the hook
 */
Module.doHook = function(hook, args, ret) {
    if (!args) {
        //no args, use blank object
        args = new Object();
    }
    //set player index
    args.index = _Game.userID;
    if (!ret) {
        //no return, use default (ADD)
        ret = ADD;
    }
    
    //re-create characters
    Data.characters = new Object();
    Data.characters[_Game.userID] = _Game.world.user;
    $.extend(Data.characters, _Game.world.players);
    Data.npcs = new Object();
    $.extend(Data.npcs, _Game.world.npcs);
    
    //set up return values
    var sum = 0;
    if (ret == MIN) sum = Number.MAX_VALUE;
    if (ret == MAX) sum = Number.MIN_VALUE;
    var num = 0;
    for (key in _Game.hooks[hook]) {
        //for each module hooked into this hook
        _Game.context.save(); //save context stack
        var prevMod = Module.lastMod; //save module stack
        //set lastMod so we know which module is running
        Module.lastMod = _Game.hooks[hook][key];
        //run the hook on this module and store the result
        var result = _Game.hooks[hook][key].client.onHook(hook, args);
        if (!isNaN(parseFloat(result))) {
            //result exists, append it to the totals
            if (ret == MAX) {
                if (result > sum) sum = result;
            } else if (ret == MIN) {
                if (result < sum) sum = result;
            } else {
                sum += result;
            }
            num++;
        }
        Module.lastMod = prevMod; //restore module stack
        _Game.context.restore(); //restore context stack
    }
    //return compiled result
    if (ret == AVG) return (sum / num);
    return sum;
}

/**
 * Called when all modules are loaded.
 */
_Game.module_onLoaded = function() {
    //store data for ease of access
    Data.npcs = _Game.world.npcs;
    
    //merge data
    for (var i = 0; i < ModuleList.length; i++) {
        var module = window[ModuleList[i]];
        delete module.server; //free up memory
        
        //call module onInit function
        Module.lastMod = module;
        module.client.onInit(isAdmin);
    }
}