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
    Module.addHook("server_start");
}


//onHook: Called when an event (that this module is hooked into) is triggered
Chat.server.onHook = function(hook, args) {
    if (hook == "server_start") {
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
}

//onHook: Called when an event (that this module is hooked into) is triggered
Chat.client.onHook = function(hook, args) {
    if (hook == "game_load") {
        Chat.client.createUI();
    } else if (hook == "world_load") {
        $(this.window).dialog("open");
    }
}

/***** helper *****/
Chat.client.createUI = function() {
    //default transparency
    if (!window.localStorage.getItem("ui-chat-o")) {
        window.localStorage.setItem("ui-chat-o", 5);
    }
    //create the ui
    this.window = UI.NewWindow("chat", "Chat", "33%", 360);
    $("#chat").css("overflow-y", "hidden"); //hide overflow
    UI.AddDiv(this.window, "area", "", false, {"style": 'display:block;margin:4px auto;height:256px;overflow-y:scroll;'});
    UI.AddInput(this.window, "box", "", function() {
        Chat.client.message = $("#chat-box").val();
    }, false, {"style": 'display:block;width:50%;margin:4px 0px;'});
    
    $("#chat-box").keyup(function(e) {
        if (e.keyCode === 13) {
            Chat.client.sendMsg();
        }
    });
}

Chat.client.sendMsg = function() {
    if (Chat.client.message != "") {
        $("#chat-area").append(Chat.client.message + "<br>");
        $("#chat-area").scrollTop($("#chat-area").prop("scrollHeight"));

        $("#chat-box").val("");
        Chat.client.message = "";
    }
}