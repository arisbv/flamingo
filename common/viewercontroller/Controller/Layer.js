/**  
 * Layer
 * @class 
 * @constructor
 * @description The superclass for all layers 
 * @param frameworkLayer The frameworkspecific layer
 * @param id The id of the layer
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 * @author <a href="mailto:roybraam@b3partners.nl">Roy Braam</a>
 */
Ext.define("viewer.viewercontroller.controller.Layer",{
    extend: "Ext.util.Observable",
    statics:{
        WMS_TYPE: "WMS",
        ARCSERVER_TYPE: "ARCSERVER",
        ARCIMS_TYPE: "ARCIMS",
        VECTOR_TYPE: "VECTOR",
        IMAGE_TYPE: "IMAGE",
        TILING_TYPE: "TILING"
    },
    events: [],
    maptips: new Array(),
    map:null,
    visible: true,
    //service id from where this layer is created
    /**@field
     *@deprecated can be found by getting the appLayer.serviceId
     **/
    serviceId: null,
    config :{
        id: null,
        options: null,
        viewerController: null,
        url:null,
        appLayerId: null,
        frameworkLayer: null
    },
    
    constructor: function (config){
        viewer.viewercontroller.controller.Layer.superclass.constructor.call(this, config);
        this.initConfig(config);        
    },
        
    /**
     *Gets a option of this layer
     *@return the option value or null if not exists
     */
    getOption: function(optionKey){
        var availableOptions=""
        for (var op in this.options){
            if (op.toLowerCase()==optionKey.toLowerCase())
                return this.options[op];
            availableOptions+=op+",";
        }
        return null;
    },    
    /**
     * Because 1 layer is created per applayer (not combined) every layer has the id:
     * serviceId_appLayerName
     * To get the appLayerName the serviceId_ string needs to be removed.
     */
    getAppLayerName: function(){
        return this.viewerController.app.appLayers[this.appLayerId].layerName;
    },   
    /**
     *Add a maptip to the layer
     */
    addMapTip : function(maptip){
        this.maptips.push(maptip);
    },
    /**
     * set a array of maptips
     */
    setMaptips : function (maptips){
        this.maptips=maptips;
    },
    /**
     * get a array of maptips
     */
    getMaptips : function (){
        return this.maptips;
    },
    /**
     *Gets the feature by a feature type (layername)
     *@param featureType the name of the featuretype returned by the server
     *@return the maptip for this layer/featuretype or null if none found
     */
    getMapTipByFeatureType : function(featureType){
        for (var m=0; m < this.maptips.length; m++){
            if (this.maptips[m].layer == featureType ||this.maptips[m].aka == featureType){
                return this.maptips[m];
            }
        }
        return null;
    },
    /**
     * Gets the layer type (WMS, ArcServer, ArcIms, Vector etc.)
     */
    getType: function (){
        Ext.Error.raise({msg: "Layer.getType() Not implemented! Must be implemented in sub-class"});
    },
    /**
     *sets or overwrites a option
     */
    setOption : function(optionKey,optionValue){
        Ext.Error.raise({msg: "Layer.getOption() Not implemented! Must be implemented in sub-class"});
    },
    /**
     *Gets the layer that are set in this layer
     */
    getLayers: function (){
        Ext.Error.raise({msg: "Get layers must be implemented by implementation"});
    },
    /**
     * Changes the opacity of a layer.
     * @param alpha percentage: a value between 0 and 100
     */
    setAlpha : function (alpha){
        Ext.Error.raise({msg: "Layer.setAlpha() Not implemented! Must be implemented in sub-class"});
    },
    setVisible : function (visible){
        Ext.Error.raise({msg: "Layer.setVisible() Not implemented! Must be implemented in sub-class"});
    },
    setQuery : function (query){
        Ext.Error.raise({msg: "Layer.setQuery() Not implemented! Must be implemented in sub-class"});
    },
    /**
     * Needs to return a object with the last request
     * @return array of objects with:
     *  object.url the url of the last request
     *  object.body (optional) the body of the request
     */
    getLastMapRequest: function(){
        Ext.Error.raise({msg: "Layer.getLastMapRequest() Not implemented! Must be implemented in sub-class"});
    },
    reload: function(){
        Ext.Error.raise({msg: "Layer.reload() Not implemented! Must be implemented in sub-class"});
    },
    fire : function (event,options){
        this.fireEvent(event,this,options);
    },

    registerEvent : function (event,handler,scope){
        this.superclass.addListener(event,handler,scope);
    }

});
