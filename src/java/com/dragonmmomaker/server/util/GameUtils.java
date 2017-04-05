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
import com.dragonmmomaker.server.npc.Npc;
import com.dragonmmomaker.server.player.Player;

/**
 * Class containing utilities for accessing and altering game data and functions.
 * @author Bryce
 */

public class GameUtils {

    private final ServData mData; //current server data
    private final ThreadLocal<SocketUtils> mSocket; //current SocketUtils

    /**
     * Constructor
     * @param pGameData current server data
     */
    public GameUtils(final ServData pGameData) {
        mData = pGameData; //save the server data
        //create new SocketUtils (subset of game functions)
        mSocket = new ThreadLocal() {
            @Override
            protected SocketUtils initialValue() {
                 return new SocketUtils(mData);
            }
        };
    }
    
    /**
     * Get the current SocketUtils
     * @return the current SocketUtils
     */
    public SocketUtils getSocket() {
        return mSocket.get();
    }
    
    /**
     * Set the current SocketUtils
     * @param pSocket the current SocketUtils
     */
    public void setSocket(SocketUtils pSocket) {
        mSocket.set(pSocket);
    }

    /**
     * Get a tile at a give position
     * @param x the x position of the tile
     * @param y the y position of the tile
     * @param floor the floor of the tile
     * @return a Tile object representing the tile at the given position
     */
    public Tile getTile(int x, int y, short floor) {
        //query the database for the tile at this position
        String sql = "SELECT * FROM tiles WHERE x=" + x + " AND y=" + y + " AND floor=" + floor;
        try (ResultSet rs = mData.DB.Query(sql)) {
            //if a result was found
            if (rs.next()) {
                //put the result into a Tile object and return it
                return new Tile(mData, rs.getInt("id"), x, y, floor, rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
            } else {
                //else return null
                return null;
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }
    
    /**
     * Get the current world's width, based on what tiles are set
     * @return an int array [min, max] of the min and max x values of the world
     */
    public int[] getWorldWidth() {
        //query the left-most and right-most tiles
        String sql = "SELECT MIN(x) AS min, MAX(x) AS max FROM tiles";
        try (ResultSet rs = mData.DB.Query(sql)) {
            //if a set is found
            if (rs.next()) {
                //create the output
                int[] out = new int[2];
                out[0] = rs.getInt("min");
                out[1] = rs.getInt("max");
                //if the world dosn't eixst
                if (out[0] == 0 && out[1] == 0) {
                    //use the center value of the world
                    out[0] = 1000000000;
                    out[1] = 1000000000;
                }
                //return the output
                return out;
            } else {
                //return a default center value of the world
                return new int[] { 1000000000, 1000000000 };
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return new int[] { 1000000000, 1000000000 };
        }
    }
    
    /**
     * Get the current world's height, based on what tiles are set
     * @return an int array [min, max] of the min and max y values of the world
     */
    public int[] getWorldHeight() {
        //query the top-most and bottom-most tiles
        String sql = "SELECT MIN(y) AS min, MAX(y) AS max FROM tiles";
        try (ResultSet rs = mData.DB.Query(sql)) {
            //if a set is found
            if (rs.next()) {
                //create the output
                int[] out = new int[2];
                out[0] = rs.getInt("min");
                out[1] = rs.getInt("max");
                //if the world dosn't eixst
                if (out[0] == 0 && out[1] == 0) {
                    //use the center value of the world
                    out[0] = 1000000000;
                    out[1] = 1000000000;
                }
                //return the output
                return out;
            } else {
                //return a default center value of the world
                return new int[] { 1000000000, 1000000000 };
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return new int[] { 1000000000, 1000000000 };
        }
    }

    /**
     * Set a tile at the given position
     * @param x the x position of the tile
     * @param y the y position of the tile
     * @param floor the floor of the tile
     * @param tile the tile to set at this location
     */
    public void setTile(int x, int y, int floor, Tile tile) {
        //do nothing, since tiles are not cached server side
    }
    
    /**
     * Spawn an NPC at the given position
     * @param x the x position to spawn the NPC at
     * @param y the y position to spawn the NPC at
     * @param floor the floor to spawn the NPC on
     * @param id the ID of the NPC to spawn
     */
    public void spawnNPC(int x, int y, short floor, int id) {
        //get the tile at this location
        Tile tile = getTile(x, y, floor);
        //if the tile exists
        if (tile != null) {
            //spawn an NPC there
            spawnNPC(tile, id);
        }
    }

    /**
     * Spawn an NPC on the given tile
     * @param tile the tile to spawn the NPC on
     * @param id the ID of the NPC to spawn
     */
    public void spawnNPC(Tile tile, int id) {
        //spawn the NPC using the NPCManager
        mData.Npcs.spawnNPC(tile, id, mData.Data.get("npcs").get(id));
    }

    /**
     * Respawn all NPCs, resetting their positions and health
     */
    public void respawnAllNpcs() {
        mData.Npcs.respawnAll();
    }
    
    /**
     * Get NPC data for a given NPC
     * @param id the ID of the NPC
     * @return the data of the NPC
     */
    public Npc getNPC(int id) {
        //get the NPC data using the NPCManager
        return mData.Npcs.getNpc(id);
    }
    
    /**
     * Get all NPCs' data
     * @return an array containing all NPCs' data
     */
    public Map<Integer,Npc> getAllNPCs() {
        //get the data using the NPCManager
        return mData.Npcs.getAll();
    }
    
    /**
     * Warp a player to a given position
     * @param id the ID of the player to warp
     * @param x the x position to warp to
     * @param y the y position to warp to
     * @param floor the floor to warp to
     */
    public void warpPlayer(int id, int x, int y, short floor) {
        //get the draw distance
        int pD = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
        //get the player character
        DRow pChar = mData.Data.get("characters").get(id);
        //get the player
        Player player = mData.Players.getPlayer(id);
        
        //since we use (1000000000, 1000000000) as the center, translate the point
        x += 1000000000;
        y += 1000000000;

        //store the new character data (x, y, floor)
        Map<Object, Object> charData = new HashMap();
        charData.put("x", x);
        charData.put("y", y);
        charData.put("floor", (int)floor);
        //warp the player
        player.floor(floor);
        player.warp(x, y);
        //save the new character data into the database
        pChar.putAll(charData);
        
        //create a message to send to the player, containing all tiles at his/her character's new location
        JSONObject newmsg = new JSONObject();
        JSONArray tiles = new JSONArray();
        JSONArray npcs = new JSONArray();
        //query all tiles at this location within draw distance
        String sql = "SELECT * FROM tiles WHERE x BETWEEN " + (x - pD) + " AND " + (x + pD) + " AND y BETWEEN " + (y - pD) + " AND " + (y + pD) + ";";
        try (ResultSet rs = mData.DB.Query(sql)) {
            //for each tile
            while (rs.next()) {
                //create the tile object
                Tile tile = new Tile(mData, rs.getShort("id"), rs.getInt("x"), rs.getInt("y"), rs.getShort("floor"), rs.getString("data"), rs.getString("attr1"), rs.getString("attr2"));
                //add it to the message
                tiles.put(tile.toString());
                //check if there is an NPC on this tile
                Npc npc = mData.Npcs.getNpc(tile.getX(), tile.getY(), tile.getFloor());
                //if there is
                if (npc != null) {
                    //add it to the message
                    npcs.put(npc.toString());
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        //put the new charcter data into the message
        newmsg.put("x", x); //new x position
        newmsg.put("y", y); //new y position
        newmsg.put("f", floor); //new floor
        newmsg.put("tiles", tiles); //tils
        newmsg.put("npcs", npcs); //npcs
        //and send the message to th current player
        player.getClient().send("warp:" + newmsg.toString());

        //now create a message to send to all other players, so they can see this player warp
        newmsg = new JSONObject();
        newmsg.put("x", x); //new x position
        newmsg.put("y", y); //new y position
        newmsg.put("f", floor); //new floor
        newmsg.put("id", id); //warping character's ID
        //send the message to all other players
        player.getClient().sendOther(mData.Players.getAll(), "warp:" + newmsg.toString());
    }

    /**
     * Check if a given location is blocked from player movement.
     * @param dir the direction to check, using arrowkey keycodes
     * @param x the x position of the player
     * @param y the y position of the player
     * @param floor the floor of the player
     * @return true if the player is blocked from moving in the given direction, false otherwise
     */
    public boolean isBlocked(int dir, int x, int y, short floor) {
        if (dir == 37) { // left
            //if we are at the edge of the universe
            if (x <= 0) {
                return true;
            }
            //else, get the tile in this direction
            Tile tile = this.getTile(x - 1, y, floor);
            //and check it's attributes
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        } else if (dir == 38) { // up
            //if we are at the edge of the universe
            if (y <= 0) {
                return true;
            }
            //else, get the tile in this direction
            Tile tile = this.getTile(x, y - 1, floor);
            //and check it's attributes
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        } else if (dir == 39) { // right
            //if we are at the edge of the universe
            if (x >= 2000000000) {
                return true;
            }
            //else, get the tile in this direction
            Tile tile = this.getTile(x + 1, y, floor);
            //and check it's attributes
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        } else if (dir == 40) { // down
            //if we are at the edge of the universe
            if (y >= 2000000000) {
                return true;
            }
            //else, get the tile in this direction
            Tile tile = this.getTile(x, y + 1, floor);
            //and check it's attributes
            if (tile != null && (tile.getAttr1() == 1 || tile.getAttr2() == 1)) {
                return true;
            }
        }
        //not blocked
        return false;
    }

    /**
     * Check if the given tile has the given attribute
     * @param attr the attribute to check for
     * @param tile the tile to check
     * @return true if the tile has the attribute, false otherwise
     */
    public boolean isAttr(int attr, Tile tile) {
        return (tile.getAttr1() == attr || tile.getAttr2() == attr);
    }

    /**
     * Check if the tile at the given position has the given attribute
     * @param attr the attribute to check for
     * @param x the x position of the tile
     * @param y the y position of the tile
     * @param floor the floor of the tile
     * @return true if the tile has the attribute, false otherwise
     */
    public boolean isAttr(int attr, int x, int y, short floor) {
        //get the tile
        Tile tile = this.getTile(x, y, floor);
        //if it exists
        if (tile != null) {
            //check it's attribute
            return this.isAttr(attr, tile);
        }
        return false;
    }

    /**
     * Get the UTC hours of the day for the current in-game time.
     * @return the UTC hours of the day
     */
    public int getUTCHours() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.setTime(mData.Time);
        return cal.get(Calendar.HOUR_OF_DAY);
    }

    /**
     * Get the UTC minutes for the current in-game time.
     * @return the UTC minutes
     */
    public int getUTCMinutes() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.setTime(mData.Time);
        return cal.get(Calendar.MINUTE);
    }

    /**
     * Get the UTC seconds for the current in-game time.
     * @return the UTC seconds
     */
    public int getUTCSeconds() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.setTime(mData.Time);
        return cal.get(Calendar.SECOND);
    }
}
