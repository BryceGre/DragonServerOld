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

package com.dragonmmomaker.server.handler;

import java.io.IOException;
import java.io.Serializable;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Predicate;

import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.json.JSONArray;
import org.json.JSONObject;

import com.dragonmmomaker.datamap.DRow;
import com.dragonmmomaker.server.DragonServer;
import com.dragonmmomaker.server.ServData;
import com.dragonmmomaker.server.data.Account;
import com.dragonmmomaker.server.data.Tile;
import com.dragonmmomaker.server.npc.Npc;
import com.dragonmmomaker.server.quadtree.HashBag;
import com.dragonmmomaker.server.player.Player;
import com.dragonmmomaker.server.util.Point;
import com.dragonmmomaker.server.util.SocketUtils;

/**
 * Server endpoint for players
 * @author Bryce
 */
@ServerEndpoint("/client")
public class ClientHandler {
    public static String ERROR = "Server Offline"; //error string

    protected static Set<ClientHandler> mClients; //list of all clients
    protected static ServData mData; //current server data
    protected static Lock mLock; //a lock

    protected Session mSession; //current client sesson

    /**
     * When application starts, create client set and Lock
     */
    static {
        mClients = new CopyOnWriteArraySet();
        mLock = new ReentrantLock();
    }

    /**
     * Set current server data
     * @param pData server data
     */
    public static void setData(ServData pData) {
        mData = pData;
    }

