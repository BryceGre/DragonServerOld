/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.dragonmmomaker.server.npc;

import java.nio.charset.Charset;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;
import java.util.Random;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import org.json.JSONArray;
import org.json.JSONObject;

import com.dragonmmomaker.datamap.DRow;
import com.dragonmmomaker.datamap.util.ArrayMap;
import com.dragonmmomaker.server.ServData;
import com.dragonmmomaker.server.data.DummyTile;
import com.dragonmmomaker.server.data.Tile;
import com.dragonmmomaker.server.handler.ClientHandler;
import com.dragonmmomaker.server.util.SocketUtils;

/**
 *
 * @author Bryce
 */
public class NpcManager {

    private final ServData mData;
    private Timer mTimer;
    private NpcUpdateTask mUpdateTask;
    private Map<String,Npc> mNpcData;
    private Queue<Npc> mRespawn;

    private int mCount;

    public NpcManager(final ServData pServData) {
        mData = pServData;
        mNpcData = new ConcurrentHashMap();
        mRespawn = new LinkedList();
        
        mCount = 1;

        mUpdateTask = new NpcUpdateTask();
        mTimer = new Timer(true);
        
        new DummyTile(0, 0, (short)0); //pre-load class
        new JSONArray().put(1).toString(); //pre-load JSONArray and sub-classes
        new JSONObject().put("a", 1).toString(); //pre-load JSONObject and sub-classes
    }
    
    public void start() {
        mTimer.scheduleAtFixedRate(mUpdateTask, 250, 250);
    }
    
    public void stop() {
        mTimer.cancel();
    }
    
    public void spawnAll(Map<Tile, Integer> pSpawns) {
        ArrayMap<DRow> cache = new ArrayMap(mData.Data.get("npcs").entrySet());
        for (Map.Entry<Tile, Integer> spawn : pSpawns.entrySet()) {
            int id = spawn.getValue();
            if (cache.containsKey(id)) {
                spawnNPC(spawn.getKey(), id, cache.get(id));
            }
        }
    }
    
    public void spawnNPC(Tile pTile, int pNpc, Map<Object,Object> pInfo) {
        Npc npc = new Npc(mCount);
        npc.setId(pNpc);
        npc.setX(pTile.getX());
        npc.setY(pTile.getY());
        npc.setFloor(pTile.getFloor());
        
        npc.setSprite((Integer)pInfo.get("sprite"));
        npc.setName((String)pInfo.get("name"));
        npc.setSpawn(pTile);
        npc.setHealth(100); //TODO: Health
        npc.setLastMove(new Date().getTime());
        mNpcData.put(Tile.key(pTile), npc);

        mCount++;
        
        Map<String,Object> args = new HashMap();
        args.put("npc", pNpc);
        mData.Module.doHook("npc_spawn", args, new SocketUtils());
    }
    
    public void respawnNpc(Npc pNpc) {
        Tile tile = pNpc.getSpawn();
        pNpc.setX(tile.getX());
        pNpc.setY(tile.getY());
        pNpc.setFloor(tile.getFloor());
        
        pNpc.setHealth(100); //TODO: Health
        pNpc.setLastMove(new Date().getTime());
        mNpcData.put(Tile.key(tile), pNpc);
        
        ClientHandler.sendAllWithTest("npc-res:" + pNpc.toString(), (charID) -> {
            DRow pchar = mData.Data.get("characters").get(charID);
            int dist = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
            int pX = (Integer) pchar.get("x");
            int pY = (Integer) pchar.get("y");
            if (pNpc.getX() - dist <= pX && pNpc.getX() + dist >= pX) {
                if (pNpc.getY() - dist <= pY && pNpc.getY() + dist >= pY) {
                    return true;
                }
            }
            return false;
        });
        
        Map<String,Object> args = new HashMap();
        args.put("npc", pNpc);
        mData.Module.doHook("npc_spawn", args, new SocketUtils());
    }
    
    public void killNpc(Npc pNpc) {
        pNpc.setRespawn(20);
        mRespawn.offer(pNpc);
        mNpcData.remove(Tile.key(pNpc.getX(), pNpc.getY(), pNpc.getFloor()));
        
        ClientHandler.sendAllWithTest("npc-die:" + pNpc.getIid(), (charID) -> {
            DRow pchar = mData.Data.get("characters").get(charID);
            int dist = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
            int pX = (Integer) pchar.get("x");
            int pY = (Integer) pchar.get("y");
            if (pNpc.getX() - dist <= pX && pNpc.getX() + dist >= pX) {
                if (pNpc.getY() - dist <= pY && pNpc.getY() + dist >= pY) {
                    return true;
                }
            }
            return false;
        });
        
        Map<String,Object> args = new HashMap();
        args.put("npc", pNpc);
        mData.Module.doHook("npc_die", args, new SocketUtils());
    }

    public void respawnAll() {
        //TODO: respawn all NPCs (for map editing)
    }
    
