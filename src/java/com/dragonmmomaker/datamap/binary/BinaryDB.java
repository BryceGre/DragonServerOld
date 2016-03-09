/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package com.dragonmmomaker.datamap.binary;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.util.Date;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.api.scripting.ScriptUtils;
import jdk.nashorn.internal.objects.NativeJSON;
import jdk.nashorn.internal.runtime.Context;
import jdk.nashorn.internal.runtime.ScriptObject;


/**
 *
 * @author Bryce
 */
public class BinaryDB {
    public static byte[] prepareObject(Object o) {
        ByteBuffer buff;
        //first, try to unwrap any ScriptObjectMirror into a ScriptObject
        if (o instanceof ScriptObjectMirror) {
            o = ScriptUtils.unwrap(o); //may or may not work
        }
        
        //basic Java objects
        if (o == null) {
            buff = ByteBuffer.allocate(0);
        } else if (o.getClass() == Byte.class) {
            buff = ByteBuffer.allocate(1+1);
            buff.put((byte)0x00);
            buff.put((Byte)o);
        } else if (o.getClass() == Boolean.class) {
            buff = ByteBuffer.allocate(1+1);
            buff.put((byte)0x01);
            if (Boolean.TRUE.equals(o)) {
                buff.put((byte)0x01);
            } else {
                buff.put((byte)0x00);
            }
        } else if (o.getClass() == Character.class) {
            buff = ByteBuffer.allocate(1+2);
            buff.put((byte)0x02);
            buff.putChar((Character)o);
        } else if (o.getClass() == Short.class) {
            buff = ByteBuffer.allocate(1+2);
            buff.put((byte)0x03);
            buff.putShort((Short)o);
        } else if (o.getClass() == Integer.class) {
            buff = ByteBuffer.allocate(1+4);
            buff.put((byte)0x04);
            buff.putInt((Integer)o);
        } else if (o.getClass() == Long.class) {
            buff = ByteBuffer.allocate(1+8);
            buff.put((byte)0x05);
            buff.putLong((Long)o);
        } else if (o.getClass() == Float.class) {
            buff = ByteBuffer.allocate(1+4);
            buff.put((byte)0x06);
            buff.putFloat((Float)o);
        } else if (o.getClass() == Double.class) {
            buff = ByteBuffer.allocate(1+8);
            buff.put((byte)0x07);
            buff.putDouble((Double)o);
        } else if (o.getClass() == Date.class) {
            buff = ByteBuffer.allocate(1+8);
            buff.put((byte)0x08);
            buff.putLong(((Date)o).getTime());
        } else if (o instanceof CharSequence) {
            //string type
            byte[] b = o.toString().getBytes(Charset.forName("UTF-8"));
            buff = ByteBuffer.allocate(1+b.length);
            buff.put((byte)0x09);
            buff.put(b);
        } else if (o instanceof ScriptObject) {
            //convert ScriptObject to JSON and store as String
            if (Context.getGlobal() != null) {
                Object value = NativeJSON.stringify(null, (ScriptObject)o, null, null);
                if (value instanceof String) {
                    byte[] b = ((String)value).getBytes(Charset.forName("UTF-8"));
                    buff = ByteBuffer.allocate(1+b.length);
                    buff.put((byte)0x0a);
                    buff.put(b);
                } else {
                    buff = ByteBuffer.allocate(0);
                }
            } else {
                buff = ByteBuffer.allocate(0);
            }
        //other serializable objects
        } else if (o instanceof Serializable) { //Other Object
            ByteArrayOutputStream byteOut = new ByteArrayOutputStream();
            try(ObjectOutputStream objectOut = new ObjectOutputStream(byteOut)) {
                objectOut.writeObject(o);
                objectOut.flush();
            } catch (IOException e) {
                e.printStackTrace();
            }
            byte[] b = byteOut.toByteArray();
            buff = ByteBuffer.allocate(1+b.length);
            buff.put((byte)0x10);
            buff.put(b);
        } else {
            buff = ByteBuffer.allocate(0);
        }
        
        return buff.array();
    }
    
    public static Object retrieveObject(byte[] b) {
        if (b.length == 0) {
            return null;
        } else if (b[0] == 0x00) { //Byte
            return new Byte(b[1]);
        } else if (b[0] == 0x01) { //Boolean
            return new Boolean(b[1] == 0x01);
        } else if (b[0] == 0x02) { //Character
            ByteBuffer buff = ByteBuffer.wrap(b, 1, b.length-1);
            return new Character(buff.getChar());
        } else if (b[0] == 0x03) { //Short
            ByteBuffer buff = ByteBuffer.wrap(b, 1, b.length-1);
            return new Short(buff.getShort());
        } else if (b[0] == 0x04) { //Integer
            ByteBuffer buff = ByteBuffer.wrap(b, 1, b.length-1);
            return new Integer(buff.getInt());
        } else if (b[0] == 0x05) { //Long
            ByteBuffer buff = ByteBuffer.wrap(b, 1, b.length-1);
            return new Long(buff.getLong());
        } else if (b[0] == 0x06) { //Float
            ByteBuffer buff = ByteBuffer.wrap(b, 1, b.length-1);
            return new Float(buff.getFloat());
        } else if (b[0] == 0x07) { //Double
            ByteBuffer buff = ByteBuffer.wrap(b, 1, b.length-1);
            return new Double(buff.getDouble());
        } else if (b[0] == 0x08) { //Date
            ByteBuffer buff = ByteBuffer.wrap(b, 1, b.length-1);
            return new Long(buff.getLong());
        } else if (b[0] == 0x09) { //String
            return new String(b, 1, b.length-1, Charset.forName("UTF-8"));
        } else if (b[0] == 0x0a) { //ScriptObject (in JSON form)
            if (Context.getGlobal() != null) {
                String value = new String(b, 1, b.length-1, Charset.forName("UTF-8"));
                return NativeJSON.parse(null, value, null);
            }
            return null;
        } else { //Other Serializable Object
            try(ObjectInputStream objectIn = new ObjectInputStream(new ByteArrayInputStream(b, 1, b.length-1))) {
                return objectIn.readObject();
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }
        }
    }
}
