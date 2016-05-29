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

@ServerEndpoint("/client")
public class ClientHandler {
    public static String ERROR = "Server Offline";

    protected static Set<ClientHandler> mClients;
    protected static ServData mData;
    protected static Lock mLock;

    protected Session mSession;

    static {
        mClients = new CopyOnWriteArraySet();
        mLock = new ReentrantLock();
    }

    public static void setData(ServData pData) {
        mData = pData;
    }

    public static void sendAll(String pMessage) {
        Iterator<ClientHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            itr.next().send(pMessage);
        }
    }

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
    
    public static String getData(String pCat, String pDat) {
        return mData.Config.get(pCat).get(pDat);
    }

    @OnOpen
    public void onOpen(Session pSession) {
        ServData._CurData = mData;

        mSession = pSession;

        mSession.setMaxTextMessageBufferSize(1048576);
        mSession.setMaxBinaryMessageBufferSize(1048576);

        synchronized (mClients) {
            mClients.add(this);
        }

        mData.Log.log(100, "Connection from: " + this.getIP());
    }

    @OnClose
    public void onClose(Session pSession, CloseReason pReason) {
        ServData._CurData = mData;
        
        if (mSession.getUserProperties().containsKey("loaded")) {
            int pID = (Integer) mSession.getUserProperties().get("char");
            Player player = mData.Players.getPlayer(pID);
            if (player != null) {
                try {
                    mLock.lock();
                    player.remove();
                } finally { mLock.unlock(); }
                for (Player p : player.getPlayers()) {
                    System.out.println("Send leave to :" + p.getID());
                }
                this.sendOther(player.getPlayers(), "leave:" + player.getID());
            }
        }

        synchronized (mClients) {
            mClients.remove(this);
        }

        mData.Log.log(101, "Disconnected: " + this.getIP());
    }

    @OnMessage
    public void onMessage(String msg) {
        if (!DragonServer.isRunning()) {
            this.send(ERROR);
            return;
        }

        try {
        ServData._CurData = mData;
        mData.Log.debug("Recieved message: " + msg);

        String[] message = msg.split(":", 2);

        //module args
        Map<String, Object> args;

        //do module hook "pre_message"
        args = new HashMap<String, Object>();
        args.put("index", 0);
        if (mSession.getUserProperties().containsKey("char")) {
            args.put("index", (Integer) mSession.getUserProperties().get("char"));
        }
        args.put("type", message[0]);
        if (message.length > 1) {
            args.put("data", message[1]);
        }
        mData.Module.doHook("pre_message", args, new SocketUtils(mSession, getRemotes(), mData));

        if (message[0].equals("login")) {
            JSONObject data = new JSONObject(message[1]);
            Account acc = new Account(mData, data.getString("user"));
            if (acc.getID() >= 0) { //if account exists
                if (acc.checkPassword(data.getString("pass"))) {
                    mSession.getUserProperties().put("acc", acc.getID());
                    this.send("login:1");

                    mData.Log.log(110, "Log-in: " + acc.getUsername());
                    return;
                }
            }
            this.send("login:0");
            mData.Log.debug("Login failed");
        } else if (message[0].equals("char")) {
            if (mSession.getUserProperties().containsKey("acc")) {
                Account acc = new Account(mData, (Integer) mSession.getUserProperties().get("acc"));
                int charID = 0;
                switch (Integer.parseInt(message[1])) {
                    case 3:
                        charID = acc.getChar3ID();
                        if (charID == 0) {
                            charID = createChar(acc.getUsername());
                            acc.setChar3ID(charID);
                        }
                        break;
                    case 2:
                        charID = acc.getChar2ID();
                        if (charID == 0) {
                            charID = createChar(acc.getUsername());
                            acc.setChar2ID(charID);
                        }
                        break;
                    default:
                        charID = acc.getChar1ID();
                        if (charID == 0) {
                            charID = createChar(acc.getUsername());
                            acc.setChar1ID(charID);
                        }
                }
                mSession.getUserProperties().put("char", new Integer(charID));

                mData.Log.log(111, "Chose character: " + acc.getUsername());
                this.onMessage("load"); //TODO: Combine character select and load.
            }
        } else if (message[0].equals("register")) {
            JSONObject data = new JSONObject(message[1]);
            if (new Account(mData, data.getString("user")).getID() >= 0) {
                this.send("register:0");
                mData.Log.debug("Register failed: Username exists");
                return;
            }
            int id = Account.insert(mData, data.getString("user"), data.getString("pass"), data.getString("email"));

            if (id == -1) {
                this.send("register:0");
                mData.Log.debug("Register failed: Could not create account");
                return;
            }

            this.send("register:1");
            mData.Log.log(120, "Registered: " + data.getString("user"));
        } else if (message[0].equals("load")) {
            mData.Log.log("starting load");
            if (mSession.getUserProperties().containsKey("acc") && mSession.getUserProperties().containsKey("char")) {
                DRow pchar = mData.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
                
                int pD = Integer.parseInt(getData("Game","draw_distance"));
                String pName = (String) pchar.get("name");
                int pID = (Integer) pchar.get("id");
                int pX = (Integer) pchar.get("x");
                int pY = (Integer) pchar.get("y");
                short pFloor = ((Integer) pchar.get("floor")).shortValue();
                int pSprite = (Integer) pchar.get("sprite");
                
                Player player = new Player(pID, pFloor, pName, pSprite, this);
                mData.Players.putPlayer(pID, player);
                player.setFloor(pFloor);
                //add player to world
                try {
                    mLock.lock();
                    //add player to world
                    player.warp(pX, pY);
                    mSession.getUserProperties().put("loaded", true);
                } finally { mLock.unlock(); }
                
                JSONObject newmsg = new JSONObject();
                
                //user
                JSONObject user = new JSONObject();
                user.put("id", pID);
                user.put("n", pName);
                user.put("x", pX);
                user.put("y", pY);
                user.put("f", pFloor);
                user.put("s", pSprite);
                newmsg.put("user", user);
                
                //players
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

                //tiles
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
                
                newmsg.put("time", mData.Time.getTime());
                
                args = new HashMap<String, Object>();
                args.put("index", pID);
                args.put("msg", newmsg.toString());
                mData.Module.doHook("on_load", args, new SocketUtils(mSession, getRemotes(), mData));

                this.send("load:" + args.get("msg"));

                newmsg = new JSONObject();
                newmsg.put("id", pID);
                newmsg.put("n", pName);
                newmsg.put("x", pX);
                newmsg.put("y", pY);
                newmsg.put("f", pFloor);
                newmsg.put("s", pSprite);
                
                args = new HashMap<String, Object>();
                args.put("index", pID);
                args.put("msg", newmsg.toString());
                mData.Module.doHook("on_enter", args, new SocketUtils(mSession, getRemotes(), mData));
                
                this.sendOther(player.getPlayers(), "enter:" + args.get("msg"));
                
                mSession.getUserProperties().put("lastMove", new Date());
                mSession.getUserProperties().put("lastAct", new Date());
            }
        } else if (message[0].equals("loaded")) {
            //pConnection.data("loaded", true);
        } else if (message[0].equals("move")) {
            if (mSession.getUserProperties().containsKey("loaded")) {
                short pDir = Short.parseShort(message[1]);
                //check the timeout to prevent hacking
                Date now = new Date();
                Date last = (Date) mSession.getUserProperties().get("lastMove");

                if ((last.getTime() + 100) < now.getTime()) {
                    mSession.getUserProperties().put("lastMove", now);
                    //compile character information
                    int pD = Integer.parseInt(getData("Game","draw_distance"));
                    int pID = (Integer) mSession.getUserProperties().get("char");
                    DRow pchar = mData.Data.get("characters").get(pID);
                    Player player = mData.Players.getPlayer(pID);
                    String pName = player.getName();
                    int pX = player.getX();
                    int pY = player.getY();
                    short pFloor = player.getFloor();
                    int pSprite = player.getSprite();
                    
                    String sql = "";
                    
                    HashBag<Player> enter = new HashBag();
                    //move the player
                    switch (pDir) {
                        case 37: //left
                            if (pX > 0) {
                                try {
                                    if (!checkAttr(pX - 1, pY, pFloor, player, pchar) || mData.Npcs.getNpc(pX - 1, pY, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pX--;
                                try {
                                    mLock.lock();
                                    pchar.put("x", new Integer(pX));
                                    player.move(pX, pY);
                                    for (Player p : player.getPlayers()) {
                                        if (player.getX() - pD == p.getX())
                                            enter.add(p);
                                    }
                                } finally { mLock.unlock(); }
                                sql = "SELECT * FROM tiles WHERE x=" + (pX - pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                            }
                            break;
                        case 38: //up
                            if (pY > 0) {
                                try {
                                    if (!checkAttr(pX, pY - 1, pFloor, player, pchar) || mData.Npcs.getNpc(pX, pY - 1, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pY--;
                                try {
                                    mLock.lock();
                                    pchar.put("y", new Integer(pY));
                                    player.move(pX, pY);
                                    for (Player p : player.getPlayers()) {
                                        if (player.getY() - pD == p.getY())
                                            enter.add(p);
                                    }
                                } finally { mLock.unlock(); }
                                sql = "SELECT * FROM tiles WHERE y=" + (pY - pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                            }
                            break;
                        case 39: //right
                            if (pX < 2000000000) {
                                try {
                                    if (!checkAttr(pX + 1, pY, pFloor, player, pchar) || mData.Npcs.getNpc(pX + 1, pY, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pX++;
                                try {
                                    mLock.lock();
                                    pchar.put("x", new Integer(pX));
                                    player.move(pX, pY);
                                    for (Player p : player.getPlayers()) {
                                        if (player.getX() + pD == p.getX())
                                            enter.add(p);
                                    }
                                } finally { mLock.unlock(); }
                                sql = "SELECT * FROM tiles WHERE x=" + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                            }
                            break;
                        case 40: //down
                            if (pY < 2000000000) {
                                try {
                                    if (!checkAttr(pX, pY + 1, pFloor, player, pchar) || mData.Npcs.getNpc(pX, pY + 1, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pY++;
                                try {
                                    mLock.lock();
                                    pchar.put("y", new Integer(pY));
                                    player.move(pX, pY);
                                    for (Player p : player.getPlayers()) {
                                        if (player.getY() + pD == p.getY())
                                            enter.add(p);
                                    }
                                } finally { mLock.unlock(); }
                                sql = "SELECT * FROM tiles WHERE y=" + (pY + pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                            }
                            break;
                    }
                    
                    //snap the user to his current position, in case of lag
                    JSONObject newmsg = new JSONObject();
                    newmsg.put("x", player.getX());
                    newmsg.put("y", player.getY());
                    newmsg.put("f", pFloor);
                    
                    JSONObject stats = new JSONObject();
                    stats.put("p", player.getStats());
                    stats.put("t", mData.Tree.getStats());
                    newmsg.put("stats", stats);
                    //and send any tiles and npcs that must be loaded in
                    this.send("snap:" + newmsg.toString());
                    
                    //send the movement to all other players
                    newmsg = new JSONObject();
                    newmsg.put("id", pID);
                    newmsg.put("dir", new Integer(pDir));
                    newmsg.put("n", pName);
                    newmsg.put("x", player.getX());
                    newmsg.put("y", player.getY());
                    newmsg.put("f", pFloor);
                    newmsg.put("s", pSprite);
                    this.sendOther(player.getPlayers(), "move:" + newmsg.toString());
                    
                    //send any tiles and npcs that must be loaded in
                    newmsg = new JSONObject();
                    JSONArray tiles = new JSONArray();
                    JSONArray npcs = new JSONArray();
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
                    
                    args = new HashMap<String, Object>();
                    args.put("index", pID);
                    args.put("msg", newmsg.toString());
                    mData.Module.doHook("on_more", args, new SocketUtils(mSession, getRemotes(), mData));
                    
                    this.send("more:" + args.get("msg"));
                }
            }
        } else if (message[0].equals("face")) {
            if (mSession.getUserProperties().containsKey("loaded")) {
                short pDir = Short.parseShort(message[1]);
                //DRow pchar = mData.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
                int pID = (Integer) mSession.getUserProperties().get("char");
                Player player = mData.Players.getPlayer(pID);

                JSONObject newmsg = new JSONObject();
                newmsg.put("id", pID);
                newmsg.put("dir", new Integer(pDir));
                this.sendOther(player.getPlayers(), "face:" + newmsg.toString());
            }
        } else if (message[0].equals("act")) {
            if (mSession.getUserProperties().containsKey("loaded")) {
                short pDir = Short.parseShort(message[1]);
                //put a cooldown on acting so that it cannot be spammed.
                Date last = (Date) mSession.getUserProperties().get("lastAct");
                Date now = new Date();
                
                if ((last.getTime() + 100) < now.getTime()) {
                    mSession.getUserProperties().put("lastAct", now);
                    //compile character information
                    DRow pchar = mData.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
                    int pID = (Integer) pchar.get("id");
                    int pX = (Integer) pchar.get("x");
                    int pY = (Integer) pchar.get("y");
                    short pFloor = ((Integer) pchar.get("floor")).shortValue();
                    
                    Npc npc = null;
                    Tile tile = null;
                    switch (pDir) {
                        case 37: //left
                            npc = mData.Npcs.getNpc(pX - 1, pY, pFloor);
                            if (npc != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("npc", npc);
                                mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                            } else {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("point", new Point(pX - 1, pY, pFloor));
                                mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                tile = mData.Utils.getTile(pX - 1, pY, pFloor);
                                if (tile != null) {
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("tile", tile);
                                    mData.Module.doHook("tile_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                }
                            }
                            break;
                        case 38: //up
                            npc = mData.Npcs.getNpc(pX, pY - 1, pFloor);
                            if (npc != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("npc", npc);
                                mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                            } else {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("point", new Point(pX, pY - 1, pFloor));
                                mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                tile = mData.Utils.getTile(pX, pY - 1, pFloor);
                                if (tile != null) {
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("tile", tile);
                                    mData.Module.doHook("tile_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                }
                            }
                            break;
                        case 39: //right
                            npc = mData.Npcs.getNpc(pX + 1, pY, pFloor);
                            if (npc != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("npc", npc);
                                mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                            } else {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("point", new Point(pX + 1, pY, pFloor));
                                mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                tile = mData.Utils.getTile(pX + 1, pY, pFloor);
                                if (tile != null) {
                                    args = new HashMap();
                                    args.put("index", pID);
                                    args.put("tile", tile);
                                    mData.Module.doHook("tile_act", args, new SocketUtils(mSession, getRemotes(), mData));
                                }
                            }
                            break;
                        case 40: //down
                            npc = mData.Npcs.getNpc(pX, pY + 1, pFloor);
                            if (npc != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("npc", npc);
                                mData.Module.doHook("npc_act", args, new SocketUtils(mSession, getRemotes(), mData));
                            } else {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("point", new Point(pX, pY + 1, pFloor));
                                mData.Module.doHook("point_act", args, new SocketUtils(mSession, getRemotes(), mData));

                                tile = mData.Utils.getTile(pX, pY + 1, pFloor);
                                if (tile != null) {
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
        args.put("head", message[0]);
        args.put("index", 0);
        if (mSession.getUserProperties().containsKey("char")) {
            args.put("index", (Integer) mSession.getUserProperties().get("char"));
        }
        args.put("body", "");
        if (message.length > 1) {
            args.put("body", message[1]);
        }
        mData.Module.doHook("message", args, new SocketUtils(mSession, getRemotes(), mData));
        } catch (Exception e) {
            System.out.println(e.toString());
            e.printStackTrace();
        }
    }

    @OnError
    public void onError(Throwable pTrowable) {
        //TODO:onError
    }
    
    public static Set<Session> getRemotes() {
        Set<Session> remotes = new LinkedHashSet();
        for (ClientHandler con : mClients) {
            remotes.add(con.mSession);
        }
        return remotes;
    }

    private int createChar(String name) {
        mData.Log.debug("inserting char");
        DRow pchar = mData.Data.get("characters").insert();
        mData.Log.debug("getting char id");
        int charID = (Integer) pchar.get("id");
        mData.Log.debug("char id: " + charID);

        Map<String, Serializable> charData = new HashMap();
        charData.put("name", name);
        charData.put("key", name);
        charData.put("x", 1000000000);
        charData.put("y", 1000000000);
        charData.put("floor", 3);
        charData.put("sprite", 1);
        pchar.putAll(charData);

        //do module hook "create_char"
        Map<String, Object> args = new HashMap<String, Object>();
        args.put("index", charID);
        args.put("name", name);
        mData.Module.doHook("create_char", args, new SocketUtils(mSession, getRemotes(), mData));

        return charID;
    }

    public boolean charInRange(DRow pchar, DRow ochar, int pDist) {
        int pX = (Integer) pchar.get("x");
        int pY = (Integer) pchar.get("y");
        int oX = (Integer) ochar.get("x");
        int oY = (Integer) ochar.get("y");
        return (Math.abs(pX - oX) <= pDist && Math.abs(pY - oY) <= pDist);
    }

    private boolean checkAttr(int pX, int pY, short pFloor, Player pPlayer, DRow pChar) throws IOException {
        Tile tile = mData.Utils.getTile(pX, pY, pFloor);
        if (tile != null) {
            int attr1 = tile.getAttr1();
            int attr2 = tile.getAttr2();
            if (attr1 == 1 || attr2 == 1) {
                //blocked
                return false; //don't continue to move
            } else if (attr1 == 2 || attr2 == 2) {
                //warp
                String[] aData;
                if (attr1 == 2) {
                    aData = tile.getA1data().split("\\.");
                } else {
                    aData = tile.getA2data().split("\\.");
                }
                int nX = Integer.parseInt(aData[0]);
                int nY = Integer.parseInt(aData[1]);
                short nF = Short.parseShort(aData[2]);

                mData.Utils.warpPlayer((Integer) pPlayer.getID(), nX, nY, nF);

                return false; //don't continue
            } else if (attr1 == 3 || attr2 == 3) {
                //floor
                String aData;
                if (attr1 == 3) {
                    aData = tile.getA1data();
                } else {
                    aData = tile.getA2data();
                }
                int nF = Integer.parseInt(aData);

                Map<String, Serializable> charData = new HashMap();
                charData.put("x", pX);
                charData.put("y", pY);
                charData.put("floor", nF);
                pChar.putAll(charData);
                
                int pID = pPlayer.getID();
                String pName = pPlayer.getName();

                for (ClientHandler con : mClients) {
                    JSONObject newmsg = new JSONObject();

                    if (!con.equals(this)) {
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

    private String getIP() {
        try {
            return InetAddress.getByName(mSession.getRequestURI().getHost()).getHostAddress();
        } catch (UnknownHostException e) {
            return "?";
        }
    }
    
    public void send(String pMessage) {
        this.mSession.getAsyncRemote().sendText(pMessage);
    }
    
    public void sendOther(Set<Player> pPlayers, String pMessage) {
        int pID = (Integer) mSession.getUserProperties().get("char");
        for (Player p : pPlayers) {
            if (p.getID() != pID)
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
