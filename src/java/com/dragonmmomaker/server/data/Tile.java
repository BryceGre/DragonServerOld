package com.dragonmmomaker.server.data;

import java.sql.ResultSet;
import java.sql.SQLException;

import com.dragonmmomaker.server.ServData;

public class Tile {
    
    public static final String DEFAULT_TILE = "0000.......";

    private final ServData mServData;

    private int mID;
    private int mX;
    private int mY;
    private short mFloor;
    private String mData;
    private String mAttr1;
    private String mAttr2;

    /**
     * *******************************
     */
    /**
     * ******** Constructors *********
     */
    /**
     * *******************************
     */
    @Deprecated
    public Tile(int pID, int pX, int pY, short pFloor, String pData, String pAttr1, String pAttr2) {
        this(ServData._CurData, pID, pX, pY, pFloor, pData, pAttr1, pAttr2);
    }

    public Tile(final ServData pServData, int pID, int pX, int pY, short pFloor, String pData, String pAttr1, String pAttr2) {
        mServData = pServData;
        
        mID = pID;
        mX = pX;
        mY = pY;
        mFloor = pFloor;
        mData = pData;
        mAttr1 = pAttr1;
        mAttr2 = pAttr2;
        
    }
    
    @Deprecated
    public Tile(int pX, int pY, short pFloor) throws SQLException {
        this(ServData._CurData, pX, pY, pFloor, DEFAULT_TILE, "", "");
    }
    
    public Tile(ServData pServData, int pX, int pY, short pFloor) throws SQLException {
        this(pServData, pX, pY, pFloor, DEFAULT_TILE, "", "");
    }

    @Deprecated
    public Tile(int pX, int pY, short pFloor, String pData) throws SQLException {
        this(ServData._CurData, pX, pY, pFloor, pData, "", "");
    }

    public Tile(ServData pServData, int pX, int pY, short pFloor, String pData) throws SQLException {
        this(pServData, pX, pY, pFloor, pData, "", "");
    }

    @Deprecated
    public Tile(int pX, int pY, short pFloor, String pData, String pAttr1, String pAttr2) throws SQLException {
        this(ServData._CurData, pX, pY, pFloor, pData, pAttr1, pAttr2);
    }

    public Tile(ServData pServData, int pX, int pY, short pFloor, String pData, String pAttr1, String pAttr2) throws SQLException {
        mServData = pServData;
        int pID = -1;
        
        String sql = "INSERT INTO tiles (x,y,floor,data,attr1,attr2)";
        sql += " VALUES (" + pX + "," + pY + "," + pFloor + ",'" + pData + "','" + pAttr1 + "','" + pAttr2 + "')";
        
        try (ResultSet rs = mServData.DB.Insert(sql)) {
            if (rs.next()) {
                pID = rs.getInt("id");
                while (rs.next()); //close the connection

                //pServData.Game.Tiles.put(Tile.key(pX, pY, pFloor), this);
            }
        }
        
        mID = pID;
        mX = pX;
        mY = pY;
        mFloor = pFloor;
        mData = pData;
        mAttr1 = pAttr1;
        mAttr2 = pAttr2;
    }

    /**
     * ******************************
     */
    /**
     * ****** Getters/Setters *******
     */
    /**
     * ******************************
     */
    /**
     * ****** Basic Getters *******
     */
    public int getID() {
        return mID;
    }

    public int getX() {
        return mX;
    }

    public int getY() {
        return mY;
    }

    public short getFloor() {
        return mFloor;
    }

    /**
     * ****** Tile Getters/Setters *******
     */
    public String getData() {
        return mData;
    }

    public void setData(String pData) {
        mData = pData;
        if (!checkDummy()) {
            mServData.DB.Update("UPDATE tiles SET data='" + getData() + "' WHERE id=" + getID());
        }
    }

    public String getA1data() {
        return mAttr1;
    }

    public void setA1data(String pData) {
        mAttr1 = pData;
        if (!checkDummy()) {
            mServData.DB.Update("UPDATE tiles SET attr1='" + getA1data() + "' WHERE id=" + getID());
        }
    }

    public String getA2data() {
        return mAttr2;
    }

    public void setA2data(String pData) {
        mAttr2 = pData;
        if (!checkDummy()) {
            mServData.DB.Update("UPDATE tiles SET attr2='" + getA2data() + "' WHERE id=" + getID());
        }
    }

