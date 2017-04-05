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

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.DateFormat;
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

import org.json.JSONArray;
import org.json.JSONObject;

import com.dragonmmomaker.server.DragonServer;
import com.dragonmmomaker.server.ServData;
import com.dragonmmomaker.server.data.Account;
import com.dragonmmomaker.server.data.Tile;
import com.dragonmmomaker.server.util.SocketUtils;

/**
 * Server endpoint for admins
 * @author Bryce
 */
@ServerEndpoint("/admin")
public class AdminHandler {
    public static String ERROR = "Server Offline"; //error string

    public static final int ACCESS = 0; //access required for admins

    protected static Set<AdminHandler> mClients; //list of all clients
    protected static ServData mData; //current server data
    
    protected Session mSession; //current client session

    /**
     * When application starts, create client set
     */
    static {
        mClients = new CopyOnWriteArraySet();
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
        Iterator<AdminHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            itr.next().mSession.getAsyncRemote().sendText(pMessage);
        }
    }

    /**
     * Send a message to all connected clients that pass a prediacate test
     * @param pMessage the message to send
     * @param pTest the test to run on the character's ID
     */
    public static void sendAllWithTest(String pMessage, Predicate<Integer> pTest) {
        Iterator<AdminHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            AdminHandler player = itr.next();
            if (player.mSession.getUserProperties().containsKey("char")) {
                if (pTest.test((Integer) player.mSession.getUserProperties().get("char"))) {
                    player.mSession.getAsyncRemote().sendText(pMessage);
                }
            }
        }
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
        mData.Log.log(100, "(ADMIN) Connection from: " + this.getIP());
    }

    /**
     * When a connection is closed
     * @param pSession a session representing the connection
     * @param pReason the reason the connection was closed
     */
    @OnClose
    public void onClose(Session pSession, CloseReason pReason) {
        ServData._CurData = mData; //set global data for this connection

        //remove this client from the set
        synchronized (mClients) {
            mClients.remove(this);
        }

        //Log disconnection
        mData.Log.log(101, "(ADMIN) Disconnected: " + this.getIP());
    }

    /**
     * When a connection recieves a WebSocket message
     * @param msg the message recieved
     */
    @OnMessage
    public void onMessage(String msg) {
        //make sure the server is running
        if (!DragonServer.isRunning()) {
            mSession.getAsyncRemote().sendText(ERROR);
            return;
        }

        ServData._CurData = mData; //set global data for this connection
        mData.Log.debug("(ADMIN): Recieved message: " + msg);
        
        //module args
        Map<String, Object> args;

        //split the message by type:data
        String[] message = msg.split(":", 2);

        if (message[0].equals("login")) {
            //client login
            JSONObject data = new JSONObject(message[1]); //get object from data
            Account acc = new Account(mData, data.getString("user")); //get account from username
            if (acc.getID() >= 0) { //if account exists
                if (acc.checkPassword(data.getString("pass")) && acc.getAccess() >= ACCESS) { //check password and access
                    //login succeeded
                    mSession.getUserProperties().put("acc", acc.getID()); //save account ID
                    mSession.getAsyncRemote().sendText("login:1"); //send success message
                    mData.Log.log(110,"(ADMIM): Log-in: " + "name"); //log login
                    return;
                }
            }
            //login failed
            mSession.getAsyncRemote().sendText("login:0"); //send fail message
            mData.Log.debug("Login failed"); //log failure
        } else if (message[0].equals("load")) {
            //reqest to load the world
            //if account is logged in
            if (mSession.getUserProperties().containsKey("acc")) {
                //get the location and draw distance
                int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
                int pX = 1000000000;
                int pY = 1000000000;

                //create a new message
                JSONObject newmsg = new JSONObject();
                
                //get all tiles to send to admin
                JSONArray tiles = new JSONArray();
                String sql = "SELECT * FROM tiles WHERE x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                try (ResultSet rs = mData.DB.Query(sql)) {
                    while (rs.next()) {
                        Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                        tiles.put(tile.toString());
                    }
                } catch (SQLException e) {
                    e.printStackTrace();
                }
                newmsg.put("tiles", tiles);
                
                //do admin_on_load module hook, and allow modules to modify the message
                args = new HashMap<String, Object>();
                args.put("msg", newmsg.toString());
                mData.Module.doHook("admin_on_load", args, new SocketUtils(mSession, getRemotes(), mData));
                
                //send the message
                mSession.getAsyncRemote().sendText("load:" + args.get("msg"));
                mSession.getUserProperties().put("loaded", true);
            }
        } else if (message[0].equals("loaded")) {
            //pConnection.data("loaded", true);
        } else if (message[0].equals("warp")) {
            //request to warp the admin to another location
            if (mSession.getUserProperties().containsKey("acc")) {
                JSONObject data = new JSONObject(message[1]); //get object from data
                int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
                int pX = data.getInt("x"); //new x
                int pY = data.getInt("y"); //new y

                //create a new message
                JSONObject newmsg = new JSONObject();
                
                //get all tiles to send to admin
                JSONArray tiles = new JSONArray();
                String sql = "SELECT * FROM tiles WHERE x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                try (ResultSet rs = mData.DB.Query(sql)) {
                    while (rs.next()) {
                        Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                        tiles.put(tile.toString());
                    }
                } catch (SQLException e) {
                    e.printStackTrace();
                }
                newmsg.put("tiles", tiles);
                
                //send the message
                mSession.getAsyncRemote().sendText("more:" + newmsg.toString());
            }
        } else if (message[0].equals("move")) {
            //request to move one unit in a direction
            if (mSession.getUserProperties().containsKey("acc")) {
                JSONObject data = new JSONObject(message[1]); //get object from data
                int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
                int pX = data.getInt("x"); //old x
                int pY = data.getInt("y"); //old y
                int pDir = data.getInt("dir"); //new direction

                //create a new message
                JSONObject newmsg = new JSONObject();
                JSONArray tiles = new JSONArray();

                //move the admin
                switch (pDir) {
                    case 37: //left
                        //if the admin isn't on the edge of the universe
                        if (pX > 0) {
                            //get the new tiles
                            String sql = "SELECT * FROM tiles WHERE x=" + (pX - pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                            try (ResultSet rs = mData.DB.Query(sql)) {
                                while (rs.next()) {
                                    Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                                    tiles.put(tile.toString());
                                }
                            } catch (SQLException e) {
                                e.printStackTrace();
                            }
                        }
                        break;
                    case 38: //up
                        //if the admin isn't on the edge of the universe
                        if (pY > 0) {
                            //get the new tiles
                            String sql = "SELECT * FROM tiles WHERE y=" + (pY - pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                            try (ResultSet rs = mData.DB.Query(sql)) {
                                while (rs.next()) {
                                    Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                                    tiles.put(tile.toString());
                                }
                            } catch (SQLException e) {
                                e.printStackTrace();
                            }
                        }
                        break;
                    case 39: //right
                        //if the admin isn't on the edge of the universe
                        if (pX < 2000000000) {
                            //get the new tiles
                            String sql = "SELECT * FROM tiles WHERE x=" + (pX + pD) + " AND y BETWEEN " + (pY - pD) + " AND " + (pY + pD) + ";";
                            try (ResultSet rs = mData.DB.Query(sql)) {
                                while (rs.next()) {
                                    Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                                    tiles.put(tile.toString());
                                }
                            } catch (SQLException e) {
                                e.printStackTrace();
                            }
                        }
                        break;
                    case 40: //down
                        //if the admin isn't on the edge of the universe
                        if (pY < 2000000000) {
                            //get the new tiles
                            String sql = "SELECT * FROM tiles WHERE y=" + (pY + pD) + " AND x BETWEEN " + (pX - pD) + " AND " + (pX + pD) + ";";
                            try (ResultSet rs = mData.DB.Query(sql)) {
                                while (rs.next()) {
                                    Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                                    tiles.put(tile.toString());
                                }
                            } catch (SQLException e) {
                                e.printStackTrace();
                            }
                        }
                        break;
                }

                //send the message
                newmsg.put("tiles", tiles);
                mSession.getAsyncRemote().sendText("more:" + newmsg.toString());
            }
        }

        //do module hook "admin_message"
        args = new HashMap<String, Object>();
        args.put("head", message[0]); //pass message head
        //pass message body, if it exists
        args.put("body", "");
        if (message.length > 1) {
            args.put("body", message[1]);
        }
        //do the module hook
        mData.Module.doHook("admin_message", args, new SocketUtils(mSession, this.getRemotes(), mData));
    }

    /**
     * When an error occurs with the connection
     * @param pTrowable 
     */
    @OnError
    public void onError(Throwable pTrowable) {
        //TODO: onError
    }

    /**
     * Get a list of remotes (used to send messages) for all connected clients
     * @return list of all remotes
     */
    public Set<Session> getRemotes() {
        Set<Session> remotes = new LinkedHashSet();
        for (AdminHandler con : mClients) {
            remotes.add(con.mSession);
        }
        return remotes;
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
     * Get current (not server) time
     * @return a string representing the current time
     */
    protected String getTime() {
        Timestamp time = new Timestamp(new Date().getTime());
        return DateFormat.getTimeInstance().format(time);
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj)
                return true;
        if (obj == null)
                return false;
        if (getClass() != obj.getClass())
                return false;
        AdminHandler other = (AdminHandler) obj;
        if (mSession == null) {
                if (other.mSession != null)
                        return false;
        } else if (mSession.getId() != other.mSession.getId())
                return false;
        return true;
    }
}
