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

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A class build to quickly and easily read a .ini file into a nested Map
 * @author Bryce
 */
public class IniLoader {
    //pattern to match a line for a section
    private static Pattern _Section = Pattern.compile( "\\s*\\[([^]]*)\\]\\s*" );
    //pattern to match a line for a value
    private static Pattern _Value = Pattern.compile( "\\s*([^=]*)=(.*)" );
    //path of the .ini file
    private final String mPath;

    /**
     * Constructor
     * @param pPath the path to the .ini file 
     */
    public IniLoader(String pPath) {
        mPath = pPath;
    }

    /**
     * Read and parse the .ini file into a nested map
     * The map will have the format get("section").get("value")
     * @return A nested map containing the .ini data
     * @throws IOException if the file could not be reada
     */
    public Map<String,Map<String,String>> load() throws IOException {
        //create a thread-safe map
        Map<String,Map<String,String>> config = new ConcurrentHashMap<String,Map<String,String>>();
        //read the file using a BufferedReader
        BufferedReader reader = new BufferedReader(new FileReader(mPath));
        String line;
        String section = null;
        //for each line
        while ((line = reader.readLine()) != null ) {
            if (line.charAt(0) == ';') {
                //this line is a comment line, skip
                continue;
            }
            //check if the line matches a section
            Matcher match = _Section.matcher(line);
            if(match.matches()) {
                //this line is a new section
                if (section != null) {
                    //lock the old section from modifications
                    Collections.unmodifiableMap(config.get(section));
                }
                //trim the section's name, and add it to the map
                section = match.group(1).trim();
                config.put(section, new ConcurrentHashMap<String,String>());   
            } else {
                //this line is a key/value pair
                match = _Value.matcher(line);
                if(match.matches()) {
                    //get the key and value
                    String key = match.group(1).trim();
                    String val = match.group(2).trim();
                    //and add it to the map
                    config.get(section).put(key, val);
                }
            }
        }
        if (section != null) {
            //lock the last section from modifications
            Collections.unmodifiableMap(config.get(section));
        }
        //close the reader
        reader.close();

        //return the map
        return Collections.unmodifiableMap(config);
    }
}
