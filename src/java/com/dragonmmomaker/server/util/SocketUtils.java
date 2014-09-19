/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.dragonmmomaker.server.util;

import java.util.Set;

import javax.websocket.RemoteEndpoint;
import javax.websocket.Session;

/**
 *
 * @author Bryce
 */
public class SocketUtils {
    private Session mSession;
    private Set<RemoteEndpoint.Async> mClients;

    public SocketUtils(Session pSession, Set<RemoteEndpoint.Async> pClients) {
        mSession = pSession;
        mClients = pClients;
    }
    
    public void send(String pMessage) {
        mSession.getAsyncRemote().sendText(pMessage);
    }

    public void sendAll(String pMessage) {
        for (RemoteEndpoint.Async a : mClients) {
            a.sendText(pMessage);
        }
    }
}
