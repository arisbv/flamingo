/* 
 * Copyright (C) 2013 B3Partners B.V.
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
Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('Ext.ux', uxpath);
Ext.require([
    //'Ext.grid.*',
    //'Ext.data.*',
    //'Ext.util.*',
    'Ext.ux.grid.GridHeaderFilters'//,
   // 'Ext.toolbar.Paging'
]);

Ext.onReady(function(){

    
});

function featureSourceChanged(select){
    var featureSourceId = select.value;
    var resultEl = Ext.get("featureType");
    if(featureSourceId && featureSourceId != "-1"){
        Ext.Ajax.request({
            url: featureType,
            params: {
                featureSourceId: select.value
            },
            success: function(response){
                var text = response.responseText;
                // process server response here
                var data = Ext.JSON.decode(text);
                if(data) {
                    var html="<option value=\"-1\">Maak uw keuze.</option>";
                    for (var id in data){
                        var ft=data[id];       
                        html+="<option value=\""+ft.id+"\"";                    
                        html+=">"+ft.name+"</option>";        
                    } 
                    resultEl.update(html);
                }
            },
            failure : function (response){
                alert("Attribuutbronnen ophalen mislukt");
            }
        });
    }else{
        var html = "<option value=\"-1\">Maak uw keuze.</option>";
        resultEl.update(html);
    }
}

function featureTypeChanged(select){
    var featureType = Ext.get("featureType");
    var featuretypeId = featureType.getValue();
    var featureSourceId = select.value;
    if(featureSourceId && featureSourceId != "-1"){
        Ext.Ajax.request({
            url: attributesUrl,
            params: {
                simpleFeatureTypeId: featuretypeId,
                featureSourceId: featureSourceId
            },
            success: function(response){
                var text = response.responseText;
                // process server response here
                var data = Ext.JSON.decode(text);
                var resultEl = Ext.get("attributes");
                if(data) {
                    var rows = data.gridrows;
                    var html="<h1>Attributen</h1><br/>";
                    for (var id in rows){
                        var ft=rows[id];       
                        html += "<input type='checkbox' name='attributes' id=\'" + ft.id + "\' value=\'"+ft.id+"\'>" + ft.attribute + "</checkbox><br/>";
                    } 
                    resultEl.update(html);
                }
            },
            failure : function (response){
                alert("Attribuutbronnen ophalen mislukt");
            }
        });
    }else{
        var html = "<option value=\"-1\">Maak uw keuze.</option>";
        resultEl.update(html);
    }
}