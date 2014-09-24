/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.dragonmmomaker.server.util;

import java.util.Set;

import javax.websocket.Session;

/**
 *
 * @author Bryce
 */
public class SocketUtils {
    private Session mSession;
    private Set<Session> mClients;

    public SocketUtils(Session pSession, Set<Session> pClients) {
        mSession = pSession;
        mClients = pClients;
    }
    
    public void send(String pMessage) {
        mSession.getAsyncRemote().sendText(pMessage);
    }

    public void sendAll(String pMessage) {
        for (Session a : mClients) {
            if (a.getUserProperties().containsKey("loaded")) {
                a.getAsyncRemote().sendText(pMessage);
            }
        }
    }
    
    public void sendAllOther(String pMessage) {
        for (Session a : mClients) {
            if (a.getUserProperties().containsKey("loaded")) {
                if (!a.getId().equals(mSession.getId())) {
                    a.getAsyncRemote().sendText(pMessage);
                }
            }
        }
    }
    
    public void sendRange(String pMessage) {
        //TODO: range
        this.sendAll(pMessage);
    }
    
    public void sendRangeOther(String pMessage) {
        //TODO: range
        this.sendAllOther(pMessage);
    }
}
