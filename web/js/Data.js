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
 * Data.js contains default data objects that can be read and modified by modules.
 */

Data = new Object();

// rough idea of colors:
// red = impairing (block)
// blue = transport (warp)
// green = environment (roof)
// yellow = spawn (npc)
// white =
Data.map_attr = { //default map attributes
    "0": {"name": "None", "display": "", "color": ""},
    "1": {"name": "Block", "display": "B", "color": "red"},
    "2": {"name": "Warp", "display": "W", "color": "blue"},
    "3": {"name": "Floor", "display": "F", "color": "blue"},
    "4": {"name": "Roof", "display": "R", "color": "green"},
    "5": {"name": "Door", "display": "D", "color": "green"},
    "6": {"name": "NPC Spawn", "display": "S", "color": "yellow"},
    "7": {"name": "NPC Avoid", "display": "A", "color": "yellow"},
};

Data.npc_actions = { //default NPC actions
    none: {name: "None"},
};

Data.npc_behaviors = { //default NPC behaviors
    still: {name: "Stationary"},
}