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
var Chat = {
    name: "Basic Chat", //module name
    desc: "Basic chatting system with local and global.", //description
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
Chat.server = {
    /***** variables *****/
    //none for this module
};

/***** functions *****/
//onInit: Called when the server is started, or the module is installed
Chat.server.onInit = function() {
    Module.addHook("message");
}


//onHook: Called when an event (that this module is hooked into) is triggered
Chat.server.onHook = function(hook, args) {
    if (hook == "message" && args.head == "chat") {
        Game.socket.sendAllOther("chat:" + args.body);
    }
}

/***** helper *****/

/***********************************************/
/***** Client **********************************/
/***********************************************/
Chat.client = {
    /***** variables *****/
    window:null,
    message:"",
    
};

/***** functions *****/
//onInit: Called when the client page loads, as this module is loaded
Chat.client.onInit = function() {
    Module.addHook("game_load");
    Module.addHook("world_load");
    Module.addHook("message");
	Module.addHook("click");
}

//onHook: Called when an event (that this module is hooked into) is triggered
Chat.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        Chat.client.createUI();
    } else if (hook == "world_load") {
        $(this.window).dialog("open");
		$("#chat-box").blur();
    } else if (hook == "message") {
        if (args.head == "chat") {
            $("#chat-area").append(args.body);
            $("#chat-area").scrollTop($("#chat-area").prop("scrollHeight"));
        }
    } else if (hook == "click") {
		$("#chat-box").blur();
	}
}

/***** helper *****/
Chat.client.createUI = function() {
    //default transparency
    if (!window.localStorage.getItem("ui-chat-o")) {
        window.localStorage.setItem("ui-chat-o", 5);
    }
    //create the ui
    this.window = UI.NewWindow("chat", "Chat", "33%", 352);
    $("#chat").css("overflowY", "hidden");
    UI.AddDiv(this.window, "area", "", false, {"style": 'display:block;margin:4px auto;height:264px;overflow-y:scroll;'});
    UI.AddInput(this.window, "box", "", function() {
        Chat.client.message = $("#chat-box").val();
    }, false, {"style": 'display:inline-block;float:left;width:79%;margin:4px 0px;'});
    UI.AddButton(this.window, "send", "Send", Chat.client.sendMsg, false, {"style": 'display:inline-block;float:right;width:19%;margin:4px 0px;'})
    
    $("#chat-box").keyup(function(e) {
        if (e.keyCode === 13) {
            Chat.client.sendMsg();
        }
    });
    
    Game.menus["Chat"] = function() {
        $("#chat").dialog("open");
		$("#chat-box").blur();
    };
}

Chat.client.sendMsg = function() {
    if (Chat.client.message != "") {
        var msg = Game.world.user.name + ": \"" + Chat.client.message + "\"<br>";
        Game.socket.send("chat:" + msg)
        
        $("#chat-area").append(msg);
        $("#chat-area").scrollTop($("#chat-area").prop("scrollHeight"));

        $("#chat-box").val("");
        Chat.client.message = "";
		
		$("#chat-box").blur();
    }
}