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

/**
 * A class for logging data
 * @author Bryce
 */
public abstract class LogCallback {
    /**
     * Add an entry to the log
     * @param pId the ID of the entry
     * @param pMessage the message of the entry
     */
    public abstract void log(int pId, String pMessage);
    
    /**
     * Add an entry to the log
     * @param pMessage the message of the entry
     */
    public void log(String pMessage) {
        this.log(0, pMessage);
    }
    
    /**
     * Add an entry to the debug log, if enabled
     * @param pMessage the message of the entry
     */
    public void debug(String pMessage) {
        //do nothing by default
    }
}