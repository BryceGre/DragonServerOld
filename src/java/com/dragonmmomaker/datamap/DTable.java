package com.dragonmmomaker.datamap;

import java.nio.charset.Charset;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.AbstractCollection;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import com.dragonmmomaker.datamap.binary.BinaryDB;
import com.dragonmmomaker.datamap.util.ArrayMap;

public class DTable implements Map<Object, DRow> {

    protected DBase mBase;
    private String mName;

    public String getName() {
        return mName;
    }
    
    public DTable(String pTableName, DBase pBase) {
        mName = pTableName;
        mBase = pBase;
    }

    @Override
    public void clear() {
        String sql = "DROP TABLE " + mName;
        if (mBase.isClosed()) return;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
        sql = "CREATE TABLE " + mName + " (id SERIAL PRIMARY KEY, key VARCHAR(255) UNIQUE)";
        if (mBase.isClosed()) return;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(30);

            statement.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    @Override
    public boolean containsKey(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0);
        if (mBase.isClosed()) return false;
        if (id != null) {
            //arg0 is a number, check the id column
            return true; //can create any key
            //need to do this because nashorn checks containsKey before calling get
        } else if (arg0 != null) {
            //arg0 is an object, check the key column
            String sql = "SELECT * FROM " + mName + " WHERE key=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg0.toString());
                statement.setQueryTimeout(30);

                try(ResultSet rs = statement.executeQuery()) {
                    return rs.next();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        return false;
    }
    
    //use this instead of containsKey if you actually are checking
    public boolean containsID(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0);
        if (mBase.isClosed()) return false;
        if (id != null) {
            //arg0 is a number, check the id column
            String sql = "SELECT * FROM " + mName + " WHERE id=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setInt(1, id);
                statement.setQueryTimeout(30);

                try(ResultSet rs = statement.executeQuery()) {
                    return rs.next();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        } else if (arg0 != null) {
            //arg0 is an object, check the key column
            String sql = "SELECT * FROM " + mName + " WHERE key=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg0.toString());
                statement.setQueryTimeout(30);

                try(ResultSet rs = statement.executeQuery()) {
                    return rs.next();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        return false;
    }

    @Override
    public boolean containsValue(Object arg0) {
        return false;
    }
    
    @Override
    public Set<Map.Entry<Object, DRow>> entrySet() {
        Set<Map.Entry<Object, DRow>> entrySet = new LinkedHashSet<Map.Entry<Object, DRow>>();
        if (mBase.isClosed()) return entrySet;
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    int id = rs.getInt("id");
                    entrySet.add(new DTable.Entry(new Integer(id), new DRow(id, this)));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return entrySet;
    }
    
    @Override
    public DRow get(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0);
        if (mBase.isClosed()) return null;
        if (id != null) {
            //arg0 is a number, check the id column
            DRow row = new DRow(id, this);
            if (!row.containsKey("id")) {
                //row doesn't exist, create it.
                String sql = "INSERT INTO " + mName + " (id) VALUES (?)";
                try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                    statement.setInt(1, id);
                    statement.setQueryTimeout(60);

                    statement.executeUpdate();
                } catch (SQLException e) {
                    e.printStackTrace();
                }
                return new DRow(id, this);
            }
            return row;
        } else if (arg0 != null) {
            //arg0 is an object, use the key column
            DRow row = new DRow(arg0.toString(), this);
            if (row.containsKey("id")) {
                //row found, return it.
                return row;
            } else {
                //row not found, return null
                return null;
            }
            
        }
        return null;
    }
    
    public ArrayMap<Map<Object,Object>> list(Object... arg0) {
        ArrayMap<Map<Object,Object>> all = new ArrayMap();
        if (mBase.isClosed()) return all;
        //compile args into string keys
        String[] keys = new String[arg0.length];
        //compile from all args
        for (int i=0; i<arg0.length; i++) {
            if (!arg0[i].toString().toLowerCase().equals("id")) {
                keys[i] = arg0[i].toString().toLowerCase();
            }
        }
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    //create a new map
                    Map<Object,Object> map = new HashMap();
                    //for each key, add the value to the map
                    for (int i=0; i<keys.length; i++) {
                        if (keys[i].equals("key")) {
                            map.put("key", rs.getString("key"));
                        } else {
                            byte[] raw = null;
                            try {
                                raw = rs.getBytes(keys[i]);
                            } catch (SQLException e) { } //column doesn't exist

                            Object value = null;
                            if (raw != null) {
                                value = BinaryDB.retrieveObject(raw);
                            }
                            map.put(keys[i], value);
                        }
                    }
                    //add the map to the output
                    all.put(rs.getInt("id"), map);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return all;
    }
    
    public ArrayMap<Object> list(Object arg0) {
        ArrayMap<Object> all = new ArrayMap();
        if (arg0.toString().toLowerCase().equals("id")) {
            //requested a list of IDs
            Set<Object> keys = this.keySet();
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            return all;
        }
        if (mBase.isClosed()) return all;
        String sql = "";
        if (arg0.toString().toLowerCase().equals("key")) {
            sql = "SELECT id,key FROM " + mName;
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setQueryTimeout(60);

                try(ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        all.put(rs.getInt("id"), rs.getString("key"));
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
            return all;
        }
        //make sure column exists
        sql = "ALTER TABLE " + mName + " ADD " + arg0.toString().toLowerCase() + " BYTEA";
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);
            statement.executeUpdate();
            
            //column didn't exist, return all nulls
            Set<Object> keys = this.keySet();
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            return all;
        } catch (SQLException e) { /*column exists*/ }
        if (mBase.isClosed()) return all;
        sql = "SELECT id," + arg0.toString().toLowerCase() + " FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try(ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    byte[] raw = rs.getBytes(arg0.toString().toLowerCase());

                    Object value = null;
                    if (raw != null) {
                        value = BinaryDB.retrieveObject(raw);
                    }

                    all.put(rs.getInt("id"), value);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return all;
    }
    
    
    public ArrayMap<Map<String,byte[]>> listRaw(Object... arg0) {
        ArrayMap<Map<String,byte[]>> all = new ArrayMap();
        if (mBase.isClosed()) return all;
        //compile args into string keys
        String[] keys = new String[arg0.length];
        //compile from all args
        for (int i=0; i<arg0.length; i++) {
            if (!arg0[i].toString().toLowerCase().equals("id")) {
                keys[i] = arg0[i].toString().toLowerCase();
            }
        }
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    //create a new map
                    Map<String,byte[]> map = new HashMap();
                    //for each key, add the value to the map
                    for (int i=0; i<keys.length; i++) {
                        if (keys[i].equals("key")) {
                            map.put("key", rs.getString("key").getBytes(Charset.forName("UTF-8")));
                        } else {
                            byte[] raw = null;
                            try { 
                                raw = rs.getBytes(keys[i]);
                            } catch (SQLException e) { } //column doesn't exist

                            map.put(keys[i], raw);
                        }
                    }
                    //add the map to the output
                    all.put(rs.getInt("id"), map);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return all;
    }
    
    public ArrayMap<byte[]> listRaw(Object arg0) {
        ArrayMap<byte[]> all = new ArrayMap();
        if (arg0.toString().toLowerCase() == "id") {
            //requested a list of IDs
            Set<Object> keys = this.keySet();
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            return all;
        }
        if (mBase.isClosed()) return all;
        String sql = "";
        if (arg0.toString().toLowerCase().equals("key")) {
            sql = "SELECT id,key FROM " + mName;
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setQueryTimeout(60);

                try(ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        all.put(rs.getInt("id"), rs.getString("key").getBytes(Charset.forName("UTF-8")));
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
            return all;
        }
        //make sure column exists
        sql = "ALTER TABLE " + mName + " ADD " + arg0.toString().toLowerCase() + " BYTEA";
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);
            statement.executeUpdate();
            
            //column didn't exist, return all nulls
            Set<Object> keys = this.keySet();
            for (Object i : keys) {
                all.put((Integer)i, null);
            }
            return all;
        } catch (SQLException e) { /*column exists*/ }
        if (mBase.isClosed()) return all;
        sql = "SELECT id," + arg0.toString().toLowerCase() + " FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    byte[] raw = rs.getBytes(arg0.toString().toLowerCase());
                    all.put(rs.getInt("id"), raw);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return all;
    }

