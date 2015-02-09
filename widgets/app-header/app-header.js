/*global define,dojo,dijit*/
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
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/i18n!nls/localized-strings",
    "dojo/on",
    "dojo/query",
    "dojo/text!./templates/app-header.html",
    "dojo/topic",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "../mapbook-collection/mapbook-utility"
], function (declare, domConstruct, lang, domAttr, domStyle, dom, domClass, nls, on, query, template, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, mapbookUtility) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, mapbookUtility], {
        templateString: template,
        nls: nls,
        /**
        * create application header
        *
        * @class
        * @name widgets/app-header/app-header
        */
        startup: function () {
            var _self = this, applicationHeaderDiv;
            //restrict accessing app and display black screen if app is running in portrait mode in devices.
            if (query('.esriOrientationBlockedText')[0]) {
                query('.esriOrientationBlockedText')[0].innerHTML = nls.orientationNotSupported;
            }
            topic.subscribe("authoringModeHandler", function () {
                _self._displayHomePage();
                topic.publish("createBookListHandler");
            });
            //create UI of application header.
            applicationHeaderDiv = domConstruct.create("div", {}, dom.byId("mapBookHeaderContainer"));
            domConstruct.place(this.applicationHeaderParentContainer, applicationHeaderDiv);
            domConstruct.create("span", { "id": "esriPaginationSpan" }, this.paginationDiv);
            //create UI for buttons in application header.
            this._createApplicationHeader();
            document.title = dojo.appConfigData.ApplicationName;
            domAttr.set(this.mapBookTitle, "innerHTML", dojo.appConfigData.ApplicationName);
            this._displayHomePage();
        },

        /**
        * create app-header tool icons
        * @memberOf widgets/app-header/app-header
        */
        _createApplicationHeader: function () {
            this._setApplicationLogo();
            this._setApplicationFavicon();
            this._createHomeIcon();
            this._createNewBookIcon();
            this._createShareBookIcon();
            this._createDeleteBookIcon();
            this._createCopyBookIcon();
            this._createRefreshIcon();
            this._createEditBookIcon();
            this._createSaveBookIcon();
            this._createDeletePageIcon();
            this._createPrintIcon();
            this._createTOCIcon();
            this._createSignInBtn();
        },

        /**
        * set application icon,  dojo.appConfigData.ApplicationIcon is set in config
        * @memberOf widgets/app-header/app-header
        */
        _setApplicationLogo: function () {
            domStyle.set(this.applicationLogoIcon, "backgroundImage", 'url(' + dojo.appConfigData.ApplicationIcon + ')');
        },

        /**
        * set application favicon and home screen icon
        * @param {object} btnNode is button object in alert dialog ,which has clicked.
        * @memberOf widgets/app-header/app-header
        */
        _setApplicationFavicon: function () {
            if (dom.byId('appFavicon')) {
                //set fav icon path from the config.
                domAttr.set(dom.byId('appFavicon'), "href", dojo.appConfigData.ApplicationFavicon);
            }
            if (dom.byId('homeFavicon')) {
                //set home icon path from the config.
                domAttr.set(dom.byId('homeFavicon'), "href", dojo.appConfigData.AppHomeScreenIcon);
            }
        },

        /**
        * create home icon UI
        * @memberOf widgets/app-header/app-header
        */
        _createHomeIcon: function () {
            var homeButtonDiv, _self = this;
            homeButtonDiv = domConstruct.create("div", { "class": "esrihomeButtonIcon", "style": "display:none", "title": nls.homeTitle }, this.applicationHeaderWidgetsContainer);
            //perform actions to display home page/gallery page when home icon is clicked.
            this.own(on(homeButtonDiv, "click", function () {
                if (dojo.bookInfo[dojo.currentBookIndex].BookConfigData.UnSaveEditsExists) {
                    //get confirmation from user to display gallery page if current book has unsaved changes.
                    _self.alertDialog._setContent(nls.validateUnSavedEdits, 1).then(function (confirmHomePageView) {
                        if (confirmHomePageView) {
                            _self._allowHomePageView();
                        }
                    });
                } else {
                    _self._allowHomePageView();
                }
            }));
        },

        /**
        * set required parameter to display bookshelf
        * @memberOf widgets/app-header/app-header
        */
        _allowHomePageView: function () {
            this._displayHomePage();
            //reset application URL if it has parameters.
            this._removeParamFromAppUrl();
            topic.publish("destroyWebmapHandler");
            if (dojo.appConfigData.AuthoringMode) {
                //disable editing mode of current book.
                this._disableEditing();
            }
            //hide TOC container.
            this._toggleContainer(dom.byId("divContentListPanel"), query(".esriTocIcon")[0], true);
        },

        /**
        * create new book icon to allow user to add new book in the bookshelf
        * @memberOf widgets/app-header/app-header
        */
        _createNewBookIcon: function () {
            var newBookIcon, _self = this;
            newBookIcon = domConstruct.create("div", { "class": "esriNewBookIcon", "title": nls.addBookTitle }, this.applicationHeaderWidgetsContainer);
            this.own(on(newBookIcon, "click", function () {
                _self._addNewBook();
            }));
        },

        /**
        * create share book icon
        * @memberOf widgets/app-header/app-header
        */
        _createShareBookIcon: function () {
            var shareBookIcon, _self = this;
            shareBookIcon = domConstruct.create("div", { "class": "esriShareBookIcon", "style": "display:none", "title": nls.shareBookTitle }, this.applicationHeaderWidgetsContainer);
            this.own(on(shareBookIcon, "click", function () {
                if (dojo.bookInfo[dojo.currentBookIndex].BookConfigData.itemId !== nls.defaultItemId) {
                    topic.publish("showShareDialogHandler");
                } else {
                    _self.alertDialog._setContent(nls.bookNotSaved, 0);
                }
            }));
        },

        /**
        * create delete book icon
        * @memberOf widgets/app-header/app-header
        */
        _createDeleteBookIcon: function () {
            var enableDeleting, deleteBookIcon, _self = this;
            deleteBookIcon = domConstruct.create("div", { "class": "esriDeleteBookIcon", "title": nls.removeBookTitle }, this.applicationHeaderWidgetsContainer);
            //get user confirmation to proceed deleting of book.
            this.own(on(deleteBookIcon, "click", function () {
                enableDeleting = true;
                if (domClass.contains(query('.esriDeleteBookIcon')[0], "esriHeaderIconSelected")) {
                    enableDeleting = false;
                }
                _self._toggleDeleteBookOption(enableDeleting);
            }));
        },

        /**
        * create copy book icon
        * @memberOf widgets/app-header/app-header
        */
        _createCopyBookIcon: function () {
            var copyBookIcon, _self = this;
            copyBookIcon = domConstruct.create("div", { "class": "esriCopyBookIcon", "title": nls.copyBookShelf }, this.applicationHeaderWidgetsContainer);
            this.own(on(copyBookIcon, "click", function () {
                //hide TOC panel.
                _self._toggleContainer(dom.byId("divContentListPanel"), query(".esriTocIcon")[0], true);
                //allow copying of book if book is not copy protected else display alert message.
                if (!dojo.bookInfo[dojo.currentBookIndex].BookConfigData.copyProtected || dojo.bookInfo[dojo.currentBookIndex].BookConfigData.owner === dojo.currentUser) {
                    //display alert message if book has some unsaved changes.
                    if (dojo.bookInfo[dojo.currentBookIndex].BookConfigData.UnSaveEditsExists) {
                        _self.alertDialog._setContent(nls.validateUnSavedEdits, 1).then(function (confirmCopy) {
                            if (confirmCopy) {
                                _self._removeParamFromAppUrl();
                                topic.publish("copySelectedBookHandler");
                            }
                        });
                    } else {
                        //get confirmation from user to make the copy of book.
                        _self.alertDialog._setContent(nls.confirmCopyOfSelectedBook, 1).then(function (confirmCopy) {
                            if (confirmCopy) {
                                _self._removeParamFromAppUrl();
                                topic.publish("copySelectedBookHandler");
                            }
                        });
                    }
                } else {
                    _self.alertDialog._setContent(nls.copyRestricted, 0);
                }
            }));
        },

        /**
        * create refresh icon
        * @memberOf widgets/app-header/app-header
        */
        _createRefreshIcon: function () {
            var refreshIcon, _self = this;
            refreshIcon = domConstruct.create("div", { "class": "esriRefreshIcon", "title": nls.refreshBookTitle }, this.applicationHeaderWidgetsContainer);
            this.own(on(refreshIcon, "click", function () {
                //get confirmation from user to reload the app URL.
                _self.alertDialog._setContent(nls.confirmAppReloading, 1).then(function (flag) {
                    if (flag) {
                        parent.location.reload();
                    }
                });
            }));
        },

        /**
        * create edit book icon
        * @memberOf widgets/app-header/app-header
        */
        _createEditBookIcon: function () {
            var editBookIcon, _self = this;
            editBookIcon = domConstruct.create("div", { "class": "esriEditIcon", "style": "display:none", "title": nls.editTitle }, this.applicationHeaderWidgetsContainer);
            this.own(on(editBookIcon, "click", function () {
                //toggle edit mode of the book on clicking of edit icon of application header.
                _self._toggleEditMode(this);
            }));
        },

        /**
        * create save book icon
        * @memberOf widgets/app-header/app-header
        */
        _createSaveBookIcon: function () {
            var saveBookIcon, _self = this;
            saveBookIcon = domConstruct.create("div", { "class": "esriSaveIcon", "title": nls.saveBookShelf }, this.applicationHeaderWidgetsContainer);
            this.own(on(saveBookIcon, "click", function () {
                //publish event of "mapbook-config-loader" to save current book on AGOL.
                _self._toggleContainer(dom.byId("divContentListPanel"), query(".esriTocIcon")[0], true);
                topic.publish("saveBookHandler");
            }));
        },

        /**
        * create delete page icon
        * @memberOf widgets/app-header/app-header
        */
        _createDeletePageIcon: function () {
            var deletePageIcon, _self = this;
            deletePageIcon = domConstruct.create("div", { "class": "esriDeleteIcon", "style": "display:none", "title": nls.deleteTitle }, this.applicationHeaderWidgetsContainer);
            this.own(on(deletePageIcon, "click", function () {
                _self._toggleContainer(dom.byId("divContentListPanel"), query(".esriTocIcon")[0], true);
                //get confirmation from user to delete currently opened page of the book.
                _self.alertDialog._setContent(nls.confirmPageDeleting, 1).then(function (confirmDeleting) {
                    if (confirmDeleting) {
                        dojo.bookInfo[dojo.currentBookIndex].BookConfigData.UnSaveEditsExists = true;
                        topic.publish("deletePageHandler");
                    }
                });
            }));
        },

        /**
        * create print icon
        * @memberOf widgets/app-header/app-header
        */
        _createPrintIcon: function () {
            var printIconDiv, pdfWinSize, _self = this;
            printIconDiv = domConstruct.create("div", { "class": "esriPrintIcon", "style": "display:none", "title": nls.printTitle }, this.applicationHeaderWidgetsContainer);
            this.own(on(printIconDiv, "click", function () {
                //display print preview page if all modules are loaded else display alert message.
                if (!dojo.moduleLoadingCount) {
                    //set print preview window's properties.
                    //set height & width and enable scrolling of window.
                    pdfWinSize = '"width=' + dom.byId("mapBookPagesUList").clientWidth + ', height=' + dom.byId("mapBookPagesUList").clientHeight + ', scrollbars=1"';
                    //set container of book pages in window object.
                    window.bookListContent = lang.clone(dom.byId("mapBookPagesUList"));
                    //set applied theme(css path) of application in window object.
                    window.theme = dom.byId("appTheme").href;
                    //title for print preview page
                    window.printPageTitle = nls.printPageTitle;
                    //open book in new window.
                    window.open("print-book.htm", "_blank", pdfWinSize);
                } else {
                    _self.alertDialog._setContent(nls.modulesNotLoaded, 0);
                }
            }));
        },

        /**
        * create TOC icon
        * @memberOf widgets/app-header/app-header
        */
        _createTOCIcon: function () {
            var tocIconDiv, _self = this;
            tocIconDiv = domConstruct.create("div", { "class": "esriTocIcon", "style": "display:none", "title": nls.tocTitle }, this.applicationHeaderWidgetsContainer);
            //attach event
            this.own(on(tocIconDiv, "click", function () {
                _self._toggleContainer(dom.byId("divContentListPanel"), this, false);
            }));
        },

        /**
        * create sign in icon
        * @memberOf widgets/app-header/app-header
        */
        _createSignInBtn: function () {
            var divSignIn, _self = this;
            divSignIn = domConstruct.create("div", { "id": "userLogIn", "class": "esriLogInIcon", "title": nls.signInText }, this.applicationHeaderWidgetsContainer);
            //perform sign in/sign out operation on clicking of signin icon on application header.
            this.own(on(divSignIn, "click", function () {
                _self._removeParamFromAppUrl();
                _self._toggleContainer(dom.byId("divContentListPanel"), query(".esriTocIcon")[0], true);
                topic.publish("toggleUserLogInHandler");
            }));
        },

        /**
        * remove parameters from application url
        * @memberOf widgets/app-header/app-header
        */
        _removeParamFromAppUrl: function () {
            var href = parent.location.href.split('?');
            if (href.length > 1 && history.pushState) {
                history.pushState({ "id": 1 }, dojo.appConfigData.ApplicationName, href[0]);
            }
        },

        /**
        * set required parameter for adding a new book to bookshelf
        * @memberOf widgets/app-header/app-header
        */
        _addNewBook: function () {
            var bookIndex, newBook;
            //set default settings to create new book.
            bookIndex = dojo.bookInfo.length;
            newBook = {};
            newBook.title = nls.mapbookDefaultTitle;
            newBook.UnSaveEditsExists = true;
            topic.publish("getFullUserNameHandler", newBook);
            newBook.owner = dojo.currentUser;
            newBook.itemId = nls.defaultItemId;
            //by default this book will not be allowed to copy
            newBook.copyProtected = false;
            dojo.bookInfo[bookIndex] = {};
            dojo.bookInfo[bookIndex].ModuleConfigData = {};
            dojo.bookInfo[bookIndex].BookConfigData = newBook;
            dojo.bookInfo[bookIndex].BookConfigData.shareWithEveryone = false;
            dojo.bookInfo[bookIndex].BookConfigData.shareWithOrg = false;
            if (dojo.bookInfo.length > 0) {
                domStyle.set(query('.esriDeleteBookIcon')[0], "display", "block");
            }
            topic.publish("addBookHandler", bookIndex);
            domClass.add(query(".esriEditIcon")[0], "esriHeaderIconSelected");
        },

        /**
        * display bookshelf view
        * @memberOf widgets/app-header/app-header
        */
        _displayHomePage: function () {
            //if app is running in tablet or i-pad then disable editing mode.
            if (window.hasOwnProperty && window.hasOwnProperty('orientation')) {
                dojo.appConfigData.AuthoringMode = false;
            }
            //set header icon visibility according to editable mode.
            domStyle.set(query(".esriEditIcon")[0], "display", "none");
            domStyle.set(query(".esriDeleteIcon")[0], "display", "none");
            domStyle.set(query(".esriCopyBookIcon")[0], "display", "none");
            domStyle.set(query(".esriSaveIcon")[0], "display", "none");
            domStyle.set(dom.byId("esriMapPages"), "display", "none");
            domStyle.set(query(".esriTocIcon")[0], "display", "none");
            domStyle.set(query(".esriFooterDiv")[0], "display", "none");
            domStyle.set(query(".esrihomeButtonIcon")[0], "display", "none");
            domStyle.set(dom.byId("mapBookScrollContent"), "display", "block");
            domStyle.set(query(".esriShareBookIcon")[0], "display", "none");
            domStyle.set(query('.esriPrintIcon')[0], "display", "none");
            domAttr.set(this.mapBookTitle, "innerHTML", dojo.appConfigData.ApplicationName);
            if (dojo.appConfigData.AuthoringMode) {
                //display editing options if book is opened in authoring mode.
                domStyle.set(query('.esriDeleteBookIcon')[0], "display", "block");
                domStyle.set(query(".esriNewBookIcon")[0], "display", "block");
                domStyle.set(query(".esriRefreshIcon")[0], "display", "block");
                domStyle.set(query(".esrihomeButtonIcon")[0], "display", "none");
                domStyle.set(query(".esriShareBookIcon")[0], "display", "none");
                domClass.remove(query('.esriSaveIcon')[0], "esriHeaderIconSelected");
            } else {
                domStyle.set(query('.esriDeleteBookIcon')[0], "display", "none");
                domStyle.set(query(".esriNewBookIcon")[0], "display", "none");
                domStyle.set(query(".esriRefreshIcon")[0], "display", "none");
            }
            //set book name as application header text
            domAttr.set(this.mapBookTitle, "innerHTML", dojo.appConfigData.ApplicationName);
            if (query(".esriPrevious")[0] && query(".esriNext")[0]) {
                domStyle.set(query(".esriPrevious")[0], "visibility", "hidden");
                domStyle.set(query(".esriNext")[0], "visibility", "hidden");
            }
        },

        /**
        * toggle editing mode
        * @param{object} editBtn is app header button for toggling edit mode in app
        * @memberOf widgets/app-header/app-header
        */
        _toggleEditMode: function (editBtn) {
            domStyle.set(query(".esrihomeButtonIcon")[0], "display", "block");
            domStyle.set(query(".esriCopyBookIcon")[0], "display", "block");
            if (domStyle.get(query(".esriMapBookEditPage")[0], "display") === "block") {
                this._disableEditing();
            } else {
                domClass.add(editBtn, "esriHeaderIconSelected");
                this._toggleContainer(dom.byId("divContentListPanel"), query(".esriTocIcon")[0], true);
                topic.publish("editMapBookHandler", true);
            }
        },

        /**
        * disable edit mode
        * @memberOf widgets/app-header/app-header
        */
        _disableEditing: function () {
            var editButton = query(".esriEditIcon")[0];
            domClass.remove(editButton, "esriHeaderIconSelected");
            topic.publish("editMapBookHandler", false);
            return false;
        },

        /**
        * toggle TOC panel visibility
        * @param{object} container is table of content pane
        * @param{object} btnNode is TOC button in app-header
        * @param{boolean} hideContainerFlag is a flag, hides TOC panel if it is true
        * @memberOf widgets/app-header/app-header
        */
        _toggleContainer: function (container, btnNode, hideContainerFlag) {
            if (hideContainerFlag) {
                //hide TOC panel
                domClass.remove(container, "esriContentPanelOpened");
                domClass.remove(btnNode, "esriHeaderIconSelected");
            } else {
                //hide TOC panel if it is opened else display it.
                if (domClass.contains(container, "esriContentPanelOpened")) {
                    domClass.remove(container, "esriContentPanelOpened");
                    domClass.remove(btnNode, "esriHeaderIconSelected");
                } else {
                    domClass.add(container, "esriContentPanelOpened");
                    domClass.add(btnNode, "esriHeaderIconSelected");
                }
            }
        }
    });
});

