package com.dragonmmomaker.server.util;

public abstract class LogCallback {
	public abstract void log(int pId, String pMessage);
	public void log(String pMessage) {
		this.log(0, pMessage);
	}
	public void debug(String pMessage) {
		//do nothing by default
	}
}