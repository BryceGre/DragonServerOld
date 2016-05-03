/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.dragonmmomaker.server.util;

import com.dragonmmomaker.server.ServData;
import java.util.Set;

import javax.websocket.Session;

import com.dragonmmomaker.server.handler.AdminHandler;
import com.dragonmmomaker.server.handler.ClientHandler;
import com.dragonmmomaker.server.player.Player;

/**
 *
 * @author Bryce
 */
public class SocketUtils {
    private Session mSession;
    private Set<Session> mClients;
    private ServData mData;
    
    public SocketUtils(ServData pData) {
        mSession = null;
        mClients = ClientHandler.getRemotes();
        mData = pData;
    }

    public SocketUtils(Session pSession, Set<Session> pClients, ServData pData) {
        mSession = pSession;
        mClients = pClients;
        mData = pData;
    }
    
    public int getIndex() {
        if (mSession != null) {
            if (mSession.getUserProperties().containsKey("char"))
                return (Integer) mSession.getUserProperties().get("char");
            if (mSession.getUserProperties().containsKey("acc"))
                return (Integer) mSession.getUserProperties().get("acc");
        }
        return -1;
    }
    
    public void send(String pMessage) {
        if (mSession != null) {
            mSession.getAsyncRemote().sendText(pMessage);
        } else {
            //no user to send message to
        }
    }
    
    public void sendAll(String pMessage) {
        if (mClients != null) {
            for (Session a : mClients) {
                if (a.getUserProperties().containsKey("loaded")) {
                    a.getAsyncRemote().sendText(pMessage);
                }
            }
        } else {
            //hook not specific to any user
            ClientHandler.sendAll(pMessage);
            AdminHandler.sendAll(pMessage);
        }
    }
    
    public void sendAllOther(String pMessage) {
        if (mSession != null && mClients != null) {
            for (Session a : mClients) {
                if (a.getUserProperties().containsKey("loaded")) {
                    if (!a.getId().equals(mSession.getId())) {
                        a.getAsyncRemote().sendText(pMessage);
                    }
                }
            }
        }
    }
    
    public void sendRange(String pMessage) {
        this.sendRangeOther(pMessage);
        mSession.getAsyncRemote().sendText(pMessage);
    }
    
    public void sendRangeOther(String pMessage) {
        int pID = (Integer) mSession.getUserProperties().get("char");
        Player player = mData.Players.getPlayer(pID);
        //TODO: range
        for (Player p : player.getPlayers()) {
            p.getClient().send(pMessage);
        }
    }
    
    public void sendTo(int pIndex, String pMessage) {
        for (Session a : mClients) {
            if (a.getUserProperties().containsKey("char")) {
                if (a.getUserProperties().get("char").equals(pIndex))
                    a.getAsyncRemote().sendText(pMessage);
            }
        }
    }
}
