/*global define,dijit*/
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom",
    "dojo/query",
    "dijit/Editor",
    "dijit/form/Textarea",
    "dijit/form/ValidationTextBox",
    "esri/dijit/HomeButton",
    "esri/dijit/Legend",
    "esri/dijit/TimeSlider",
    "esri/TimeExtent",
    "../mapbook-collection/mapbook-utility",
    "dijit/_editor/plugins/FontChoice",
    "dijit/_editor/plugins/LinkDialog",
    "dijit/_editor/plugins/TextColor"
], function (declare, domConstruct, domAttr, domStyle, dom, query, Editor, Textarea, ValidationTextBox, HomeButton, LegendDijit, TimeSlider, TimeExtent, mapbookUtility) {
    return declare([mapbookUtility], {
        /**
        * create mapbook dijits
        *
        * @class
        * @name widgets/mapbook-collection/mapbook-dijits
        */
        /**
        * create legend container for webmap module
        * @param{object} map is the instance of webmap
        * @memberOf widgets/mapbook-collection/mapbook-dijits
        */
        _createLegend: function (map, layerArray) {
            var i, j, legendContainer, legendContainerId, legendContent, layerInfo = [];
            //add layers to layerInfo, if it's renderer will be shown in legend
            for (i = 0; i < layerArray.length; i++) {
                if (layerArray[i].layers) {
                    for (j = layerArray[i].layers.length - 1; j >= 0; j--) {
                        if (layerArray[i].layers[j].showLegend === false) {
                            layerArray[i].layerObject.visibleLayers.splice(layerArray[i].layerObject.visibleLayers.indexOf(layerArray[i].layers[j].id), 1);
                        }
                    }
                    layerInfo.push({ layer: layerArray[i].layerObject, title: layerArray[i].title });
                } else if (layerArray[i].layerObject && layerArray[i].showLegend !== false) {
                    layerInfo.push({ layer: layerArray[i].layerObject, title: layerArray[i].title });
                }
            }
            legendContainerId = "legendContent" + map.id;
            //destroy legend instance which is already registered with new legend id
            this._destroyExistingNode(dijit.registry.byId(legendContainerId), true);
            legendContainer = domConstruct.create("div", { "id": legendContainerId, "class": "esriLegendContainer" }, null);
            map.root.appendChild(legendContainer);
            legendContent = new LegendDijit({
                map: map,
                layerInfos: layerInfo
            }, legendContainerId);
            legendContent.startup();
        },

        /**
        * create home button for webmap
        * @param{object} map is the instance of webmap
        * @memberOf widgets/mapbook-collection/mapbook-dijits
        */
        _createHomeButton: function (map) {
            var homeBtnContainer, homeBtn, homeBtnId, zoomSlider, zoomSliderLastChild;
            homeBtnId = "homeBtn" + map.id;
            //destroy old instance of home dijit with registered id.
            this._destroyExistingNode(dijit.registry.byId(homeBtnId), true);
            homeBtnContainer = domConstruct.create("div", { "id": homeBtnId, "class": "esriHomeButton" }, null);
            zoomSlider = query('#' + map.id + ' .esriSimpleSlider')[0];
            zoomSliderLastChild = zoomSlider.lastChild || zoomSlider.lastElementChild;
            zoomSlider.insertBefore(homeBtnContainer, zoomSliderLastChild);
            //initialize esri home dijit.
            homeBtn = new HomeButton({
                map: map
            }, homeBtnId);
            homeBtn.startup();
        },

        /**
        * create text editor for setting dialog
        * @param{object} moduleSettingContent is the parent container of text editor
        * @param{array} moduleAttr is an json array ,which contains required attributes for selected module
        * @param{string} key is the attribute of selected module in json for which text editor is being created
        * @memberOf widgets/mapbook-collection/mapbook-dijits
        */
        _createTextEditor: function (moduleSettingContent, moduleAttr, key) {
            var divInputContainer, dijitInputContainer, fontFamily;
            this._destroyExistingNode(dijit.byId("textEditor"), true);
            divInputContainer = domConstruct.create("div", { "class": "esriTextArea" }, moduleSettingContent);
            //initialize dojo editor.
            //add plugins to it.
            dijitInputContainer = new Editor({
                height: '250px',
                required: true,
                plugins: ['bold', 'italic', 'underline', 'foreColor', 'hiliteColor', 'indent', 'outdent', 'justifyLeft', 'justifyCenter', 'justifyRight', 'createLink'],
                extraPlugins: [{ name: "dijit/_editor/plugins/FontChoice", command: "fontSize", plainText: true }, { name: "dijit/_editor/plugins/FontChoice", command: "fontName", custom: ["Arial", "Courier New", "Garamond", "sans-serif", "Tahoma", "Times New Roman", "Verdana"]}],
                "class": "esriSettingInput",
                id: "textEditor"
            }, divInputContainer);
            dijitInputContainer.startup();
            dijitInputContainer.setValue(moduleAttr[key]);
            domAttr.set(dijitInputContainer.domNode, "inputKey", key);
            dijitInputContainer.onLoadDeferred.then(function () {
                setTimeout(function () {
                    //disable editing in drop-downs of editor.
                    dijit.byId("textEditor")._plugins[12].button.select.textbox.readOnly = true;
                    dijit.byId("textEditor")._plugins[11].button.select.textbox.readOnly = true;
                    dijit.byId("textEditor").editNode.noWrap = true;
                    if (!dijit.byId("textEditor").value.match('<font')) {
                        //set default font family to 'sans-serif'
                        fontFamily = domStyle.get(dijit.byId("textEditor").domNode, 'fontFamily');
                        if (fontFamily) {
                            dijit.byId("textEditor").execCommand('selectAll');
                            dijit.byId("textEditor").execCommand('fontName', "sans-serif");
                        }
                    }
                }, 300);
            });
            return dijitInputContainer;
        },

        /**
        * create text area for setting dialog
        * @param{object} moduleSettingContent is the parent container of text area
        * @param{array} moduleAttr is an json array ,which contains required attributes for selected module
        * @param{string} key is the attribute of selected module in json for which text area is being created
        * @memberOf widgets/mapbook-collection/mapbook-dijits
        */
        _createTextArea: function (moduleSettingContent, moduleAttr, key) {
            var divInputContainer, dijitInputContainer;
            divInputContainer = domConstruct.create("div", { "class": "esriTextArea" }, moduleSettingContent);
            dijitInputContainer = new Textarea({
                value: moduleAttr[key],
                "class": "esriSettingInput"
            }, divInputContainer);
            dijitInputContainer.startup();
            domAttr.set(dijitInputContainer.domNode, "inputKey", key);
            return dijitInputContainer;
        },

        /**
        * create textbox for setting dialog
        * @param{object} moduleSettingContent is the parent container of textbox
        * @param{array} moduleAttr is an json array ,which contains required attributes for selected module
        * @param{string} key is the attribute of selected module in json for which textbox is being created
        * @param{boolean} isValidationRequired is decides that textbox input is need to be filled or not
        * @memberOf widgets/mapbook-collection/mapbook-dijits
        */
        _createTextBox: function (moduleSettingContent, moduleAttr, key, isValidationRequired) {
            var divInputContainer, dijitInputContainer;
            divInputContainer = domConstruct.create("div", { "inputKey": key, "class": "esriSettingInputHolder" }, moduleSettingContent);
            dijitInputContainer = new ValidationTextBox({
                required: isValidationRequired,
                "class": "esriSettingInput"
            }, divInputContainer);
            dijitInputContainer.startup();
            dijitInputContainer.setValue(moduleAttr[key]);
            domAttr.set(dijitInputContainer.domNode, "inputKey", key);
            return dijitInputContainer;
        },

        /**
        * create time slider for webmap
        * @param{object} response is the webmap response
        * @memberOf widgets/mapbook-collection/mapbook-dijits
        */
        _createTimeSlider: function (response) {
            var webmap, showTimeSlider, itemData, timeSlider, webmapTimeSlider, timeExtent, esriLogo, layeIndex;
            webmap = response.map;
            showTimeSlider = false;
            itemData = response.itemInfo.itemData;
            //traverse operation array to find out, if any layer is time enabled.
            for (layeIndex = 0; layeIndex < itemData.operationalLayers.length; layeIndex++) {
                if (itemData.operationalLayers[layeIndex].layerObject && itemData.operationalLayers[layeIndex].layerObject.timeInfo) {
                    if (!(itemData.operationalLayers[layeIndex].timeAnimation === false)) {
                        //fetch time slider properties from webmap response data.
                        if (itemData.widgets && itemData.widgets.timeSlider) {
                            showTimeSlider = true;
                            break;
                        }
                    }
                }
            }
            //create time slider if any layer is enabled for time animation.
            if (showTimeSlider) {
                this._destroyExistingNode(dijit.byId("Slider" + webmap.id), true);
                domConstruct.create("div", { "id": "Slider" + webmap.id, "class": "esriSliderDemo" }, webmap.root);
                //initialize esri time sider dijit.
                timeSlider = new TimeSlider({
                    style: "width: 100%;"
                }, dom.byId("Slider" + webmap.id));
                //set time slider properties.
                webmap.setTimeSlider(timeSlider);
                webmapTimeSlider = itemData.widgets.timeSlider;
                timeExtent = new TimeExtent();
                if (webmapTimeSlider.properties.startTime) {
                    timeExtent.startTime = new Date(webmapTimeSlider.properties.startTime);
                }
                if (webmapTimeSlider.properties.endTime) {
                    timeExtent.endTime = new Date(webmapTimeSlider.properties.endTime);
                }
                timeSlider.setThumbCount(webmapTimeSlider.properties.thumbCount);
                timeSlider.createTimeStopsByTimeInterval(timeExtent, webmapTimeSlider.properties.timeStopInterval.interval, webmapTimeSlider.properties.timeStopInterval.units);
                timeSlider.startup();
                esriLogo = query('.esriControlsBR', dom.byId(webmap.id))[0];
                //display esri logo at the top of the time slider.
                domStyle.set(esriLogo, "bottom", "50px");
            }
        }
    });
});
