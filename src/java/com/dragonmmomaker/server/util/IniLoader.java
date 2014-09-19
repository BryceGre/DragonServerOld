package com.dragonmmomaker.server.util;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IniLoader {
	private static Pattern _Section = Pattern.compile( "\\s*\\[([^]]*)\\]\\s*" );
	private static Pattern _Value = Pattern.compile( "\\s*([^=]*)=(.*)" );
	private String mPath;
	
	public IniLoader(String pPath) {
		mPath = pPath;
	}
	
	public Map<String,Map<String,String>> load() throws IOException {
		Map<String,Map<String,String>> config = new ConcurrentHashMap<String,Map<String,String>>();
		BufferedReader reader = new BufferedReader(new FileReader(mPath));
		String line;
		String section = null;
		while ((line = reader.readLine()) != null ) {
			if (line.charAt(0) == ';') {
				//comment line, skip
				continue;
			}
			Matcher match = _Section.matcher(line);
			if(match.matches()) {
				//new section
                                if (section != null) {
                                    Collections.unmodifiableMap(config.get(section));
                                }
				section = match.group(1).trim();
                                config.put(section, new ConcurrentHashMap<String,String>());   
			} else {
				//key/value pair
				match = _Value.matcher(line);
				if(match.matches()) {
					String key = match.group(1).trim();
					String val = match.group(2).trim();
					config.get(section).put(key, val);
				}
			}
		}
                Collections.unmodifiableMap(config.get(section));
		reader.close();
                
		return Collections.unmodifiableMap(config);
	}
}
