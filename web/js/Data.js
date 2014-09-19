/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

Data = new Object();

// rough idea of colors:
// red = impairing (block)
// blue = transport (warp)
// green = environment (roof)
// yellow = spawn (npc)
// white =
Data.map_attr = {
    "0": {"name": "None", "display": "", "color": ""},
    "1": {"name": "Block", "display": "B", "color": "red"},
    "2": {"name": "Warp", "display": "W", "color": "blue"},
    "3": {"name": "Floor", "display": "F", "color": "blue"},
    "4": {"name": "Roof", "display": "R", "color": "green"},
    "5": {"name": "Door", "display": "D", "color": "green"},
    "6": {"name": "NPC Spawn", "display": "S", "color": "yellow"},
    "7": {"name": "NPC Avoid", "display": "A", "color": "yellow"},
};

Data.npc_actions = {
    none: {name: "None"},
};

Data.npc_behaviors = {
    still: {name: "Stationary"},
}