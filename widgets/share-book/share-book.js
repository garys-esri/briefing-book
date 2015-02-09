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
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/Dialog",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/on",
    "dojo/topic",
    "dojo/i18n!nls/localized-strings",
    "esri/request",
    "dojo/parser"
], function (declare, lang, _WidgetBase, Dialog, domConstruct, domAttr, domClass, dom, on, topic, nls, esriRequest) {
    return declare([_WidgetBase], {
        _portal: null,
        /**
        * create share book  widget
        *
        * @class
        * @name widgets/share-book/share-book
        */
        startup: function () {
            //get portal object.
            topic.subscribe("_getPortal", lang.hitch(this, function (portal) {
                this._portal = portal;
            }));
            topic.subscribe("showShareDialogHandler", lang.hitch(this, this._showShareDialog));
            topic.subscribe("shareBookHandler", lang.hitch(this, this._sendEsriSharingRequest));
            this._createShareBookDialog();
        },

        /**
        * create share option dialog
        * @memberOf widgets/share-book/share-book
        */
        _createShareBookDialog: function () {
            var btnContainer, shareBookDialog, btnShare, _self = this, optionIndex, divShareDialogOptionList, divCheckBox,
                shareOptions, divShareDialogContent;

            if (dijit.byId("ShareBookDialog")) {
                dijit.byId("ShareBookDialog").destroy();
            }
            shareBookDialog = new Dialog({
                id: "ShareBookDialog",
                "class": "esriShareBookDialog",
                draggable: false
            });
            shareBookDialog.startup();
            shareBookDialog.closeButtonNode.title = nls.closeButtonTitle;
            //set header icon and title of sharing dialog
            shareBookDialog.titleNode.innerHTML = '<img class="esriSettingModuleIcon" src="themes/images/share-book.png">' + nls.shareBookDialogTitle;
            divShareDialogContent = domConstruct.create("div", {}, null);
            shareOptions = [{ "key": "everyone", "label": nls.shareToEveryoneText }, { "key": "org", "label": nls.shareToOrgText }, { "key": "copyProtected", "label": nls.protectCopyBookText}];

            //create sharing options in share dialog
            for (optionIndex = 0; optionIndex < shareOptions.length; optionIndex++) {
                divShareDialogOptionList = domConstruct.create("div", { "class": "esriShareDialogOptionList" }, divShareDialogContent);
                divCheckBox = domConstruct.create("div", { "id": "chkBox" + shareOptions[optionIndex].key, "class": "esriCheckBox", "key": shareOptions[optionIndex].key }, divShareDialogOptionList);
                on(divCheckBox, "click", lang.hitch(this, this._toggleSharingCheckbox));
                domConstruct.create("div", { "class": "esriCheckBoxLabel", "innerHTML": shareOptions[optionIndex].label }, divShareDialogOptionList);
            }

            //create share button in share dialog to save selected sharing option
            btnContainer = domConstruct.create("div", { "class": "esriButtonContainer" }, divShareDialogContent);
            btnShare = domConstruct.create("div", { "class": "esriSelectWebmapBtn", "innerHTML": nls.shareBtnText }, btnContainer);
            on(btnShare, "click", function () {
                _self._shareBook(shareOptions);
            });
            shareBookDialog.setContent(divShareDialogContent);
        },

        /**
        * display share dialog
        * @param{array} pages is the json array ,which contains data about selected book's pages
        * @memberOf widgets/share-book/share-book
        */
        _showShareDialog: function () {
            //show check box selected if respective sharing option is true
            if (dojo.bookInfo[dojo.currentBookIndex].BookConfigData.shareWithEveryone) {
                domClass.add(dom.byId("chkBoxeveryone"), "esriCheckBoxChecked");
            }

            if (dojo.bookInfo[dojo.currentBookIndex].BookConfigData.shareWithOrg) {
                domClass.add(dom.byId("chkBoxorg"), "esriCheckBoxChecked");
            }

            if (dojo.bookInfo[dojo.currentBookIndex].BookConfigData.copyProtected) {
                domClass.add(dom.byId("chkBoxcopyProtected"), "esriCheckBoxChecked");
            }
            dijit.byId("ShareBookDialog").show();
        },

        /**
        * set parameter for sharing selected book
        * @param{array} shareOptions is the json array ,which contains available sharing options for book
        * @memberOf widgets/share-book/share-book
        */
        _shareBook: function (shareOptions) {
            var chkBox, isChecked, index;
            for (index = 0; index < shareOptions.length; index++) {
                chkBox = dom.byId("chkBox" + shareOptions[index].key);
                isChecked = false;
                if (domClass.contains(chkBox, "esriCheckBoxChecked")) {
                    isChecked = true;
                }
                this._setSharingOptions(shareOptions[index].key, isChecked);
            }
            this._sendEsriSharingRequest();
        },

        /**
        * set selected share option in book config
        * @param{string} shareKey is the selected shared option name
        * @param{boolean} isChecked is true if respective checkbox of share option is checked
        * @memberOf widgets/share-book/share-book
        */
        _setSharingOptions: function (shareKey, isChecked) {
            switch (shareKey) {
            case "everyone":
                dojo.bookInfo[dojo.currentBookIndex].BookConfigData.shareWithEveryone = isChecked;
                break;
            case "org":
                dojo.bookInfo[dojo.currentBookIndex].BookConfigData.shareWithOrg = isChecked;
                break;
            case "copyProtected":
                dojo.bookInfo[dojo.currentBookIndex].BookConfigData.copyProtected = isChecked;
                break;
            }
        },

        /**
        * handle toggling of share option check boxes
        * @memberOf widgets/share-book/share-book
        */
        _toggleSharingCheckbox: function (event) {
            var checkBoxKey, chkBox;
            chkBox = event.currentTarget || event.srcElement;

            checkBoxKey = domAttr.get(chkBox, "key");
            if (domClass.contains(chkBox, "esriCheckBoxChecked")) {
                if (!domClass.contains(chkBox, "opacityChkBox")) {
                    //do not allow check/uncheck if checkbox is disabled.
                    domClass.remove(chkBox, "esriCheckBoxChecked");
                }
                //uncheck checkbox of organization option if everyone option is not checked.
                if (checkBoxKey === "everyone") {
                    domClass.remove(dom.byId("chkBoxorg"), "opacityChkBox");
                }
            } else {
                domClass.add(chkBox, "esriCheckBoxChecked");
                //check checkbox of organization option and make it disable if everyone option is checked.
                if (checkBoxKey === "everyone") {
                    domClass.add(dom.byId("chkBoxorg"), "esriCheckBoxChecked");
                    domClass.add(dom.byId("chkBoxorg"), "opacityChkBox");
                }
            }
        },

        /**
        * send esri request to update shared status of the selected book on AGOL
        * @memberOf widgets/share-book/share-book
        */
        _sendEsriSharingRequest: function (isShareToGroup) {
            var _self = this, currentItemId, queryParam, requestUrl;

            //set query parameter for sharing book item o AGOL
            queryParam = {
                itemType: "text",
                f: 'json',
                everyone: dojo.bookInfo[dojo.currentBookIndex].BookConfigData.shareWithEveryone,
                org: dojo.bookInfo[dojo.currentBookIndex].BookConfigData.shareWithOrg,
                groups: []
            };
            //share newly created book to the configured group if 'DisplayBook' is set to 'group'.
            if (isShareToGroup) {
                queryParam.groups = dojo.appConfigData.DisplayGroup;
            }
            currentItemId = dojo.bookInfo[dojo.currentBookIndex].BookConfigData.itemId;
            //set request url for sharing item on AGOL
            requestUrl = _self._portal.getPortalUser().userContentUrl;
            // set folder id to update sharing permission for the book to its current folder
            if (dojo.bookInfo[dojo.currentBookIndex].folderId) {
                requestUrl += '/' + dojo.bookInfo[dojo.currentBookIndex].folderId;
            }
            requestUrl += '/items/' + currentItemId + '/share';

            //send request
            esriRequest({
                url: requestUrl,
                content: queryParam
            }, { usePost: true }).then(function (result) {
                dijit.byId("ShareBookDialog").hide();
            }, function (err) {
                if (err.messageCode === "GWM_0003") {
                    //display error if sharing permission is not granted.
                    _self.alertDialog._setContent(nls.errorMessages.permissionDenied, 0);
                } else {
                    _self.alertDialog._setContent(nls.errorMessages.shareItemError, 0);
                }
            });
        }
    });
});

