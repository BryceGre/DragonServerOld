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
import java.util.function.Predicate;

import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import com.dragonmmomaker.datamap.DRow;
import com.dragonmmomaker.server.DragonServer;
import com.dragonmmomaker.server.ServData;
import com.dragonmmomaker.server.data.Account;
import com.dragonmmomaker.server.data.Tile;
import com.dragonmmomaker.server.npc.Npc;
import com.dragonmmomaker.server.util.GameUtils;
import com.dragonmmomaker.server.util.SocketUtils;
import com.eclipsesource.json.JsonArray;
import com.eclipsesource.json.JsonObject;

@ServerEndpoint("/client")
public class ClientHandler {
    public static String ERROR = "Server Offline";

    protected static Set<ClientHandler> mClients;
    protected static ServData mServData;

    protected Session mSession;

    static {
        mClients = new CopyOnWriteArraySet();
    }

    public static void setData(ServData pData) {
        mServData = pData;
    }

    public static void sendAll(String pMessage) {
        Iterator<ClientHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            itr.next().mSession.getAsyncRemote().sendText(pMessage);
        }
    }

    public static void sendAllWithTest(String pMessage, Predicate<Integer> pTest) {
        Iterator<ClientHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            ClientHandler player = itr.next();
            if (player.mSession.getUserProperties().containsKey("char")) {
                if (pTest.test((Integer) player.mSession.getUserProperties().get("char"))) {
                    player.mSession.getAsyncRemote().sendText(pMessage);
                }
            }
        }
    }

    @OnOpen
    public void onOpen(Session pSession) {
        ServData._CurData = mServData;

        mSession = pSession;

        mSession.setMaxTextMessageBufferSize(1048576);
        mSession.setMaxBinaryMessageBufferSize(1048576);

        synchronized (mClients) {
            mClients.add(this);
        }

        mServData.Log.log(100, "Connection from: " + this.getIP());
    }

    @OnClose
    public void onClose(Session pSession, CloseReason pReason) {
        ServData._CurData = mServData;
        synchronized (mClients) {
            if (mSession.getUserProperties().containsKey("loaded")) {
                for (ClientHandler con : mClients) {
                    if (!con.equals(this) && con.mSession.getUserProperties().containsKey("loaded")) {
                        con.mSession.getAsyncRemote().sendText("leave:" + mSession.getUserProperties().get("char"));
                    }
                }
            }
        }

        synchronized (mClients) {
            mClients.remove(this);
        }

        mServData.Log.log(101, "Disconnected: " + this.getIP());
    }

    @OnMessage
    public void onMessage(String msg) {
        if (!DragonServer.isRunning()) {
            mSession.getAsyncRemote().sendText(ERROR);
            return;
        }

        ServData._CurData = mServData;
        mServData.Log.debug("Recieved message: " + msg);

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
        mServData.Game.Utils.socket = new SocketUtils(mSession, this.getRemotes());
        mServData.Module.doHook("pre_message", args);

        if (message[0].equals("login")) {
            JsonObject data = JsonObject.readFrom(message[1]);
            Account acc = new Account(mServData, data.get("user").asString());
            if (acc.getID() >= 0) { //if account exists
                if (acc.checkPassword(data.get("pass").asString())) {
                    mSession.getUserProperties().put("player", acc.getID());
                    mSession.getAsyncRemote().sendText("login:1");

                    mServData.Log.log(110, "Log-in: " + acc.getUsername());
                    return;
                }
            }
            mSession.getAsyncRemote().sendText("login:0");
            mServData.Log.debug("Login failed");
        } else if (message[0].equals("char")) {
            if (mSession.getUserProperties().containsKey("player")) {
                Account acc = new Account(mServData, (Integer) mSession.getUserProperties().get("player"));
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

                mServData.Log.log(111, "Chose character: " + acc.getUsername());
                this.onMessage("load"); //TODO: Combine character select and load.
            }
        } else if (message[0].equals("register")) {
            JsonObject data = JsonObject.readFrom(message[1]);
            if (new Account(mServData, data.get("user").asString()).getID() >= 0) {
                mSession.getAsyncRemote().sendText("register:0");
                mServData.Log.debug("Register failed: Username exists");
                return;
            }
            int id = Account.insert(mServData, data.get("user").asString(), data.get("pass").asString(), data.get("email").asString());

            if (id == -1) {
                mSession.getAsyncRemote().sendText("register:0");
                mServData.Log.debug("Register failed: Could not create account");
                return;
            }

            mSession.getAsyncRemote().sendText("register:1");
            mServData.Log.log(120, "Registered: " + data.get("user").asString());
        } else if (message[0].equals("load")) {
            mServData.Log.log("starting load");
            if (mSession.getUserProperties().containsKey("player") && mSession.getUserProperties().containsKey("char")) {
                DRow pchar = mServData.Game.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));

                int pD = Integer.parseInt(mServData.Game.Config.get("Game").get("draw_distance"));
                String pName = (String) pchar.get("name");
                int pID = (Integer) pchar.get("id");
                int pX = (Integer) pchar.get("x");
                int pY = (Integer) pchar.get("y");
                short pFloor = ((Integer) pchar.get("floor")).shortValue();
                int pSprite = (Integer) pchar.get("sprite");

                JsonObject newmsg = new JsonObject();

                //user
                JsonObject user = new JsonObject();
                user.add("id", pID);
                user.add("n", pName);
                user.add("x", pX);
                user.add("y", pY);
                user.add("f", pFloor);
                user.add("s", pSprite);
                newmsg.add("user", user);

                //players
                JsonArray chars = new JsonArray();
                for (ClientHandler con : mClients) {
                    if (!con.equals(this) && con.mSession.getUserProperties().containsKey("loaded")) {
                        Integer icharID = (Integer) con.mSession.getUserProperties().get("char");
                        DRow ichar = mServData.Game.Data.get("characters").get(icharID);
                        JsonObject ochar = new JsonObject();
                        ochar.add("id", (Integer) ichar.get("id"));
                        ochar.add("n", (String) pchar.get("name"));
                        ochar.add("x", (Integer) ichar.get("x"));
                        ochar.add("y", (Integer) ichar.get("y"));
                        ochar.add("f", ((Integer) ichar.get("floor")).shortValue());
                        ochar.add("s", (Integer) ichar.get("sprite"));
                        chars.add(ochar);
                    }
                }
                newmsg.add("players", chars);

                //tiles
                JsonArray tiles = new JsonArray();
                JsonArray npcs = new JsonArray();
                String sql = "SELECT * FROM tiles WHERE x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                try (ResultSet rs = mServData.DB.Query(sql)) {
                    while (rs.next()) {
                        Tile tile = new Tile(mServData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                        tiles.add(tile.toString());
                        Npc npc = mServData.Game.Npcs.getNpc(tile.getX(), tile.getY(), tile.getFloor());
                        if (npc != null) {
                            npcs.add(npc.toString());
                        }
                    }
                } catch (SQLException e) {
                    e.printStackTrace();
                }
                newmsg.add("tiles", tiles);
                newmsg.add("npcs", npcs);
                
                newmsg.add("time", mServData.Game.Time.getTime());
                
                args = new HashMap<String, Object>();
                args.put("index", pID);
                args.put("msg", newmsg.toString());
                mServData.Module.doHook("on_load", args);

                mSession.getAsyncRemote().sendText("load:" + args.get("msg"));

                newmsg = new JsonObject();
                newmsg.add("id", pID);
                newmsg.add("n", pName);
                newmsg.add("x", pX);
                newmsg.add("y", pY);
                newmsg.add("f", pFloor);
                newmsg.add("s", pSprite);
                this.sendAllOther("enter:" + newmsg.toString());

                mSession.getUserProperties().put("loaded", true);
                mSession.getUserProperties().put("lastMove", new Date());
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
                    DRow pchar = mServData.Game.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
                    int pD = Integer.parseInt(mServData.Game.Config.get("Game").get("draw_distance"));
                    int pID = (Integer) pchar.get("id");
                    String pName = (String) pchar.get("name");
                    int pX = (Integer) pchar.get("x");
                    int pY = (Integer) pchar.get("y");
                    short pFloor = ((Integer) pchar.get("floor")).shortValue();
                    int pSprite = (Integer) pchar.get("sprite");
                    
                    String sql = "";
                    
                    //move the player
                    switch (pDir) {
                        case 37: //left
                            if (pX > 0) {
                                try {
                                    if (!checkAttr(pX - 1, pY, pFloor, pchar) || mServData.Game.Npcs.getNpc(pX - 1, pY, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pX--;
                                pchar.put("x", new Integer(pX));
                                sql = "SELECT * FROM tiles WHERE x=" + (pX - pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                            }
                            break;
                        case 38: //up
                            if (pY > 0) {
                                try {
                                    if (!checkAttr(pX, pY - 1, pFloor, pchar) || mServData.Game.Npcs.getNpc(pX, pY - 1, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pY--;
                                pchar.put("y", new Integer(pY));
                                sql = "SELECT * FROM tiles WHERE y=" + (pY - pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                            }
                            break;
                        case 39: //right
                            if (pX < 2000000000) {
                                try {
                                    if (!checkAttr(pX + 1, pY, pFloor, pchar) || mServData.Game.Npcs.getNpc(pX + 1, pY, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pX++;
                                pchar.put("x", new Integer(pX));
                                sql = "SELECT * FROM tiles WHERE x=" + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                            }
                            break;
                        case 40: //down
                            if (pY < 2000000000) {
                                try {
                                    if (!checkAttr(pX, pY + 1, pFloor, pchar) || mServData.Game.Npcs.getNpc(pX, pY + 1, pFloor) != null) {
                                        return;
                                    }
                                } catch (Exception e) { e.printStackTrace(); }
                                pY++;
                                pchar.put("y", new Integer(pY));
                                sql = "SELECT * FROM tiles WHERE y=" + (pY + pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                            }
                            break;
                    }
                    
                    //snap the user to his current position, in case of lag
                    JsonObject newmsg = new JsonObject();
                    newmsg.add("x", pX);
                    newmsg.add("y", pY);
                    newmsg.add("f", pFloor);
                    //and send any tiles and npcs that must be loaded in
                    this.mSession.getAsyncRemote().sendText("snap:" + newmsg.toString());
                    
                    //send the movement to all other players
                    newmsg = new JsonObject();
                    newmsg.add("id", pID);
                    newmsg.add("dir", new Integer(pDir));
                    newmsg.add("n", pName);
                    newmsg.add("x", pX);
                    newmsg.add("y", pY);
                    newmsg.add("f", pFloor);
                    newmsg.add("s", pSprite);
                    this.sendAllOther("move:" + newmsg.toString());
                    
                    //send any tiles and npcs that must be loaded in
                    newmsg = new JsonObject();
                    JsonArray tiles = new JsonArray();
                    JsonArray npcs = new JsonArray();
                    try (ResultSet rs = mServData.DB.Query(sql)) {
                        while (rs.next()) {
                            Tile tile = new Tile(mServData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                            tiles.add(tile.toString());
                            Npc npc = mServData.Game.Npcs.getNpc(tile.getX(), tile.getY(), tile.getFloor());
                            if (npc != null) {
                                npcs.add(npc.toString());
                            }
                        }
                    } catch (SQLException e) {
                        e.printStackTrace();
                    }
                    newmsg.add("tiles", tiles);
                    newmsg.add("npcs", npcs);
                    this.mSession.getAsyncRemote().sendText("more:" + newmsg.toString());
                }
            }
        } else if (message[0].equals("face")) {
            if (mSession.getUserProperties().containsKey("loaded")) {
                short pDir = Short.parseShort(message[1]);
                //DRow pchar = mServData.Game.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
                int pID = (Integer) mSession.getUserProperties().get("char");

                JsonObject newmsg = new JsonObject();
                newmsg.add("id", pID);
                newmsg.add("dir", new Integer(pDir));
                this.sendAllOther("face:" + newmsg.toString());
            }
        } else if (message[0].equals("act")) {
            if (mSession.getUserProperties().containsKey("loaded")) {
                short pDir = Short.parseShort(message[1]);
                DRow pchar = mServData.Game.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));

                int pID = (Integer) pchar.get("id");
                int pX = (Integer) pchar.get("x");
                int pY = (Integer) pchar.get("y");
                short pFloor = ((Integer) pchar.get("floor")).shortValue();
                
                mServData.Game.Utils.socket = new SocketUtils(mSession, this.getRemotes());
                Npc npc = null;
                Tile tile = null;
                GameUtils.Point point = null;
                switch (pDir) {
                    case 37: //left
                        npc = mServData.Game.Npcs.getNpc(pX - 1, pY, pFloor);
                        if (npc != null) {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("npc", npc);
                            mServData.Module.doHook("npc_act", args);
                        } else {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("point", new GameUtils.Point(pX - 1, pY, pFloor));
                            mServData.Module.doHook("point_act", args);

                            tile = mServData.Game.Utils.getTile(pX - 1, pY, pFloor);
                            if (tile != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("tile", tile);
                                mServData.Module.doHook("tile_act", args);
                            }
                        }
                        break;
                    case 38: //up
                        npc = mServData.Game.Npcs.getNpc(pX, pY - 1, pFloor);
                        if (npc != null) {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("npc", npc);
                            mServData.Module.doHook("npc_act", args);
                        } else {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("point", new GameUtils.Point(pX, pY - 1, pFloor));
                            mServData.Module.doHook("point_act", args);

                            tile = mServData.Game.Utils.getTile(pX, pY - 1, pFloor);
                            if (tile != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("tile", tile);
                                mServData.Module.doHook("tile_act", args);
                            }
                        }
                        break;
                    case 39: //right
                        npc = mServData.Game.Npcs.getNpc(pX + 1, pY, pFloor);
                        if (npc != null) {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("npc", npc);
                            mServData.Module.doHook("npc_act", args);
                        } else {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("point", new GameUtils.Point(pX + 1, pY, pFloor));
                            mServData.Module.doHook("point_act", args);

                            tile = mServData.Game.Utils.getTile(pX + 1, pY, pFloor);
                            if (tile != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("tile", tile);
                                mServData.Module.doHook("tile_act", args);
                            }
                        }
                        break;
                    case 40: //down
                        npc = mServData.Game.Npcs.getNpc(pX, pY + 1, pFloor);
                        if (npc != null) {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("npc", npc);
                            mServData.Module.doHook("npc_act", args);
                        } else {
                            args = new HashMap();
                            args.put("index", pID);
                            args.put("point", new GameUtils.Point(pX, pY + 1, pFloor));
                            mServData.Module.doHook("point_act", args);

                            tile = mServData.Game.Utils.getTile(pX, pY + 1, pFloor);
                            if (tile != null) {
                                args = new HashMap();
                                args.put("index", pID);
                                args.put("tile", tile);
                                mServData.Module.doHook("tile_act", args);
                            }
                        }
                        break;
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
        mServData.Game.Utils.socket = new SocketUtils(mSession, this.getRemotes());
        mServData.Module.doHook("on_message", args);
    }

    @OnError
    public void onError(Throwable pTrowable) {
        //TODO:onError
    }

    public Set<Session> getRemotes() {
        Set<Session> remotes = new LinkedHashSet();
        for (ClientHandler con : mClients) {
            remotes.add(con.mSession);
        }
        return remotes;
    }

    private int createChar(String name) {
        mServData.Log.debug("inserting char");
        DRow pchar = mServData.Game.Data.get("characters").insert();
        mServData.Log.debug("getting char id");
        int charID = (Integer) pchar.get("id");
        mServData.Log.debug("char id: " + charID);

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
        mServData.Game.Utils.socket = new SocketUtils(mSession, this.getRemotes());
        mServData.Module.doHook("create_char", args);

        return charID;
    }

    public boolean charInRange(DRow pchar, DRow ochar, int pDist) {
        int pX = (Integer) pchar.get("x");
        int pY = (Integer) pchar.get("y");
        int oX = (Integer) ochar.get("x");
        int oY = (Integer) ochar.get("y");
        return (Math.abs(pX - oX) <= pDist && Math.abs(pY - oY) <= pDist);
    }

    private boolean checkAttr(int pX, int pY, short pFloor, DRow pChar) throws IOException {
        Tile tile = mServData.Game.Utils.getTile(pX, pY, pFloor);
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

                mServData.Game.Utils.warpPlayer((Integer) pChar.get("id"), nX, nY, nF);

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
                
                int pID = (Integer) pChar.get("id");
                String pName = (String) pChar.get("name");

                for (ClientHandler con : mClients) {
                    JsonObject newmsg = new JsonObject();

                    if (!con.equals(this)) {
                        newmsg.add("id", pID);
                        newmsg.add("n", pName);
                    }
                    newmsg.add("x", pX);
                    newmsg.add("y", pY);
                    newmsg.add("f", nF);
                    //con.mSession.getAsyncRemote().sendText("floor:" + newmsg.toString());
                    con.mSession.getAsyncRemote().sendText("warp:" + newmsg.toString());
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

    public void sendAllOther(String msg) {
        //DRow pchar = mServData.Game.Data.get("characters").get((Integer) mSession.getUserProperties().get("char"));
        for (ClientHandler con : mClients) {
            if (con.mSession.getUserProperties().containsKey("loaded")) {
                if (!con.equals(this)) {
                    //DRow ochar = mServData.Game.Data.get("characters").get((Integer) con.mSession.getUserProperties().get("char"));
                    //if (ochar.get("floor").equals(pchar.get("floor")) && charInRange(pchar, ochar, pD)) {
                    con.mSession.getAsyncRemote().sendText(msg);
                    //}
                }
            }
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
