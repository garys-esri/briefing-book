/*global define,dojo */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
 | Copyright 2013 Esri
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
//==================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/i18n!nls/localized-strings",
    "dijit/_WidgetBase",
    "widgets/alert-dialog/alert-dialog",
    "widgets/app-header/app-header",
    "widgets/mapbook-collection/mapbook-collection",
    "widgets/mapbook-config-loader/mapbook-config-loader",
    "widgets/select-webmap/select-webmap",
    "widgets/share-book/share-book"
], function (declare, lang, nls, _WidgetBase, AlertBox, AppHeader, MapBookCollection, MapBookConfigLoader, SelectWebmap, ShareBook) {
    return declare([_WidgetBase], {
        nls: nls,
        /**
        * create widget loader
        *
        * @class
        * @name widgets/core-library/widget-loader
        */
        startup: function () {
            var mapbookLoader, mapBookCollection, applicationHeader, sharebook, alertDialog, selectWebmap;
            //create alert dialog object
            alertDialog = new AlertBox();
            try {
                //initialize mapbook-config-loader widget to create portal.
                mapbookLoader = new MapBookConfigLoader({ alertDialog: alertDialog });
                mapbookLoader.startup().then(function () {
                    //initialize map map-book-collection widget to create book gallery UI.
                    mapBookCollection = new MapBookCollection({ alertDialog: alertDialog });
                    mapBookCollection.startup();
                    //initialize  app-header widget to create application header UI.
                    applicationHeader = new AppHeader({ alertDialog: alertDialog });
                    applicationHeader.startup();
                    // initialize select-webmap widget to create webmap navigation widget to search webmap on AGOL.
                    selectWebmap = new SelectWebmap({ alertDialog: alertDialog });
                    selectWebmap.startup();
                    //initialize share-book widget to create share dialog to share book on AGOL.
                    sharebook = new ShareBook({ alertDialog: alertDialog });
                    sharebook.startup();
                }, function () {
                    var message = "";
                    if (dojo.appConfigData.PortalURL && lang.trim(dojo.appConfigData.PortalURL) !== "") {
                        //display error message if any widget fails to load.
                        message = nls.errorMessages.configurationError;
                    } else {
                        //display error message if portal URL is not configured.
                        message = nls.errorMessages.organizationNotSet;
                    }
                    alertDialog._setContent(message, 0);
                });
            } catch (ex) {
                //display error message if any widget fails to load.
                alertDialog._setContent(nls.errorMessages.configurationError, 0);
            }
        }
    });
});
