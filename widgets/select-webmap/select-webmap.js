/*global define,dojo,dijit,console,appGlobals*/
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
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/form/ComboBox",
    "dijit/form/TextBox",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/on",
    "dojo/query",
    "dojo/string",
    "dojo/store/Memory",
    "dojo/topic",
    "dojo/i18n!nls/localized-strings",
    "../mapbook-collection/mapbook-utility"
], function (declare, lang, _WidgetBase, ComboBox, TextBox, domConstruct, domAttr, domStyle, domClass, dom, on, query, dojoString, Memory, topic, nls, mapbookUtility) {
    return declare([_WidgetBase, mapbookUtility], {
        _portal: null,
        _selectedWebmap: null,
        _webmapModule: null,
        _webmapURL: null,
        /**
        * create select webmap widget
        *
        * @class
        * @name widgets/select-webmap/select-webmap
        */
        startup: function () {
            //set access url for webmaps
            this._webmapURL = appGlobals.appConfigData.PortalURL + '/home/webmap/viewer.html?webmap=';
            //get portal object.
            topic.subscribe("_getPortal", lang.hitch(this, function (portal) {
                this._portal = portal;
            }));
            topic.subscribe("_queryForWebmapsHandler", lang.hitch(this, this._setDefaultSearchOption));
            topic.subscribe("_createSelectWebmapDialogHandler", lang.hitch(this, function (container, moduleContainer) {
                this._webmapModule = moduleContainer;
                this._createSelectWebmapDialog(container);
            }));
            on(window, "resize", lang.hitch(this, this._resizeSelectWebmapDialog));
        },

        /**
        * resize select webmap dialog
        * @memberOf widgets/select-webmap/select-webmap
        */
        _resizeSelectWebmapDialog: function () {
            var container, containerWidth, outerContainerWidth, i;
            container = query('.esriSelectWebmapContainer')[0];
            if (container && container.offsetWidth) {
                containerWidth = domStyle.get(container, "width") - 5;
                outerContainerWidth = dom.byId("divWebmapContent").childNodes.length * containerWidth;
                for (i = 0; i < dom.byId("divWebmapContent").childNodes.length; i++) {
                    domAttr.set(dom.byId("divWebmapContent").children[i], "width", containerWidth + 'px');
                    dom.byId("divWebmapContent").children[i].style.width = containerWidth + 'px';
                }
                //set webmap container width
                domStyle.set(dom.byId("divWebmapContent"), "width", outerContainerWidth + "px");
                dom.byId("divWebmapContent").style.width = outerContainerWidth + "px";
            }
        },

        /**
        * create UI of select webmap dialog
        * @memberOf widgets/select-webmap/select-webmap
        */
        _createSelectWebmapDialog: function (container) {
            var divSelectWebMapContainer, divSearchOption;
            //create outer container for webmap dialog.
            divSelectWebMapContainer = domConstruct.create("div", { "class": "esriSelectWebmapContainer" }, null);
            divSearchOption = domConstruct.create("div", { "class": "esriSearchWebmapOptions" }, divSelectWebMapContainer);
            this._createWebmapSearchDropdown(divSearchOption);
            this._createWebmapSearchBox(divSearchOption);
            domConstruct.create("div", { "id": "divWebmapContent", "class": "esriWebmapContent" }, divSelectWebMapContainer);
            this._createPaginationFooter(divSelectWebMapContainer);
            container.appendChild(divSelectWebMapContainer);
            this._setDefaultSearchOption();

        },

        /**
        * set default option for searching webmap on AGOL in drop-down
        * @memberOf widgets/select-webmap/select-webmap
        */
        _setDefaultSearchOption: function () {
            //display 'organization' selected to search webmaps with in the organization.
            dijit.byId("searchWebmapComboBox").set("item", dijit.byId("searchWebmapComboBox").store.data[2]);
            dijit.byId("searchTagTextBox").reset();
        },

        /**
        * create UI of pagination node for webmap dialog
        * @memberOf widgets/select-webmap/select-webmap
        */
        _createPaginationFooter: function (divSelectWebMapContainer) {
            var divPaginationFooter, divInnerPaginationFooter, divPrev, divPageStatus, divNext;
            divPaginationFooter = domConstruct.create("div", { "class": "esriWebmapPagination" }, divSelectWebMapContainer);
            divInnerPaginationFooter = domConstruct.create("div", { "class": "esriPaginationInnerDiv" }, divPaginationFooter);
            domConstruct.create("div", { "class": "esriWebmapCountDiv" }, divInnerPaginationFooter);
            //create previous arrow in select webmap dialog.
            divPrev = domConstruct.create("div", { "class": "esriPaginationPrevious disableNavigation", "innerHTML": "<span class='esriPaginationText'>" + nls.preWebmapPageText + "<span>" }, divInnerPaginationFooter);
            //create node to display currently opened page status.
            divPageStatus = domConstruct.create("div", { "class": "esriCurrentPageStatus" }, divInnerPaginationFooter);
            //create previous arrow in select webmap dialog.
            divNext = domConstruct.create("div", { "class": "esriPaginationNext disableNavigation", "innerHTML": "<span class='esriPaginationText'>" + nls.nextWebmapPageText + "</span>" }, divInnerPaginationFooter);
            //display total no of pages available in select webmap dialog.
            divPageStatus.innerHTML = '<div class="esriCurrentPageIndex"></div>' + ' / <div class="esriTotalPageCount"> </div>';
            on(divPrev, "click", lang.hitch(this, this._displaySelecteddPage, divPrev, false));
            on(divNext, "click", lang.hitch(this, this._displaySelecteddPage, divNext, true));

        },

        /**
        * display selected page in webmap dialog
        * @param{object} btnNode is the navigation button it can be left or right
        * @param{boolean} isNext is true for showing next page and false for previous page in webmap dialog
        * @memberOf widgets/select-webmap/select-webmap
        */
        _displaySelecteddPage: function (btnNode, isNext) {
            var currentPageIndex, webmapPageList;
            //display page if clicked node is enable.
            if (!domClass.contains(btnNode, "disableNavigation")) {
                webmapPageList = query('.esriWebmapListPage');
                //get index of selected page.
                currentPageIndex = parseInt(domAttr.get(query('.esriCurrentPageIndex')[0], "currentPage"), 10);
                domClass.add(webmapPageList[currentPageIndex], "displayNone");
                if (isNext) {
                    currentPageIndex++;
                } else {
                    currentPageIndex--;
                }
                //hide earlier selected page and display new one.
                domClass.remove(webmapPageList[currentPageIndex], "displayNone");
                domClass.remove(query('.esriPaginationNext')[0], "disableNavigation");
                domClass.remove(query('.esriPaginationPrevious')[0], "disableNavigation");
                //disable arrow if displayed page is the last page.
                if (currentPageIndex === webmapPageList.length - 1) {
                    domClass.add(btnNode, "disableNavigation");
                }
                //disable arrow if displayed page is the first page.
                if (currentPageIndex === 0) {
                    domClass.add(btnNode, "disableNavigation");
                }
                //update page status.
                this._setPaginationDetails(currentPageIndex);
            }
        },

        /**
        * search webmap on portal
        * @param{string} param contains search string for query webmaps
        * @memberOf widgets/select-webmap/select-webmap
        */
        _queryPortalForWebmaps: function (param) {
            var _self = this, queryParams, queryString;
            queryString = ' type:"Web Map" -type:"Web Mapping Application"';
            //add additional search param.
            if (param && param !== '') {
                queryString = param + ' AND' + queryString;
            }
            //set query parameter for searching webmap
            queryParams = {
                q: queryString,
                sortField: "title",
                sortOrder: "asc",
                start: 1,
                num: appGlobals.appConfigData.MaxWebMapCount
            };
            //display loading text.
            dom.byId("divWebmapContent").innerHTML = nls.loadingWebmap;
            this._portal.queryItems(queryParams).then(function (response) {
                //create webmap thumbnail grid.
                _self._createWebMapDialogContent(response);
            }, function (error) {
                //display error message if any error occurred.
                domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
                dom.byId("divWebmapContent").innerHTML = nls.errorMessages.webmapSearchFailed;
                console.log(error);
            });
        },

        /**
        * create select webmap dialog content
        * @param{object} response contains search results (webmaps)
        * @memberOf widgets/select-webmap/select-webmap
        */
        _createWebMapDialogContent: function (response) {
            var pageIndex, webmapIndex, divWebmapPage, divWebmapThumbnail, pageWidth,
                paginationFooter, noOfpages, pageContentIndex;
            this._selectedWebmap = null;
            domConstruct.empty(dom.byId("divWebmapContent"));
            noOfpages = Math.ceil(response.results.length / appGlobals.appConfigData.WebmapPerPage);
            webmapIndex = 0;
            if (response.results.length > 0) {
                //create webmap page
                for (pageIndex = 0; pageIndex < noOfpages; pageIndex++) {
                    divWebmapPage = domConstruct.create("div", { "pageIndex": pageIndex, "class": "esriWebmapListPage" }, dom.byId("divWebmapContent"));
                    if (pageIndex !== 0) {
                        domClass.add(divWebmapPage, "displayNone");
                    }
                    // create node for webmap thumbnails & titles
                    for (pageContentIndex = 0; pageContentIndex < appGlobals.appConfigData.WebmapPerPage; pageContentIndex++) {
                        if (response.results[webmapIndex]) {
                            divWebmapThumbnail = domConstruct.create("div", { "class": "esriWebmapThumbnailDiv" }, divWebmapPage);
                            this._createWebmapThumbnail(divWebmapThumbnail, response, webmapIndex);
                            //attach event on webmap thumbnail
                            this.own(on(divWebmapThumbnail, "click", lang.hitch(this, this._selectWebmap)));
                            //display summary on hovering of webmap thumbnail.
                            this.own(on(divWebmapThumbnail, "mouseover", lang.hitch(this, this._toggleDescriptionView)));
                            //hide summary on removing mouse/cursor from webmap thumbnail.
                            this.own(on(divWebmapThumbnail, "mouseout", lang.hitch(this, this._toggleDescriptionView)));
                            //display selected webmap in webmap container on double click of webmap thumbnail.
                            this.own(on(divWebmapThumbnail, "dblclick", lang.hitch(this, this._selectWebmap)));
                            webmapIndex++;
                        }
                        //break loop, when webmap thumbnail is created for all webmaps.
                        if (webmapIndex > response.results.length) {
                            break;
                        }
                    }
                }
                //set width of webmap thumbnail grid.
                pageWidth = domStyle.get(divWebmapPage, "width");
                domStyle.set(dom.byId("divWebmapContent"), "width", pageWidth * noOfpages + 'px');
            }
            //set page status in footer.
            paginationFooter = query('.esriWebmapPagination')[0];
            if (paginationFooter) {
                if (response.results.length === 0) {
                    domStyle.set(query('.esriPaginationInnerDiv')[0], "display", "none");
                    dom.byId("divWebmapContent").innerHTML = nls.noWebmapFound;
                } else {
                    domStyle.set(query('.esriPaginationInnerDiv')[0], "display", "block");
                }
                query('.esriTotalPageCount')[0].innerHTML = noOfpages;
                domAttr.set(query('.esriTotalPageCount')[0], "totalWebmap", response.results.length);
                domAttr.set(query('.esriTotalPageCount')[0], "webmapPerPage", appGlobals.appConfigData.WebmapPerPage);
                if (noOfpages === 1) {
                    domClass.add(query('.esriPaginationNext')[0], "disableNavigation");
                } else {
                    domClass.remove(query('.esriPaginationNext')[0], "disableNavigation");
                }
                domClass.add(query('.esriPaginationPrevious')[0], "disableNavigation");
                //display first page.
                this._setPaginationDetails(0);
            }
            domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
            this._resizeSelectWebmapDialog();
        },

        /**
        * create webmap thumbnail
        * @param{object} divWebmapThumbnail is domNode, which displays webmap thumbnail and description
        * @param{object} response is the collection of webmaps
        * @param{int} webmapIndex is index of webmap in response
        * @memberOf widgets/select-webmap/select-webmap
        */
        _createWebmapThumbnail: function (divWebmapThumbnail, response, webmapIndex) {
            var imgWebmapDescript, webmapThumbnailSrc;
            if (response.results[webmapIndex].thumbnailUrl) {
                //set webmap thumbnail URL from webmap object.
                webmapThumbnailSrc = response.results[webmapIndex].thumbnailUrl;
            } else {
                //set default image for webmap thumbnail from config .
                webmapThumbnailSrc = appGlobals.appConfigData.DefaultWebmapThumbnail;
            }
            domConstruct.create("img", { "src": webmapThumbnailSrc, "class": "esriWebmapThumbnail" }, divWebmapThumbnail);
            //set webmap id as webmapID attribute of webmap thumbnail node.
            domAttr.set(divWebmapThumbnail, "webmapID", this._webmapURL + response.results[webmapIndex].id);
            //set webmap title as webmapTitle attribute of webmap thumbnail node.
            domAttr.set(divWebmapThumbnail, "webmapTitle", response.results[webmapIndex].title);
            //create node to display title of webmap.
            domConstruct.create("div", { "class": "esriWebmapTitle", "innerHTML": response.results[webmapIndex].title }, divWebmapThumbnail);
            imgWebmapDescript = domConstruct.create("div", { "class": "esriWebmapDescript" }, divWebmapThumbnail);
            //display configured text for summary if it is not available in webmap object.
            if (response.results[webmapIndex].snippet !== null) {
                //set webmap summary as webmapCaption attribute of webmap thumbnail node.
                domAttr.set(divWebmapThumbnail, "webmapCaption", response.results[webmapIndex].snippet);
                imgWebmapDescript.innerHTML = response.results[webmapIndex].snippet;
            } else {
                //set empty string as webmapCaption attribute of webmap thumbnail node.
                domAttr.set(divWebmapThumbnail, "webmapCaption", "");
                imgWebmapDescript.innerHTML = nls.descriptionNotAvailable;
            }
        },

        /**
        * select clicked webmap to show it in webmap module of the book
        * @memberOf widgets/select-webmap/select-webmap
        */
        _selectWebmap: function (event) {
            var isDblClicked = false, selectedNode;
            selectedNode = event.currentTarget || event.srcElement;
            if (event.type === "dblclick") {
                isDblClicked = true;
                event.stopPropagation();
            }
            if (query('.esriSelectedWebmapDiv')[0]) {
                domClass.remove(query('.esriSelectedWebmapDiv')[0], "esriSelectedWebmapDiv");
            }
            domClass.add(selectedNode, "esriSelectedWebmapDiv");
            this._selectedWebmap = {};
            this._selectedWebmap.URL = domAttr.get(selectedNode, "webmapID");
            this._selectedWebmap.title = domAttr.get(selectedNode, "webmapTitle");
            this._selectedWebmap.caption = domAttr.get(selectedNode, "webmapCaption");
            this._setSelectedWebmapAttr(isDblClicked);
        },

        /**
        * toggle visibility of description of webmap on hovering on it
        * @memberOf widgets/select-webmap/select-webmap
        */
        _toggleDescriptionView: function (event) {
            var selectedNode, imgWebmap, descWebmap, isVisible = false;
            selectedNode = event.currentTarget || event.srcElement;
            //check if mouse is over on webmap thumbnail.
            if (event.type === "mouseover") {
                isVisible = true;
            }
            //get webmap thumbnail and summary node.
            imgWebmap = query('.esriWebmapThumbnail', selectedNode)[0];
            descWebmap = query('.esriWebmapDescript', selectedNode)[0];
            if (isVisible) {
                imgWebmap.style.display = "none";
                descWebmap.style.display = "block";
            } else {
                imgWebmap.style.display = "block";
                descWebmap.style.display = "none";
            }
        },

        /**
        * on clicking of webmap thumbnail set it selected webmap
        * @param{object} response contains search results (webmaps)
        * @memberOf widgets/select-webmap/select-webmap
        */
        _setSelectedWebmapAttr: function (isDblClicked) {
            var inputIndex, moduleInputs, inputKey, inputFields, btnSave;
            if (this._selectedWebmap) {
                moduleInputs = [];
                inputFields = query('.esriSettingInput');
                //display selected webmap's attributes in webmap setting dialog.
                for (inputIndex = 0; inputIndex < inputFields.length; inputIndex++) {
                    moduleInputs[inputIndex] = {};
                    inputKey = domAttr.get(inputFields[inputIndex], "inputKey");
                    if (this._selectedWebmap.hasOwnProperty(inputKey)) {
                        moduleInputs[inputIndex].value = this._selectedWebmap[inputKey];
                        query('.dijitInputInner', inputFields[inputIndex])[0].value = this._selectedWebmap[inputKey];
                    }
                }
            }
            if (isDblClicked) {
                btnSave = query('.esriSettingSave')[0];
                //validate input for display selected webmap in book page.
                topic.publish("validateInputHandler", btnSave, this._webmapModule, moduleInputs);
            }
        },

        /**
        * set pagination data
        * @param{int} pageIndex is the index of currently opened web map page in webmap dialog
        * @memberOf widgets/select-webmap/select-webmap
        */
        _setPaginationDetails: function (pageIndex) {
            var startIndex, webmapCount, webmapPerPage, totalWebmap, webmapCountDetails;
            //update current page status.
            totalWebmap = domAttr.get(query('.esriTotalPageCount')[0], "totalWebmap");
            webmapPerPage = domAttr.get(query('.esriTotalPageCount')[0], "webmapPerPage");
            webmapCount = query('.esriWebmapListPage')[pageIndex].children.length;
            startIndex = pageIndex * webmapPerPage + 1;
            webmapCount = webmapCount + startIndex - 1;
            if (webmapCount) {
                webmapCountDetails = dojoString.substitute(nls.webmapCountStatus, { "start": startIndex, "end": webmapCount, "total": totalWebmap });
                query('.esriWebmapCountDiv')[0].innerHTML = webmapCountDetails;
                domAttr.set(query('.esriCurrentPageIndex')[0], "currentPage", pageIndex);
                query('.esriCurrentPageIndex')[0].innerHTML = pageIndex + 1;
            }
        },

        /**
        * create drop-down for searching webmap on portal
        * @param{object} divSearchOption is the parent container for search drop-down
        * @memberOf widgets/select-webmap/select-webmap
        */
        _createWebmapSearchDropdown: function (divSearchOption) {

            var divInputContainer, stateStore, dijitInputContainer;
            divInputContainer = domConstruct.create("div", {}, divSearchOption);

            if (dijit.byId("searchWebmapComboBox")) {
                dijit.byId("searchWebmapComboBox").destroy();
            }
            //create store for searching options in drop down.
            stateStore = new Memory({
                data: [{ name: nls.arcgisOptionText, value: "arcgis" },
                       { name: nls.myContentOptionText, value: "mycontent" },
                       { name: nls.organizationOptionText, value: "org"}]
            });
            //initialize dojo combo-box.
            dijitInputContainer = new ComboBox({
                store: stateStore,
                value: stateStore.data[0].name,
                searchAttr: "name",
                "id": "searchWebmapComboBox"
            }, divInputContainer);
            dijitInputContainer.startup();
            //set search drop-down readable only.
            dijitInputContainer.textbox.readOnly = true;
            dijit.byId("searchWebmapComboBox").item = stateStore.data[0];
            on(dijitInputContainer, "change", lang.hitch(this, function () {
                this._getSelectedSearchOption();
            }));
        },

        /**
        * get selected search option.
        * @memberOf widgets/select-webmap/select-webmap
        */
        _getSelectedSearchOption: function () {
            var searchParam, queryParam = '';
            searchParam = dijit.byId("searchWebmapComboBox").item.value;
            //get selected item from drop-down.
            switch (searchParam) {
            case "arcgis":
                break;
            case "org":
                queryParam = "orgid:" + this._portal.id;
                break;
            case "mycontent":
                queryParam = "owner: " + appGlobals.currentUser;
                break;
            }
            //get searched string from textbox.
            if (lang.trim(dijit.byId("searchTagTextBox").get("value")) !== "") {
                if (queryParam !== '') {
                    queryParam += ' AND ';
                }
                queryParam += 'title:' + dijit.byId("searchTagTextBox").get("value");
            }
            this._queryPortalForWebmaps(queryParam);
        },

        /**
        * create textbox for searching webmap on portal
        * @param{object} divSearchOption is the parent container for search text-box
        * @memberOf widgets/select-webmap/select-webmap
        */
        _createWebmapSearchBox: function (divSearchOption) {
            var divInputContainer, dijitInputContainer, btnSearch;
            divInputContainer = domConstruct.create("div", {}, divSearchOption);
            if (dijit.byId("searchTagTextBox")) {
                dijit.byId("searchTagTextBox").destroy();
            }
            //initialize dojo text-box.
            dijitInputContainer = new TextBox({ "id": "searchTagTextBox", "class": "esriSearchWebmapTextBox" }, divInputContainer);
            dijitInputContainer.textbox.placeholder = nls.searchWebmapPlaceHolder;
            dijitInputContainer.startup();
            //create 'go' button to search webmap on AGOL with input string of text-box.
            btnSearch = domConstruct.create("div", { "class": "esriSearchWebmapBtn", "innerHTML": nls.webmapSearchBtnText }, null);
            dijitInputContainer.domNode.appendChild(btnSearch);
            this.own(on(btnSearch, "click", lang.hitch(this, function () {
                this._getSelectedSearchOption();
            })));
        }
    });
});