    public Npc getNpc(int pX, int pY, short pFloor) {
        if (mNpcData.containsKey(Tile.key(pX, pY, pFloor))) {
            return mNpcData.get(Tile.key(pX, pY, pFloor));
        }
        return null;
    }

    public boolean checkAttr(int pX, int pY, short pFloor, Npc pNpc, Set<String> pPlayerData) {
        Tile tile = mData.Utils.getTile(pX, pY, pFloor);
        if (tile == null) {
            return false; //cannot walk off the map
        }
        int attr1 = tile.getAttr1();
        int attr2 = tile.getAttr2();

        if (attr1 == 1 || attr2 == 1) {
            //blocked
            return false;
        }
        if (attr1 == 2 || attr2 == 2 || attr1 == 3 || attr2 == 3) {
            //don't block warp or floor tiles
            return false;
        }

        if (attr1 == 7 || attr2 == 7) {
            //Npc Avoid
            return false;
        }
        
        if (mNpcData.containsKey(Tile.key(tile))) {
            //other npc there
            return false;
        }
        if (pPlayerData.contains(Tile.key(tile))) {
            //other player there
            return false;
        }
        return true;
    }
    
    private class NpcUpdateTask extends TimerTask {
        @Override
        public void run() {
            //log the positions of all players
            Set<String> playerData = new CopyOnWriteArraySet();
            Set<Map.Entry<Object,DRow>> players = mData.Data.get("characters").entrySet();
            for (Map.Entry<Object,DRow> entry : players) {
                DRow player = entry.getValue();
                if (player.get("x") != null && player.get("y") != null && player.get("floor") != null)
                    playerData.add(Tile.key((Integer)player.get("x"), (Integer)player.get("y"), (Integer)player.get("floor")));
            }
            //cache NPC behavior
            Date now = new Date();
            Map<Integer,byte[]> cache = mData.Data.get("npcs").listRaw("behavior");
            //clone the entry set, and iterate over the npcs
            Iterator<Map.Entry<String,Npc>> itr = new LinkedHashSet(mNpcData.entrySet()).iterator();
            while (itr.hasNext()) {
                Npc npc = itr.next().getValue();
                Set<String> behavior = parseRaw(cache.get(npc.getId()));
                //kill npc
                if (npc.getHealth() <= 0) {
                    killNpc(npc);
                    continue; //don't bother moving it.
                }
                //move npc
                if (!behavior.contains("still") && npc.getLastMove() + 1000 < now.getTime()) {
                    //time to move
                    if (Math.random() < 0.1) { //move?
                        int dir = new Random().nextInt(4) + 37;
                        int newX = 0;
                        int newY = 0;
                        
                        //determine new position
                        switch (dir) {
                            case 37: //left
                                newX = npc.getX() - 1;
                                newY = npc.getY();
                                break;
                            case 38: //up
                                newX = npc.getX();
                                newY = npc.getY() - 1;
                                break;
                            case 39: //right
                                newX = npc.getX() + 1;
                                newY = npc.getY();
                                break;
                            case 40: //down
                                newX = npc.getX();
                                newY = npc.getY() + 1;
                                break;
                        }

                        //check new position for blocking
                        if (checkAttr(newX, newY, npc.getFloor(), npc, playerData)) {
                            //update npc position
                            mNpcData.remove(Tile.key(npc.getX(), npc.getY(), npc.getFloor()));
                            npc.setX(newX);
                            npc.setY(newY);
                            npc.setLastMove(now.getTime());
                            mNpcData.put(Tile.key(npc.getX(), npc.getY(), npc.getFloor()), npc);
                            
                            //send the snap and move direction
                            JSONObject newmsg = new JSONObject();
                            newmsg.put("npc", npc.toString());
                            newmsg.put("dir", dir);
                            ClientHandler.sendAllWithTest("npc-move:" + newmsg.toString(), (charID) -> {
                                DRow pchar = mData.Data.get("characters").get(charID);
                                int dist = Integer.parseInt(mData.Config.get("Game").get("draw_distance"));
                                int pX = (Integer) pchar.get("x");
                                int pY = (Integer) pchar.get("y");
                                if (npc.getX() - dist <= pX && npc.getX() + dist >= pX) {
                                    if (npc.getY() - dist <= pY && npc.getY() + dist >= pY) {
                                        return true;
                                    }
                                }
                                return false;
                            });
                        }
                    }
                }
            }
            
            for (Npc npc : mRespawn) {
                npc.tickRespawn();
            }
            while (mRespawn.peek() != null && mRespawn.peek().getRespawn() <= 0) {
                respawnNpc(mRespawn.poll());
            }
        }
        
        private Set<String> parseRaw(byte[] b) {
            Set<String> set = new HashSet();
            if (b == null || b.length <= 1) return set;
            JSONArray behavior = new JSONArray(new String(b, 1, b.length-1, Charset.forName("UTF-8")));
            for (int i = 0; i < behavior.length(); i++) {
                set.add(behavior.getString(i));
            }
            return set;
        }
    }
}
