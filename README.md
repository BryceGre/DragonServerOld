# Dragon MMO Maker

Dragon MMO Maker is an open source toolkit for creating MMORPGs and MMOs that run in your browser. It is highly reminiscent of the MirageSource engine (and all engines based off of it, including Eclipse, Genesis2D, and XtremeWorlds). 

The server is written in Java (Tomcat) and the client is web based (HTML5/CSS3/JavaScript). A demo can be found [here](http://dragonmmomaker.com/). If it doesn't load (you get a 5XX error code) wait for a few second and refresh the page.

Can be hosted on OpenShift using a QuickStart that runs Tomcat8 and Java8 [such as this one](http://github.com/BryceGre/openshift-tomcat8-quickstart).

## Features

* Handles a seamless, roomless world. The map has 10 floors, and each floor has 8 layers include ground, mask1, mask2, and mask anim (below the player) and fringe1, fringe2, and fringe anim (above the player).
  * The world automatically expands as you edit it, allowing for a seamless transition.
  * Attributes such as Blocked, Warp, Roof, Door, NpcSpawn, and NpcAvoid can be placed as well.
* Handles players and NPCs in the world. Other players and NPCs can be targeted, and with the Combat module, NPCs can be attacked.
* Module-based. Modules can be swapped in and out to add or modify features of the game engine. Modules are each contained in a single .js file for easy sharing.
  * Included modules are Chat, Basic Combat, Items, Shops, Quests, and Progress.
    * Chat: a module for chatting with other players.
    * Combat: a module that allows NPCs to be marked as "enemy" allowing combat, including abilities and spells. Includes an AbilityEditor.
    * Items: a module that allows NPCs to drop items which can be collected by the players into an inventory. Also, allows certain items to be equipped with paperdolling. Includes an ItemEditor.
    * Shops: a module that allows NPCs to be marked as "shop", selling items to the player. Requires the Items module. Includes a ShopEditor.
    * Quests: a module that allows NPCs to be marked as "quest", giving and completing quests. Includes a QuestEditor.
    * Progress: a module that allows players to gain XP and level up, increasing their stats. Works with the Combat module, but does not require it.
  * Also included are MapEditor and NpcEditor for client-side editing.
    * MapEditor: a module that provides an interface for editing the map, placing tiles (including autotiles) and attributes on the map.
    * NpcEditor: a module that provides an interface for editing NPCs, given them sprites, actions, and behaviors.

## Features to come
* Day/Night cycle, light layer.
* Improved UI
* More Modules

## Requirements
* Java8 runtime and a Tomcat8 application server for the server.
* Any HTML5 browser for the client.

## Installation
A pre-build DragonServer.war file is included in the base directory. Otherwise, NetBeans can build it for Tomcat8 using Java8.
1. Download the DragonServer.war file. Place it in the WebApps directory of a Tomcat8 server.
2. Download everything in the "GFX", "SFX", and "modules" folders, as well as the config.ini and layout.xml files.
3. (Optional) Replace/Add any files in "GFX" and "SFX" with your own custom resources. Add your own modules to "modules".
4. Place the 3 folders and 2 files in a folder named "DragonServer" in Tomcat8's catalina.base or catalina.home.

## Usage
1. Run the DragonServer WebApp in Tomcat8.
2. Open the WebApp in your browser. The server will automatically use to the /client path.
3. Create an account by typing in a username and password, and clicking "Create".
4. Log in if you like, you won't see much but your character and a blank world.
5. Change the path to /admin path by adding "/admin" to the domain.
6. Log in using the account you created.
7. Open the game menu in the lower-left to access the game editors.
8. Create your game! I suggest starting with the MapEditor.