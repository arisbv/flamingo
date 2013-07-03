<%--
Copyright (C) 2013 B3Partners B.V.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@include file="/WEB-INF/jsp/taglibs.jsp"%>

<stripes:layout-render name="/WEB-INF/jsp/templates/ext.jsp">
    <stripes:layout-component name="head">
        <title>Service Usage Matrix</title>
    </stripes:layout-component>

    <stripes:layout-component name="header">
        <jsp:include page="/WEB-INF/jsp/header.jsp"/>
    </stripes:layout-component>

    <stripes:layout-component name="body">
        <script type="text/javascript">
            var activelink = 'menu_serviceusagematrix';
            var deleteApplicationLayerUrl= <js:quote><stripes:url beanclass="nl.b3p.viewer.admin.stripes.ServiceUsageMatrixActionBean" event="deleteApplicationLayer"/></js:quote>
            
            function deleteApplicationLayer(applicationId, appLayerId){
                Ext.Ajax.request({ 
                    url: deleteApplicationLayerUrl, 
                    scope:this,
                    params: { 
                        applicationLayer: appLayerId,
                        application: applicationId
                    }, 
                    success: function ( result  ) {
                        result = Ext.JSON.decode(result.responseText);
                        if (result.success){
                            Ext.MessageBox.alert("Verwijderd", "De kaart "+result.name+"("+result.id+") is verwijderd.");
                            Ext.get("trApplicationLayer_"+result.id).remove();
                        }else{
                            Ext.MessageBox.alert("Foutmelding", "Het verwijderen is niet gelukt: "+result.message);
                        }
                    },
                    failure: function() {
                        Ext.MessageBox.alert("Foutmelding", "Er is een fout opgetreden: "+result.message);
                    }
                });
            }
            var changedFeatureTypes;
            <c:if test="${not empty actionBean.changedFeatureTypes}">
                changedFeatureTypes=${actionBean.changedFeatureTypes};
            </c:if>
            var translateKey={
                "FAILED" : "Mislukt",
                "MISSING" : "Ontbreekt",
                "NEW" : "Nieuw",
                "UNMODIFIED" : "Ongewijzigd", 
                "CHANGED" : "Gewijzigd", 
                "UPDATED" : "Geupdate"
            }
            function checkChanged(){
                if (changedFeatureTypes){
                    for (var key in changedFeatureTypes){
                        if(changedFeatureTypes[key]){
                            for(var i =0; i < changedFeatureTypes[key].length; i++){
                                var els = Ext.select(".featureType_"+changedFeatureTypes[key][i]);
                                els.addCls("featureType-"+key.toLowerCase());
                                var transKey = translateKey[key];
                                els.insertHtml("beforeEnd"," ("+transKey+")");
                            }
                        }
                    }
                }
            }
            function exportXsl(){
                var url=<js:quote><stripes:url beanclass="nl.b3p.viewer.admin.stripes.ServiceUsageMatrixActionBean" event="view"/></js:quote>
                url+="?output_format=XSL";
                <c:if test="${not empty actionBean.featureSource}">
                    url+="&featureSource=${actionBean.featureSource.id}";
                </c:if>
                window.open(url);
            }
            Ext.onReady(checkChanged);
        </script>
        <div id="content">
            <h1>Service Usage Matrix</h1><br/>   
            <a href="javascript: void(0)" onclick="exportXsl()">Exporteer als Excel document</a><br>
            <x:parse xml="${actionBean.xml}" var="doc"/>
            <x:forEach select="$doc/root/featureSources/featureSource" var="featureSource">
                <div class="usageMatrixFeatureSource">
                    <b>Attribruutbron: <x:out select="$featureSource/name"/> (<x:out select="$featureSource/protocol"/>:: <x:out select="$featureSource/url"/> id: <x:out select="$featureSource/id"/>) </b>
                    <x:choose>
                        <x:when select="$featureSource//applayer">
                            <table>
                                <tr>
                                    <th>FeatureType</td>
                                    <th>Applicatie</td>
                                    <th>Layernaam van service</td>
                                    <th>Applicatie layer (kaart)</td>
                                </tr>
                                <x:forEach select="$featureSource/featureType" var="featureType">
                                    <x:forEach select="$featureType/applications/application" var="application">
                                        <x:forEach select="$application/layers/layer" var="layer">
                                            <x:forEach select="$layer/applayers/applayer" var="appLayer">
                                                <tr id="trApplicationLayer_<x:out select="$appLayer/id"/>">
                                                    <td class="featureType_<x:out select="$featureType/id"/>"><x:out select="$featureType/name"/></td>
                                                    <td><x:out select="$application/name"/>,versie: <x:out select="$application/version"/> (<x:out select="$application/id"/>)</td>
                                                    <td><x:out select="$layer/name"/></td>
                                                    <td><x:out select="$appLayer/alias"/>(<x:out select="$appLayer/id"/>) <a href="javascript: void(0)" onclick="deleteApplicationLayer(<x:out select="$application/id"/>,<x:out select="$appLayer/id"/>)">Verwijder</a></td>
                                                </tr> 
                                            </x:forEach>
                                        </x:forEach>
                                    </x:forEach>
                                </x:forEach>
                            </table>
                        </x:when>
                        <x:otherwise>
                            <br>De service wordt niet gebruikt in één van de geconfigureerde applicaties.
                        </x:otherwise>
                    </x:choose>
                </div> 
            </x:forEach>
        </div>
    </stripes:layout-component>

</stripes:layout-render>