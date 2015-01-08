/*global define*/
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
    "dojo/_base/Deferred",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/Dialog",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/on",
    "dojo/i18n!nls/localized-strings"
], function (declare, Deferred, lang, _WidgetBase, Dialog, domConstruct, domAttr, domStyle, on, nls) {
    return declare([_WidgetBase], {
        alertDialogText: null,
        buttonCancel: null,
        buttonOK: null,
        domNode: null,
        /**
        * create customized alert dialog
        *
        * @class
        * @name widgets/alert-dialog/alert-dialog
        */
        postCreate: function () {
            var alertDialogContent, alertButtons;
            // create UI for alert dialog
            this.domNode = new Dialog({
                "class": "esriAlertDialog",
                draggable: false
            });
            this.domNode.startup();
            //set tooltip for close button of alert dialog.
            this.domNode.closeButtonNode.title = nls.closeButtonTitle;
            alertDialogContent = domConstruct.create("div", { "class": "esriAlertDialogContent" }, null);
            //create div to display text message.
            this.alertDialogText = domConstruct.create("div", { "class": "esriAlertDialogText" }, alertDialogContent);
            alertButtons = domConstruct.create("div", { "class": "esriAlertButtonContainer" }, alertDialogContent);
            //create 'OK' and 'Cancel' button.
            this.buttonCancel = domConstruct.create("div", { "class": "esriAlertCancelBtn", "innerHTML": nls.cancelButtonText, "value": "1" }, alertButtons);
            this.buttonOK = domConstruct.create("div", { "class": "esriAlertOkBtn", "innerHTML": nls.okButtonText, "value": "0" }, alertButtons);
            on(this.buttonOK, "click", lang.hitch(this, this._hide, this.buttonOK));
            on(this.buttonCancel, "click", lang.hitch(this, this._hide, this.buttonCancel));
            this.domNode.setContent(alertDialogContent);
        },

        /**
        * create content for alert dialog
        * @param {string} newContent is new message/text to display in alert dialog
        * @param {int} MessageBoxButtons decides no of buttons in alert dialog
        * @memberOf widgets/alert-dialog/alert-dialog
        */
        _setContent: function (newContent, messageBoxButtons) {
            this.defer = false;
            this.alertDialogText.innerHTML = newContent;
            if (messageBoxButtons === 0) {
                //display dialog for showing alert message
                domStyle.set(this.buttonCancel, "display", "none");
                this.domNode.titleNode.innerHTML = nls.alertDialogTitle;
            } else if (messageBoxButtons === 1) {
                //use defer to wait for the user response for the confirmation.
                this.defer = new Deferred();
                //display dialog for confirmation
                domStyle.set(this.buttonCancel, "display", "block");
                this.domNode.titleNode.innerHTML = nls.confirmDialogTitle;
            }
            this.domNode.show();
            this.domNode.resize();

            if (this.defer) {
                return this.defer.promise;
            }
        },

        /**
        * hide alert dialog
        * @param {object} btnNode is button object in alert dialog ,which has clicked.
        * @memberOf widgets/alert-dialog/alert-dialog
        */
        _hide: function (btnNode) {
            var btnValue, value;
            //check, which button (OK or Cancel) is clicked.
            btnValue = domAttr.get(btnNode, "value");
            //return true if 'OK' button is clicked else return false.
            value = btnValue === "0" ? true : false;
            this.domNode.hide();
            if (this.defer) {
                this.defer.resolve(value);
            }
        }
    });
});

