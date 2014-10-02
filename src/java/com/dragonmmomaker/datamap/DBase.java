package com.dragonmmomaker.datamap;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.AbstractCollection;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

public class DBase implements Map<String, DTable> {

    private final Connection mConnection;
    private final HashSet<String> mBlacklist;

    public Connection getConnection() {
        return mConnection;
    }
    
    public boolean isClosed() {
        try {
            if (this.getConnection().isClosed()) return true;
        } catch (SQLException e) {
            return true;
        }
        return false;
    }

    public DBase(String pClass, String pDriver, String... pBlacklist) throws ClassNotFoundException, SQLException {
        Class.forName(pClass);
        mConnection = DriverManager.getConnection(pDriver);
        mBlacklist = new HashSet();
        for (int i = 0; i < pBlacklist.length; i++) {
            mBlacklist.add(pBlacklist[i].toLowerCase());
        }
    }
    
    //fixes issues with Nashorn and DatabaseMap
    public void fixEngine(ScriptEngine pEngine) {
        String headers = "var Util = com.dragonmmomaker.datamap.util.DUtil;\n";
        
        //wrap JSON.stingify to take a Map as an argument.
        //since JSON.stringify requires a ScriptObject by default
        StringBuilder json = new StringBuilder();
        json.append("var JSON = Object.create(JSON);\n");
        json.append("var JSONProto = Object.getPrototypeOf(JSON);\n");
        json.append("JSON.stringify = function(obj) {\n");
        json.append("    arguments[0] = JSON.toJS(obj);\n");
        json.append("    return JSONProto.stringify.apply(this, arguments);\n");
        json.append("};");
        json.append("JSON.toJS = function(obj) {\n");
        json.append("    if (obj instanceof Java.type('java.util.Map')) {\n");
        json.append("        var obj2 = Util.toJS(obj);\n");
        json.append("        for(var key in obj2) {\n");
        json.append("           obj2[key] = JSON.toJS(obj2[key])\n");
        json.append("        }; return obj2;\n");
        json.append("    } else if (obj instanceof Java.type('jdk.nashorn.internal.runtime.ScriptObject')) {\n");
        json.append("        for(var key in obj) {\n");
        json.append("           obj[key] = JSON.toJS(obj[key])\n");
        json.append("        }; return obj;\n");
        json.append("    } else {\n");
        json.append("        return obj;\n");
        json.append("    }\n");
        json.append("}");
        
        try {
            pEngine.eval(headers);
            pEngine.eval(json.toString());
        } catch (ScriptException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void clear() {
        // unsupported
        throw new UnsupportedOperationException();
    }

    @Override
    public boolean containsKey(Object arg0) {
        if (mBlacklist.contains(arg0.toString().toLowerCase())) {
            return false;
        }
        try {
            if (this.isClosed()) return false;
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            try (ResultSet rs = dbmeta.getTables(null, null, arg0.toString().toLowerCase(), null)) {
                return rs.next();
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    @Override
    public boolean containsValue(Object arg0) {
        // unsupported
        throw new UnsupportedOperationException();
    }
    
    @Override
    public Set<Map.Entry<String, DTable>> entrySet() {
        Set<Map.Entry<String, DTable>> entrySet = new LinkedHashSet();
        try {
            if (this.isClosed()) return entrySet;
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            try (ResultSet rs = dbmeta.getTables(null, null, "%", null)) {
                while (rs.next()) {
                    String name = rs.getString(3);
                    if (!mBlacklist.contains(name)) {
                        entrySet.add(new DBase.Entry(name, new DTable(name, this)));
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return entrySet;
    }

    @Override
    public DTable get(Object arg0) {
        if (mBlacklist.contains(arg0.toString().toLowerCase())) {
            return null;
        }
        if (this.isClosed()) return null;
        String sql = "CREATE TABLE IF NOT EXISTS " + arg0.toString().toLowerCase() + " (id SERIAL PRIMARY KEY, key VARCHAR(255) UNIQUE)";
        try (PreparedStatement statement = mConnection.prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
            statement.close();
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
        return new DTable(arg0.toString(), this);
    }

    @Override
    public boolean isEmpty() {
        try {
            if (this.isClosed()) return true;
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            try (ResultSet rs = dbmeta.getTables(null, null, "%", null)) {
                while (rs.next()) {
                    if (!mBlacklist.contains(rs.getString(3))) {
                        return false;
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return true;
    }

    @Override
    public Set<String> keySet() {
        Set<String> keySet = new LinkedHashSet<String>();
        try {
            if (this.isClosed()) return keySet;
            DatabaseMetaData dbmeta = mConnection.getMetaData();
            try (ResultSet rs = dbmeta.getTables(null, null, "%", null)) {
                while (rs.next()) {
                    String name = rs.getString(3);
                    if (!mBlacklist.contains(name)) {
                        keySet.add(name);
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return keySet;
    }

    @Override
    public DTable put(String arg0, DTable arg1) {
        // unsupported
        throw new UnsupportedOperationException();
    }

    @Override
    public void putAll(Map<? extends String, ? extends DTable> arg0) {
        // unsupported
        throw new UnsupportedOperationException();
    }

    @Override
    public DTable remove(Object arg0) {
        if (mBlacklist.contains(arg0.toString().toLowerCase())) {
            return null;
        }
        if (this.isClosed()) return null;
        String sql = "DROP TABLE IF EXISTS " + arg0.toString().toLowerCase();
        try (PreparedStatement statement = mConnection.prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
            statement.close();
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    @Override
    public int size() {
        return this.keySet().size();
    }

    @Override
    public Collection<DTable> values() {
        Collection<DTable> values = new AbstractCollection<DTable>() {
            @Override
            public Iterator<DTable> iterator() {
                return new Iterator<DTable>() {
                    private Iterator<Map.Entry<String, DTable>> mItr = DBase.this.entrySet().iterator();

                    @Override
                    public boolean hasNext() {
                        return mItr.hasNext();
                    }

                    @Override
                    public DTable next() {
                        return mItr.next().getValue();
                    }
                };
            }

            @Override
            public int size() {
                return DBase.this.size();
            }
        };

        //populate the collection
        Iterator<DTable> itr = values.iterator();
        while (itr.hasNext()) {
            values.add(itr.next());
        }

        return values;
    }

    public class Entry implements Map.Entry<String, DTable> {

        private String mKey;
        private DTable mValue;

        public Entry(String pKey, DTable pValue) {
            mKey = pKey;
            mValue = pValue;
        }

        @Override
        public String getKey() {
            return mKey;
        }

        @Override
        public DTable getValue() {
            return mValue;
        }

        @Override
        public DTable setValue(DTable arg0) {
            return DBase.this.put(mKey, arg0);
        }
    }
}