    /**
     * ****** Data Getters/Setters *******
     */
    /**
     * ****** Needed for Nashorn  *******
     */
    
    public String toData() {
        return getData();
    }
    
    //Attribute 1
    public int getAttr1() {
        return Integer.parseInt(mData.substring(0, 1), 36);
    }

    public void setAttr1(int pI) {
        setData(Integer.toString(pI, 36) + mData.substring(1));
    }

    //Attribute 2

    public int getAttr2() {
        return Integer.parseInt(mData.substring(1, 2), 36);
    }

    public void setAttr2(int pI) {
        setData(mData.substring(0, 1) + Integer.toString(pI, 36) + mData.substring(2));
    }
    
    
    
    //Music
    
    public int getMusic() {
        return Integer.parseInt(mData.substring(2, 4), 36);
    }
    
    public void setMusic(int pI) {
        setData(mData.substring(0, 2) + zeroPad(Integer.toString(pI, 36), 2) + mData.substring(4));
    }

    //Ground (level 0)

    public int getGrs() {
        return getLevs(0);
    }

    public void setGrs(int pI) {
        setLevs(0, pI);
    }

    public int getGrx() {
        return getLevx(0);
    }

    public void setGrx(int pI) {
        setLevx(0, pI);
    }

    public int getGry() {
        return getLevy(0);
    }

    public void setGry(int pI) {
        setLevy(0, pI);
    }

    //Mask 1 (level 1)

    public int getM1s() {
        return getLevs(1);
    }

    public void setM1s(int pI) {
        setLevs(1, pI);
    }

    public int getM1x() {
        return getLevx(1);
    }

    public void setM1x(int pI) {
        setLevx(1, pI);
    }

    public int getM1y() {
        return getLevy(1);
    }

    public void setM1y(int pI) {
        setLevy(1, pI);
    }

    //Mask 2 (level 2)

    public int getM2s() {
        return getLevs(2);
    }

    public void setM2s(int pI) {
        setLevs(2, pI);
    }

    public int getM2x() {
        return getLevx(2);
    }

    public void setM2x(int pI) {
        setLevx(2, pI);
    }

    public int getM2y() {
        return getLevy(2);
    }

    public void setM2y(int pI) {
        setLevy(2, pI);
    }

    //Mask Anim (level 3)

    public int getMas() {
        return getLevs(3);
    }

    public void setMas(int pI) {
        setLevs(3, pI);
    }

    public int getMax() {
        return getLevx(3);
    }

    public void setMax(int pI) {
        setLevx(3, pI);
    }

    public int getMay() {
        return getLevy(3);
    }

    public void setMay(int pI) {
        setLevy(3, pI);
    }

    //Fringe 1 (level 4)

    public int getF1s() {
        return getLevs(4);
    }

    public void setF1s(int pI) {
        setLevs(4, pI);
    }

    public int getF1x() {
        return getLevx(4);
    }

    public void setF1x(int pI) {
        setLevx(4, pI);
    }

    public int getF1y() {
        return getLevy(4);
    }

    public void setF1y(int pI) {
        setLevy(4, pI);
    }

    //Fringe 2 (level 5)

    public int getF2s() {
        return getLevs(5);
    }

    public void setF2s(int pI) {
        setLevs(5, pI);
    }

    public int getF2x() {
        return getLevx(5);
    }

    public void setF2x(int pI) {
        setLevx(5, pI);
    }

    public int getF2y() {
        return getLevy(5);
    }

    public void setF2y(int pI) {
        setLevy(5, pI);
    }

    //Fringe Anim (level 6)
    public int getFas() {
        return getLevs(6);
    }

    public void setFas(int pI) {
        setLevs(6, pI);
    }

    public int getFax() {
        return getLevx(6);
    }

    public void setFax(int pI) {
        setLevx(6, pI);
    }

    public int getFay() {
        return getLevy(6);
    }

    public void setFay(int pI) {
        setLevy(6, pI);
    }
    
    //Light (level 7)
    
    public int getLis() {
        return getLevs(7);
    }

    public void setLis(int pI) {
        setLevs(7, pI);
    }

    public int getLix() {
        return getLevx(7);
    }

    public void setLix(int pI) {
        setLevx(7, pI);
    }

    public int getLiy() {
        return getLevy(7);
    }
    
    public void setLiy(int pI) {
        setLevy(7, pI);
    }
    