    /**
     * Send a message to all connected clients
     * @param pMessage the message to send
     */
    public static void sendAll(String pMessage) {
        Iterator<ClientHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            itr.next().send(pMessage);
        }
    }

    /**
     * Send a message to all connected clients that pass a prediacate test
     * @param pMessage the message to send
     * @param pTest the test to run on the character's ID
     */
    public static void sendAllWithTest(String pMessage, Predicate<Integer> pTest) {
        Iterator<ClientHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            ClientHandler player = itr.next();
            if (player.mSession.getUserProperties().containsKey("char")) {
                if (pTest.test((Integer) player.mSession.getUserProperties().get("char"))) {
                    player.send(pMessage);
                }
            }
        }
    }
    
    /**
     * Get a value from the config.ini data
     * @param pCat the category of the value
     * @param pDat the name of the value
     * @return the value
     */
    public static String getData(String pCat, String pDat) {
        return mData.Config.get(pCat).get(pDat);
    }

    /**
     * When a new connection is made
     * @param pSession a session representing the connection
     */
    @OnOpen
    public void onOpen(Session pSession) {
        ServData._CurData = mData; //set global data for this connection

        mSession = pSession; //record the session

        //prepare buffers
        mSession.setMaxTextMessageBufferSize(1048576);
        mSession.setMaxBinaryMessageBufferSize(1048576);

        //add this client to the set
        synchronized (mClients) {
            mClients.add(this);
        }

        //Log connection
        mData.Log.log(100, "Connection from: " + this.getIP());
    }

    /**
     * When a connection is closed
     * @param pSession a session representing the connection
     * @param pReason the reason the connection was closed
     */
    @OnClose
    public void onClose(Session pSession, CloseReason pReason) {
        ServData._CurData = mData; //set global data for this connection
        
        //if the player has loaded into the game
        if (mSession.getUserProperties().containsKey("loaded")) {
            //get the player's character
            int pID = (Integer) mSession.getUserProperties().get("char");
            Player player = mData.Players.getPlayer(pID);
            //if the character exists
            if (player != null) {
                try {
                    //remove the player from the list of players
                    mLock.lock();
                    player.remove();
                } finally { mLock.unlock(); }
                //send leave message to other players
                this.sendOther(player.getPlayers(), "leave:" + player.getID());
            }
        }

        //remove this client from the set
        synchronized (mClients) {
            mClients.remove(this);
        }

        //Log disconnection
        mData.Log.log(101, "Disconnected: " + this.getIP());
    }

    /**
     * When a connection recieves a WebSocket message
     * @param msg the message recieved
     */
    @OnMessage
    public void onMessage(String msg) {
        //make sure the server is running
        if (!DragonServer.isRunning()) {
            this.send(ERROR);
            return;
        }

        //try block in case anything goes wrong
        try {
            ServData._CurData = mData; //set global data for this connection
            mData.Log.debug("Recieved message: " + msg);

            //module args
            Map<String, Object> args;
            
            //split the message by type:data
            String[] message = msg.split(":", 2);

            //do module hook "pre_message"
            args = new HashMap<String, Object>();
            //player ID
            args.put("index", 0);
            if (mSession.getUserProperties().containsKey("char")) {
                args.put("index", (Integer) mSession.getUserProperties().get("char"));
            }
            //message type
            args.put("type", message[0]);
            //message data
            if (message.length > 1) {
                args.put("data", message[1]);
            }
            //run hook
            mData.Module.doHook("pre_message", args, new SocketUtils(mSession, getRemotes(), mData));
            
            if (message[0].equals("login")) {
                //client login
                JSONObject data = new JSONObject(message[1]); //get object from data
                Account acc = new Account(mData, data.getString("user")); //get account from username
                if (acc.getID() >= 0) { //if account exists
                    if (acc.checkPassword(data.getString("pass"))) { //check password
                        //login succeeded
                        mSession.getUserProperties().put("acc", acc.getID()); //save account ID
                        this.send("login:1"); //send success message
                        mData.Log.log(110, "Log-in: " + acc.getUsername()); //log login
                        return;
                    }
                }
                //login failed
                this.send("login:0"); //send fail message
                mData.Log.debug("Login failed"); //log failure
            } else if (message[0].equals("char")) {
                //character select
                if (mSession.getUserProperties().containsKey("acc")) { //if account is logged in
                    Account acc = new Account(mData, (Integer) mSession.getUserProperties().get("acc")); //get account
                    int charID = 0; //TODO: character select/create
                    //check which character was selected
                    switch (Integer.parseInt(message[1])) {
                        case 3: //char 3
                            charID = acc.getChar3ID(); //get character ID
                            if (charID == 0) {
                                //character doesn't exist, create it
                                charID = createChar(acc.getUsername());
                                acc.setChar3ID(charID);
                            }
                            break;
                        case 2: //char 2
                            charID = acc.getChar2ID(); //get character ID
                            if (charID == 0) {
                                //character doesn't exist, create it
                                charID = createChar(acc.getUsername());
                                acc.setChar2ID(charID);
                            }
                            break;
                        default: //char1
                            charID = acc.getChar1ID(); //get character ID
                            if (charID == 0) {
                                //character doesn't exist, create it
                                charID = createChar(acc.getUsername());
                                acc.setChar1ID(charID);
                            }
                    }
                    
                    mSession.getUserProperties().put("char", new Integer(charID));//save character ID

                    mData.Log.log(111, "Chose character: " + acc.getUsername()); //log character select
                    this.onMessage("load"); //TODO: Combine character select and load.
                }
            } else if (message[0].equals("register")) {
                //account registration
                JSONObject data = new JSONObject(message[1]); //get object from data
                if (new Account(mData, data.getString("user")).getID() >= 0) {
                    //username exists
                    this.send("register:0"); //send fail message
                    mData.Log.debug("Register failed: Username exists"); //log failure
                    return;
                }
                //insert account into database
                int id = Account.insert(mData, data.getString("user"), data.getString("pass"), data.getString("email"));
                if (id == -1) {
                    //problem inserting account
                    this.send("register:0"); //send fail message
                    mData.Log.debug("Register failed: Could not create account"); //log failure
                    return;
                }

                this.send("register:1"); //send success message
                mData.Log.log(120, "Registered: " + data.getString("user")); //log registration
            } else if (message[0].equals("load")) {
                //request to load the world
                mData.Log.log("starting load");
                //if account is logged in and character is selected
                if (mSession.getUserProperties().containsKey("acc") && mSession.getUserProperties().containsKey("char")) {
                    //get all character data from database
                    DRow pchar = mData.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));

                    //store data in local variables for ease of access
                    int pD = Integer.parseInt(getData("Game","draw_distance"));
                    String pName = (String) pchar.get("name");
                    int pID = (Integer) pchar.get("id");
                    int pX = (Integer) pchar.get("x");
                    int pY = (Integer) pchar.get("y");
                    short pFloor = ((Integer) pchar.get("floor")).shortValue();
                    int pSprite = (Integer) pchar.get("sprite");

                    //create a new player objeect
                    Player player = new Player(pID, pFloor, pName, pSprite, this);
                    mData.Players.putPlayer(pID, player); //add the player to the list
                    player.setFloor(pFloor); //set the player's floor
                    try {
                        //add player to world
                        mLock.lock(); //lock
                        player.warp(pX, pY); //warp player into world
                        mSession.getUserProperties().put("loaded", true); //record success
                    } finally { mLock.unlock(); }

                    //create a new message to send to the new player
                    JSONObject newmsg = new JSONObject();
                    //user information
                    JSONObject user = new JSONObject();
                    user.put("id", pID);
                    user.put("n", pName);
                    user.put("x", pX);
                    user.put("y", pY);
                    user.put("f", pFloor);
                    user.put("s", pSprite);
                    newmsg.put("user", user);
                    //other players
                    JSONArray chars = new JSONArray();
                    for (Player p : player.getPlayers()) {
                        JSONObject ochar = new JSONObject();
                        ochar.put("id", p.getID());
                        ochar.put("n", p.getName());
                        ochar.put("x", p.getX());
                        ochar.put("y", p.getY());
                        ochar.put("f", p.getFloor());
                        ochar.put("s", p.getSprite());
                        chars.put(ochar);
                    }
                    newmsg.put("players", chars);
                    //tiles and npcs
                    JSONArray tiles = new JSONArray();
                    JSONArray npcs = new JSONArray();
                    String sql = "SELECT * FROM tiles WHERE x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                    try (ResultSet rs = mData.DB.Query(sql)) {
                        while (rs.next()) {
                            Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                            tiles.put(tile.toString());
                            Npc npc = mData.Npcs.getNpc(tile.getX(), tile.getY(), tile.getFloor());
                            if (npc != null) {
                                npcs.put(npc.toString());
                            }
                        }
                    } catch (SQLException e) {
                        e.printStackTrace();
                    }
                    newmsg.put("tiles", tiles);
                    newmsg.put("npcs", npcs);
                    //server time
                    newmsg.put("time", mData.Time.getTime());
                    //do on_load module hook, and allow modules to modify the message
                    args = new HashMap<String, Object>();
                    args.put("index", pID);
                    args.put("msg", newmsg.toString());
                    mData.Module.doHook("on_load", args, new SocketUtils(mSession, getRemotes(), mData));
                    //send the message
                    this.send("load:" + args.get("msg"));

                    //create a new message to send the other players
                    newmsg = new JSONObject();
                    //user information
                    newmsg.put("id", pID);
                    newmsg.put("n", pName);
                    newmsg.put("x", pX);
                    newmsg.put("y", pY);
                    newmsg.put("f", pFloor);
                    newmsg.put("s", pSprite);
                    //do on_enter module hook, and allow modules to modify the message
                    args = new HashMap<String, Object>();
                    args.put("index", pID);
                    args.put("msg", newmsg.toString());
                    mData.Module.doHook("on_enter", args, new SocketUtils(mSession, getRemotes(), mData));
                    //send the message
                    this.sendOther(player.getPlayers(), "enter:" + args.get("msg"));

                    //save last action times
                    mSession.getUserProperties().put("lastMove", new Date());
                    mSession.getUserProperties().put("lastAct", new Date());
                }
            } else if (message[0].equals("loaded")) {
                //pConnection.data("loaded", true);
            } else if (message[0].equals("move")) {
                //request for player to move
                if (mSession.getUserProperties().containsKey("loaded")) {
                    short pDir = Short.parseShort(message[1]);
                    //check the timeout to prevent hacking
                    Date now = new Date();
                    Date last = (Date) mSession.getUserProperties().get("lastMove");

                    if ((last.getTime() + 100) < now.getTime()) {
                        mSession.getUserProperties().put("lastMove", now);
                        //compile character information
                        int pD = Integer.parseInt(getData("Game","draw_distance")); //draw distance
                        int pID = (Integer) mSession.getUserProperties().get("char"); //character ID
                        DRow pchar = mData.Data.get("characters").get(pID); //character data
                        Player player = mData.Players.getPlayer(pID); //Player object
                        String pName = player.getName(); //name
                        int pX = player.getX(); //x
                        int pY = player.getY(); //y
                        short pFloor = player.getFloor(); //flooy
                        int pSprite = player.getSprite(); //sprite

                        String sql = "";

                        HashBag<Player> enter = new HashBag();
                        //move the player
                        switch (pDir) {
                            case 37: //left
                                //if the player isn't on the edge of the universe
                                if (pX > 0) {
                                    //make sure that the tile is not blocked
                                    try {
                                        if (!checkAttr(pX - 1, pY, pFloor, player, pchar) || mData.Npcs.getNpc(pX - 1, pY, pFloor) != null) {
                                            return;
                                        }
                                    } catch (Exception e) { e.printStackTrace(); }
                                    pX--; //get new position
                                    try {
                                        //update the player's position in the database
                                        mLock.lock(); //lock
                                        pchar.put("x", new Integer(pX)); //save new x
                                        player.move(pX, pY); //move the player
                                        //get all nearby players
                                        for (Player p : player.getPlayers()) {
                                            if (player.getX() - pD == p.getX())
                                                enter.add(p); //remember them
                                        }
                                    } finally { mLock.unlock(); }
                                    //new tile select query
                                    sql = "SELECT * FROM tiles WHERE x=" + (pX - pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                                }
                                break;
                            case 38: //up
                                //if the player isn't on the edge of the universe
                                if (pY > 0) {
                                    //make sure that the tile is not blocked
                                    try {
                                        if (!checkAttr(pX, pY - 1, pFloor, player, pchar) || mData.Npcs.getNpc(pX, pY - 1, pFloor) != null) {
                                            return;
                                        }
                                    } catch (Exception e) { e.printStackTrace(); }
                                    pY--; //get new position
                                    try {
                                        //update the player's position in the database
                                        mLock.lock(); //lock
                                        pchar.put("y", new Integer(pY)); //save new y
                                        player.move(pX, pY); //move the player
                                        //get all nearby players
                                        for (Player p : player.getPlayers()) {
                                            if (player.getY() - pD == p.getY())
                                                enter.add(p);
                                        }
                                    } finally { mLock.unlock(); }
                                    //new tile select query
                                    sql = "SELECT * FROM tiles WHERE y=" + (pY - pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                                }
                                break;
                            case 39: //right
                                //if the player isn't on the edge of the universe
                                if (pX < 2000000000) {
                                    //make sure that the tile is not blocked
                                    try {
                                        if (!checkAttr(pX + 1, pY, pFloor, player, pchar) || mData.Npcs.getNpc(pX + 1, pY, pFloor) != null) {
                                            return;
                                        }
                                    } catch (Exception e) { e.printStackTrace(); }
                                    pX++; //get new position
                                    try {
                                        //update the player's position in the database
                                        mLock.lock(); //lock
                                        pchar.put("x", new Integer(pX)); //save new x
                                        player.move(pX, pY); //move the player
                                        //get all nearby players
                                        for (Player p : player.getPlayers()) {
                                            if (player.getX() + pD == p.getX())
                                                enter.add(p);
                                        }
                                    } finally { mLock.unlock(); }
                                    //new tile select query
                                    sql = "SELECT * FROM tiles WHERE x=" + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                                }
                                break;
                            case 40: //down
                                //if the player isn't on the edge of the universe
                                if (pY < 2000000000) {
                                    //make sure that the tile is not blocked
                                    try {
                                        if (!checkAttr(pX, pY + 1, pFloor, player, pchar) || mData.Npcs.getNpc(pX, pY + 1, pFloor) != null) {
                                            return;
                                        }
                                    } catch (Exception e) { e.printStackTrace(); }
                                    pY++; //get new position
                                    try {
                                        //update the player's position in the database
                                        mLock.lock(); //lock
                                        pchar.put("y", new Integer(pY)); //save new y
                                        player.move(pX, pY); //move the player
                                        //get all nearby players
                                        for (Player p : player.getPlayers()) {
                                            if (player.getY() + pD == p.getY())
                                                enter.add(p);
                                        }
                                    } finally { mLock.unlock(); }
                                    //new tile select query
                                    sql = "SELECT * FROM tiles WHERE y=" + (pY + pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                                }
                                break;
                        }
                        
                        //snap the user to his current position, in case of lag
                        JSONObject newmsg = new JSONObject();
                        newmsg.put("x", player.getX());
                        newmsg.put("y", player.getY());
                        newmsg.put("f", pFloor);
                        //also send some stats for the client to render
                        JSONObject stats = new JSONObject();
                        stats.put("p", player.getStats());
                        stats.put("t", mData.Tree.getStats());
                        newmsg.put("stats", stats);
                        //send the snap message
                        this.send("snap:" + newmsg.toString());

                        //send the movement to all other players
                        newmsg = new JSONObject();
                        newmsg.put("id", pID); //id of the moving player
                        newmsg.put("dir", new Integer(pDir)); //direction the player is moving in
                        newmsg.put("n", pName); //name of the moving player
                        newmsg.put("x", player.getX()); //x of the moving player
                        newmsg.put("y", player.getY()); //y of the moving player
                        newmsg.put("f", pFloor); //floor of the moving player
                        newmsg.put("s", pSprite); //sprite of the moving player
                        //send the move message
                        this.sendOther(player.getPlayers(), "move:" + newmsg.toString());

                        //send any tiles and npcs that must be loaded in
                        newmsg = new JSONObject();
                        JSONArray tiles = new JSONArray();
                        JSONArray npcs = new JSONArray();
                        //tiles and npcs
                        try (ResultSet rs = mData.DB.Query(sql)) {
                            while (rs.next()) {
                                Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                                tiles.put(tile.toString());
                                Npc npc = mData.Npcs.getNpc(tile.getX(), tile.getY(), tile.getFloor());
                                if (npc != null) {
                                    npcs.put(npc.toString());
                                }
                            }
                        } catch (SQLException e) {
                            e.printStackTrace();
                        }
                        //other players
                        JSONArray chars = new JSONArray();
                        for (Player p : enter) {
                            JSONObject ochar = new JSONObject();
                            ochar.put("id", p.getID());
                            ochar.put("n", p.getName());
                            ochar.put("x", p.getX());
                            ochar.put("y", p.getY());
                            ochar.put("f", p.getFloor());
                            ochar.put("s", p.getSprite());
                            chars.put(ochar);
                        }
                        newmsg.put("tiles", tiles);
                        newmsg.put("npcs", npcs);
                        newmsg.put("players", chars);
                        //do on_more module hook, and allow modules to modify the message
                        args = new HashMap<String, Object>();
                        args.put("index", pID);
                        args.put("msg", newmsg.toString());
                        mData.Module.doHook("on_more", args, new SocketUtils(mSession, getRemotes(), mData));
                        //send the message
                        this.send("more:" + args.get("msg"));
                    }
                }
            } else if (message[0].equals("face")) {
                //request for player to change the direction they're facing
                if (mSession.getUserProperties().containsKey("loaded")) {
                    short pDir = Short.parseShort(message[1]); //get new direction
                    //DRow pchar = mData.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
                    //get player
                    int pID = (Integer) mSession.getUserProperties().get("char");
                    Player player = mData.Players.getPlayer(pID);
                    //send new facing direction to other players
                    JSONObject newmsg = new JSONObject();
                    newmsg.put("id", pID);
                    newmsg.put("dir", new Integer(pDir));
                    this.sendOther(player.getPlayers(), "face:" + newmsg.toString());
                }
            } else if (message[0].equals("act")) {
                //request for player to perform action on the tile they're facing at
                if (mSession.getUserProperties().containsKey("loaded")) {
                    short pDir = Short.parseShort(message[1]); //get direction
                    //put a cooldown on acting so that it cannot be spammed.
                    Date last = (Date) mSession.getUserProperties().get("lastAct");
                    Date now = new Date();
                    //make sure that the last action wasn't too close to now
                    if ((last.getTime() + 100) < now.getTime()) {
                        //update now as last action
                        mSession.getUserProperties().put("lastAct", now);
                        //compile character information
                        DRow pchar = mData.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
                        int pID = (Integer) pchar.get("id");
                        int pX = (Integer) pchar.get("x");
                        int pY = (Integer) pchar.get("y");
                        short pFloor = ((Integer) pchar.get("floor")).shortValue();
                        //perform action
                        Npc npc = null;
                        Tile tile = null;
                        switch (pDir) {
                            case 37: //left
                                //get NPC on faced tile
                                npc = mData.Npcs.getNpc(pX - 1, pY, pFloor);
                                if (npc != null) {
                                    //if there is an npc on the faced tile, act on them
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("npc", npc);
                                    mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                } else {
                                    //else, act on the location of the tile
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("point", new Point(pX - 1, pY, pFloor));
                                    mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                    //also, if the tile exists
                                    tile = mData.Utils.getTile(pX - 1, pY, pFloor);
                                    if (tile != null) {
                                        //act on the tile itself
                                        args = new HashMap();
                                        args.put("index", pID);
                                        args.put("tile", tile);
                                        mData.Module.doHook("tile_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                    }
                                }
                                break;
                            case 38: //up
                                //get NPC on faced tile
                                npc = mData.Npcs.getNpc(pX, pY - 1, pFloor);
                                if (npc != null) {
                                    //if there is an npc on the faced tile, act on them
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("npc", npc);
                                    mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                } else {
                                    //else, act on the location of the tile
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("point", new Point(pX, pY - 1, pFloor));
                                    mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                    //also, if the tile exists
                                    tile = mData.Utils.getTile(pX, pY - 1, pFloor);
                                    if (tile != null) {
                                        //act on the tile itself
                                        args = new HashMap();
                                        args.put("index", pID);
                                        args.put("tile", tile);
                                        mData.Module.doHook("tile_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                    }
                                }
                                break;
                            case 39: //right
                                //get NPC on faced tile
                                npc = mData.Npcs.getNpc(pX + 1, pY, pFloor);
                                if (npc != null) {
                                    //if there is an npc on the faced tile, act on them
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("npc", npc);
                                    mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                } else {
                                    //else, act on the location of the tile
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("point", new Point(pX + 1, pY, pFloor));
                                    mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                    //also, if the tile exists
                                    tile = mData.Utils.getTile(pX + 1, pY, pFloor);
                                    if (tile != null) {
                                        //act on the tile itself
                                        args = new HashMap();
                                        args.put("index", pID);
                                        args.put("tile", tile);
                                        mData.Module.doHook("tile_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                    }
                                }
                                break;
                            case 40: //down
                                //get NPC on faced tile
                                npc = mData.Npcs.getNpc(pX, pY + 1, pFloor);
                                if (npc != null) {
                                    //if there is an npc on the faced tile, act on them
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("npc", npc);
                                    mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                } else {
                                    //else, act on the location of the tile
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("point", new Point(pX, pY + 1, pFloor));
                                    mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                    //also, if the tile exists
                                    tile = mData.Utils.getTile(pX, pY + 1, pFloor);
                                    if (tile != null) {
                                        //act on the tile itself
                                        args = new HashMap();
                                        args.put("index", pID);
                                        args.put("tile", tile);
                                        mData.Module.doHook("tile_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                    }
                                }
                                break;
                        }
                    }
                }
            }

            //do module hook "on_message"
            args = new HashMap<String, Object>();
            args.put("head", message[0]); //pass message head
            //pass character id, if it exists
            args.put("index", 0);
            if (mSession.getUserProperties().containsKey("char")) {
                args.put("index", (Integer) mSession.getUserProperties().get("char"));
            }
            //pass message body, if it exists
            args.put("body", "");
            if (message.length > 1) {
                args.put("body", message[1]);
            }
            //do the module hook
            mData.Module.doHook("message", args, new SocketUtils(mSession, getRemotes(), mData));
        } catch (Exception e) {
            System.out.println(e.toString());
            e.printStackTrace();
        }
    }

    /**
     * When an error occurs with the connection
     * @param pTrowable 
     */
    @OnError
    public void onError(Throwable pTrowable) {
        //TODO:onError
    }
    
    /**
     * Get a list of remotes (used to send messages) for all connected clients
     * @return list of all remotes
     */
    public static Set<Session> getRemotes() {
        Set<Session> remotes = new LinkedHashSet();
        for (ClientHandler con : mClients) {
            remotes.add(con.mSession);
        }
        return remotes;
    }

    /**
     * Create a new character for the currently connected account
     * @param name the new character's name
     * @return the ID of the new character
     */
    private int createChar(String name) {
        //insert character into database
        mData.Log.debug("inserting char");
        DRow pchar = mData.Data.get("characters").insert();
        //record the character ID
        mData.Log.debug("getting char id");
        int charID = (Integer) pchar.get("id");
        mData.Log.debug("char id: " + charID);

        //update character data in the database
        Map<String, Serializable> charData = new HashMap();
        charData.put("name", name);
        charData.put("key", name);
        charData.put("x", 1000000000);
        charData.put("y", 1000000000);
        charData.put("floor", 3);
        charData.put("sprite", 1);
        //use putAll for single update call
        pchar.putAll(charData);

        //do module hook "create_char"
        Map<String, Object> args = new HashMap<String, Object>();
        args.put("index", charID);
        args.put("name", name);
        mData.Module.doHook("create_char", args, new SocketUtils(mSession, getRemotes(), mData));

        return charID;
    }

    /**
     * Check if a character is within range of another character
     * @param pchar the first character
     * @param ochar the second character
     * @param pDist the range (max distance)
     * @return true if the first character is within range of the second character, false otherwise
     */
    public boolean charInRange(DRow pchar, DRow ochar, int pDist) {
        //get first character locaion
        int pX = (Integer) pchar.get("x");
        int pY = (Integer) pchar.get("y");
        //get second character location
        int oX = (Integer) ochar.get("x");
        int oY = (Integer) ochar.get("y");
        //compare locations
        return (Math.abs(pX - oX) <= pDist && Math.abs(pY - oY) <= pDist);
    }

    /**
     * Handle any attributes on a given tile for a given player character
     * @param pX the x position of the tile
     * @param pY the y position of the tile
     * @param pFloor the floor of the tile
     * @param pPlayer the player object
     * @param pChar the character data
     * @return true if the player can move to the tile, false otherwise
     * @throws IOException 
     */
    private boolean checkAttr(int pX, int pY, short pFloor, Player pPlayer, DRow pChar) throws IOException {
        Tile tile = mData.Utils.getTile(pX, pY, pFloor); //get tile
        if (tile != null) {
            //tiles can have 2 attributes
            int attr1 = tile.getAttr1(); //get attribute 1
            int attr2 = tile.getAttr2(); //get attribute 2
            if (attr1 == 1 || attr2 == 1) {
                //tile has "blocked" attribute
                return false; //don't continue to move
            } else if (attr1 == 2 || attr2 == 2) {
                //tile has "warped" attribute
                String[] aData;
                //get attribute data
                if (attr1 == 2) {
                    aData = tile.getA1data().split("\\.");
                } else {
                    aData = tile.getA2data().split("\\.");
                }
                //get new position
                int nX = Integer.parseInt(aData[0]);
                int nY = Integer.parseInt(aData[1]);
                short nF = Short.parseShort(aData[2]);
                //warp the player to the new position
                mData.Utils.warpPlayer((Integer) pPlayer.getID(), nX, nY, nF);

                return false; //don't continue to move
            } else if (attr1 == 3 || attr2 == 3) {
                //tile has "floor" attribute
                String aData;
                //get attribute data
                if (attr1 == 3) {
                    aData = tile.getA1data();
                } else {
                    aData = tile.getA2data();
                }
                //get new floor
                int nF = Integer.parseInt(aData);
                
                //update the character's location in the database
                Map<String, Serializable> charData = new HashMap();
                charData.put("x", pX);
                charData.put("y", pY);
                charData.put("floor", nF);
                pChar.putAll(charData);
                
                //get player info
                int pID = pPlayer.getID();
                String pName = pPlayer.getName();
                
                //for each connected client
                for (ClientHandler con : mClients) {
                    //send a floor change message
                    JSONObject newmsg = new JSONObject();
                    
                    if (!con.equals(this)) {
                        //record id and name for other plaeyers
                        newmsg.put("id", pID);
                        newmsg.put("n", pName);
                    }
                    newmsg.put("x", pX);
                    newmsg.put("y", pY);
                    newmsg.put("f", nF);
                    
                    //con.send("floor:" + newmsg.toString());
                    con.send("warp:" + newmsg.toString());
                }

                return false; //don't continue
            }
        }
        return true;
    }

    /**
     * Get the IP address of the currently connected client
     * @return the client's IP address
     */
    private String getIP() {
        try {
            return InetAddress.getByName(mSession.getRequestURI().getHost()).getHostAddress();
        } catch (UnknownHostException e) {
            return "?";
        }
    }
    
    /**
     * Send a message to this client
     * @param pMessage the message to send
     */
    public void send(String pMessage) {
        this.mSession.getAsyncRemote().sendText(pMessage);
    }
    
    /**
     * Send a message to all other players in a set
     * @param pPlayers the set of players to send the message to
     * @param pMessage the message to send
     */
    public void sendOther(Set<Player> pPlayers, String pMessage) {
        //get current character id
        int pID = (Integer) mSession.getUserProperties().get("char");
        //for every player
        for (Player p : pPlayers) {
            //if the player isn't the current player
            if (p.getID() != pID)
                //send the message
                p.getClient().send(pMessage);
        }
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj)
                return true;
        if (obj == null)
                return false;
        if (getClass() != obj.getClass())
                return false;
        ClientHandler other = (ClientHandler) obj;
        if (mSession == null) {
                if (other.mSession != null)
                        return false;
        } else if (!mSession.getId().equals(other.mSession.getId()))
                return false;
        return true;
    }
}
