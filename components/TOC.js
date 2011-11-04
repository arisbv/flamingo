function TOC(divId, mapViewer,options){
    this.mapViewer = mapViewer;
    this.panel = null;
    this.div = divId;
    this.options = options;
    this.loadTree();
}

TOC.prototype.loadTree = function(){
   
    var store = Ext.create('Ext.data.TreeStore', {
        root: {
            text: 'Root',
            expanded: true,
            checked: false,
            children: []
        }
    });
    this.panel =Ext.create('Ext.tree.Panel', {
        renderTo: this.div,
        title: 'Table of Contents',
        //width: 330,
        height: "100%",
        frame: true,
        useArrows: true,
        rootVisible: false,
        resizable: true,
        floating: false,
        listeners:{
            checkchange:{
                toc: this,
                fn: this.checkboxClicked
            }
        },
        store: store
    });
}

TOC.prototype.addArcIMS = function(){
    var services = layerJSON.layers;
    for (var i = 0 ; i < services.length; i++){
        var layer = services[i];
       
        this.insertLayer(layer);   
    }
    this.panel.showVerticalScroller();
}

TOC.prototype.insertLayer = function (laag){
    
    if(laag.type == "ArcIMS"){
        var laagObject = null;
        if(laag.visible){
            laagObject = this.createLayer(laag);
            this.mapViewer.wmc.getMap().addLayer(laagObject);
        }
        var treeNode = {
            text: laag.name,
            checked: laag.visible,
            expanded: true,
            leaf: true,
            id: laag.id,
            layerConfig: laag,
            layerObj: laagObject
        };
    }
    var root = this.panel.getRootNode();
    root.appendChild(treeNode);
    root.expand()
}

TOC.prototype.createLayer = function (JSONConfig){
    var ogcOptions = {
        exceptions: "application/vnd.ogc.se_inimage",
        srs: "EPSG:28992",
        version: "1.1.1",
        name: JSONConfig.name,
        server:JSONConfig.server, 
        servlet:JSONConfig.servlet,
        mapservice:JSONConfig.mapservice,
        visibleids:JSONConfig.name,
        noCache: false // TODO: Voor achtergrond kaartlagen wel cache gebruiken
    };
    var options = {
        timeout: 30,
        retryonerror: 10,
        id:JSONConfig.id,
        ratio: 1,
        showerrors: true,
        initService: true
    }; 
    var mapservice = JSONConfig.mapservice;
    var servlet = JSONConfig.servlet;
    var name = JSONConfig.name;
    var server = JSONConfig.server;
    options["isBaseLayer"]=false;
        
    return this.mapViewer.wmc.createArcIMSLayer(name,server,servlet,mapservice, ogcOptions, options);
}

TOC.prototype.checkboxClicked = function(nodeObj,checked,toc){
    var node = nodeObj.raw;
    if(node ===undefined){
        node = nodeObj.data;
    }
    var layer = node.layerObj;
    
    if(checked){
        var laag = toc.toc.createLayer(node.layerConfig);
        toc.toc.mapViewer.wmc.getMap().addLayer(laag);
        nodeObj.data.layerObj = laag;
        nodeObj.updateInfo();
    }else{
        toc.toc.mapViewer.wmc.getMap().removeLayer(layer)
    }
}