/*global define,dojo,esriConfig,appGlobals*/
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
    "dijit/_WidgetBase",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/on",
    "dojo/topic",
    "dojo/i18n!nls/localized-strings",
    "esri/arcgis/Portal",
    "esri/arcgis/utils",
    "dojo/cookie",
    "esri/tasks/GeometryService",
    "esri/kernel",
    "esri/request",
    "esri/IdentityManager",
    "coreLibrary/oauth-helper",
    "dojo/promise/all",
    "dojo/_base/Deferred"
], function (declare, array, lang, _WidgetBase, domAttr, domStyle, domClass, dom, on, topic, nls, esriPortal, arcgisUtils, cookie, GeometryService, kernel, esriRequest, IdentityManager, OAuthHelper, promiseAll, Deferred) {
    return declare([_WidgetBase], {
        _portal: null,
        /**
        * create mapbook config loader widget
        *
        * @class
        * @name widgets/mapbook-config-loader/mapBookConfigLoader
        */
        startup: function () {
            var defer, deferred = new Deferred();
            this.defaultAuthoringMode = appGlobals.appConfigData.AuthoringMode;
            appGlobals.appConfigData.AuthoringMode = false;
            this._setApplicationTheme();

            topic.subscribe("createPortal", lang.hitch(this, this._createPortal));

            topic.subscribe("saveBookHandler", lang.hitch(this, this._saveSelectedBook));

            topic.subscribe("deleteItemHandler", lang.hitch(this, this._deleteBookItem));

            topic.subscribe("copySelectedBookHandler", lang.hitch(this, this._copyBookItem));

            topic.subscribe("getFullUserNameHandler", lang.hitch(this, function (newBook) {
                newBook.author = this._getFullUserName();
            }));

            topic.subscribe("toggleUserLogInHandler", lang.hitch(this, function () {
                if (!domClass.contains(dom.byId("userLogIn"), "esriLogOutIcon")) {
                    this._createPortal(false);
                } else {
                    domStyle.set(dom.byId("outerLoadingIndicator"), "display", "block");
                    this._portal.signOut().then(lang.hitch(this, function () {
                        this._removeCredentials();
                        defer = new Deferred();
                        this._createPortal(defer);
                        defer.then(function () {
                            domClass.remove(dom.byId("userLogIn"), "esriLogOutIcon");
                            domAttr.set(dom.byId("userLogIn"), "title", nls.signInText);
                        });
                    }));
                }
            }));

            this._createPortal(deferred);
            return deferred.promise;
        },
        /**
        * create portal
        * @memberOf widgets/mapBookConfigLoader/mapbook-config-loader
        */
        _createPortal: function (deferred) {
            //initialize portal
            if (appGlobals.appConfigData.PortalURL) {
                this._portal = new esriPortal.Portal(appGlobals.appConfigData.PortalURL);
                on(this._portal, 'load', lang.hitch(this, function () {
                    if (deferred) {
                        //fetch geometry service URL from portal object.
                        this._setGeometryServiceUrl();
                        this._loadCredentials(deferred);
                    } else {
                        //destroy stored credential of logged in user.
                        this._removeCredentials();
                        this._destroyCredentials();
                        //display sign in dialog.
                        this._displayLoginDialog();
                    }
                }));
            } else {
                //reject defer
                if (deferred) {
                    deferred.reject();
                }
            }
        },

        /**
        *Set the geometry helper service.
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _setGeometryServiceUrl: function () {
            if (this._portal.helperServices.geometry.url) {
                esriConfig.defaults.geometryService = new GeometryService(this._portal.helperServices.geometry.url);
            }
        },

        /**
        * display login dialog
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _displayLoginDialog: function () {
            var _self = this, queryParams;
            this._portal.signIn().then(function (loggedInUser) {
                if (dom.byId("outerLoadingIndicator")) {
                    domStyle.set(dom.byId("outerLoadingIndicator"), "display", "block");
                }
                //empty book list global array
                appGlobals.bookInfo = [];
                queryParams = _self._setQueryParams();
                if (loggedInUser) {
                    _self._storeCredentials();
                    //set authoring mode true for user
                    if (_self.defaultAuthoringMode) {
                        appGlobals.appConfigData.AuthoringMode = true;
                    }
                    //toggle sign in icon image on application header
                    if (dom.byId("userLogIn")) {
                        domClass.add(dom.byId("userLogIn"), "esriLogOutIcon");
                        domAttr.set(dom.byId("userLogIn"), "title", nls.signOutText);
                        appGlobals.currentUser = loggedInUser.username;
                    }
                } else {
                    appGlobals.appConfigData.AuthoringMode = false;
                }
                //search accessible book item for logged in user
                _self._portal.queryItems(queryParams).then(function (response) {
                    appGlobals.bookInfo = [];
                    topic.publish("destroyWebmapHandler");
                    topic.publish("_getPortal", _self._portal);
                    _self._getBookItemData(response);

                });
            }, function (error) {
                _self._destroyCredentials();
                if (error.httpCode === 403) {
                    // display alert message if logged in user is not a member of the configured organization
                    _self.alertDialog._setContent(nls.validateOrganizationUser, 0);
                }
            });
        },

        /**
        * destroy credentials when logged in user is not from configured organization
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _destroyCredentials: function () {
            var i;
            for (i = 0; i < IdentityManager.credentials.length; i++) {
                if (appGlobals.appConfigData.PortalURL === IdentityManager.credentials[i].server) {
                    IdentityManager.credentials[i].destroy();
                }
            }
        },

        /**
        * if valid credentials are found in localStorage/cookie then directly sign in with that
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _loadCredentials: function (deferred) {
            deferred.resolve();
            var idJson, idObject, i, isCredAvailable = false, signedInViaOAuth = false;

            // If we've connected via OAuth, we can go ahead with the the behind-the-scenes login.
            // We shield the call because it throws an exception if OAuthHelper has not been
            // initialized, but we can only initialize OAuthHelper if we're intending to use it
            // (its initialization alters the Identity Manager, so we don't want to initialize it
            // all the time).
            try {
                signedInViaOAuth = OAuthHelper.isSignedIn();
            } catch (ex) {
                signedInViaOAuth = false;
            }
            if (signedInViaOAuth) {
                this._displayLoginDialog();
                // Otherwise see if we've cached credentials
            } else {
                if (this._supports_local_storage()) {
                    idJson = window.localStorage.getItem(appGlobals.appConfigData.Credential);
                } else {
                    if (cookie.isSupported()) {
                        idJson = cookie(appGlobals.appConfigData.Credential);
                    }
                }
                if (idJson && idJson !== "null" && idJson.length > 4) {
                    idObject = JSON.parse(idJson);
                    for (i = 0; i < idObject.credentials.length; i++) {
                        if (appGlobals.appConfigData.PortalURL === idObject.credentials[i].server) {
                            //load credential from local storage if it is not expired else ignore
                            if (idObject.credentials[i].expires > new Date().getTime()) {
                                isCredAvailable = true;
                                kernel.id.initialize(idObject);
                                this._displayLoginDialog();
                            }
                        }
                    }
                }
                if (!isCredAvailable) {
                    this._queryOrgItems();
                }
            }
        },

        /**
        * check that local storage is supported by current browser or not
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _supports_local_storage: function () {
            try {
                if (window && window.localStorage && window.localStorage !== null) {
                    return true;
                }
            } catch (e) {
                return false;
            }
        },

        /**
        * remove credential from localStorage/cookie if user gets sign-out
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _removeCredentials: function () {
            if (this._supports_local_storage()) {
                window.localStorage.setItem(appGlobals.appConfigData.Credential, null, { expire: -1 });
            } else {
                if (cookie.isSupported()) {
                    appGlobals.cookie(appGlobals.appConfigData.Credential, null, { expire: -1 });
                }
            }
        },

        /**
        * store credentials to localStorage/cookie if user signs in
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _storeCredentials: function () {
            if (kernel.id.credentials.length === 0) {
                return;
            }
            var idString = JSON.stringify(kernel.id.toJson());
            if (this._supports_local_storage()) {
                window.localStorage.setItem(appGlobals.appConfigData.Credential, idString, { expires: 1 });
            } else {
                if (cookie.isSupported()) {
                    cookie(appGlobals.appConfigData.Credential, idString, { expires: 1 });
                }
            }
        },

        /**
        * get book data from result of searched items
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _getBookItemData: function (response) {
            var deferArray = [], bookIndex;
            //get json data of each item
            array.forEach(response.results, function (itemData) {
                var defer = new Deferred();
                deferArray.push(defer);
                try {
                    arcgisUtils.getItem(itemData.id).then(function (itemInfo) {
                        //check if itemInfo is having BookConfigData and ModuleConfigData.
                        if (itemInfo.itemData && itemInfo.itemData.BookConfigData && itemInfo.itemData.ModuleConfigData) {
                            //set book id as itemId in book config.
                            itemInfo.itemData.BookConfigData.itemId = itemInfo.item.id;
                            //set item owner as owner in book config.
                            itemInfo.itemData.BookConfigData.owner = itemInfo.item.owner;
                            itemInfo.itemData.BookConfigData.UnSaveEditsExists = false;
                            itemInfo.itemData.folderId = null;
                            //save folder id of book item.
                            if (itemInfo.item.ownerFolder) {
                                itemInfo.itemData.folderId = itemInfo.item.ownerFolder;
                            }
                            defer.resolve(itemInfo.itemData);
                        } else {
                            defer.resolve();
                        }
                    }, function () {
                        defer.resolve();
                    });
                } catch (ex) {
                    defer.resolve();
                }
            });

            //push all book data in bookInfo array.
            promiseAll(deferArray).then(function (results) {
                appGlobals.bookInfo = [];
                for (bookIndex = 0; bookIndex < results.length; bookIndex++) {
                    if (results[bookIndex]) {
                        appGlobals.bookInfo.push(results[bookIndex]);
                    }
                }
                //display book in author/public mode.
                topic.publish("authoringModeHandler");
            });
        },

        /**
        * query portal for book item for configured search tag
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _queryOrgItems: function () {
            var _self = this, queryParams;
            appGlobals.appConfigData.AuthoringMode = false;
            //get parameters to search books.
            queryParams = _self._setQueryParams();
            //search public book item on portal
            if (queryParams) {
                _self._portal.queryItems(queryParams).then(function (response) {
                    appGlobals.bookInfo = [];
                    _self._getBookItemData(response);
                }, function () {
                    _self.alertDialog._setContent(nls.errorMessages.contentQueryError, 0);
                    domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
                });
            }
        },

        /**
        * set query parameter to search book items on portal
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _setQueryParams: function () {
            var queryString = '', queryParams, isSignInRequired;
            if (appGlobals.appConfigData.DisplayBook && lang.trim(appGlobals.appConfigData.DisplayBook) !== "") {
                appGlobals.appConfigData.DisplayBook = appGlobals.appConfigData.DisplayBook.toLowerCase();
                switch (appGlobals.appConfigData.DisplayBook) {
                case "group":
                    //add group id in query string if 'displayGroup' is set to 'group' in config.
                    if (lang.trim(appGlobals.appConfigData.DisplayGroup) !== "") {
                        queryString = "group:" + appGlobals.appConfigData.DisplayGroup + " AND ";
                    } else {
                        this.alertDialog._setContent(nls.errorMessages.groupIdNotConfigured, 0);
                        return;
                    }
                    break;
                case "organization":
                    //add group id in query string if 'displayGroup' is set to 'organization' in config.
                    if (this._portal.id && lang.trim(this._portal.id) !== "") {
                        queryString = "orgid:" + this._portal.id + " AND ";
                    } else {
                        //set parameter 'isSignInRequired' to true if configured organization is private.
                        isSignInRequired = true;
                    }
                    break;
                }
                if (isSignInRequired) {
                    appGlobals.bookInfo = [];
                    //display sign in dialog.
                    topic.publish("authoringModeHandler");
                    this._displayLoginDialog();
                } else {
                    //set query parameters.
                    queryString += "typekeywords:JavaScript AND type:Web Mapping Application AND tags:" + appGlobals.appConfigData.ConfigSearchTag;
                    queryParams = {
                        q: queryString,
                        sortField: appGlobals.appConfigData.SortField,
                        sortOrder: appGlobals.appConfigData.SortOrder,
                        num: 100
                    };
                }
            } else {
                domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
                this.alertDialog._setContent(nls.errorMessages.configurationError, 0);
            }
            return queryParams;
        },

        /**
        * save selected book on AGOL
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _saveSelectedBook: function () {
            var configObj, queryParam, currentItemId, requestUrl, requestType;
            domStyle.set(dom.byId("outerLoadingIndicator"), "display", "block");
            appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.UnSaveEditsExists = false;
            configObj = JSON.stringify(appGlobals.bookInfo[appGlobals.currentBookIndex]);
            queryParam = {
                itemType: "text",
                f: 'json',
                text: configObj,
                overwrite: true,
                url: ''
            };
            requestUrl = this._portal.getPortalUser().userContentUrl;
            currentItemId = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.itemId;
            if (currentItemId === nls.defaultItemId) {
                // set required parameter for adding book item on AGOL
                requestUrl += '/addItem';
                queryParam.type = 'Web Mapping Application';
                queryParam.typeKeywords = 'JavaScript,Configurable';
                queryParam.title = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.title;
                queryParam.tags = appGlobals.appConfigData.ConfigSearchTag;
                requestType = "add";
            } else {
                // set folder id to save book to its current folder
                if (appGlobals.bookInfo[appGlobals.currentBookIndex].folderId) {
                    requestUrl += '/' + appGlobals.bookInfo[appGlobals.currentBookIndex].folderId;
                }
                requestUrl += '/items/' + currentItemId + '/update';
                requestType = "update";
                queryParam.url = this._getAppUrl() + '?bookId=' + currentItemId;
            }
            this._sendEsriRequest(queryParam, requestUrl, requestType);
        },

        /**
        * delete selected book from AGOL
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _deleteBookItem: function () {
            var queryParam, currentItemId, requestUrl;
            domStyle.set(dom.byId("outerLoadingIndicator"), "display", "block");
            queryParam = {
                f: 'json',
                overwrite: true
            };
            currentItemId = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.itemId;
            requestUrl = this._portal.getPortalUser().userContentUrl;
            // set folder id to delete book from its current folder
            if (appGlobals.bookInfo[appGlobals.currentBookIndex].folderId) {
                requestUrl += '/' + appGlobals.bookInfo[appGlobals.currentBookIndex].folderId;
            }
            requestUrl += '/items/' + currentItemId + '/delete';
            this._sendEsriRequest(queryParam, requestUrl, "delete", nls.errorMessages.deletingItemError);
        },

        /**
        * copy selected book on AGOL
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _copyBookItem: function () {
            var configObj, bookTitle, queryParam, copiedConfig, requestUrl, requestType;
            //create title for copied book.
            bookTitle = nls.copyKeyword + appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.title;
            domStyle.set(dom.byId("outerLoadingIndicator"), "display", "block");
            copiedConfig = lang.clone(appGlobals.bookInfo[appGlobals.currentBookIndex]);
            //set default property of copied book.
            copiedConfig.BookConfigData.copyProtected = false;
            copiedConfig.BookConfigData.UnSaveEditsExists = false;
            copiedConfig.BookConfigData.shareWithEveryone = false;
            copiedConfig.BookConfigData.shareWithOrg = false;
            copiedConfig.BookConfigData.title = bookTitle;
            copiedConfig.ModuleConfigData.CoverPage.title.text = bookTitle;
            copiedConfig.BookConfigData.author = this._portal.getPortalUser().fullName;
            appGlobals.bookInfo.push(copiedConfig);
            appGlobals.currentBookIndex = appGlobals.bookInfo.length - 1;
            configObj = JSON.stringify(copiedConfig);
            queryParam = {
                itemType: "text",
                f: 'json',
                text: configObj,
                tags: appGlobals.appConfigData.ConfigSearchTag,
                title: copiedConfig.BookConfigData.title,
                type: 'Web Mapping Application',
                typeKeywords: 'JavaScript,Configurable'
            };
            //create request URL to add new book.
            requestUrl = this._portal.getPortalUser().userContentUrl + '/addItem';
            requestType = "copy";
            this._sendEsriRequest(queryParam, requestUrl, requestType);
        },

        /**
        * send esri request to perform operation for adding, deleting and updating book item on portal
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _sendEsriRequest: function (queryParam, requestUrl, reqType) {
            var _self = this;
            esriRequest({
                url: requestUrl,
                content: queryParam,
                handleAs: 'json'
            }, { usePost: true }).then(function (result) {
                if (result.success) {
                    if (reqType === "copy" || reqType === "delete") {
                        if (reqType === "copy") {
                            appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.itemId = result.id;
                            if (appGlobals.appConfigData.DisplayBook === "group") {
                                topic.publish("shareBookHandler", true);
                            }
                            _self._saveSelectedBook();
                        }
                        topic.publish("destroyWebmapHandler");
                        setTimeout(function () {
                            //reload all books in bookshelf if copy or delete operation is performed.
                            _self._displayLoginDialog();
                        }, 2000);
                    } else {
                        appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.itemId = result.id;
                        if (reqType === "add") {
                            if (appGlobals.appConfigData.DisplayBook === "group") {
                                topic.publish("shareBookHandler", true);
                            }
                            _self._saveSelectedBook();
                        }
                        domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
                    }
                }
            }, function (err) {
                // display error message if any operation is failed
                _self._genrateErrorMessage(reqType, err);
                domStyle.set(dom.byId("outerLoadingIndicator"), "display", "none");
            });
        },

        /**
        * display error message if performed operation gets failed
        * @param{string} reqType is the type of operation which has failed
        * @param{object} err is the error caught by esri request's error handler
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _genrateErrorMessage: function (reqType, err) {
            var errorMsg;
            if (err.messageCode === "GWM_0003") {
                errorMsg = nls.errorMessages.permissionDenied;
            } else if (reqType === "add") {
                errorMsg = nls.errorMessages.addingItemError;
            } else if (reqType === "update") {
                errorMsg = nls.errorMessages.updatingItemError;
            } else if (reqType === "delete") {
                errorMsg = nls.errorMessages.deletingItemError;
            } else if (reqType === "copy") {
                errorMsg = nls.errorMessages.copyItemError;
            }
            this.alertDialog._setContent(errorMsg, 0);
        },

        /**
        * get full name of logged in user
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _getFullUserName: function () {
            return this._portal.getPortalUser().fullName;
        },

        /**
        * get portal when portal is initialized
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _getPortal: function () {
            return this._portal;
        },

        /**
        * apply configured theme to application
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _setApplicationTheme: function () {
            var cssURL;
            switch (appGlobals.appConfigData.ApplicationTheme) {
            case "blue":
                cssURL = "themes/styles/theme-blue.css";
                break;
            case "grey":
                cssURL = "themes/styles/theme-grey.css";
                break;
            default:
                cssURL = "themes/styles/theme-grey.css";
                break;
            }
            if (dom.byId("appTheme")) {
                domAttr.set(dom.byId("appTheme"), "href", cssURL);
            }
        },

        /**
        * get application URL
        * @memberOf widgets/mapbook-config-loader/mapbook-config-loader
        */
        _getAppUrl: function () {
            var appUrl = parent.location.href.split('?')[0];
            //remove '#' tag from URL.
            appUrl = appUrl.replace('#', '');
            return appUrl;
        }
    });
});

