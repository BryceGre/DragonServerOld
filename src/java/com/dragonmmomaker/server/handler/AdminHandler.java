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

@ServerEndpoint("/admin")
public class AdminHandler {
    public static String ERROR = "Server Offline";

    public static final int ACCESS = 0;

    protected static Set<AdminHandler> mClients;
    protected static ServData mData;
    
    protected Session mSession;

    static {
        mClients = new CopyOnWriteArraySet();
    }

    public static void setData(ServData pData) {
        mData = pData;
    }
    

    public static void sendAll(String pMessage) {
        Iterator<AdminHandler> itr = mClients.iterator();
        while (itr.hasNext()) {
            itr.next().mSession.getAsyncRemote().sendText(pMessage);
        }
    }

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

    @OnOpen
    public void onOpen(Session pSession) {
        ServData._CurData = mData;

        mSession = pSession;
        
        mSession.setMaxTextMessageBufferSize(1048576);
        mSession.setMaxBinaryMessageBufferSize(1048576);

        synchronized (mClients) {
            mClients.add(this);
        }

        mData.Log.log(100, "(ADMIN) Connection from: " + this.getIP());
    }

    @OnClose
    public void onClose(Session pSession, CloseReason pReason) {
        ServData._CurData = mData;

        synchronized (mClients) {
            mClients.remove(this);
        }

        mData.Log.log(101, "(ADMIN) Disconnected: " + this.getIP());
    }

    @OnMessage
    public void onMessage(String msg) {
        if (!DragonServer.isRunning()) {
            mSession.getAsyncRemote().sendText(ERROR);
            return;
        }

        ServData._CurData = mData;
        mData.Log.debug("(ADMIN): Recieved message: " + msg);

        String[] message = msg.split(":", 2);

        if (message[0].equals("login")) {
            JSONObject data = new JSONObject(message[1]);
            
            Account acc = new Account(mData, data.getString("user"));
            if (acc.getID() >= 0) { //if account exists
                if (acc.checkPassword(data.getString("pass")) && acc.getAccess() >= ACCESS) {
                    mSession.getUserProperties().put("player", acc.getID());
                    mSession.getAsyncRemote().sendText("login:1");
                    mData.Log.log(110,"(ADMIM): Log-in: " + "name");
                    return;
                }
            }

            mSession.getAsyncRemote().sendText("login:0");
            mData.Log.debug("Login failed");
        } else if (message[0].equals("load")) {
            if (mSession.getUserProperties().containsKey("player")) {
                int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
                int pX = 1000000000;
                int pY = 1000000000;

                JSONObject newmsg = new JSONObject();
                
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
                
                mSession.getAsyncRemote().sendText("load:" + newmsg.toString());
                mSession.getUserProperties().put("loaded", true);
            }
        } else if (message[0].equals("loaded")) {
            //pConnection.data("loaded", true);
        } else if (message[0].equals("warp")) {
            if (mSession.getUserProperties().containsKey("player")) {
                JSONObject data = new JSONObject(message[1]);
                int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
                int pX = data.getInt("x");
                int pY = data.getInt("y");

                JSONObject newmsg = new JSONObject();
                
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
                
                mSession.getAsyncRemote().sendText("more:" + newmsg.toString());
            }
        } else if (message[0].equals("move")) {
            if (mSession.getUserProperties().containsKey("player")) {
                JSONObject data = new JSONObject(message[1]);
                int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
                int pX = data.getInt("x");
                int pY = data.getInt("y");
                int pDir = data.getInt("dir");

                JSONObject newmsg = new JSONObject();
                JSONArray tiles = new JSONArray();

                switch (pDir) {
                    case 37: //left
                        if (pX > 0) {
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
                        if (pY > 0) {
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
                        if (pX < 2000000000) {
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
                        if (pY < 2000000000) {
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

                newmsg.put("tiles", tiles);
                mSession.getAsyncRemote().sendText("more:" + newmsg.toString());
            }
        }

        //do module hook "admin_message"
        Map<String, Object> args = new HashMap<String, Object>();
        args.put("head", message[0]);
        args.put("body", "");
        if (message.length > 1) {
            args.put("body", message[1]);
        }
        
        mData.Module.doHook("admin_message", args, new SocketUtils(mSession, this.getRemotes()));
    }

    @OnError
    public void onError(Throwable pTrowable) {
        //TODO: onError
    }

    public Set<Session> getRemotes() {
        Set<Session> remotes = new LinkedHashSet();
        for (AdminHandler con : mClients) {
            remotes.add(con.mSession);
        }
        return remotes;
    }
    
    private String getIP() {
        try {
            return InetAddress.getByName(mSession.getRequestURI().getHost()).getHostAddress();
        } catch (UnknownHostException e) {
            return "?";
        }
    }
    
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
