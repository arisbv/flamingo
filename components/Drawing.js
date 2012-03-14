/* 
 * Copyright (C) 2012 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * Drawing component
 * Creates a Drawing component
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 */
Ext.define ("viewer.components.Drawing",{
    extend: "viewer.components.Component",   
    iconPath: null,
    formdraw : null,
    formselect : null,
    formsave : null,
    formopen : null,
    vectorLayer:null,
    features:null,
    colorPicker:null,
    activeFeature:null,
    config:{
        title: "",
        iconUrl: "",
        tooltip: "",
        color: ""
    },
    constructor: function (conf){        
        viewer.components.Drawing.superclass.constructor.call(this, conf);
        this.initConfig(conf);
        this.features = new Object();
        var me = this;
        this.renderButton({
            handler: function(){
                me.popup.show();
            },
            text: me.title,
            icon: me.iconUrl,
            tooltip: me.tooltip
        });
        
        this.vectorLayer=viewerController.mapComponent.createVectorLayer({
            id: 'drawingVectorLayer',
            name:'drawingVectorLayer',
            geometrytypes:["Circle","Polygon","Point","LineString"],
            showmeasures:false,
            style: {
                fillcolor: "0x"+this.color,
                fillopacity: 50,
                strokecolor: "0xFF0000",
                strokeopacity: 100
            }
        });
        viewerController.mapComponent.getMap().addLayer(this.vectorLayer);
        this.vectorLayer.addListener (viewer.viewercontroller.controller.Event.ON_ACTIVE_FEATURE_CHANGED,this.activeFeatureChanged,this)
        this.iconPath=contextPath+"/viewer-html/components/resources/images/drawing/"
        this.loadWindow();
        this.popup.show();
        return this;
    },
    loadWindow : function(){
        var me=this;
        this.colorPicker = Ext.create("Ext.ux.ColorField",{ 
            width: 40,
            showText: false,
            name: 'color',
            id:'color',
            value: this.color,
            listeners :{
                select : {
                    fn: this.colorChanged,
                    scope : this
                }
            }
            
        });
        this.formdraw = new Ext.form.FormPanel({
            items: [{ 
                    xtype: 'fieldset',
                    defaultType: 'textfield',
                    border: 0,
                    padding: 0,
                    style: {
                        border: '0px none',
                        marginBottom: '0px'
                    },
                    items: [
                        {
                            xtype: 'label',
                            text: 'Objecten op de kaart tekenen'
                        },
                        {
                            xtype: 'fieldset',
                            //columns: 7,
                            layout:'hbox',
                            border: 0,
                            items: [{
                                    xtype: 'button',
                                    icon: this.iconPath+"bullet_red.png",
                                    tooltip: "Teken een punt",
                                    listeners: {
                                        click:{
                                            scope: me,
                                            fn: me.drawPoint
                                        }
                                    }
                                },
                                {
                                    xtype: 'button',
                                    icon: this.iconPath+"line_red.png",
                                    tooltip: "Teken een lijn",
                                    listeners: {
                                        click:{
                                            scope: me,
                                            fn: me.drawLine
                                        }
                                    }
                                },
                                {
                                    xtype: 'button',
                                    icon: this.iconPath+"shape_square_red.png",
                                    tooltip: "Teken een polygoon",
                                    listeners: {
                                        click:{
                                            scope: me,
                                            fn: me.drawPolygon
                                        }
                                    }
                                },
                                {
                                    xtype: 'button',
                                    icon: this.iconPath+"shape_square_red.png",
                                    tooltip: "Teken een cirkel",
                                    listeners: {
                                        click:{
                                            scope: me,
                                            fn: me.drawCircle
                                        }
                                    }
                                },
                                {
                                    xtype: 'button',
                                    icon: this.iconPath+"cursor.png",
                                    tooltip: "Selecteer een object"
                                }, 
                                this.colorPicker,
                                {
                                    xtype: 'button',
                                    icon: this.iconPath+"delete.png",
                                    tooltip: "Verwijder alle objecten",
                                    listeners: {
                                        click:{
                                            scope: me,
                                            fn: me.deleteAll
                                        }
                                    } 
                                }]
                        }
                    ]
                }],

            renderTo: this.getContentDiv()
        });
        
        this.formselect = new Ext.form.FormPanel({
            items: [
                { 
                    xtype: 'fieldset',
                    defaultType: 'textfield',
                    border: 0,
                    padding: 10,
                    style: {
                        border: '0px none',
                        marginBottom: '0px'
                    },
                    layout:'hbox',
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'labelObject',
                            fieldLabel: 'Label geselecteerd object',
                            labelWidth: 150,
                            id: 'labelObject' + this.name,
                            listeners:{
                                change:{
                                    fn: this.labelChanged,
                                    scope:this
                                }
                            }
                        },
                        {
                            xtype: 'button',
                            icon: this.iconPath+"delete.png",
                            tooltip: "Verwijder geselecteerd object",
                            listeners: {
                                click:{
                                    scope: me,
                                    fn: me.deleteObject
                                }
                            } 
                        }
                    ]
                }
            ],
            renderTo: this.getContentDiv()
        });
        
        this.formsave = new Ext.form.FormPanel({
            items: [
                { 
                    xtype: 'fieldset',
                    defaultType: 'textfield',
                    border: 0,
                    padding: 10,
                    style: {
                        border: '0px none',
                        marginBottom: '0px'
                    },
                    items: [
                        {
                            xtype: 'label',
                            text: 'Op de kaart getekende objecten opslaan'
                        },
                        {
                            xtype: 'textfield', 
                            fieldLabel: 'Titel',
                            name: 'title',
                            id: 'title'+ this.name
                        },
                        {
                            xtype: 'textarea',
                            fieldLabel: 'Opmerking',
                            name: 'comment',
                            id: 'comment'+ this.name
                        },
                        { 
                            xtype: 'button',
                            text: 'Opslaan als bestand',
                            listeners: {
                                click:{
                                    scope: me,
                                    fn: me.saveFile
                                }
                            }
                        }
                    ]
                }
            ],
            renderTo: this.getContentDiv()
        });
        
        this.formopen = new Ext.form.FormPanel({
            items: [
                { 
                    xtype: 'fieldset',
                    defaultType: 'textfield',
                    border: 0,
                    padding: 10,
                    style: {
                        border: '0px none',
                        marginBottom: '0px'
                    },
                    items: [
                        {
                            xtype: 'label',
                            text: 'Bestand met getekende objecten openen'
                        },
                        {
                            xtype: 'filefield',
                            fieldLabel: 'Tekstbestand',
                            name: 'textfile',
                            msgTarget: 'side',
                            anchor: '100%',
                            buttonText: 'Bladeren',
                            id: 'file'+ this.name
                        },
                        {
                            xtype: 'button',
                            text: 'bestand openen',
                            listeners: {
                                click:{
                                    scope: me,
                                    fn: me.openFile
                                }
                            }
                        }
                    ]
                }
            ],
            renderTo: this.getContentDiv()
        });
        
        this.formselect.setVisible(false);
    },
    
    /**
     * Event handlers
     **/
    activeFeatureChanged : function (vectorLayer,feature){
        this.toggleSelectForm(true);
        this.activeFeature = feature;
        this.activeFeature.color = this.colorPicker.getValue();
        if(this.features[feature.id] != undefined){
            // vul form
        }else{
            this.features[feature.id] = feature;
        }
    },
    colorChanged : function (hexColor){
        this.vectorLayer.style.fillcolor = '0x'+hexColor;
        this.vectorLayer.adjustStyle();
        if(this.activeFeature != null){
            this.activeFeature.color = '0x'+hexColor;
        }
    },
    labelChanged : function (field,newValue){
        this.vectorLayer.setLabel(this.activeFeature.getId(),newValue);
        this.activeFeature.label=newValue;
    },
    toggleSelectForm : function(visible){
        this.formselect.setVisible(visible);
    },
    drawPoint: function(){
        this.vectorLayer.drawFeature("Point");
    },
    drawLine: function(){
        this.vectorLayer.drawFeature("LineString");
    },
    drawPolygon: function(){
        this.vectorLayer.drawFeature("Polygon");
    },
    drawCircle: function(){
        this.vectorLayer.drawFeature("Circle");
    },
    deleteAll: function(){
        this.vectorLayer.removeAllFeatures();
        this.toggleSelectForm(true);
    },
    deleteObject: function(){
        this.toggleSelectForm(true);
        
    },
    saveFile: function(){
        var title = this.formopen.getChildByElement('title'+ this.name).getValue();
        var comment = this.formopen.getChildByElement('comment'+ this.name).getValue();
    },
    openFile: function(){
        var file = this.formopen.getChildByElement('file'+ this.name).getValue();
    }
});
 