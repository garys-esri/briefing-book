/*global define,dojo,dijit,OAuthHelper,appGlobals*/
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
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/on",
    "dojo/topic",
    "dojo/query",
    "dojo/string",
    "dojo/dnd/Source",
    "dojo/text!./templates/mapbook-collection.html",
    "dojo/window",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!nls/localized-strings",
    "esri/urlUtils",
    "dojox/image/FlickrBadge",
    "dojox/data/FlickrRestStore",
    "../mapbook-collection/mapbook-dijits",
    "../mapbook-collection/page-navigation",
    "../mapbook-collection/module-renderer",
    "../mapbook-collection/page-renderer"
], function (declare, lang, array, domConstruct, domAttr, domStyle, domClass, dom, on, topic, query, dojoString, DndSource, template, dojoWindow, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, nls, urlUtils, FlickrBadge, FlickrRestStore, mapbookDijits, pageNavigation, moduleRenderer, pageRenderer) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, mapbookDijits, pageNavigation, moduleRenderer, pageRenderer], {
        templateString: template,
        nls: nls,
        mapBookDetails: {},
        currentIndex: null,
        currentBookIndex: 0,
        webmapArray: [],
        isDND: false,
        DNDArray: [],
        isNavigationEnabled: true,
        isEditModeEnable: false,
        /**
        * create mapBookCollection widget
        *
        * @class
        * @name widgets/mapbook-collection/mapbook-collection
        */
        startup: function () {
            var _self = this, flickrUrl = "https://www.flickr.com/services/rest/";
            // count to detect how many modules are not loaded yet
            appGlobals.moduleLoadingCount = 0;
            //overriding dojo flickr widgets
            lang.extend(FlickrRestStore, {
                _flickrRestUrl: flickrUrl
            });
            lang.extend(FlickrBadge, {
                postCreate: function () {
                    if (this.username && !this.userid) {
                        dojo.io.script.get({
                            url: flickrUrl,
                            preventCache: true,
                            content: {
                                format: "json",
                                method: "flickr.people.findByUsername",
                                api_key: this.apikey,
                                username: this.username
                            },
                            callbackParamName: "jsoncallback"
                        }).addCallback(this, function (a) {
                            if (a.user && a.user.nsid) {
                                this.userid = a.user.nsid;
                                if (!this._started) {
                                    this.startup();
                                }
                            }
                        });
                    }
                }
            });
            // update module height on resizing
            topic.subscribe("/dojo/resize/stop", function (resizerObj) {
                appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.UnSaveEditsExists = true;
                _self._setNewHeight(resizerObj);
                //update page height on changing module height.
                _self._updatePageHeight();

            });
            //display updated book gallery.
            topic.subscribe("createBookListHandler", function () {
                _self.isEditModeEnable = false;
                _self._createMapBookList();
                _self._loadSelectedBook();
            });
            //handle editing of book, when user clicks on 'edit book' icon.
            topic.subscribe("editMapBookHandler", function (isEditModeEnable) {
                _self.isEditModeEnable = isEditModeEnable;
                _self._enableMapBookEditing();
            });
            //perform operation to delete page when user clicks on 'delete page' icon.
            topic.subscribe("deletePageHandler", function () {
                _self.isNavigationEnabled = true;
                _self._deletePage();
            });
            //perform operation to add new book,when user clicks on 'add book' icon.
            topic.subscribe("addBookHandler", function (bookIndex) {
                _self._createMapBookList();
                appGlobals.currentBookIndex = bookIndex;
                _self.isEditModeEnable = true;
                _self._displaySelectedBookContent(appGlobals.bookInfo[bookIndex]);
            });
            //destroy all maps of the selected book.
            topic.subscribe("destroyWebmapHandler", function () {
                array.forEach(_self.webmapArray, function (webmap) {
                    webmap.destroy();
                });
                _self.webmapArray = [];
            });
            //handler for validating input to create/update modules.
            topic.subscribe("validateInputHandler", function (btnNode, moduleContainer, moduleInputs) {
                _self._validateInputFields(btnNode, moduleContainer, "webmap", moduleInputs);
            });
            //placed html template of book gallery in document body.
            dom.byId("divCTParentDivContainer").appendChild(_self.divOuterContainer);
            //create esri logo at book gallery page.
            _self._createMapBookEsriLogo();
            //create UI of TOC panel
            _self._createContentListPanel();
            //resize all the containers of the book.
            _self._resizeMapBook();
            //create dojo lightbox for viewing the image module.
            _self._createImageLightBox();
            //resize book when window gets resized.
            _self.own(on(window, "resize", lang.hitch(_self, _self._resizeMapBook)));
            //resize book when orientation of device gets changed
            _self.own(on(window, "orientationchange", lang.hitch(_self, _self._resizeMapBook)));
            //attach event to handle navigation of pages when left/previous arrow is clicked.
            _self.own(on(_self.mapBookPreviousPage, "click", lang.hitch(_self, _self._handlePageNavigation, _self.mapBookPreviousPage, true)));
            //attach event to handle navigation of pages when right/next arrow is clicked.
            _self.own(on(_self.mapBookNextPage, "click", lang.hitch(_self, _self._handlePageNavigation, _self.mapBookNextPage, false)));
        },

        /**
        * load selected book,if app url contains any book id
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _loadSelectedBook: function () {
            var urlParam, bookId, isBookExist, signedInViaOAuth;
            //fetch bookId param from app url.
            urlParam = urlUtils.urlToObject(parent.location.href);
            if (urlParam.query) {
                bookId = urlParam.query.bookId;
                if (bookId) {
                    isBookExist = false;
                    //check bookId is matched with any of books.
                    isBookExist = array.some(appGlobals.bookInfo, lang.hitch(this, function (book, index) {
                        if (book.BookConfigData.itemId === bookId) {
                            appGlobals.currentBookIndex = index;
                            return true;
                        }
                    }));
                    //check if user is already signed in.
                    try {
                        signedInViaOAuth = OAuthHelper.isSignedIn();
                    } catch (ex) {
                        signedInViaOAuth = false;
                    }
                    if (isBookExist) {
                        // display book, which is specified in app URL.
                        this._displaySelectedBookContent(appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData);
                    } else if (signedInViaOAuth || appGlobals.currentUser) {
                        // display alert message, if book is not found for logged in user.
                        this.alertDialog._setContent(nls.errorMessages.permissionDenied, 0);
                    } else {
                        //display logIn dialog, if book is not found in searched items for logged in user.
                        topic.publish("createPortal");
                    }

                }
            }
        },

        /**
        * create UI of book gallery
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _createMapBookList: function () {
            var count = 0, container, _self = this, currentMapBook, mapbookTitle, mapBookContainer, divMapBookContainer, divMapBookInnerContainer, mapBookname, isBookExist;
            this.mapBookDetails = [];
            domConstruct.empty(dom.byId("mapBookContent"));

            array.forEach(appGlobals.bookInfo, function (currentBook, bookIndex) {
                //create row in bookshelf.
                if (count % 25 === 0) {
                    container = domConstruct.create("div", { "class": "esriMapBookListContainer" }, dom.byId("mapBookContent"));
                }
                count++;
                //create book Icon in shelf.
                mapBookContainer = domConstruct.create("div", { "class": "esriBookContainer" }, container);
                currentMapBook = domConstruct.create("div", { "class": "esriMapBookList", "index": bookIndex, "value": currentBook.BookConfigData.title }, mapBookContainer);
                //set cover page of the book from the config.
                domStyle.set(currentMapBook, "backgroundImage", 'url(' + appGlobals.appConfigData.BriefingBookCoverIcon + ')');
                //create delete icon on book.
                domConstruct.create("div", { "class": "esriBookClose" }, currentMapBook);
                //create div to display title of the book.
                divMapBookContainer = domConstruct.create("div", { "class": "esriBookTitlediv" }, currentMapBook);
                divMapBookInnerContainer = domConstruct.create("div", { "class": "esriBookTitledivInner" }, divMapBookContainer);
                mapBookname = domConstruct.create("div", { "class": "esriBookTitle", "title": currentBook.BookConfigData.title, "innerHTML": currentBook.BookConfigData.title }, divMapBookInnerContainer);
                //create div to display author name of the book.
                domConstruct.create("div", { "class": "esriBookAuthor", "innerHTML": lang.trim(currentBook.BookConfigData.author) }, currentMapBook);
                _self.webmapArray = [];
                if (currentBook.BookConfigData.title.length > 20) {
                    domAttr.set(mapBookname, "title", currentBook.BookConfigData.title);
                }
                _self.own(on(currentMapBook, "click", function (evt) {
                    //attach event for delete button on book.
                    if (domClass.contains(evt.target, "esriBookClose") && appGlobals.appConfigData.AuthoringMode) {
                        appGlobals.currentBookIndex = parseInt(domAttr.get(evt.target.parentElement, "index"), 10);
                        _self._deleteSeletedBook(domAttr.get(evt.target.parentElement, "value"));
                    } else {
                        if (appGlobals.appConfigData.AuthoringMode) {
                            //do not allow user to open any book if delete button is displayed on book.
                            if (domClass.contains(query('.esriDeleteBookIcon')[0], "esriHeaderIconSelected")) {
                                return 0;
                            }
                        }
                        appGlobals.currentBookIndex = parseInt(domAttr.get(this, "index"), 10);
                        mapbookTitle = domAttr.get(this, "value");
                        //search selected book's JSON data in bookInfo array.
                        isBookExist = array.some(appGlobals.bookInfo, function (book, index) {
                            if (book.BookConfigData.title === mapbookTitle && appGlobals.currentBookIndex === index) {
                                return true;
                            }
                        });
                        if (isBookExist) {
                            //display selected book view ,if selected book's data is found in bookInfo array.
                            _self._displaySelectedBookContent(appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData);
                        }
                    }
                }));
            });
            //remove delete icon from all books.
            if (query('.esriDeleteBookIcon')[0]) {
                this._removeClass(query('.esriDeleteBookIcon')[0], "esriHeaderIconSelected");
            }
            if (query('.esriEditIcon')[0]) {
                this._removeClass(query('.esriEditIcon')[0], "esriHeaderIconSelected");
            }
            //hide outer loading indicator.
            domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
            _self._resizeMapBook();
        },


        /**
        * set header icon visibility for selected book
        * @param {array} book is an object array which contains required content for selected book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _displaySelectedBookContent: function (book) {
            //display opened book view and hide book gallery view.
            domStyle.set(dom.byId("esriMapPages"), "display", "block");
            domStyle.set(dom.byId("mapBookScrollContent"), "display", "none");
            //reset content panel.
            if (dom.byId("divContentList")) {
                domConstruct.empty(dom.byId("divContentList"));
            }
            if (query(".esriMapBookTitle")[0]) {
                domAttr.set(query(".esriMapBookTitle")[0], "innerHTML", book.title);
                domStyle.set(query(".esrihomeButtonIcon")[0], "display", "block");
                domStyle.set(query(".esriTocIcon")[0], "display", "block");
                domStyle.set(query('.esriPrintIcon')[0], "display", "block");
                if (appGlobals.appConfigData.AuthoringMode) {
                    //display editing option if authoring mode is enabled or user is signed in.
                    this._toggleDeleteBookOption(false);
                    domStyle.set(query(".esriDeleteBookIcon")[0], "display", "none");
                    domStyle.set(query(".esriNewBookIcon")[0], "display", "none");
                    domStyle.set(query(".esriRefreshIcon")[0], "display", "none");
                    domStyle.set(query(".esriEditIcon")[0], "display", "block");
                    domStyle.set(query(".esriDeleteIcon")[0], "display", "none");
                    if (appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.owner === appGlobals.currentUser) {
                        domStyle.set(query(".esriSaveIcon")[0], "display", "block");
                        domStyle.set(query(".esriShareBookIcon")[0], "display", "block");
                    }
                    domStyle.set(query(".esriCopyBookIcon")[0], "display", "block");
                }
            }
            //destroy all webmaps.
            array.forEach(this.webmapArray, function (webmap) {
                webmap.destroy();
            });
            this.webmapArray = [];
            //destroy dnd modules
            if (this.dndModuleContent) {
                this.dndModuleContent.destroy();
                this.dndModuleContent = null;
            }
            appGlobals.moduleLoadingCount = 0;
            this._displayBookContent(book);
            //set default page index to 0 to display cover page of the book.
            this.currentIndex = 0;
            //handle left/right arrow visibility.
            if (this.mapBookDetails[appGlobals.currentBookIndex].length === 1) {
                domClass.add(this.mapBookNextPage, "esriNextDisabled");
            } else {
                if (this.mapBookDetails[appGlobals.currentBookIndex].length === 2 && this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                    domClass.add(this.mapBookNextPage, "esriNextDisabled");
                } else {
                    this._removeClass(this.mapBookNextPage, "esriNextDisabled");
                }
                domClass.add(this.mapBookPreviousPage, "esriPrevDisabled");
            }
            this._resizeMapBook();
        },

        /**
        * set required parameter to enable edit mode for opened book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _enableMapBookEditing: function () {
            var divTitle, mapBookContents, module;
            //do not allow editing of book, if user is not the author of that book.
            if (this.isEditModeEnable && appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.owner !== appGlobals.currentUser) {
                this.isEditModeEnable = false;
                domClass.remove(query('.esriEditIcon')[0], "esriHeaderIconSelected");
                this.alertDialog._setContent(nls.validateBookOwner, 0);
            }

            this._resizeMapBook();
            mapBookContents = query('.esriMapBookColContent');
            if (this.currentIndex > 1) {
                divTitle = query('.esriMapBookPageTitle', dom.byId("mapBookPagesUList").children[this.currentIndex])[0];
                if (divTitle && divTitle.innerHTML.length === 0) {
                    domAttr.set(divTitle, "innerHTML", nls.pageText + (this.currentIndex - 1));
                }
            }
            if (this.isEditModeEnable) {
                //display book with editing functionality, if edit mode is enabled.
                domStyle.set(query(".esriMapBookEditPage")[0], "display", "block");
                domClass.add(dom.byId("esriMapPages"), "esriEditableMode");
                array.forEach(mapBookContents, function (node) {
                    //Add edit bar(dashed border) to item.
                    domClass.add(node, "esriEditableModeContent");
                    //Enable drag-and-drop.
                    module = query(".esriDivPageModule", node)[0];
                    if (module) {
                        domClass.add(module, "dojoDndHandle");
                    }
                });
                //hide print icon if edit mode is enabled.
                domStyle.set(query('.esriPrintIcon')[0], "display", "none");
                if (this.currentIndex > 1) {
                    domStyle.set(query(".esriDeleteIcon")[0], "display", "block");
                }
                this._setSliderWidth();
                this._setSliderArrows();
                this._highlightSelectedPage();
            } else {
                // display book in view mode, if edit mode is disabled.
                this._updateTOC();
                domStyle.set(query(".esriDeleteIcon")[0], "display", "none");
                if (query(".esriMapBookEditPage")[0]) {
                    domStyle.set(query(".esriMapBookEditPage")[0], "display", "none");
                    domStyle.set(query('.esriEditPageBody')[0], "display", "none");
                    domStyle.set(query('.esriMapBookEditPage')[0], "height", "auto");
                    query('.esriVideoModule').style("visibility", "visible");
                }
                domClass.remove(dom.byId("esriMapPages"), "esriEditableMode");
                array.forEach(mapBookContents, function (node) {
                    //Remove edit bar(dashed border) from item.
                    domClass.remove(node, "esriEditableModeContent");
                    //Disable drag-and-drop
                    module = query(".esriDivPageModule", node)[0];
                    if (module) {
                        domClass.remove(module, "dojoDndHandle");
                    }
                });
                this._togglePageNavigation(true);
            }
            this._resizeMapBook();
            //enable/disable drag and drop functionality over modules according to the edit mode
            this._toggleDnd(this.isEditModeEnable);
        },

        /**
        * create esri logo on bookshelf page at right bottom position
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _createMapBookEsriLogo: function () {
            var logoContainer = query(".esriMapBookEsriLogo")[0];
            if (logoContainer) {
                domConstruct.create("img", { "src": "themes/images/esri-logo.png", "class": "esriLogo" }, logoContainer);
            }
        },

        /**
        * delete selected book
        * @param {string} bookTitle is the name of selected book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _deleteSeletedBook: function (bookTitle) {
            var confirmMsg, _self = this;
            //display confirmation message to confirm deleting of book.
            confirmMsg = dojoString.substitute(nls.confirmDeletingOfSelectedBook, { bookName: "'" + bookTitle + "'" });
            this.alertDialog._setContent(confirmMsg, 1).then(function (confirmDeleteBook) {
                if (confirmDeleteBook) {
                    //delete book from bookInfo array and reset book gallery, if it book is not saved on AGOL.
                    if (appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.itemId === nls.defaultItemId) {
                        appGlobals.bookInfo.splice(appGlobals.currentBookIndex, 1);
                        _self._createMapBookList();
                    } else {
                        //delete book AGOL.
                        topic.publish("deleteItemHandler");
                    }
                }
            });
            //hide delete book icon from application header if book Gallery is empty.
            if (appGlobals.bookInfo.length === 0) {
                domStyle.set(query('.esriDeleteBookIcon')[0], "display", "none");
            }
        },

        /**
        * resize book content on window resize
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _resizeMapBook: function () {
            var _self = this, marginleft, totalPages, pageWidth, editHeaderHeight, pageHeight, bookPageHeight, listcontentPage, marginTop = 0;
            totalPages = query('#mapBookPagesUList .esriMapBookPageListItem');
            pageWidth = domStyle.get(query("#mapBookContentContainer")[0], "width");
            //calculate page height.
            bookPageHeight = pageHeight = dojoWindow.getBox().h - (domStyle.get(dom.byId("mapBookHeaderContainer"), "height")) - 5;
            domStyle.set(dom.byId("mapBookScrollContent"), "height", pageHeight + 'px');
            if (dom.byId('divContentList')) {
                domStyle.set(dom.byId('divContentList'), "height", pageHeight - domStyle.get(query('.esriContentListHeaderDiv ')[0], "height") - 10 + 'px');
            }
            //resize module setting dialog.
            if (dijit.byId("settingDialog")) {
                dijit.byId("settingDialog").resize();
            }
            if (this.isEditModeEnable) {
                editHeaderHeight = domStyle.get(query(".esriEditPageHeader")[0], "height");
                pageHeight -= editHeaderHeight;
                bookPageHeight = pageHeight;
                marginTop = editHeaderHeight;
                domStyle.set(query(".esriEditPageBody")[0], "height", bookPageHeight - 5 + 'px');
                this._setSliderWidth();
                this._setSliderArrows();
            }
            if (totalPages && dom.byId("mapBookPagesUList")) {
                if (this.mapBookDetails.length > 0 && this.mapBookDetails[appGlobals.currentBookIndex]) {
                    array.forEach(totalPages, function (page, index) {
                        if (index > 1 || _self.mapBookDetails[appGlobals.currentBookIndex][index] === "EmptyContent") {
                            bookPageHeight = pageHeight - domStyle.get(query(".esriFooterDiv")[0], "height");
                        }
                        listcontentPage = query('.esriMapBookPage', page)[0];
                        if (listcontentPage) {
                            //set page height & width
                            domStyle.set(listcontentPage, "width", pageWidth + 'px');
                            domStyle.set(listcontentPage, "height", bookPageHeight + 'px');
                            listcontentPage.style.width = pageWidth + 'px';
                            listcontentPage.style.height = bookPageHeight + 'px';
                            listcontentPage.style.marginTop = marginTop + 'px';
                            _self._checkImageDimension(listcontentPage, false);
                            _self._setColumnHeight(listcontentPage);
                        }
                    });

                    if (this.currentIndex !== 0 && this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                        marginleft = (this.currentIndex - 1) * Math.ceil(pageWidth);
                    } else {
                        marginleft = this.currentIndex * Math.ceil(pageWidth);
                    }
                    //set margin left of the boo page carousel
                    dom.byId("mapBookPagesUList").style.marginLeft = -marginleft + 'px';
                    //resize all webmap
                    this._resizeMapModule(true);
                }
            }
        },

        /**
        * set column height
        * @param {object} listContentPage is a domNode ,which is the column of the page for selected book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _setColumnHeight: function (listContentPage) {
            var screenResolutionMark, i, divResolutionMark, columnHeight = 0, pageHeader, columns;
            screenResolutionMark = query('.esriDeviceResolution', listContentPage);
            array.forEach(screenResolutionMark, function (node) {
                domConstruct.destroy(node);
            });
            columns = query('.esriColumnLayout', listContentPage);
            //get max height of page columns
            array.forEach(columns, function (node) {
                domStyle.set(node, "height", "auto");
                if (domStyle.get(node, "height") > columnHeight) {
                    columnHeight = domStyle.get(node, "height");
                }
            });
            //set max height to all columns
            array.forEach(columns, function (node) {
                if (columnHeight > 0) {
                    domStyle.set(node, "height", columnHeight + 'px');
                }
            });
            //show visual cues if page content will display scrollbar in configured devices.
            if (this.isEditModeEnable) {
                pageHeader = query('.esriMapBookPageTitle', listContentPage);
                if (pageHeader[0]) {
                    columnHeight = 100 + columnHeight;
                }
                for (i = 0; i < appGlobals.appConfigData.DeviceResolution.length; i++) {
                    if (appGlobals.appConfigData.DeviceResolution[i].height < columnHeight) {
                        divResolutionMark = domConstruct.create("div", {
                            "class": "esriDeviceResolution",
                            "style": "top:" + appGlobals.appConfigData.DeviceResolution[i].height + "px;"
                        }, listContentPage);
                        //create label to display device name
                        domConstruct.create("div", {
                            "class": "esriLeftText",
                            "innerHTML": appGlobals.appConfigData.DeviceResolution[i].devicename + '(' + appGlobals.appConfigData.DeviceResolution[i].width + '*' + appGlobals.appConfigData.DeviceResolution[i].height + ')'
                        }, divResolutionMark);
                        domConstruct.create("div", {
                            "class": "esriRightText",
                            "innerHTML": appGlobals.appConfigData.DeviceResolution[i].devicename + '(' + appGlobals.appConfigData.DeviceResolution[i].width + '*' + appGlobals.appConfigData.DeviceResolution[i].height + ')'
                        }, divResolutionMark);
                    }
                }
            }
        },

        /**
        * create table of content panel for selected book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _createContentListPanel: function () {
            domConstruct.create("div", { "class": "esriContentListPanelDiv esriArialFont", "id": "divContentListPanel" }, dom.byId("mapBookContentContainer"));
            domConstruct.create("div", { "innerHTML": nls.tocContentsCaption, "class": "esriContentListHeaderDiv " }, dom.byId("divContentListPanel"));
            domConstruct.create("div", { "id": "divContentList" }, dom.byId("divContentListPanel"));
        },

        /**
        * set config parameter to display selected book
        * @param {object} listcontentPage is a domNode ,which is the column of the page for selected book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _displayBookContent: function (book) {
            var arrPages = [];
            //empty book page container
            if (dom.byId("esriMapPages")) {
                domConstruct.empty(dom.byId("esriMapPages"));
            }
            this.DNDArray = [];
            if (!this.mapBookDetails[appGlobals.currentBookIndex]) {
                if (book.hasOwnProperty('CoverPage')) {
                    book.CoverPage.type = "CoverPage";
                    arrPages.push(book.CoverPage);
                } else {
                    //enable edit mode if no cover page found in new book
                    this.isEditModeEnable = true;
                    arrPages.push(this._createCoverPage());
                }
                if (book.hasOwnProperty('ContentPage')) {
                    book.ContentPage.type = "ContentPage";
                    arrPages.push(book.ContentPage);
                } else {
                    //set "emptyContent" if book does not have content page
                    arrPages.push("EmptyContent");
                }
                if (!book.hasOwnProperty('BookPages')) {
                    appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.BookPages = [];
                    appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.BookPages = [];
                }
                array.forEach(book.BookPages, function (currentPage) {
                    currentPage.type = "BookPages";
                    arrPages.push(currentPage);
                });
                //push all book pages in a global array this.mapBookDetails
                this.mapBookDetails[appGlobals.currentBookIndex] = arrPages;
            }
            //start rendering of book pages
            this._renderPages(this.mapBookDetails[appGlobals.currentBookIndex]);
            //render table of content panel
            this._renderTOCContent(dom.byId("divContentList"));
            domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
        },

        /**
        * create dnd module panel to create new module for book by drag & drop
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _createDnDModuleList: function () {
            var _self = this, divDndModule, dndIocnDiv, divEditPageHeader, dndModuleArray;

            divEditPageHeader = query('.esriEditPageHeader')[0];
            this._destroyExistingNode(dom.byId("DNDContainer"), false);
            if (divEditPageHeader) {
                // create drag & drop module list in edit page
                divDndModule = domConstruct.create("div", { "dndContType": "newDndModule", "id": "DNDContainer", "class": "esriDragAndDropPanel" }, divEditPageHeader);
                this.dndModuleContent = new DndSource("DNDContainer", { creator: _self._createAvatar, accept: [] });
                domConstruct.create("div", { "innerHTML": nls.dndModuleText, "class": "esriDragAndDropTitle" }, divDndModule);
                dndIocnDiv = domConstruct.create("div", { "class": "esriDragAndDropIcon" }, null);
                domConstruct.create("span", { "class": "esriDragAndDropWebmapIcon", "type": "webmap", "title": nls.webMapIconTitle }, dndIocnDiv);
                domConstruct.create("span", { "class": "esriDragAndDropTextareaIcon", "type": "text", "title": nls.textAreaIconTitle }, dndIocnDiv);
                domConstruct.create("span", { "class": "esriDragAndDropVideoIcon", "type": "video", "title": nls.videoIconTitle }, dndIocnDiv);
                domConstruct.create("span", { "class": "esriDragAndDropHTMLIcon", "type": "HTML", "title": nls.freeFormIconTitle }, dndIocnDiv);
                domConstruct.create("span", { "class": "esriDragAndDropFlickrIcon", "type": "flickr", "title": nls.flickrIconTitle }, dndIocnDiv);
                domConstruct.create("span", { "class": "esriDragAndDropImageIcon", "type": "image", "title": nls.imageIconTitle }, dndIocnDiv);
                dndModuleArray = [];
                this.dndModuleContent.copyOnly = true;
                array.forEach(dndIocnDiv.children, function (node) {
                    dndModuleArray.push({ data: node.outerHTML, type: ["text"] });
                });
                this.dndModuleContent.insertNodes(false, dndModuleArray);
                this.dndModuleContent.forInItems(function (item, id, map) {
                    domClass.add(id, item.type[0]);
                });
                //disable dnd on module.
                this.dndModuleContent.checkAcceptance = function () {
                    return false;
                };
                //update module position when dnd is performed.
                on(this.dndModuleContent, "DndDrop", function (srcContainer, nodes, copy, targetContainer) {
                    appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.UnSaveEditsExists = true;
                    var srcContType = domAttr.get(srcContainer.node, "dndContType");
                    if (srcContType === "newDndModule") {
                        //if new module is dragged into page columns.
                        _self._identifySeletedModule(targetContainer, nodes);
                    } else {
                        targetContainer.sync();
                        srcContainer.sync();
                        if (srcContType === "pageCarousel") {
                            //if dnd is performed in page carousel.
                            setTimeout(function () {
                                _self._reArrangePageSequence(nodes, targetContainer);
                            }, 0);
                        } else {
                            //if dnd is performed on page modules.
                            setTimeout(function () {
                                _self._saveModuleSequence(nodes[0], srcContainer, targetContainer);
                            }, 0);
                        }
                    }
                });
            }
        },

        /**
        * rearrange page sequence in book and book config when dnd is performed
        * @param {object} node is the dnd node which is dragged
        * @param {object} targetContainer container is dnd target node where selected node is dropped
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _reArrangePageSequence: function (node, targetContainer) {
            var targetNodes, currentPageIndex, index, nodeIndex, flag = false;
            //get all nodes of container, in which module is dropped
            targetNodes = targetContainer.getAllNodes();
            nodeIndex = parseInt(domAttr.get(node[0], "index"), 10);
            for (index = 0; index < targetNodes.length; index++) {
                //find index of current page
                if (targetNodes[index].id === node[0].id) {
                    if (index === nodeIndex - 2) {
                        flag = true;
                        break;
                    }
                    this.currentIndex = nodeIndex;
                    if (index === targetNodes.length - 1) {
                        //add current page after the last page of the book, dragged item is the last node of the dnd container.
                        currentPageIndex = parseInt(domAttr.get(targetNodes[index - 1], "index"), 10);
                        this._appendPageAtLast(currentPageIndex + 1);
                    } else {
                        //get updated index of dragged item in page carousel and insert current page at the same index in book.
                        currentPageIndex = parseInt(domAttr.get(targetNodes[index + 1], "index"), 10);
                        this._changePageSequence(currentPageIndex);
                        if (currentPageIndex === 2) {
                            currentPageIndex++;
                        }
                    }
                }
                domAttr.set(targetNodes[index], "index", index + 2);
            }
            if (flag) {
                return;
            }
            //rerender page carousel
            this._createPageSlider();
            this._updateTOC();
            this._gotoPage(this.currentIndex);
        },

        /**
        * change page sequence when dnd is performed on page slider container
        * @param {int} currentPageIndex is integer value which contains current page index of book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _changePageSequence: function (currentPageIndex) {
            var selectedPage, bookPages, mapBookDetails, bookListdata, mapbookdata, bookdata, moduleData,
                currentListItemIndex = this.currentIndex, refListItemIndex = currentPageIndex;
            if (this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                currentListItemIndex--;
                refListItemIndex--;
            }
            selectedPage = dom.byId('mapBookPagesUList').children[currentListItemIndex];
            dom.byId('mapBookPagesUList').insertBefore(selectedPage, dom.byId('mapBookPagesUList').children[refListItemIndex]);

            bookPages = appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.BookPages;
            bookListdata = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.BookPages;
            mapBookDetails = this.mapBookDetails[appGlobals.currentBookIndex];
            mapbookdata = this.mapBookDetails[appGlobals.currentBookIndex][this.currentIndex];
            bookdata = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.BookPages[this.currentIndex - 2];
            moduleData = bookPages[this.currentIndex - 2];
            mapBookDetails.splice(currentPageIndex, 0, mapbookdata);
            bookPages.splice(currentPageIndex - 2, 0, moduleData);
            bookListdata.splice(currentPageIndex - 2, 0, bookdata);
            //change page sequence in book JSON
            if (currentPageIndex > this.currentIndex) {
                mapBookDetails.splice(this.currentIndex, 1);
                bookPages.splice(this.currentIndex - 2, 1);
                bookListdata.splice(this.currentIndex - 2, 1);
                currentPageIndex--;
            } else {
                mapBookDetails.splice(this.currentIndex + 1, 1);
                bookPages.splice(this.currentIndex - 1, 1);
                bookListdata.splice(this.currentIndex - 1, 1);
            }
            this._setBookPageIndex(bookListdata, bookPages.length);
            this.currentIndex = currentPageIndex;
        },

        /**
        * append selected dnd node at the last in target dnd container
        * @param {int} currentPageIndex is integer value which contains current page index of book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _appendPageAtLast: function (currentPageIndex) {
            var currentListItemIndex = this.currentIndex, selectedPage, bookPages, mapBookDetails, bookListdata;
            if (this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                currentListItemIndex--;
            }
            selectedPage = dom.byId('mapBookPagesUList').children[currentListItemIndex];
            dom.byId('mapBookPagesUList').appendChild(selectedPage);

            bookPages = appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.BookPages;
            bookListdata = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.BookPages;
            mapBookDetails = this.mapBookDetails[appGlobals.currentBookIndex];
            //update content data in arrays
            mapBookDetails.splice(currentPageIndex + 1, 0, mapBookDetails[this.currentIndex]);
            bookPages.splice(currentPageIndex - 1, 0, bookPages[this.currentIndex - 2]);
            bookListdata.splice(currentPageIndex - 1, 0, bookListdata[this.currentIndex - 2]);

            mapBookDetails.splice(this.currentIndex, 1);
            bookPages.splice(this.currentIndex - 2, 1);
            bookListdata.splice(this.currentIndex - 2, 1);
            this._setBookPageIndex(bookListdata, bookPages.length);
            this.currentIndex = currentPageIndex;
        },

        /**
        * save updated node sequence in global variable
        * @param {object} srcContainer is dnd source container for selected dnd node
        * @param {object} targetContainer is dnd target container for selected dnd node
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _saveModuleSequence: function (node, srcContainer, targetContainer) {
            var moduleKey, bookData, targetColIndex, srcColIndex, targetNodes, sourceNodes, firstChild, nodeIndex, listItemIndex, selectedPage;
            targetColIndex = parseInt(domAttr.get(targetContainer.node, "columnIndex"), 10);
            targetNodes = targetContainer.getAllNodes();
            bookData = this._getConfigData(appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData);
            bookData.content[targetColIndex] = [];
            if (srcContainer) {
                //get nodes of container, from where node is dragged.
                srcColIndex = parseInt(domAttr.get(srcContainer.node, "columnIndex"), 10);
                sourceNodes = srcContainer.getAllNodes();
            }
            for (nodeIndex = 0; nodeIndex < targetNodes.length; nodeIndex++) {
                if (srcContainer) {
                    firstChild = targetNodes[nodeIndex].firstElementChild || targetNodes[nodeIndex].firstChild;
                    if (firstChild) {
                        //change module content's styles according to its new parent column.
                        domClass.replace(firstChild, "esriLayoutDiv" + targetColIndex, "esriLayoutDiv" + srcColIndex);
                    }
                } else {
                    //add styles to module content according to its new parent column.
                    domClass.add(firstChild, "esriLayoutDiv" + targetColIndex);
                }
                moduleKey = domAttr.get(targetNodes[nodeIndex], "moduleKey");
                bookData.content[targetColIndex].push(moduleKey);
            }
            if (srcContainer) {
                bookData.content[srcColIndex] = [];
                //update content sequence in book JSON
                for (nodeIndex = 0; nodeIndex < sourceNodes.length; nodeIndex++) {
                    moduleKey = domAttr.get(sourceNodes[nodeIndex], "moduleKey");
                    bookData.content[srcColIndex].push(moduleKey);
                }
            }
            if (this.currentIndex > 0 && this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                listItemIndex = this.currentIndex - 1;
            }
            if (domAttr.get(node, "type") === "image") {
                this._setImageDimensions(query('.esriImageModule', node)[0], false);
            }
            selectedPage = targetContainer.node.parentElement;
            this._setColumnHeight(selectedPage);
            this.mapBookDetails[appGlobals.currentBookIndex][this.currentIndex].content = bookData.content;
        },

        /**
        * update required setting to create new page in selected book
        * @param {object} addpageBtn is button node in layout options page
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _createNewPageLayout: function (addpageBtn) {
            var templateType = domAttr.get(addpageBtn, "isBookPageLayout");
            if (query('.selectedTemplate')[0]) {
                //create book page with selected layout.
                this._togglePageNavigation(true);
                this._createNewPage(templateType);
                this._createPageSlider();
                this._setSliderWidth();
                this._highlightSelectedPage();
                this._setSliderArrows();
            }
        },

        /**
        * create page layout on page
        * @param {array} page is an object array which contains required parameter to create a page layout
        * @param {object} currentPageContainer is a domNode which is a page in the page list of the book
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _createPageLayout: function (page, currentPageContainer) {
            var _self = this, pageTitleHolder, columnWidth, newBookPage, pageContentContainer, parentContainer, pageContentHolder, mapBookPageContent,
                pageLayoutClass, moduleIndex, arrContent = {}, dndCont, dndContentArray, pageTitleClass = "esriMapBookPageTitle esriMapBookColContent";
            if (!this.isEditModeEnable) {
                //get page content data from book JSON.
                mapBookPageContent = this._getConfigData(appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData);
            } else {
                newBookPage = {};
                //get default module properties for creating new module.
                mapBookPageContent = lang.clone(appGlobals.appConfigData.ModuleDefaultsConfig);
                pageTitleClass += " esriEditableModeContent";
                newBookPage = lang.clone(page);
                if (page.title) {
                    mapBookPageContent.title.text = page.title;
                    arrContent.title = mapBookPageContent.title;
                }
            }
            if (page.type !== "CoverPage") {
                //create title node here for each page except cover page of the book
                pageTitleHolder = domConstruct.create("div", { "moduleIndex": "pageTitle" + this.currentIndex, "type": "text", "class": pageTitleClass }, currentPageContainer);
                this._createTitleModule(mapBookPageContent.title, pageTitleHolder);
            }
            array.forEach(page.content, function (currentContent, columnIndex) {
                //render column of the page
                //check column of the page and set the width of column in percentage
                columnWidth = page.columnWidth[columnIndex] + '%';
                pageLayoutClass = _self._setColumnClass(page.columns, columnIndex);
                parentContainer = domConstruct.create("div", { "columnIndex": columnIndex, "pageIndex": page.index, "class": "esriColumnLayout" }, currentPageContainer);
                domStyle.set(parentContainer, "width", columnWidth);
                //make dnd source container
                dndCont = new DndSource(parentContainer, { accept: ["mapbookPageModule"], withHandles: true });
                if (!_self.isEditModeEnable) {
                    //disable dnd if editing of book is disable.
                    _self._disableDnd(dndCont);
                } else {
                    //enable dnd if editing mode is enable.
                    //newBookPage object contains data for newly added page
                    newBookPage.content[columnIndex] = [];
                    _self._enableDnd(dndCont);
                }
                dndContentArray = [];

                array.forEach(currentContent, function (currentModuleContent, contentIndex) {
                    //render content for each column of the page
                    if (currentModuleContent && currentModuleContent.length > 0) {
                        //generate a unique attribute 'moduleIndex' key for columns
                        moduleIndex = contentIndex.toString() + columnIndex.toString() + page.index.toString() + appGlobals.currentBookIndex.toString();
                        pageContentContainer = domConstruct.create("div", { "dndType": "mapbookPageModule" }, null);
                        pageContentHolder = domConstruct.create("div", { "class": pageLayoutClass }, pageContentContainer);
                        _self._setModuleIndex(pageContentHolder, moduleIndex, columnIndex, contentIndex);
                        //render contents in column
                        _self._createColumnContent(currentModuleContent, pageContentHolder, newBookPage, arrContent);
                        pageContentContainer.dndType = "mapbookPageModule";
                        //push dnd column in array
                        dndContentArray.push(pageContentContainer);
                    }
                });
                //set page carousel width when dnd gets started.
                on(dndCont, "DndStart", lang.hitch(_self, _self._setSliderWidth));
                //place dnd nodes in page domNode
                dndCont.insertNodes(false, dndContentArray);
                dndCont.forInItems(function (item, id, map) {
                    domClass.add(id, item.type[0]);
                });
                dndCont.sync();
                _self.DNDArray.push(dndCont);
            });

            _self._setColumnHeight(currentPageContainer);
            if (_self.isEditModeEnable) {
                //create UI for modules, that can be rendered in book pages by dragging it.
                _self._createDnDModuleList();
                if (page.type === "BookPages") {
                    //save page information of newly created book page in arrays.
                    appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData[page.type].push(newBookPage);
                    appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.BookPages.push(arrContent);
                    _self.mapBookDetails[appGlobals.currentBookIndex].push(newBookPage);
                } else {
                    //save page information of newly created cover/content page in arrays.
                    appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData[page.type] = newBookPage;
                    appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData[page.type] = arrContent;
                    _self.mapBookDetails[appGlobals.currentBookIndex][_self.currentIndex] = newBookPage;
                }
                //delete default height for module from book json.
                delete newBookPage.height;
            }
        },

        /**
        * create content for column of the page
        * @param {array} currentModuleContent is an object array, which contains required parameter for column content
        * @param {object} pageContentHolder is a domNode which is outer container for column content
        * @param {array} newBookPage is an object array for newly added page
        * @param {array} arrContent is an object array for content of the newly added page
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _createColumnContent: function (currentModuleContent, pageContentHolder, newBookPage, arrContent) {
            var mapBookPageContent, pageModule, moduleIndex, pageContentModule, _self = this;
            mapBookPageContent = this._getConfigData(appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData);
            moduleIndex = domAttr.get(pageContentHolder, "moduleIndex");
            //create parent container for module
            pageModule = domConstruct.create("div", { "class": "esriDivPageModule" }, pageContentHolder);
            domAttr.set(pageModule, "moduleIndex", moduleIndex);
            if (currentModuleContent && currentModuleContent.length > 0) {
                if (!this.isEditModeEnable) {
                    domAttr.set(pageContentHolder.parentElement, "moduleKey", currentModuleContent);
                    if (mapBookPageContent.hasOwnProperty(currentModuleContent)) {
                        pageContentModule = mapBookPageContent[currentModuleContent];
                        domAttr.set(pageContentHolder.parentElement, "type", pageContentModule.type);
                        domAttr.set(pageContentHolder, "type", pageContentModule.type);
                        this._renderModuleContent(pageContentModule.type, pageModule, pageContentModule);
                    }
                } else {
                    //to add new page in the book.
                    this._renderNewPageModule(pageContentHolder.parentElement, newBookPage, currentModuleContent, arrContent);
                }
                on(pageContentHolder, "dblclick", function () {
                    if (_self.isEditModeEnable && (domAttr.get(this, "type") !== "TOC")) {
                        //display setting dialog for updating module.
                        _self._showModuleSettingDialog(domAttr.get(this, "type"), false, this, domAttr.get(this, "key"));
                    }
                });
                return pageModule;
            }
        },

        /**
        * show setting dialog to update/add module of the book
        * @param {string} moduleType defines what kind of module is selected like 'HTML' ,'image' or 'webmap'
        * @param {boolean} isNewModule to know that selected module is an existing one or newly created
        * @param {object} moduleContainer is the parent container of selected module
        * @param {string} moduleKey is the config key for selected module
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _showModuleSettingDialog: function (moduleType, isNewModule, moduleContainer, moduleKey) {
            var label, dialogTitle, labelValue, moduleIconPath, moduleInfo, moduleData, divModuleSetting, inputContainer, key, _self = this,
                moduleSettingContent, isValidationRequired, btns, btnSave, moduleAttr = {}, moduleInputs = [], loadingIcon;

            moduleInfo = lang.clone(appGlobals.appConfigData.ModuleDefaultsConfig);
            //set module icon as header icon for setting dialog.
            moduleIconPath = appGlobals.appConfigData.DefaultModuleIcons[moduleType].URL;
            dialogTitle = '<img class="esriSettingModuleIcon" src=' + moduleIconPath + '>' + dojoString.substitute(nls.settingDialogTitle, { modType: nls[moduleType + 'DialogTitle'] });

            if (!isNewModule) {
                //do not display setting dialog if module is not loaded.
                loadingIcon = query('.esriModuleLoadingIndicator', moduleContainer)[0];
                if (loadingIcon && domStyle.get(loadingIcon, "display") !== "none") {
                    if (loadingIcon.childNodes[0].innerHTML === "") {
                        return 0;
                    }
                }
                //get module attributes from book JSON.
                moduleData = this._getConfigData(appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData);
                moduleAttr = moduleData[moduleKey];
                if (!moduleAttr) {
                    return 0;
                }
            } else {
                //set default text for default module from nls.
                _self._setDefaultText(moduleInfo[moduleType]);
            }
            //create input fields for each attribute of the module in setting dialog.
            if (moduleInfo.hasOwnProperty(moduleType)) {
                //create UI for setting dialog.
                divModuleSetting = domConstruct.create("div", { "class": "esriModuleSettings" }, null);

                for (key in moduleInfo[moduleType]) {
                    if (moduleInfo[moduleType].hasOwnProperty(key)) {
                        if (isNewModule) {
                            //get default attributes if module is to be created.
                            moduleAttr[key] = moduleInfo[moduleType][key];
                        }
                        moduleSettingContent = domConstruct.create("div", { "class": "esriModuleContent" }, divModuleSetting);
                        label = domConstruct.create("div", { "class": "esriSettingLabel" }, moduleSettingContent);

                        labelValue = key.charAt(0).toUpperCase() + key.slice(1);
                        labelValue = labelValue.replace("_", ' ');
                        domAttr.set(label, "innerHTML", labelValue);
                        if (key === "text") {
                            //create text editor if module type is text.
                            inputContainer = this._createTextEditor(moduleSettingContent, moduleAttr, key);
                            domStyle.set(label, "display", "none");
                        } else if (key === "HTML") {
                            //create text area if module type is HTML.
                            inputContainer = this._createTextArea(moduleSettingContent, moduleAttr, key);
                        } else if (key === "map") {
                            //display a webmap navigation dialog if module type is map.
                            domStyle.set(label, "display", "none");
                            topic.publish("_createSelectWebmapDialogHandler", divModuleSetting, moduleContainer);
                        } else {
                            //display text box.
                            if ((key === "URL" && moduleType !== "flickr") || key === "username" || key === "rows" || key === "columns") {
                                //enable validation for specified module types.
                                isValidationRequired = true;
                            } else {
                                isValidationRequired = false;
                            }
                            inputContainer = this._createTextBox(moduleSettingContent, moduleAttr, key, isValidationRequired);
                        }
                        if (inputContainer) {
                            moduleInputs.push(inputContainer);
                        }
                        // hide all not required to display fields in setting dialog.
                        if (key === "type" || key === "height" || key === "width") {
                            domStyle.set(moduleSettingContent, "display", "none");
                        }
                    }
                }

                //set setting dialog's title.
                dijit.byId("settingDialog").titleNode.innerHTML = dialogTitle;
                dijit.byId("settingDialog").setContent(divModuleSetting);
                //create save button for setting dialog to save updated setting for module.
                btns = domConstruct.create("div", { "class": "esriButtonContainer" }, divModuleSetting);
                btnSave = domConstruct.create("div", { "moduleKey": moduleKey, "class": "esriSettingSave", "type": isNewModule, "innerHTML": nls.saveButtonText }, btns);
                on(btnSave, "click", function () {
                    appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.UnSaveEditsExists = true;
                    _self._validateInputFields(this, moduleContainer, moduleType, moduleInputs);
                });
            }
            dijit.byId("settingDialog").show();
            dijit.byId("settingDialog").resize();
        },

        /**
        * set default text for newly created modules
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _setDefaultText: function (module) {
            if (module.type === "text") {
                module.text = nls[module.text];
            } else if (module.type === "HTML") {
                module.HTML = nls[module.HTML];
            } else if (module.title && module.caption) {
                module.title = nls[module.title];
                module.caption = nls[module.caption];
            }
        },

        /**
        * validate input fields of module setting dialog
        * @param {object} btnNode is a save button of setting dialog
        * @param {object} moduleContainer is a dnd container where selected item is placed
        * @param {string} moduleType is the type of selected module
        * @param {array} moduleInputs is an array of object of input fields
        * @memberOf widgets/mapbook-collection/mapbook-collection
        */
        _validateInputFields: function (btnNode, moduleContainer, moduleType, moduleInputs) {
            var moduleKey, isNewModule, inputData, inputFields, inputIndex, flagReturn = false;

            inputFields = query('.esriSettingInput');
            if (moduleType === "webmap") {
                for (inputIndex = 0; inputIndex < inputFields.length; inputIndex++) {
                    moduleInputs[inputIndex].value = query('.dijitInputInner', inputFields[inputIndex])[0].value;
                }
            }
            for (inputIndex = 0; inputIndex < moduleInputs.length; inputIndex++) {
                if (moduleInputs[inputIndex].state === "Error") {
                    //display error message if any given input is not valid.
                    this.alertDialog._setContent(nls.errorMessages.fieldInputIsNotValid, 0);
                    flagReturn = true;
                    break;
                }
                if (moduleInputs[inputIndex].required) {
                    if (moduleInputs[inputIndex].editNode) {
                        inputData = moduleInputs[inputIndex].editNode.textContent || moduleInputs[inputIndex].editNode.innerText;
                    } else {
                        inputData = moduleInputs[inputIndex].value;
                    }
                    inputData = lang.isString(inputData) ? lang.trim(inputData) : inputData;
                    if (inputData === "") {
                        //display error message if any required input field is empty.
                        this.alertDialog._setContent(nls.fieldIsEmpty, 0);
                        flagReturn = true;
                        break;
                    }
                }
            }
            //return from function if any error is found in input data
            if (flagReturn) {
                return;
            }
            moduleKey = domAttr.get(btnNode, "moduleKey");
            //check if module is created or to be created.
            isNewModule = domAttr.get(btnNode, "type");
            if (isNewModule) {
                this._createNewModule(moduleContainer, moduleType, moduleKey, moduleInputs);
                domAttr.set(btnNode, "type", false);
            } else {
                this._updateExistingModule(moduleContainer, moduleType, moduleKey, moduleInputs);
            }
        }

    });
});