    @Override
    public boolean isEmpty() {
        if (mBase.isClosed()) return true;
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return true;
    }
    
    @Override
    public Set<Object> keySet() {
        Set<Object> keySet = new LinkedHashSet();
        if (mBase.isClosed()) return keySet;
        String sql = "SELECT * FROM " + mName;
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
            statement.setQueryTimeout(60);

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    keySet.add(new Integer(rs.getInt("id")));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return keySet;
    }

    @Override
    public DRow put(Object arg0, DRow arg1) {
        return null; // unsupported, use get for autocreate
    }
    
    public DRow insert() {
        if (mBase.isClosed()) return null;
        String sql = "INSERT INTO " + mName + " DEFAULT VALUES";
        try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            statement.setQueryTimeout(30);
            statement.executeUpdate();
            
            try (ResultSet rs = statement.getGeneratedKeys()) {
                if (rs.next()) {
                    return new DRow(rs.getInt("id"), this);
                }
            }
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }

    @Override
    public void putAll(Map<? extends Object, ? extends DRow> arg0) {
        // unsupported
    }

    @Override
    public DRow remove(Object arg0) {
        Integer id = ArrayMap.fixInt(arg0);
        if (mBase.isClosed()) return null;
        if (id != null) {
            String sql = "DELETE FROM " + mName + " WHERE id=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setInt(1, id);
                statement.setQueryTimeout(30);

                statement.executeUpdate();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        } else if (arg0 != null) {
            String sql = "DELETE FROM " + mName + " WHERE key=?";
            try (PreparedStatement statement = mBase.getConnection().prepareStatement(sql)) {
                statement.setString(1, arg0.toString());
                statement.setQueryTimeout(30);

                statement.executeUpdate();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        return null;
    }

    @Override
    public int size() {
        return this.keySet().size();
    }

    @Override
    public Collection<DRow> values() {
        Collection<DRow> values = new AbstractCollection<DRow>() {
            @Override
            public Iterator<DRow> iterator() {
                return new Iterator<DRow>() {
                    private Iterator<Map.Entry<Object, DRow>> mItr = DTable.this.entrySet().iterator();

                    @Override
                    public boolean hasNext() {
                        return mItr.hasNext();
                    }

                    @Override
                    public DRow next() {
                        return mItr.next().getValue();
                    }
                };
            }

            @Override
            public int size() {
                return DTable.this.size();
            }
        };

        //populate the collection
        Iterator<DRow> itr = values.iterator();
        while (itr.hasNext()) {
            values.add(itr.next());
        }

        return values;
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((mName == null) ? 0 : mName.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        DTable other = (DTable) obj;
        if (mName == null) {
            if (other.mName != null) {
                return false;
            }
        } else if (!mName.equals(other.mName)) {
            return false;
        }
        return true;
    }

    public class Entry implements Map.Entry<Object, DRow> {

        private Object mKey;
        private DRow mValue;

        public Entry(Object pKey, DRow pValue) {
            mKey = pKey;
            mValue = pValue;
        }

        @Override
        public Object getKey() {
            return mKey;
        }

        @Override
        public DRow getValue() {
            return mValue;
        }

        @Override
        public DRow setValue(DRow arg0) {
            return DTable.this.put(mKey, arg0);
        }
    }
}
