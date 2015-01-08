/*global define,dojo,dijit,esriConfig*/
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
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/on",
    "dojo/query",
    "dojo/i18n!nls/localized-strings",
    "dojo/touch",
    "dojox/image/FlickrBadge",
    "dojox/image/Lightbox",
    "dojox/layout/ResizeHandle",
    "esri/arcgis/utils",
    "esri/geometry/Extent",
    "esri/tasks/ProjectParameters",
    "esri/SpatialReference",
    "esri/urlUtils"
], function (declare, array, lang, domConstruct, domAttr, domStyle, domClass, dom, on, query, nls, touch, FlickrBadge, Lightbox, ResizeHandle, arcgisUtils, Extent, ProjectParameters, SpatialReference, urlUtils) {

    return declare([], {
        currentNode: null,
        /**
        * create mapbook module renderer widget
        *
        * @class
        * @name widgets/mapbook-collection/module-renderer
        */
        /**
        * identify selected module
        * @param{object} targetContainer is the dnd target domNode where selected node is placed
        * @param{object} node is the selected node
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _identifySeletedModule: function (targetContainer, node) {
            var moduleType, nodesArray, dndNode, nodeIndex;
            nodesArray = targetContainer.getAllNodes();
            //identify which module is dragged to create.
            for (nodeIndex = 0; nodeIndex < nodesArray.length; nodeIndex++) {
                if (targetContainer.getAllNodes()[nodeIndex].innerHTML === node[0].innerHTML) {
                    this.currentNode = nodesArray[nodeIndex];
                    this.currentNode.index = nodeIndex;
                    this.currentNode.innerHTML = '';
                    dndNode = node[0].firstElementChild || node[0].firstChild;
                    //get type of module, which has dragged.
                    moduleType = domAttr.get(dndNode, "type");
                    //display setting dialog to create the module.
                    this._showModuleSettingDialog(moduleType, true, targetContainer, nodesArray.length);
                    break;
                }
            }
        },

        /**
        * render module content for the book
        * @param{string} moduleType is the type of module to be created
        * @param{object} pageModule is the parent container for the module to be created
        * @param{array} moduleData is object array which contains required attributes for module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _renderModuleContent: function (moduleType, pageModule, moduleData) {
            var moduleIndex = domAttr.get(pageModule.parentElement, "moduleIndex");
            switch (moduleType) {
            case "webmap":
                this._createWebmapModule(moduleData, pageModule, moduleIndex);
                break;

            case "video":
                this._renderVideoContent(moduleData, pageModule);
                break;

            case "image":
                this._createImageModule(moduleData, pageModule, moduleIndex);
                break;

            case "flickr":
                this._renderPhotoSetContent(moduleData, pageModule);
                break;

            case "logo":
                this._createLogo(moduleData, pageModule);
                break;

            case "TOC":
                this._renderTOCContent(pageModule);
                break;

            default:
                this._createTextModule(moduleData, pageModule);
                break;
            }
        },

        /**
        * delete module from the book and book config
        * @param{string} moduleType is the type of module to be deleted
        * @param{object} moduleContainer is the parent container for the module to be deleted
        * @param{string} moduleKey is the unique key for module in book config
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _deleteModule: function (moduleType, moduleContainer, moduleKey) {
            var colIndex, contentIndex, moduleIndex, moduleData, mapId, bookList, pageContainer = moduleContainer.parentElement.parentElement.parentElement;
            moduleIndex = domAttr.get(moduleContainer, "moduleIndex");
            //destroy selected module container.
            this._destroyExistingNode(moduleContainer.parentElement, false);
            colIndex = parseInt(domAttr.get(moduleContainer, "columnIndex"), 10);
            bookList = this._getConfigData(dojo.bookInfo[dojo.currentBookIndex].BookConfigData);
            moduleData = this._getConfigData(dojo.bookInfo[dojo.currentBookIndex].ModuleConfigData);
            contentIndex = array.indexOf(bookList.content[colIndex], moduleKey);
            bookList.content[colIndex].splice(contentIndex, 1);
            this.mapBookDetails[dojo.currentBookIndex][this.currentIndex].content[colIndex].splice(contentIndex, 1);
            //delete data about module from book JSON.
            delete moduleData[moduleKey];
            //destroy map instance if selected module type is webmap.
            if (moduleType === "webmap") {
                mapId = "map" + moduleIndex;
                this._destroyMap(mapId);
            }
            //update column height;
            this._setColumnHeight(pageContainer);
        },

        /**
        * render new module in newly added book page
        * @param{object} pageContentContainer is the parent container for new module in newly added page
        * @param{array} newBookPage is json array, which contains required attributes for new page
        * @param{string} currentModuleContent is the type of module to be created in the newly added page
        * @param{array} arrContent is json array, which contains required attributes for new module for new page
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _renderNewPageModule: function (pageContentContainer, newBookPage, currentModuleContent, arrContent) {
            var newModuleKey, pageModule, contentIndex, columnIndex, moduleIndex, pageContentModule;

            pageModule = query('.esriDivPageModule', pageContentContainer)[0];
            domClass.add(pageModule, "dojoDndHandle");
            moduleIndex = domAttr.get(pageModule, "moduleIndex");
            domAttr.set(pageModule.parentElement, "moduleIndex", moduleIndex);
            //get default module attributes from config.
            pageContentModule = lang.clone(dojo.appConfigData.ModuleDefaultsConfig[currentModuleContent]);
            contentIndex = parseInt(domAttr.get(pageModule.parentElement, "contentIndex"), 10);
            columnIndex = parseInt(domAttr.get(pageModule.parentElement, "columnIndex"), 10);
            this._setDefaultText(pageContentModule);
            pageContentModule.height = newBookPage.height[columnIndex][contentIndex];
            domClass.add(pageModule.parentElement, "esriEditableModeContent");
            domAttr.set(pageModule.parentElement, "type", pageContentModule.type);
            if (currentModuleContent === "title" || currentModuleContent === "author") {
                newModuleKey = currentModuleContent;
                pageContentModule[pageContentModule.type] = dojo.bookInfo[dojo.currentBookIndex].BookConfigData[currentModuleContent];
            } else {
                //generate unique id to access module fom book JSON.
                newModuleKey = ((new Date()).getTime()).toString() + contentIndex.toString() + columnIndex.toString(); //get unique key in microseconds
            }
            domAttr.set(pageContentContainer, "moduleKey", newModuleKey);
            newBookPage.content[columnIndex][contentIndex] = newModuleKey;
            pageContentModule.uid = newModuleKey;
            arrContent[newModuleKey] = pageContentModule;
            pageModule.id = "resizable" + newModuleKey + moduleIndex;
            this._renderModuleContent(pageContentModule.type, pageModule, pageContentModule);
        },

        /**
        * update existing module
        * @param{string} moduleType is the type of module to be created
        * @param{object} moduleContainer is the parent container for the module to be created
        * @param{string} moduleKey is the unique key for the module defined in config
        * @param{object} moduleInputs is inputFields which contains user inputs(attributes for module)
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _updateExistingModule: function (moduleContainer, moduleType, moduleKey, moduleInputs) {
            var moduleIndex, inputFields, inputFieldValue, moduleData, moduleAttr, pageModule, bookListData, moduleContent, pageTitle, inputKey, inputIndex, attr;
            domConstruct.empty(moduleContainer);
            inputFields = query('.esriSettingInput');
            moduleData = {};
            //check input values to update selected module.
            for (inputIndex = 0; inputIndex < inputFields.length; inputIndex++) {
                inputKey = domAttr.get(inputFields[inputIndex], "inputKey");
                moduleData[inputKey] = moduleInputs[inputIndex].value;
                if (inputKey === "text") {
                    inputFieldValue = moduleInputs[inputIndex].editNode.textContent || moduleInputs[inputIndex].editNode.innerText;
                    if (moduleKey === "author") {
                        //update author name in book JSON.
                        dojo.bookInfo[dojo.currentBookIndex].BookConfigData.author = lang.trim(inputFieldValue);
                    } else if (moduleKey === "title") {
                        //update page title in book JSON.
                        pageTitle = inputFieldValue;
                        if (this.currentIndex === 0) {
                            dojo.bookInfo[dojo.currentBookIndex].BookConfigData.title = pageTitle;
                        } else if (this.currentIndex === 1 && this.mapBookDetails[dojo.currentBookIndex][inputIndex] !== "EmptyContent") {
                            dojo.bookInfo[dojo.currentBookIndex].BookConfigData.ContentPage.title = pageTitle;
                        } else {
                            dojo.bookInfo[dojo.currentBookIndex].BookConfigData.BookPages[this.currentIndex - 2].title = pageTitle;
                        }
                    }
                }
            }
            moduleContent = this._getConfigData(dojo.bookInfo[dojo.currentBookIndex].ModuleConfigData);
            moduleAttr = moduleContent[moduleKey];
            //update module attributes in bookJSON.
            for (attr in moduleData) {
                if (moduleData.hasOwnProperty(attr)) {
                    moduleAttr[attr] = moduleData[attr];
                }
            }
            bookListData = this._getConfigData(dojo.bookInfo[dojo.currentBookIndex].BookConfigData);
            moduleIndex = domAttr.get(moduleContainer, "moduleIndex");
            if (moduleKey === "title" && this.currentIndex !== 0) {
                this._createTitleModule(moduleAttr, moduleContainer);
                bookListData.title = pageTitle;
                this.mapBookDetails[dojo.currentBookIndex][this.currentIndex][moduleKey] = pageTitle;
                //update TOC if page title gets changed.
                this._updateTOC();
            } else {
                //rerender container for updated module node.
                pageModule = domConstruct.create("div", { "moduleIndex": moduleIndex, "class": "esriDivPageModule dojoDndHandle" }, moduleContainer);
                domAttr.set(pageModule, "type", moduleType);
                this._renderModuleContent(moduleType, pageModule, moduleAttr);
            }
            dijit.byId("settingDialog").hide();
        },

        /**
        * create new module
        * @param{object} targetContainer is the parent container for the module to be created
        * @param{string} moduleType is the type of module to be created
        * @param{string} index is the index of new module in page column
        * @param{object} moduleInputs is inputFields which contains user inputs(attributes for module)
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createNewModule: function (targetContainer, moduleType, index, moduleInputs) {
            var columnIndex, pageModule, inputFields, moduleData, divModuleContent, inputKey, moduleAttr, bookList, newModuleKey, newModuleIndex, inputIndex;

            columnIndex = parseInt(domAttr.get(targetContainer.node, "columnIndex"), 10);
            newModuleIndex = index.toString() + columnIndex.toString() + this.currentIndex.toString() + "new" + dojo.currentBookIndex.toString();
            inputFields = query('.esriSettingInput');
            moduleData = {};
            //fetch input values
            for (inputIndex = 0; inputIndex < inputFields.length; inputIndex++) {
                inputKey = domAttr.get(inputFields[inputIndex], "inputKey");
                moduleData[inputKey] = moduleInputs[inputIndex].value;
            }
            //generate new unique key to access newly created module.
            newModuleKey = ((new Date()).getTime()).toString();
            moduleData.uid = newModuleKey;
            moduleData.type = moduleType;
            divModuleContent = domConstruct.create("div", { "class": "esriEditableModeContent esriMapBookColContent dojoDndItem esriLayoutDiv" + columnIndex }, null);
            domAttr.set(divModuleContent, "moduleIndex", newModuleIndex);
            domAttr.set(divModuleContent, "columnIndex", columnIndex);
            domAttr.set(divModuleContent, "contentIndex", index);
            pageModule = domConstruct.create("div", { "moduleIndex": newModuleIndex, "class": "esriDivPageModule dojoDndHandle" }, divModuleContent);
            domAttr.set(divModuleContent, "type", moduleType);
            this._renderModuleContent(moduleType, pageModule, moduleData);
            domAttr.set(this.currentNode, "moduleKey", newModuleKey);
            this.currentNode.appendChild(divModuleContent);

            bookList = this._getConfigData(dojo.bookInfo[dojo.currentBookIndex].BookConfigData);
            moduleAttr = this._getConfigData(dojo.bookInfo[dojo.currentBookIndex].ModuleConfigData);
            if (!bookList.content[columnIndex]) {
                bookList.content[columnIndex] = [];
            }
            bookList.content[columnIndex].splice(this.currentNode.index, 0, newModuleKey);
            moduleAttr[newModuleKey] = moduleData;
            this.mapBookDetails[dojo.currentBookIndex][this.currentIndex].content = bookList.content;
            //update column height if new module is added.
            this._setColumnHeight(targetContainer.node.parentElement);
            dijit.byId("settingDialog").hide();
        },

        /**
        * create logo module
        * @param{object} pageModule is the parent container for the logo module
        * @param{array} pageContentModule is the json array, which contains required attributes for logo module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createLogo: function (pageContentModule, pageModule) {
            var moduleIndex, divLogo, divImage, _self = this;
            dojo.moduleLoadingCount++;
            moduleIndex = "resizable" + domAttr.get(pageModule.parentElement, "moduleIndex");
            divLogo = domConstruct.create("div", { "class": "innerDiv", "id": moduleIndex }, pageModule);
            divImage = domConstruct.create("img", { "class": "esriLogoIcon", "id": "img" + moduleIndex, "style": 'height:' + pageContentModule.height + 'px;width:auto' }, divLogo);
            on(divImage, "load", function () {
                //set image dimension when it gets loaded.
                _self._setImageDimensions(this, true);
                dojo.moduleLoadingCount--;
                _self._updatePageHeight();
            });
            divImage.src = pageContentModule.URL;
            on(divImage, "error", function () {
                dojo.moduleLoadingCount--;
            });
            this._createEditMenu(pageModule.parentElement, pageContentModule.uid, divImage);
        },

        /**
        * create page title module
        * @param{object} pageTitleHolder is the parent container for the text module
        * @param{array} moduleData is the json array, which contains required attributes for page title module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createTitleModule: function (moduleData, pageTitleHolder) {
            var divText;
            divText = domConstruct.create("div", { "class": "esriGeorgiaFont esriPageTitle", "innerHTML": moduleData[moduleData.type] }, pageTitleHolder);
            domStyle.set(divText, "height", moduleData.height + 'px');
            this._createEditMenu(pageTitleHolder, moduleData.uid, false);
        },

        /**
        * create text module
        * @param{object} pageModule is the parent container for the text module
        * @param{array} moduleData is the json array, which contains required attributes for text module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createTextModule: function (moduleData, pageModule) {
            var divText, moduleIndex;
            moduleIndex = domAttr.get(pageModule.parentElement, "moduleIndex");
            divText = domConstruct.create("div", { "id": "resizable" + moduleIndex, "innerHTML": moduleData[moduleData.type] }, pageModule);
            domStyle.set(divText, "height", moduleData.height + 'px');
            if (moduleData.uid === "author") {
                //set logged in user's full name as author name of the book.
                domClass.add(divText, "esriArialFont esriMapBookAuthor");
                query('.esriBookAuthor')[dojo.currentBookIndex].innerHTML = dojo.bookInfo[dojo.currentBookIndex].BookConfigData.author;
            } else if (moduleData.uid === "title") {
                this._createCoverPageTitle(divText);
            } else {
                domClass.add(divText, "esriArialFont esriText");
            }
            this._createEditMenu(pageModule.parentElement, moduleData.uid, divText);
        },

        /**
        * create cover page title module
        * @param{object} divText is the text module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createCoverPageTitle: function (divText) {
            var pageTitle, bookPages;
            pageTitle = dojo.bookInfo[dojo.currentBookIndex].BookConfigData.title;
            domClass.add(divText, "esriGeorgiaFont esriPageTitle esriTitleFontSize");
            this.mapBookDetails[dojo.currentBookIndex][this.currentIndex].title = pageTitle;
            //update book title in book gallery.
            query('.esriBookTitle')[dojo.currentBookIndex].innerHTML = pageTitle;
            query('.esriMapBookList')[dojo.currentBookIndex].value = pageTitle;
            bookPages = lang.clone(this.mapBookDetails[dojo.currentBookIndex]);
            delete this.mapBookDetails[dojo.currentBookIndex];
            this.mapBookDetails[dojo.currentBookIndex] = bookPages;
            //update book title in book header.
            if (query('.esriMapBookTitle')[0]) {
                domAttr.set(query('.esriMapBookTitle')[0], "innerHTML", pageTitle);
            }
            domAttr.set(query('.esriBookTitle')[dojo.currentBookIndex], "title", pageTitle);
            this._updateTOC();
        },

        /**
        * create webmap module
        * @param{array} pageContentModule is the json array, which contains required attributes for webmap module
        * @param{object} pageModule is the parent container of the webmap module
        * @param{string} moduleIndex is the unique key for webmap module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createWebmapModule: function (pageContentModule, pageModule, moduleIndex) {
            var divMapModuleHolder, mapContent, mapOuterContainer, btnViewFullMap, loadingIndicator,
                imgLegendData, _self = this;
            divMapModuleHolder = domConstruct.create("div", { "class": "mapModule" }, pageModule);
            //create node to display title of webmap.
            this._createModuleHeaderTitle(divMapModuleHolder, pageContentModule);
            //destroy older node.
            if (dom.byId("map" + moduleIndex)) {
                domConstruct.destroy(dom.byId("map" + moduleIndex));
            }
            //create outer container for map.
            mapOuterContainer = domConstruct.create("div", { "id": "divMapContainer" + moduleIndex, "class": "esriMapContainer" }, divMapModuleHolder);
            domStyle.set(mapOuterContainer, "height", pageContentModule.height + 'px');
            mapContent = domConstruct.create("div", { "id": "map" + moduleIndex }, mapOuterContainer);
            domClass.add(mapContent, "esriCTFullHeightWidth");
            //create full map view icon and legend icon.
            btnViewFullMap = domConstruct.create("div", { "index": moduleIndex, "title": nls.fullScreen, "class": "imgfullMapView" }, null);
            imgLegendData = domConstruct.create("div", { "index": moduleIndex, "title": nls.legendTitle, "class": "imgLegend" }, null);
            //attach event on legend icon to toggle visiblity of legend panel.
            on(imgLegendData, "click", function () {
                _self._toggleLegendContainer(domAttr.get(this, "index"));
            });
            //create web map instance if webmap id/URL is available.
            if (pageContentModule.URL) {
                dojo.moduleLoadingCount++;
                //create loading icon to display map is loading.
                loadingIndicator = domConstruct.create("div", { id: "loadingmap" + moduleIndex, "class": "esriModuleLoadingIndicator" }, mapContent);
                domConstruct.create("div", { "class": "esriModuleLoadingIndicatorImage" }, loadingIndicator);
                //create a container of full page size to display map in full page view.
                this._createFullViewMap(btnViewFullMap, moduleIndex);
                this._renderWebMapContent(pageContentModule, mapContent.id, btnViewFullMap, imgLegendData);
            }
            this._createModuleCaption(divMapModuleHolder, pageContentModule);
            this._createEditMenu(pageModule.parentElement, pageContentModule.uid, mapOuterContainer);
        },

        /**
        * render webmap in webmap container
        * @param{array} currentModuleContent is the json array, which contains required attributes for webmap module
        * @param{string} mapId is the instance of the webmap
        * @param{object} btnViewFullMap is a domNode, which contains full-map view button tools
        * @param{object} imgLegendData is a domNode, which contains legend button
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _renderWebMapContent: function (currentModuleContent, mapId, btnViewFullMap, imgLegendData) {
            var _self = this, webmapUrl, webmapExtent;
            //destroy same id instance of webmap if exists.
            _self._destroyMap(mapId);
            //fetch wemap id from provided URL.
            webmapUrl = urlUtils.urlToObject(currentModuleContent.URL);
            if (webmapUrl.query) {
                if (webmapUrl.query.webmap) {
                    webmapUrl.path = webmapUrl.query.webmap;
                } else if (webmapUrl.query.id) {
                    webmapUrl.path = webmapUrl.query.id;
                }
                if (webmapUrl.query.extent) {
                    webmapExtent = webmapUrl.query.extent;
                }
            }
            if (webmapUrl.path) {
                //initialize webmap.
                arcgisUtils.createMap(webmapUrl.path, mapId, {
                    mapOptions: {
                        slider: true
                    },
                    ignorePopups: false
                }).then(function (response) {
                    if (dom.byId(mapId)) {
                        //add full view and legend icon at the top of the map.
                        response.map.root.appendChild(btnViewFullMap);
                        response.map.root.appendChild(imgLegendData);
                        _self.webmapArray.push(response.map);
                        //hide loading indicator of webmap module.
                        domStyle.set(dom.byId("loading" + mapId), "display", "none");
                        _self._createLegend(response.map, response.itemInfo.itemData.operationalLayers);
                        _self._createHomeButton(response.map);
                        //resize map on mouseover/touchover to prevent panning of map.
                        if (window.hasOwnProperty && window.hasOwnProperty('orientation')) {
                            _self.own(touch.over(dom.byId(mapId), function () {
                                response.map.resize();
                                response.map.reposition();
                            }));
                        } else {
                            _self.own(on(dom.byId(mapId), "mouseover", function (evt) {
                                response.map.resize();
                                response.map.reposition();
                                if (_self.isEditModeEnable) {
                                    evt.stopPropagation();
                                    evt.preventDefault();
                                }
                            }));
                        }
                        if (webmapExtent) {
                            _self._setExtentFromURL(response.map, webmapExtent);
                        }
                        //create UI of time slider.
                        _self._createTimeSlider(response);
                    } else {
                        //destroy map instance, if webmap response comes after closing the book.
                        response.map.destroy();
                    }
                    dojo.moduleLoadingCount--;
                }, function () {
                    dojo.moduleLoadingCount--;
                    //display error message if webmap gets failed to load.
                    if (dom.byId("loading" + mapId).children[0]) {
                        domAttr.set(dom.byId("loading" + mapId).children[0], "innerHTML", nls.errorMessages.webmapError);
                        dom.byId("loading" + mapId).children[0].style.backgroundImage = "none";
                    }
                });
            }
        },

        /**
        * set shared extent on map
        * @param{object} map is the instance of the webmap
        * @param{string} extentParam is the shared extent
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _setExtentFromURL: function (map, extentParam) {
            var newExtent, params, extent = extentParam.split(',');
            //fetch extent param from provided webmap URL and set it on map.
            if (extent.length > 3) {
                if (extent.length === 5) {
                    newExtent = new Extent(parseFloat(extent[0]), parseFloat(extent[1]), parseFloat(extent[2]), parseFloat(extent[3]), new SpatialReference({ wkid: parseFloat(extent[4]) }));
                } else {
                    if (extent[0] >= -180 && extent[0] <= 180) {
                        newExtent = new Extent(parseFloat(extent[0]), parseFloat(extent[1]), parseFloat(extent[2]), parseFloat(extent[3]), new SpatialReference({ wkid: 4326 }));
                    }
                }
                if (map.spatialReference.wkid === newExtent.spatialReference.wkid) {
                    map.setExtent(newExtent);
                } else {
                    //project extent on map if wkid of map is not matched with new extent's wkid.
                    params = new ProjectParameters();
                    params.geometries = [newExtent];
                    params.outSR = map.spatialReference;
                    esriConfig.defaults.geometryService.project(params, function (result) {
                        map.setExtent(result[0]);
                    });
                }

            }
        },

        /**
        * create title for module
        * @param{object} divMapModuleHolder is parent container of module
        * @param{array} pageContentModule is json array, which contains required attributes for title
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createModuleHeaderTitle: function (divMapModuleHolder, pageContentModule) {
            var mapTitle;
            if (pageContentModule.title) {
                mapTitle = domConstruct.create("div", { "class": "esriModuleTitle" }, null);
                domAttr.set(mapTitle, "innerHTML", pageContentModule.title);
                divMapModuleHolder.appendChild(mapTitle);
            }
        },

        /**
        * create caption for module
        * @param{object} divMapModuleHolder is parent container of module
        * @param{array} pageContentModule is json array, which contains required attributes for caption
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createModuleCaption: function (divMapModuleHolder, pageContentModule) {
            var mapCaption;
            if (pageContentModule.caption) {
                mapCaption = domConstruct.create("div", { "class": "esriModuleCaption" }, null);
                domAttr.set(mapCaption, "innerHTML", pageContentModule.caption);
                divMapModuleHolder.appendChild(mapCaption);
            }
        },

        /**
        * display full view of selected webmap
        * @param{object} btnViewFullMap is full-map view button for webmap
        * @param{string} moduleIndex is the unique key for webmap module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createFullViewMap: function (btnViewFullMap, moduleIndex) {
            var divFullMapView, currentPage, _self = this, fullMapIndex = this.currentIndex;
            divFullMapView = domConstruct.create("div", { "class": "esriFullMap", "id": "viewFull" + moduleIndex }, null);
            if (this.mapBookDetails[dojo.currentBookIndex][1] === "EmptyContent" && this.currentIndex !== 0) {
                fullMapIndex--;
            }
            currentPage = dom.byId("mapBookPagesUList").children[fullMapIndex];
            currentPage.appendChild(divFullMapView);
            //display/hide full map view when user clicks on full view icon placed at tope left corner of map.
            on(btnViewFullMap, "click", function () {
                if (domClass.contains(dom.byId("divContentListPanel"), "esriContentPanelOpened")) {
                    domClass.remove(dom.byId("divContentListPanel"), "esriContentPanelOpened");
                    domClass.remove(query(".esriTocIcon")[0], "esriHeaderIconSelected");
                }
                _self._toggleFullMapView(this);
            });
        },

        /**
        * render LightBox for image
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createImageLightBox: function () {
            var imageDialog = new Lightbox.LightboxDialog({ "id": "dijitImageLightBox" });
            imageDialog.startup();
            imageDialog.hide();
        },

        /**
        * render image module
        * @param{object} pageModule is the parent of image module
        * @param{array} pageContentModule is the json array,which contains required attribute to create image module
        * @param{string} moduleIndex is the unique key for image module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createImageModule: function (pageContentModule, pageModule, moduleIndex) {
            var innerDiv, imgModule, imgPath, loadingIndicator, loadingIcon, _self = this;
            //create outer container for image.
            innerDiv = domConstruct.create("div", { "id": "innerDiv" + "Img" + moduleIndex, "style": 'height:auto', "class": "innerDiv" }, pageModule);
            dojo.moduleLoadingCount++;
            if (dojo.isString(pageContentModule.URL) && lang.trim(pageContentModule.URL) !== "") {
                //create loading icon for image.
                loadingIndicator = domConstruct.create("div", { id: "resizableImg" + moduleIndex + "loading", "class": "esriModuleLoadingIndicator" }, innerDiv);
                domConstruct.create("div", { "class": "esriModuleLoadingIndicatorImage" }, loadingIndicator);
                imgModule = domConstruct.create("img", { "id": "resizableImg" + moduleIndex, "class": "esriImageModule esriAutoWidth", "style": 'height:auto' }, innerDiv);
                imgModule.URL = pageContentModule.URL;
                imgModule.loaded = false;
                on(imgModule, "load", function () {
                    //hide loading icon when image gets loaded.
                    this.loaded = true;
                    loadingIcon = query('.esriModuleLoadingIndicator', this.parentElement)[0];
                    domStyle.set(loadingIcon, "display", "none");
                    _self._setImageDimensions(this, true);
                    dojo.moduleLoadingCount--;
                    _self._updatePageHeight();
                });
                imgModule.src = pageContentModule.URL;
                on(imgModule, "error", function (e) {
                    //hide loading icon when image gets failed to load.
                    domStyle.set(dom.byId(this.id + "loading"), "display", "none");
                    dojo.moduleLoadingCount--;
                });
                on(imgModule, "click", function (evt) {
                    //allow user to view image in light box if edit mode is disable and image is loaded.
                    if (!_self.isEditModeEnable && this.loaded) {
                        imgPath = this.URL;
                        dijit.byId("dijitImageLightBox").show({ title: "", href: imgPath });
                    }
                });
            }
            this._createEditMenu(pageModule.parentElement, pageContentModule.uid, imgModule);
        },

        /**
        * render video module
        * @param{object} pageModule is the parent of video module
        * @param{array} pageContentModule is the json array,which contains required attribute to create video module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _renderVideoContent: function (pageContentModule, pageModule) {
            var embed = '', videoProvider = null, urlParam = pageContentModule.URL, videoURL, resizableFrame = false;
            if (pageContentModule.title) {
                embed += '<div class="esriModuleTitle">' + pageContentModule.title + '</div>';
            }
            if (dojo.isString(pageContentModule.URL) && lang.trim(pageContentModule.URL) !== "") {
                //identify which type of video URL is provided by searching keywords 'vimeo', 'esri','youtube' in URL.
                if (pageContentModule.URL.match("vimeo")) {
                    videoProvider = "vimeo";
                } else if (pageContentModule.URL.match("youtube")) {
                    videoProvider = "youtube";
                } else if (pageContentModule.URL.match("esri")) {
                    videoProvider = "esri";
                }
                videoURL = urlUtils.urlToObject(pageContentModule.URL);
                switch (videoProvider) {
                case "vimeo":
                    if (videoURL) {
                        urlParam = pageContentModule.URL.split('/');
                        urlParam = urlParam[urlParam.length - 1];
                    }
                    //create frame to display vimeo video.
                    videoURL = dojo.appConfigData.VimeoVideoUrl + urlParam;
                    embed += "<iframe width=" + "90%" + " height=" + pageContentModule.height + "px src='" + videoURL + "' frameborder=0 webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>";
                    break;
                case "youtube":
                    if (videoURL && videoURL.query) {
                        urlParam = videoURL.query.v;
                    }
                    //create frame to display youtube video.
                    videoURL = dojo.appConfigData.YouTubeVideoUrl + urlParam;
                    embed += "<iframe width=" + "90%" + " height=" + pageContentModule.height + "px src='" + videoURL + "' frameborder='0' allowfullscreen></iframe>";
                    break;
                case "esri":
                    if (videoURL) {
                        videoURL = pageContentModule.URL.replace("watch", "iframe");
                    } else {
                        videoURL = dojo.appConfigData.EsriVideoUrl + urlParam;
                    }
                    //create frame to display esri video.
                    embed += "<iframe width=" + "90%" + " height=" + pageContentModule.height + "px src='" + videoURL + "' frameborder=0 webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>";
                    break;
                }
                if (pageContentModule.caption) {
                    embed += '<div class="esriModuleCaption">' + pageContentModule.caption + '</div>';
                }
                pageModule.innerHTML = embed;
                domStyle.set(pageModule, "overflow", "hidden");
                //add class 'esriVideoModule' to fetch all video containing node in query.
                domClass.add(pageModule, "esriVideoModule");
            }
            if (query('iframe', pageModule)[0]) {
                //add resizable handle in video frame.
                resizableFrame = query('iframe', pageModule)[0];
                domAttr.set(query('iframe', pageModule)[0], "id", "resizableFrame" + pageContentModule.uid);
            }
            this._createEditMenu(pageModule.parentElement, pageContentModule.uid, resizableFrame);
        },

        /**
        * render Table of content module
        * @param{object} paranetNode is the parent of table of container node it can be content page or content panel
        * @param{array} moduleData is the json array,which contains required attribute to create table of content module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _renderTOCContent: function (parentNode, moduleData) {
            var _self = this, tocContent, anchorTag, divPageNo, divPageTitle, title, pageIndex;
            tocContent = query('.esriTOCcontainer', parentNode)[0];
            //destroy old TOC.
            this._destroyExistingNode(tocContent, false);
            tocContent = domConstruct.create("div", { "class": "esriTOCcontainer" }, null);
            //add page title and page no in TOC
            for (pageIndex = 0; pageIndex < _self.mapBookDetails[dojo.currentBookIndex].length; pageIndex++) {
                if (_self.mapBookDetails[dojo.currentBookIndex][pageIndex] !== "EmptyContent") {
                    anchorTag = domConstruct.create("div", { "value": pageIndex, "class": "esriContentListDiv" }, null);
                    divPageTitle = domConstruct.create("div", { "value": pageIndex, "class": "esriTitleListDiv" }, anchorTag);
                    divPageNo = domConstruct.create("div", { "value": pageIndex, "class": "esriTitleIndexDiv" }, anchorTag);
                    title = _self.mapBookDetails[dojo.currentBookIndex][pageIndex].title;
                    domAttr.set(divPageTitle, "innerHTML", title);
                    if (pageIndex > 1) {
                        domAttr.set(divPageNo, "innerHTML", (pageIndex - 1));
                    }
                    tocContent.appendChild(anchorTag);
                    on(anchorTag, "click", lang.hitch(this, this._openSelectedPage));
                }
            }
            if (anchorTag) {
                domStyle.set(anchorTag, "border-bottom", "none");
            }
            if (moduleData) {
                domStyle.set(parentNode, "height", moduleData.height + "px");
            }
            parentNode.appendChild(tocContent);
        },

        /**
        * open selected page in the book
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _openSelectedPage: function (event) {
            var target = event.currentTarget || event.srcElement;

            if (!domClass.contains(target.parentElement.parentElement.parentElement, "esriEditableModeContent")) {
                //on clicking of page title in TOC open respective page.
                if (this.mapBookDetails[dojo.currentBookIndex][target.value] !== "EmptyContent") {
                    this._gotoPage(target.value);
                    event.cancelBubble = true;
                    event.cancelable = true;
                }
            }
            event.stopPropagation();
        },

        /**
        * create flickr module
        * @param{array} moduleData is the json data,which contains required attributes for flickr module
        * @param{object} pageModule is the parent container of the module to be created
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _renderPhotoSetContent: function (moduleData, pageModule) {
            var photsetContent, moduleId, flickUrl, flickrSetId, flickrParams = {};
            moduleId = "flickr" + domAttr.get(pageModule, "moduleIndex");
            //destroy old instance of flickr grid with same id.
            if (dijit.byId(moduleId)) {
                dijit.byId(moduleId).destroy();
            }
            //fetch setid from provided flickr URL.
            flickUrl = moduleData.URL.split('/');
            if (flickUrl.length > 1) {
                flickrSetId = flickUrl[flickUrl.length - 1];
            } else {
                flickrSetId = moduleData.URL;
            }
            //set required parameter to fetch flickr photos.
            flickrParams = {
                "username": moduleData.username,
                "cols": moduleData.columns,
                "rows": moduleData.rows,
                "target": "_blank",
                "id": moduleId
            };
            //add 'setid' param if provided.
            if (flickrSetId && lang.trim(flickrSetId) !== "") {
                flickrParams.setId = flickrSetId;
            }
            //add 'apikey' param if provided.
            if (moduleData.apiKey && lang.trim(moduleData.apiKey) !== "") {
                flickrParams.apikey = moduleData.apiKey;
            }
            //add 'tags' param if provided.
            if (moduleData.tags && lang.trim(moduleData.tags) !== "") {
                flickrParams.tags = moduleData.tags;
            }
            //initialize dojo flickr widget.
            photsetContent = new FlickrBadge(flickrParams);
            domClass.add(pageModule, "esriflickrContainer");
            photsetContent.startup();
            //create title div for flickr module.
            this._createModuleHeaderTitle(pageModule, moduleData);
            pageModule.appendChild(photsetContent.domNode);
            //create caption div for flickr module.
            this._createModuleCaption(pageModule, moduleData);
            this._createEditMenu(pageModule.parentElement, moduleData.uid, false);
        },

        /**
        * create edit menu for module
        * @param{string} moduleId is the unique id of module in book config
        * @param{object} pageContentHolder is the parent container for the edit menu
        * @param{object} moduleHolder is the selected module
        * @memberOf widgets/mapbook-collection/module-renderer
        */
        _createEditMenu: function (pageContentHolder, moduleId, moduleHolder) {
            var _self = this, resizeHandle, moduleHolderId, resizer, deleteBtnNode, moduleType, divEditIcon, divEditOption, divDeleteIcon, moduleContainer, loadingIcon, allowDeleting;
            moduleType = domAttr.get(pageContentHolder, "type");
            domAttr.set(pageContentHolder, "key", moduleId);
            divEditOption = domConstruct.create("div", { "class": "esriEditContentOption" }, null);
            pageContentHolder.appendChild(divEditOption);
            if (moduleHolder) {
                //add auto resize handle for module.
                resizeHandle = domConstruct.create('div', {}, divEditOption);
                moduleHolderId = domAttr.get(moduleHolder, "id");
                resizer = new ResizeHandle({
                    resizeAxis: "y",
                    targetId: moduleHolderId,
                    minHeight: 10,
                    activeResize: true
                }, resizeHandle);
                resizer.resizeHandle.children[0].innerHTML = "...";
                resizer.startup();
                domAttr.set(resizer.domNode, "key", moduleId);
            }

            if (moduleId !== "title") {
                //create delete icon in edit panel to provide functionality to delete module.
                //delete module functionality will not be available for title of the page.
                divDeleteIcon = domConstruct.create("div", { "key": moduleId, "class": "esriDeletetModuleIcon", "title": nls.editMentDeleteTitle }, divEditOption);
                domAttr.set(divDeleteIcon, "type", moduleType);
                on(divDeleteIcon, "click", function () {
                    deleteBtnNode = this;
                    allowDeleting = true;
                    moduleContainer = deleteBtnNode.parentElement.parentElement;
                    loadingIcon = query('.esriModuleLoadingIndicator', moduleContainer)[0];
                    //allow deleting of module if it is loaded
                    if (loadingIcon && domStyle.get(loadingIcon, "display") !== "none") {
                        if (loadingIcon.childNodes[0].innerHTML === "") {
                            allowDeleting = false;
                        }
                    }
                    if (allowDeleting) {
                        //get confirmation from user to delete selected module.
                        _self.alertDialog._setContent(nls.confirmModuleDeleting, 1).then(function (deleteModuleFlag) {
                            if (deleteModuleFlag) {
                                dojo.bookInfo[dojo.currentBookIndex].BookConfigData.UnSaveEditsExists = true;
                                _self._deleteModule(domAttr.get(deleteBtnNode, "type"), moduleContainer, domAttr.get(deleteBtnNode, "key"));
                            }
                        });
                    }
                });
            }
            divEditIcon = domConstruct.create("div", { "key": moduleId, "class": "esriEditModuleIcon", "title": nls.editMentEditTitle }, divEditOption);
            domAttr.set(divEditIcon, "type", moduleType);
            //display setting dialog for module when user clicks on edit icon of edit panel.
            on(divEditIcon, "click", function () {
                moduleContainer = this.parentElement.parentElement;
                _self._showModuleSettingDialog(domAttr.get(this, "type"), false, moduleContainer, domAttr.get(this, "key"));
            });
        }
    });
});
