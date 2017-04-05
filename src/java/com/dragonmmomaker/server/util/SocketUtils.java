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

import com.dragonmmomaker.server.ServData;
import java.util.Set;

import javax.websocket.Session;

import com.dragonmmomaker.server.handler.AdminHandler;
import com.dragonmmomaker.server.handler.ClientHandler;
import com.dragonmmomaker.server.player.Player;

/**
 * Class containing utilities for sending and recieving game messages.
 * @author Bryce
 */
public class SocketUtils {
    private Session mSession; //current client's session
    private Set<Session> mClients; //list of connected clients
    private ServData mData; //current server data
    
    /**
     * Constructor
     * @param pData current server data
     */
    public SocketUtils(ServData pData) {
        mSession = null;
        mClients = ClientHandler.getRemotes();
        mData = pData;
    }

    /**
     * Constructor
     * @param pSession current client's session
     * @param pClients list of connected clients
     * @param pData current server data
     */
    public SocketUtils(Session pSession, Set<Session> pClients, ServData pData) {
        mSession = pSession;
        mClients = pClients;
        mData = pData;
    }
    
    /**
     * Get an ID for this connected client
     * @return this client's ID
     */
    public int getIndex() {
        //if the session exists
        if (mSession != null) {
            //if the user is logged in, return his/her character id
            if (mSession.getUserProperties().containsKey("char"))
                return (Integer) mSession.getUserProperties().get("char");
            //else, return his/her account id
            if (mSession.getUserProperties().containsKey("acc"))
                return (Integer) mSession.getUserProperties().get("acc");
        }
        //return no id
        return -1;
    }
    
    /**
     * Send a message to the current game client
     * @param pMessage the message to send
     */
    public void send(String pMessage) {
        if (mSession != null) {
            mSession.getAsyncRemote().sendText(pMessage);
        } else {
            //no user to send message to
        }
    }
    
    /**
     * Send a message to all game clints
     * @param pMessage the message to send
     */
    public void sendAll(String pMessage) {
        if (mClients != null) {
            //for each client
            for (Session a : mClients) {
                //if the client has loaded in-game
                if (a.getUserProperties().containsKey("loaded")) {
                    //send the message
                    a.getAsyncRemote().sendText(pMessage);
                }
            }
        } else {
            //hook not specific to any user, use generic sendAll
            ClientHandler.sendAll(pMessage);
            AdminHandler.sendAll(pMessage);
        }
    }
    
    /**
     * Send a message to all game clients except the current game client
     * @param pMessage 
     */
    public void sendAllOther(String pMessage) {
        if (mSession != null && mClients != null) {
            //for each client
            for (Session a : mClients) {
                //if the client has loaded in-game
                if (a.getUserProperties().containsKey("loaded")) {
                    //and is not the current client
                    if (!a.getId().equals(mSession.getId())) {
                        //send the message
                        a.getAsyncRemote().sendText(pMessage);
                    }
                }
            }
        }
    }
    
    /**
     * Send a message to all game clients within range of the current game client
     * @param pMessage the message to send
     */
    public void sendRange(String pMessage) {
        this.sendRangeOther(pMessage); //send to other clients in range
        mSession.getAsyncRemote().sendText(pMessage); //send to this client
    }
    
    /**
     * Send a message to all game clients within range of the current game client,
     * except the current game client
     * @param pMessage 
     */
    public void sendRangeOther(String pMessage) {
        //get the current character id
        int pID = (Integer) mSession.getUserProperties().get("char");
        //get the current player
        Player player = mData.Players.getPlayer(pID);
        //for each other player loaded for this player
        for (Player p : player.getPlayers()) {
            //send the message
            p.getClient().send(pMessage);
        }
    }
    
    /**
     * Send a message to a specific game client
     * @param pIndex the ID if the client's character
     * @param pMessage the message to send
     */
    public void sendTo(int pIndex, String pMessage) {
        //for each client
        for (Session a : mClients) {
            //if the client has a character selected
            if (a.getUserProperties().containsKey("char")) {
                //and the character is the intended recipient
                if (a.getUserProperties().get("char").equals(pIndex))
                    //send the message
                    a.getAsyncRemote().sendText(pMessage);
            }
        }
    }
}
