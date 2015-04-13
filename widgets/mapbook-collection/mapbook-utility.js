/*global define,dojo,dijit,appGlobals*/
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
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/query",
    "dojo/parser"
], function (declare, array, domConstruct, domAttr, domStyle, domClass, dom, query) {
    return declare([], {
        /**
        * create mapbook helper widget
        *
        * @class
        * @name widgets/mapbook-collection/mapbook-utility
        */
        /**
        * get data for current page from its json
        * @param{array} configData is a json array for a book it can be "moduleConfigData" or "BookConfigData"
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _getConfigData: function (configData) {
            var data;
            if (this.currentIndex === 0) {
                //if current page index is 0, then fetch data from book config for cover page.
                data = configData.CoverPage;
            } else if (this.currentIndex === 1) {
                //if current page index is 1, then fetch data from book config for content page.
                data = configData.ContentPage;
            } else {
                //if current page index is >1, then fetch data from book config for book page.
                if (configData.BookPages.length > (this.currentIndex - 2)) {
                    data = configData.BookPages[this.currentIndex - 2];
                }
            }
            return data;
        },
        /**
        * remove class from the domNode
        * @param{object} node is the domNode
        * @param{string} className is the name of class which has to be removed from the node
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _removeClass: function (node, className) {
            if (domClass.contains(node, className)) {
                domClass.remove(node, className);
            }
        },

        /**
        * destroy the node
        * @param{object} dijitNode is the node to be destroyed
        * @param{boolean} isDijitNode tell that node is a dijit or a domNode
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _destroyExistingNode: function (dijitNode, isDijitNode) {
            if (dijitNode) {
                if (isDijitNode) {
                    dijitNode.destroy();
                } else {
                    domConstruct.destroy(dijitNode);
                }
            }
        },

        /**
        * destroy the map
        * @param{string} mapId is the id of the webmap to be destroyed
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _destroyMap: function (mapId) {
            var mapIndex, isMapExist = false, _self = this;
            array.forEach(this.webmapArray, function (currentMap, index) {
                if (mapId === currentMap.id) {
                    mapIndex = index;
                    isMapExist = true;
                    _self._destroyExistingNode(dijit.registry.byId("legendContent" + currentMap.id), true);
                    currentMap.destroy();
                }
            });
            //update 'webmapArray' array after destroying the webmap.
            if (isMapExist) {
                this.webmapArray.splice(mapIndex, 1);
            }
        },

        /**
        * add layout class to the columns
        * @param{int} pageColumns is the no of columns in a page
        * @param{int} columnIndex is the index of columns in a page
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _setColumnClass: function (pageColumns, columnIndex) {
            var pageLayoutClass = '';
            if (pageColumns === 1) {
                //add class to column node if page has 1 column layout.
                pageLayoutClass = "esriLayoutDiv";
            } else {
                //add class to column node, if page has multi column layout.
                pageLayoutClass = "esriLayoutDiv" + columnIndex;
            }
            //add class to column node to make it dojo dnd container.
            pageLayoutClass += ' esriMapBookColContent dojoDndItem';
            return pageLayoutClass;
        },

        /**
        * set unique keys for module
        * @param{object} node is the module domNode in the page
        * @param{string} moduleIndex is the index of module in a book
        * @param{string} columnIndex is the index of column in a page
        * @param{string} contentIndex is the index of content in a column
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _setModuleIndex: function (node, moduleIndex, columnIndex, contentIndex) {
            if (node) {
                domAttr.set(node, "moduleIndex", moduleIndex);
                domAttr.set(node, "columnIndex", columnIndex);
                domAttr.set(node, "contentIndex", contentIndex);
            }
        },

        /**
        * enable dnd on book module
        * @param{object} dndNode is the dnd node
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _enableDnd: function (dndNode) {
            dndNode.delay = 0;
            dndNode.checkAcceptance = function () {
                return true;
            };
        },

        /**
        * disable dnd on book module
        * @param{object} dndNode is the dnd node
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _disableDnd: function (dndNode) {
            dndNode.delay = 1000;
            dndNode.checkAcceptance = function () {
                return false;
            };
        },

        /**
        * toggle disability of page navigation arrows
        * @param{boolean} enableNavigation,enable navigation arrows if enableNavigation is true
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _togglePageNavigation: function (enableNavigation) {
            if (enableNavigation) {
                this.isNavigationEnabled = true;
                this._removeClass(this.mapBookNextPage, "esriNextDisabledEditMode");
                this._removeClass(this.mapBookPreviousPage, "esriPrevDisabledEditMode");
            } else {
                this.isNavigationEnabled = false;
                domClass.add(this.mapBookNextPage, "esriNextDisabledEditMode");
                domClass.add(this.mapBookPreviousPage, "esriPrevDisabledEditMode");
            }
        },

        /**
        * toggle visibility of edit page & layout option page
        * @param{boolean} isContentPage, display content-layout option if it true else display page-layout option
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _toggleEditPageVisibility: function (isContentPage) {
            if (domStyle.get(query('.esriEditPageBody')[0], "display") === "none") {
                //hide video modules on opening of layout option page.
                query('.esriVideoModule').style("visibility", "hidden");
                domStyle.set(query('.esriEditPageBody')[0], "display", "block");
                domStyle.set(query('.esriMapBookEditPage')[0], "height", "100%");
                if (isContentPage) {
                    domStyle.set(query('.contentLayoutOption')[0], "display", "block");
                    domStyle.set(query('.pageLayoutOption')[0], "display", "none");
                } else {
                    domStyle.set(query('.contentLayoutOption')[0], "display", "none");
                    domStyle.set(query('.pageLayoutOption')[0], "display", "block");
                }
                this._togglePageNavigation(false);
            }
        },

        /**
        * toggle visibility of legend panel in webmap container
        * @param{object} btnNode is the legend button in webmap container
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _toggleLegendContainer: function (containerId) {
            var legendContainer = dom.byId("legendContentmap" + containerId);
            if (domClass.contains(legendContainer, "esriLegendContainerOpen")) {
                domClass.remove(legendContainer, "esriLegendContainerOpen");
            } else {
                this._resizeLegendContainer("map" + containerId);
                domClass.add(legendContainer, "esriLegendContainerOpen");
            }
        },

        /**
        * resize legend container according to map container.
        * @param{object} containerId is the webmap id
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _resizeLegendContainer: function (containerId) {
            var legendContainerWidth, mapContainer = dom.byId(containerId), legendContainer = dom.byId("legendContent" + containerId);
            if (legendContainer) {
                legendContainerWidth = Math.floor(mapContainer.offsetWidth / 2);
                if (legendContainerWidth > 250) {
                    legendContainerWidth = 250;
                }
                domStyle.set(legendContainer, "width", legendContainerWidth + "px");
            }
        },

        /**
        * toggle visibility of full-view of webmap
        * @param{object} btnNode is the full-view button for webmap container
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _toggleFullMapView: function (btnNode) {
            var containerId, divFullMap, divCustomMap, mapContainer, _self = this;
            containerId = domAttr.get(btnNode, "index");
            mapContainer = dom.byId("map" + containerId);
            divFullMap = dom.byId("viewFull" + containerId);
            divCustomMap = dom.byId("divMapContainer" + containerId);
            if (domStyle.get(divFullMap, "display") === "none") {
                //display map in full view mode.
                query('.esriVideoModule').style("visibility", "hidden");
                domStyle.set(divFullMap, "display", "block");
                divFullMap.appendChild(mapContainer);
            } else {
                //hide full view of map and display the original size.
                query('.esriVideoModule').style("visibility", "visible");
                domStyle.set(divFullMap, "display", "none");
                divCustomMap.appendChild(mapContainer);
            }
            _self._resizeMapModule(false, "map" + containerId);
        },

        /**
        * resize all webmap
        * @param{boolean} isResizeAll flag is true for resizing all webmap module and legend container.
        * @param{string} mapId is the id of webmap to resize provided webmap id 'isResizeAll' flag is set to false.
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _resizeMapModule: function (isResizeAll, mapId) {
            var _self = this;
            array.forEach(this.webmapArray, function (currentMap) {
                if (isResizeAll || mapId === currentMap.id) {
                    currentMap.resize();
                    currentMap.reposition();
                    _self._resizeLegendContainer(currentMap.id);
                }
            });
        },

        /**
        * toggle activating and deactivating dnd on modules
        * @param{boolean} isEditModeEnable allow function to activate dnd if it is true else deactivate dnd
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _toggleDnd: function (isEditModeEnable) {
            array.forEach(this.DNDArray, function (dndCont) {
                if (isEditModeEnable) {
                    dndCont.delay = 0;
                    dndCont.checkAcceptance = function (source, nodes) {
                        if (nodes[0].dndType !== "carouselPage") {
                            return true;
                        }
                    };
                } else {
                    dndCont.delay = 1000;
                    dndCont.checkAcceptance = function () {
                        return false;
                    };
                }
            });
        },

        /**
        * toggle visibility of delete icon over the book
        * @param{boolean} isEnable is a flag, it it is true then displays close buttons else hides
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _toggleDeleteBookOption: function (isEnable) {
            var selectedBookIndex, closeBtns, bookTitle;
            bookTitle = query('.esriBookTitlediv');
            closeBtns = query('.esriBookClose');
            array.forEach(closeBtns, function (deleteBtn, index) {
                selectedBookIndex = domAttr.get(deleteBtn.parentElement, "index");
                if (isEnable && appGlobals.bookInfo[selectedBookIndex].BookConfigData.owner === appGlobals.currentUser) {
                    //display delete icon on those books, which is created by the logging user.
                    domClass.add(bookTitle[index], "esriBookTitledivchange");
                    domStyle.set(deleteBtn, "display", "block");
                } else {
                    //remove delete icon from books.
                    domClass.remove(bookTitle[index], "esriBookTitledivchange");
                    domStyle.set(deleteBtn, "display", "none");
                }
            });
            //toggle highlighting delete book icon on application header.
            if (isEnable) {
                domClass.add(query('.esriDeleteBookIcon')[0], "esriHeaderIconSelected");
            } else {
                domClass.remove(query('.esriDeleteBookIcon')[0], "esriHeaderIconSelected");
            }
        },

        /**
        * clear selected template
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _clearTemplateSelection: function () {
            var configLayout, selectedTemp, _self = this;

            selectedTemp = query('.pageLayoutOption .esriTemplateImage');
            configLayout = appGlobals.appConfigData.BookPageLayouts;
            //remove selection from earlier selected template option for book pages.
            array.forEach(selectedTemp, function (template, index) {
                _self._removeClass(template, "selectedTemplate");
                domAttr.set(template, "src", configLayout[index].templateIcon);
            });

            selectedTemp = query('.contentLayoutOption .esriTemplateImage');
            configLayout = appGlobals.appConfigData.ContentPageLayouts;
            //remove selection from earlier selected template option for content page.
            array.forEach(selectedTemp, function (template, index) {
                _self._removeClass(template, "selectedTemplate");
                domAttr.set(template, "src", configLayout[index].templateIcon);
            });
        },

        /**
        * update table of content
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _updateTOC: function () {
            var oldTOC;
            oldTOC = query('.esriMapBookColContent .esriTOCcontainer')[0];
            if (oldTOC) {
                //update older TOC placed in content page.
                this._renderTOCContent(oldTOC.parentElement);
            }
            //update older TOC panel.
            this._renderTOCContent(dom.byId("divContentList"));
        },

        /**
        * reassign indexes to book pages
        * @param{array} bookListdata is an object array for book data
        * @param{int} bookPagesLength is the no of pages in the book
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _setBookPageIndex: function (bookListdata, bookPagesLength) {
            var bookPageIndex;
            for (bookPageIndex = 0; bookPageIndex < bookPagesLength; bookPageIndex++) {
                bookListdata[bookPageIndex].index = bookPageIndex + 2;
            }
        },

        /**
        * update height of module in config when resizing is done
        * @param{object} resizerObject is the domNode which used to identify that which module node is resized
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _setNewHeight: function (resizerObj) {
            var moduleKey, newHeight, newWidth, configData, aspectRatio;
            moduleKey = domAttr.get(resizerObj.domNode, "key");
            newHeight = domStyle.get(resizerObj.targetDomNode, "height");
            //resize image module without distorting it.
            if (domClass.contains(resizerObj.targetDomNode, "esriImageModule") || domClass.contains(resizerObj.targetDomNode, "esriLogoIcon")) {
                domClass.add(resizerObj.targetDomNode, "esriAutoWidth");
                //set new dimensions for image if it is not fit in the container.
                if (resizerObj.targetDomNode.parentElement.offsetWidth < resizerObj.targetDomNode.offsetWidth) {
                    //find aspect ratio of the image dimension.
                    aspectRatio = resizerObj.targetDomNode.offsetWidth / resizerObj.targetDomNode.offsetHeight;
                    newWidth = resizerObj.targetDomNode.parentElement.offsetWidth - 5;
                    //calculate new height according to aspect ratio of the image.
                    newHeight = Math.floor(newWidth / aspectRatio);
                    domClass.remove(resizerObj.targetDomNode, "esriAutoWidth");
                    //set calculated dimensions to the image.
                    domStyle.set(resizerObj.targetDomNode, "width", newWidth + 'px');
                    domStyle.set(resizerObj.targetDomNode, "height", newHeight + 'px');
                }
            }
            configData = this._getConfigData(appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData);
            //update height of the module in book JSON.
            configData[moduleKey].height = Math.floor(newHeight);
        },

        /**
        * update page height, when image gets loaded
        * @param{object} resizerObject is the domNode which used to identify that which module node is resized
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _updatePageHeight: function () {
            var selectedPage, listItemIndex = this.currentIndex;
            if (this.currentIndex > 0 && this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                listItemIndex = this.currentIndex - 1;
            }
            selectedPage = query('.esriMapBookPage', dom.byId("mapBookPagesUList").childNodes[listItemIndex])[0];
            this._setColumnHeight(selectedPage);
        },

        /**
        * set image dimension for all images in the page
        * @param{object} page is the domNode, which is the page of the book
        * @param{boolean} isOnLoad flag is true when an image is loaded first time
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _checkImageDimension: function (page, isOnLoad) {
            var _self = this, imgModules = query('.esriImageModule', page);
            array.forEach(imgModules, function (imgModule) {
                _self._setImageDimensions(imgModule, isOnLoad);
            });
        },

        /**
        * set image dimension for all images in the page
        * @param{object} imageModule is the image node
        * @param{boolean} isOnLoad flag is true when an image is loaded first time
        * @memberOf widgets/mapbook-collection/mapbook-utility
        */
        _setImageDimensions: function (imgModule, isOnLoad) {
            var aspectRatio, newWidth, newHeight, imgWidth, imgContainer = imgModule.parentElement;
            if (isOnLoad && imgModule && imgModule.offsetHeight > 0) {
                //set original dimensions of image as it max dimensions.
                domAttr.set(imgModule, "originalWidth", imgModule.offsetWidth);
                domStyle.set(imgModule, "maxHeight", imgModule.offsetHeight + 'px');
                domStyle.set(imgModule, "maxWidth", imgModule.offsetWidth + 'px');
            }
            imgWidth = parseFloat(domAttr.get(imgModule, "originalWidth"));
            if ((imgWidth > 0 && imgContainer.offsetWidth > 0) && (imgContainer.offsetWidth < imgModule.offsetWidth || imgWidth > imgContainer.offsetWidth)) {
                //change dimensions of image if it is larger/smaller than its parent container.
                //calculate aspect ratio of image.
                aspectRatio = imgModule.offsetWidth / imgModule.offsetHeight;
                //calculate new dimensions according to aspect ratio of image.
                newWidth = imgContainer.offsetWidth - 2;
                newHeight = Math.floor(newWidth / aspectRatio);
                domClass.remove(imgModule, "esriAutoWidth");
                //set new dimensions to image.
                domStyle.set(imgModule, "width", newWidth + 'px');
                domStyle.set(imgModule, "height", newHeight + 'px');
            }
        }
    });
});
