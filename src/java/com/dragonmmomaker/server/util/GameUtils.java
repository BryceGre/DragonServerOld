package com.dragonmmomaker.server.util;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

import org.json.JSONArray;
import org.json.JSONObject;

import com.dragonmmomaker.datamap.DRow;
import com.dragonmmomaker.server.ServData;
import com.dragonmmomaker.server.data.Tile;
import com.dragonmmomaker.server.handler.ClientHandler;
import com.dragonmmomaker.server.npc.Npc;

public class GameUtils {

    private final ServData mData;
    private final ThreadLocal<SocketUtils> mSocket;

    public GameUtils(final ServData pGameData) {
        mData = pGameData;
        mSocket = new ThreadLocal() {
            @Override
            protected SocketUtils initialValue() {
                 return new SocketUtils();
            }
        };
    }
    
    public SocketUtils getSocket() {
        return mSocket.get();
    }
    
    public void setSocket(SocketUtils pSocket) {
        mSocket.set(pSocket);
    }

    public Tile getTile(int x, int y, short floor) {
        String sql = "SELECT * FROM tiles WHERE x=" + x + " AND y=" + y + " AND floor=" + floor;
        try (ResultSet rs = mData.DB.Query(sql)) {
            if (rs.next()) {
                return new Tile(mData, rs.getInt("id"), x, y, floor, rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
            } else {
                return null;
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }
    
    public int[] getWorldWidth() {
        String sql = "SELECT MIN(x) AS min, MAX(x) AS max FROM tiles";
        try (ResultSet rs = mData.DB.Query(sql)) {
            if (rs.next()) {
                int[] out = new int[2];
                out[0] = rs.getInt("min");
                out[1] = rs.getInt("max");
                if (out[0] == 0 && out[1] == 0) {
                    out[0] = 1000000000;
                    out[1] = 1000000000;
                }
                return out;
            } else {
                return new int[] { 1000000000, 1000000000 };
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return new int[] { 1000000000, 1000000000 };
        }
    }
    
    public int[] getWorldHeight() {
        String sql = "SELECT MIN(y) AS min, MAX(y) AS max FROM tiles";
        try (ResultSet rs = mData.DB.Query(sql)) {
            if (rs.next()) {
                int[] out = new int[2];
                out[0] = rs.getInt("min");
                out[1] = rs.getInt("max");
                if (out[0] == 0 && out[1] == 0) {
                    out[0] = 1000000000;
                    out[1] = 1000000000;
                }
                return out;
            } else {
                return new int[] { 1000000000, 1000000000 };
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return new int[] { 1000000000, 1000000000 };
        }
    }

    public void setTile(int x, int y, int floor, Tile tile) {
        //do nothing, since tiles are not cached server side
    }
    
    public void spawnNPC(int x, int y, short floor, int id) {
        Tile tile = getTile(x, y, floor);
        if (tile != null) {
            spawnNPC(tile, id);
        }
    }

    public void spawnNPC(Tile tile, int id) {
        mData.Npcs.spawnNPC(tile, id, mData.Data.get("npcs").get(id));
    }

    public void respawnAllNpcs() {
        mData.Npcs.respawnAll();
    }
    
    public void warpPlayer(int id, int x, int y, short floor) {
        DRow pChar = mData.Data.get("characters").get(id);
        int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));

        Map<Object, Object> charData = new HashMap();
        charData.put("x", x);
        charData.put("y", y);
        charData.put("floor", (int)floor);
        pChar.putAll(charData);
        
        JSONObject newmsg = new JSONObject();
        JSONArray tiles = new JSONArray();
        JSONArray npcs = new JSONArray();
        String sql = "SELECT * FROM tiles WHERE x BETWEEN " + (x - pD) + " AND " + (x + pD) + " AND y BETWEEN " + (y - pD) + " AND " + (y + pD) + ";";
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
        newmsg.put("x", x);
        newmsg.put("y", y);
        newmsg.put("f", floor);
        newmsg.put("tiles", tiles);
        newmsg.put("npcs", npcs);
        ClientHandler.sendAllWithTest("warp:" + newmsg.toString(), (charID) -> {
            return (charID == id);
        });

        newmsg = new JSONObject();
        newmsg.put("x", x);
        newmsg.put("y", y);
        newmsg.put("f", floor);
        newmsg.put("id", id);
        ClientHandler.sendAllWithTest("warp:" + newmsg.toString(), (charID) -> {
            return (charID != id);
        });
    }

    public boolean isBlocked(int dir, int x, int y, short floor) {
        if (dir == 37) { // left
            if (x <= 0) {
                return true;
            }
            Tile tile = this.getTile(x - 1, y, floor);
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        } else if (dir == 38) { // up
            if (y <= 0) {
                return true;
            }
            Tile tile = this.getTile(x, y - 1, floor);
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        } else if (dir == 39) { // right
            if (x >= 2000000000) {
                return true;
            }
            Tile tile = this.getTile(x + 1, y, floor);
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        } else if (dir == 40) { // down
            if (y >= 2000000000) {
                return true;
            }
            Tile tile = this.getTile(x, y + 1, floor);
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        }
        return false;
    }

    public boolean isAttr(int attr, Tile tile) {
        return (tile.getAttr1() == attr || tile.getAttr2() == attr);
    }

    public boolean isAttr(int attr, int x, int y, short floor) {
        Tile tile = this.getTile(x, y, floor);
        if (tile != null) {
            return this.isAttr(attr, tile);
        }
        return false;
    }

    public int getUTCHours() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.setTime(mData.Time);
        return cal.get(Calendar.HOUR_OF_DAY);
    }

    public int getUTCMinutes() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.setTime(mData.Time);
        return cal.get(Calendar.MINUTE);
    }

    public int getUTCSeconds() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.setTime(mData.Time);
        return cal.get(Calendar.SECOND);
    }
}
