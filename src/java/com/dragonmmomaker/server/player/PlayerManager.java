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

package com.dragonmmomaker.server.player;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * A class to manage all Player characters.
 * @author Bryce
 */

//TODO: Custom Map to save memory
public class PlayerManager {
    private Map<Integer, Player> mPlayers; //List of players
    
    /**
     * Constructor
     */
    public PlayerManager() {
        mPlayers = new HashMap();
    }
    
    public Player getPlayer(int pID) {
        return mPlayers.get(pID);
    }
    
    public Player putPlayer(int pID, Player pPlayer) {
        return mPlayers.put(pID, pPlayer);
    }
    
    public int countPlayers() {
        return mPlayers.size();
    }
    
    public Set<Player> getAll() {
        return new HashSet(mPlayers.values());
    }
}
