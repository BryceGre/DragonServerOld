package com.dragonmmomaker.war;

import java.io.File;
import java.util.jar.Manifest;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.catalina.WebResource;
import org.apache.catalina.WebResourceRoot;
import org.apache.catalina.servlets.DefaultServlet;
import org.apache.catalina.webresources.FileResource;
import org.apache.catalina.webresources.StandardRoot;

public class FileServlet extends DefaultServlet {

    private static final long serialVersionUID = -5671563424683507507L;
    private String mDataDir;

    @Override
    public void init() throws ServletException {
        super.init();
        mDataDir = ServerListener.dataDir;
        resources = new FileRoot(resources);
    }

    @Override
    protected boolean checkIfModifiedSince(HttpServletRequest request, HttpServletResponse response, WebResource resource) {
        return true;
    }

    private class FileRoot extends StandardRoot {

        public FileRoot(WebResourceRoot parent) {
            super(parent.getContext());
            this.setAllowLinking(parent.getAllowLinking());
            /*for (WebResourceSet res : parent.getPreResources())
             this.addPreResources(res);
             for (WebResourceSet res : parent.getJarResources())
             this.addJarResources(res);
             for (WebResourceSet res : parent.getPostResources())
             this.addPostResources(res);*/
            this.setCachingAllowed(false);
        }

        @Override
        public WebResource getResource(String path) {
            return new FileResource(this, path, new File(mDataDir + path), true, null);
        }
    }
}