    //HELPER
    private int getLevs(int pLev) {
        String[] datas = mData.substring(4).split("\\.");
        if (datas[pLev].length() > 0) {
            return Integer.parseInt(datas[pLev].substring(0, 1), 36);
        } else {
            return 0;
        }
    }

    private void setLevs(int pLev, int pI) {
        String[] datas = mData.substring(4).split("\\.");
        if (datas[pLev].length() > 0) {
            datas[pLev] = Integer.toString(pI, 36) + datas[pLev].substring(1);
        } else {
            datas[pLev] = Integer.toString(pI, 36) + "000";
        }
        setData(mData.substring(0, 4) + concat(datas, "."));
    }

    private int getLevx(int pLev) {
        String[] datas = mData.substring(4).split("\\.");
        if (datas[pLev].length() > 0) {
            return Integer.parseInt(datas[pLev].substring(1, 2), 36);
        } else {
            return 0;
        }
    }

    private void setLevx(int pLev, int pI) {
        String[] datas = mData.substring(4).split("\\.");
        if (datas[pLev].length() > 0) {
            datas[pLev] = datas[pLev].substring(0, 1) + Integer.toString(pI, 36) + datas[pLev].substring(2);
        } else {
            datas[pLev] = "0" + Integer.toString(pI, 36) + "00";
        }
        setData(mData.substring(0, 4) + concat(datas, "."));
    }

    private int getLevy(int pLev) {
        String[] datas = mData.substring(4).split("\\.");
        if (datas[pLev].length() > 0) {
            return Integer.parseInt(datas[pLev].substring(2, 4), 36);
        } else {
            return 0;
        }
    }

    private void setLevy(int pLev, int pI) {
        String[] datas = mData.substring(4).split("\\.");
        if (datas[pLev].length() > 0) {
            datas[pLev] = datas[pLev].substring(0, 2) + zeroPad(Integer.toString(pI, 36), 2);
        } else {
            datas[pLev] = "00" + zeroPad(Integer.toString(pI, 36), 2);
        }
        setData(mData.substring(0, 4) + concat(datas, "."));
    }

    //toString
    public String toString() {
         //TODO: base-36 (mX and mY)
        return this.mX + "," + this.mY + "," + this.mFloor + "," + this.mData + "," + this.mAttr1 + "," + this.mAttr2;
    }
    
    public boolean checkDummy() {
        if (mID == 0) {
            String sql = "INSERT INTO tiles (x,y,floor,data,attr1,attr2)";
            sql += " VALUES (" + getX() + "," + getY() + "," + getFloor() + ",'" + getData() + "','" + getAttr1() + "','" + getAttr2() + "')";
            try (ResultSet rs = mServData.DB.Insert(sql)) {
                if (rs.next()) {
                    this.mID = rs.getInt("id");
                    while (rs.next()); //close the connection

                    //pServData.Game.Tiles.put(Tile.key(pX, pY, pFloor), this);
                }
                
                return true;
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
        return false;
    }

    /**
     * *******************************
     */
    /**
     * ******* Static Methods ********
     */
    /**
     * *******************************
     */
    public static String getStructure() {
        String structure = "";
        structure += "id SERIAL PRIMARY KEY, ";
        structure += "x INTEGER NOT NULL DEFAULT 0, ";
        structure += "y INTEGER NOT NULL DEFAULT 0, ";
        structure += "floor INTEGER NOT NULL DEFAULT 0, ";
        structure += "data VARCHAR(63) NOT NULL DEFAULT '', ";
        structure += "attr1 VARCHAR(255) NOT NULL DEFAULT '', ";
        structure += "attr2 VARCHAR(255) NOT NULL DEFAULT ''";

        return structure;
    }

    public static String key(Tile pTile) {
        return key(pTile.mX, pTile.mY, pTile.mFloor);
    }
    
    public static String key(int pX, int pY, int pFloor) {
        return pX + "." + pY + "." + pFloor;
    }
    
    private static String concat(String[] strings, String cement) {
        StringBuilder sb = new StringBuilder();
        for (String str : strings) {
            sb.append(str);
            sb.append(cement);
        }
        sb.delete(sb.length() - cement.length(), sb.length());
        return sb.toString();
    }
    
    private static String zeroPad(String num, int size) {
        String s = "000000000" + num;
        return s.substring(s.length()-size);
    }
}
