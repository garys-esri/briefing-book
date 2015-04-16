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
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/on",
    "dojo/query",
    "dojo/window",
    "dojo/i18n!nls/localized-strings",
    "dijit/Dialog",
    "dojo/parser"
], function (declare, array, lang, domConstruct, domAttr, domStyle, domClass, dom, on, query, dojoWindow, nls, Dialog) {
    return declare([], {
        /**
        * create mapbook page renderer widget
        *
        * @class
        * @name widgets/mapbook-collection/page-renderer
        */

        /**
        * render pages of the selected book
        * @param{array} pages is the json array ,which contains data about selected book's pages
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _renderPages: function (pages) {
            var page, mapBookUList, settingDialog, pageIndex;
            mapBookUList = domConstruct.create("ul", { "id": "mapBookPagesUList", "class": "esriMapBookUList" }, null);
            dom.byId("esriMapPages").appendChild(mapBookUList);
            if (pages.length >= 1) {
                //display navigation arrows if there is more than one page in selected book
                domStyle.set(query(".esriPrevious")[0], "visibility", "visible");
                domStyle.set(query(".esriNext")[0], "visibility", "visible");
                if (pages.length === 1) {
                    domClass.replace(this.mapBookNextPage, "esriNextDisabled", "esriNext");
                }
                for (pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                    if (pages[pageIndex] !== "EmptyContent") {
                        //create UI for all book pages except for not existing content page.
                        page = pages[pageIndex];
                        page.index = pageIndex;
                        this._renderPage(pages[pageIndex]);
                    }
                }
            }
            this._destroyExistingNode(dijit.byId("settingDialog"), true);

            //create setting dialog for updating/creating module of the book.
            settingDialog = new Dialog({
                id: "settingDialog",
                "class": "settingDialog",
                draggable: false
            });
            settingDialog.startup();
            settingDialog.closeButtonNode.title = nls.closeButtonTitle;
            settingDialog.hide();
            //create UI for edit page to display page carousel, add page button and layouts for content and book pages.
            this._renderEditPage();
        },

        /**
        * render page of the book
        * @param{array} pages is the json array ,which contains data about single page
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _renderPage: function (page) {
            var listItem, pageHeight, currentPageContainer;
            listItem = domConstruct.create("li", { "class": "esriMapBookPageListItem" }, null);
            listItem.innerHTML = '<div class="esriPageHeaderDiv"><div class="esriMapBookTitle">' + appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.title + '</div></div>';
            dom.byId("mapBookPagesUList").appendChild(listItem);
            this.currentIndex = page.index;
            //create outer container for page.
            currentPageContainer = domConstruct.create("div", { "class": "esriMapBookPage", "pageIndex": page.index }, listItem);
            domStyle.set(currentPageContainer, "width", Math.ceil(dom.byId("mapBookContentContainer").offsetWidth) + 'px');
            this._createPageLayout(page, currentPageContainer);
            pageHeight = dojoWindow.getBox().h - domStyle.get(dom.byId("mapBookHeaderContainer"), "height") - 5;

            if (this.isEditModeEnable) {
                //shift page to down to display page carousel above it.
                if (query(".esriEditPageHeader")[0]) {
                    domStyle.set(currentPageContainer, "margin-top", domStyle.get(query(".esriEditPageHeader")[0], "height") + 'px');
                    pageHeight -= domStyle.get(query(".esriEditPageHeader")[0], "height");
                    currentPageContainer.style.marginTop = domStyle.get(query(".esriEditPageHeader")[0], "height") + 'px';
                }
            }
            if (page.index > 1) {
                if (query(".esriFooterDiv")[0]) {
                    pageHeight -= domStyle.get(query(".esriFooterDiv")[0], "height");
                }
            }
            domStyle.set(currentPageContainer, "height", pageHeight + 'px');
            this._setColumnHeight(currentPageContainer);

        },

        /**
        * render cover page of the book
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _createCoverPage: function () {
            var coverPage, defaultTitle;
            if (!appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData) {
                appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData = {};
            }
            //set default configuration for cover page.
            defaultTitle = lang.clone(appGlobals.appConfigData.ModuleDefaultsConfig.title);
            defaultTitle.text = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.title;
            coverPage = lang.clone(appGlobals.appConfigData.CoverPageLayout);
            coverPage.title = defaultTitle.text;
            appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.CoverPage = coverPage;
            appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.CoverPage = {};
            this._removeClass(this.mapBookNextPage, "esriNextDisabled");
            return coverPage;
        },

        /**
        * render edit page of the book
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _renderEditPage: function () {
            var divEditPage, divEditPageHeader, divEditPageList, imgOptionList, imgEditCoverPage, imgEditContentPage, divAddNewPage,
                tempContHeight, divEditPageBody;
            //create outer container for edit page.
            divEditPage = domConstruct.create("div", { "class": "esriMapBookEditPage" }, dom.byId('esriMapPages'));
            divEditPageHeader = domConstruct.create("div", { "class": "esriEditPageHeader" }, divEditPage);
            divEditPageList = domConstruct.create("div", { "class": "esriEditPageOptionList" }, divEditPageHeader);
            if (appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.CoverPage) {
                //create cover page icon in page carousel.
                imgOptionList = domConstruct.create("div", { "class": "esriEditPageOptionListImg" }, divEditPageList);
                imgEditCoverPage = domConstruct.create("div", { "index": 0, "class": "esriEditPageImg esriBookPage esriPageSelected esriCoverPageImg" }, imgOptionList);
                imgEditCoverPage.innerHTML = nls.coverPageText;
                //display cover page if cover page icon is selected from page carousel.
                on(imgEditCoverPage, "click", lang.hitch(this, this._gotoPage, 0));
            }
            imgOptionList = domConstruct.create("div", { "class": "esriEditPageOptionListImg" }, divEditPageList);
            //create content page icon in page carousel.
            imgEditContentPage = domConstruct.create("div", { "index": 1, "class": "esriEditPageImg esriBookPage esriContentPageImg" }, imgOptionList);
            imgEditContentPage.innerHTML = nls.contentPageText;
            on(imgEditContentPage, "click", lang.hitch(this, function () {
                if (appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.ContentPage) {
                    //display content page.
                    this._gotoPage(1);
                } else {
                    //display layout options for content page if content page does not exist.
                    this._toggleEditPageVisibility(true);
                }
            }));
            //create UI for button to add new page in book.
            divAddNewPage = domConstruct.create("div", { "class": "esriAddNewPageDiv" }, divEditPageHeader);
            domConstruct.create("div", { "class": "esriAddNewPageImg" }, divAddNewPage);
            domConstruct.create("div", { "class": "esriAddNewPageLabel", "innerHTML": nls.addPageTitle }, divAddNewPage);
            divEditPageBody = domConstruct.create("div", { "class": "esriEditPageBody" }, divEditPage);
            domConstruct.create("div", { "class": "esriPageSliderContainer" }, divEditPageHeader);
            this._createPageSlider();
            this._createDnDModuleList();
            //create template/layout options page.
            this._renderTemplateOptionPage(divEditPageBody, appGlobals.appConfigData.BookPageLayouts, true);
            this._renderTemplateOptionPage(divEditPageBody, appGlobals.appConfigData.ContentPageLayouts, false);
            tempContHeight = dojoWindow.getBox().h - domStyle.get(dom.byId("mapBookHeaderContainer"), "height") - domStyle.get(query(".esriEditPageHeader")[0], "height") - 10;
            domStyle.set(divEditPageBody, "height", tempContHeight + 'px');
            //perform actions to display layout options to create new page.
            on(divAddNewPage, "click", lang.hitch(this, function () {
                if (query('.esriEditPageBody')[0]) {
                    this._clearTemplateSelection();
                    this._toggleEditPageVisibility(false);
                }
            }));

            if (this.isEditModeEnable) {
                this._enableMapBookEditing();
                domStyle.set(query('.esriMapBookEditPage')[0], "display", "block");
            }
        },

        /**
        * render template options page for the book
        * @param{object} divEditPageBody is the edit page container
        * @param{array} configLayout is the json array ,which contains data about template options
        * @param{boolean} isBookPageLayout is true for simple book page layout and false for content page layout
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _renderTemplateOptionPage: function (divEditPageBody, configLayout, isBookPageLayout) {
            var _self = this, divOuter, layoutType, divTemplateContainer, divTemplatelist, divEditPageBodyContent, divEditPageFooter, divAddPage, divCancel, tempIndex;
            //check for which type of page, layout options will be created.
            if (isBookPageLayout) {
                layoutType = "pageLayoutOption";
            } else {
                layoutType = "contentLayoutOption";
            }
            //create outer container for layout/template images.
            divEditPageBodyContent = domConstruct.create("div", { "class": layoutType }, divEditPageBody);
            //display label above the layout opions.
            domConstruct.create("div", { "class": "esriLabelSelectlayout", "innerHTML": nls.selectAnyLayout }, divEditPageBodyContent);
            divOuter = domConstruct.create("div", { "class": "esriTemplateOuterDiv" }, divEditPageBodyContent);
            //create UI for configured layouts.
            array.forEach(configLayout, function (layoutOption, index) {
                divTemplateContainer = domConstruct.create("div", { "class": "esriTemplateContainer" }, divOuter);
                //create template icon.
                divTemplatelist = domConstruct.create("img", { "isBookPageLayout": isBookPageLayout, "class": "esriTemplateImage", "src": layoutOption.templateIcon, "index": index }, divTemplateContainer);
                //highlight selected template.
                on(divTemplatelist, "click", function () {
                    _self._clearTemplateSelection();
                    tempIndex = domAttr.get(this, "index");
                    if (!domClass.contains(this, "selectedTemplate")) {
                        domClass.add(this, "selectedTemplate");
                        domAttr.set(this, "src", configLayout[tempIndex].selectedTemplateIcon);
                    }
                });
                //add a new page with selected layout, when a layout image is double clicked.
                on(divTemplatelist, "dblclick", function () {
                    _self._createNewPageLayout(this);
                });
            });
            //create a footer div to display 'add' and 'cancel' button.
            divEditPageFooter = domConstruct.create("div", { "class": "esriEditPageFooter" }, divEditPageBodyContent);
            divAddPage = domConstruct.create("div", { "isBookPageLayout": isBookPageLayout, "class": "esriAddBtn", "innerHTML": nls.addPageText }, divEditPageFooter);
            divCancel = domConstruct.create("div", { "class": "esriCancelBtn", "innerHTML": nls.cancelButtonText }, divEditPageFooter);
            //add new page with selected layout, when 'add' button is clicked.
            on(divAddPage, "click", function () {
                _self._createNewPageLayout(this);
            });
            //hide layout option page, when 'cancel' button is clicked.
            on(divCancel, "click", function () {
                _self._togglePageNavigation(true);
                domStyle.set(query('.esriEditPageBody')[0], "display", "none");
                query('.esriVideoModule').style("visibility", "visible");
                domStyle.set(query('.esriMapBookEditPage')[0], "height", "auto");
            });
        },

        /**
        * create new page in the selected book
        * @param{boolean} isBookPageLayout is true for simple book page layout and false for content page layout
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _createNewPage: function (isBookPageLayout) {
            var selectedTempIndex, newPage = {}, pageIndex, selectedPage, flag = false, currentPageIndex = this.currentIndex;

            selectedTempIndex = parseInt(domAttr.get(query('.selectedTemplate')[0], "index"), 10);
            //get index of last page of the book.
            pageIndex = this.mapBookDetails[appGlobals.currentBookIndex].length;

            if (isBookPageLayout) {
                // create new book page, if 'isBookPageLayout' is true.
                if (!appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.ContentPage) {
                    if (this.mapBookDetails[appGlobals.currentBookIndex][1] !== "EmptyContent") {
                        this.mapBookDetails[appGlobals.currentBookIndex].push("EmptyContent");
                        pageIndex++;
                    }
                }
                //get default attributes from config to create new page.
                newPage = appGlobals.appConfigData.BookPageLayouts[selectedTempIndex];
                newPage.type = "BookPages";
                if (currentPageIndex > 0 && currentPageIndex !== pageIndex - 1) {
                    pageIndex = currentPageIndex + 1;
                    flag = true;
                }
                newPage.title = nls.pageText + (pageIndex - 1);
                newPage.index = this.mapBookDetails[appGlobals.currentBookIndex].length;
            } else {
                //create content page
                if (this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                    flag = true;
                }
                //get default attributes from config to create content page.
                newPage = appGlobals.appConfigData.ContentPageLayouts[selectedTempIndex];
                newPage.type = "ContentPage";
                newPage.title = nls.contentsPageTitle;
                //update bookInfo array.
                if (appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.ContentPage) {
                    appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.ContentPage = {};
                    appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.ContentPage = {};
                }
                newPage.index = 1;
            }

            domStyle.set(query('.esriEditPageBody')[0], "display", "none");
            //hide video module.
            query('.esriVideoModule').style("visibility", "visible");
            domStyle.set(query('.esriMapBookEditPage')[0], "height", "auto");
            this._renderPage(newPage);
            if (flag) {
                //add newly added page in book.
                if (isBookPageLayout) {
                    //insert new page after the opened page.
                    this._reArrangePageList(currentPageIndex + 1);
                } else {
                    //append new page after the last page of the book.
                    selectedPage = dom.byId('mapBookPagesUList').lastChild || dom.byId('mapBookPagesUList').lastElementChild;
                    dom.byId('mapBookPagesUList').insertBefore(selectedPage, dom.byId('mapBookPagesUList').children[1]);
                    this.currentIndex = 1;
                }
            }
            //display newly created page.
            this._gotoPage(this.currentIndex);
            //update TOC after adding new page.
            this._updateTOC();
            //enable page navigation arrows.
            this._togglePageNavigation(true);
        },

        /**
        * rearrange book page list and book config list when new page is added
        * @param{int} currentpageIndex is index of currently opened page of the book
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _reArrangePageList: function (currentPageIndex) {
            var currentListItemIndex = this.currentIndex, selectedPage, bookPages, mapBookDetails, bookListdata,
                refListItemIndex = currentPageIndex;
            if (this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                currentListItemIndex--;
                refListItemIndex--;
            }
            selectedPage = dom.byId('mapBookPagesUList').children[currentListItemIndex];
            //insert new page after the current opened page.
            dom.byId('mapBookPagesUList').insertBefore(selectedPage, dom.byId('mapBookPagesUList').children[refListItemIndex]);

            bookPages = appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.BookPages;
            bookListdata = appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.BookPages;
            mapBookDetails = this.mapBookDetails[appGlobals.currentBookIndex];
            //update book JSON.
            mapBookDetails.splice(currentPageIndex, 0, mapBookDetails[this.currentIndex]);
            bookPages.splice(currentPageIndex - 2, 0, bookPages[this.currentIndex - 2]);
            bookListdata.splice(currentPageIndex - 2, 0, bookListdata[this.currentIndex - 2]);

            mapBookDetails.splice(this.currentIndex + 1, 1);
            bookPages.splice(this.currentIndex - 1, 1);
            bookListdata.splice(this.currentIndex - 1, 1);
            //assign new indexes to the book pages.
            this._setBookPageIndex(bookListdata, bookPages.length);
            this.currentIndex = currentPageIndex;
        },

        /**
        * delete page from the selected book
        * @memberOf widgets/mapbook-collection/page-renderer
        */
        _deletePage: function () {
            var selectedPage, pageModuleContent, bookPages, bookPageIndex, _self = this, pageIndex = this.currentIndex, index, moduleIndex;
            if (this.mapBookDetails[appGlobals.currentBookIndex][1] === "EmptyContent") {
                pageIndex--;
            }
            selectedPage = dom.byId('mapBookPagesUList').children[pageIndex];
            domStyle.set(selectedPage, "display", "none");
            bookPages = appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.BookPages;
            bookPageIndex = this.currentIndex - 2;
            pageModuleContent = query('.esriMapBookColContent', selectedPage);
            //delete page data from book JSON.
            this.mapBookDetails[appGlobals.currentBookIndex].splice(bookPageIndex + 2, 1);
            appGlobals.bookInfo[appGlobals.currentBookIndex].BookConfigData.BookPages.splice(bookPageIndex, 1);
            for (index = bookPageIndex; index < bookPages.length - 1; index++) {
                this.mapBookDetails[appGlobals.currentBookIndex][index].index = index;
            }
            //destroy webmap instance of the deleted page.
            array.forEach(pageModuleContent, function (node) {
                if (domAttr.get(node, "type") === "webmap") {
                    moduleIndex = domAttr.get(node, "moduleIndex");
                    _self._destroyMap("map" + moduleIndex);
                }
            });
            //update bookInfo array.
            appGlobals.bookInfo[appGlobals.currentBookIndex].ModuleConfigData.BookPages.splice(bookPageIndex, 1);
            dom.byId('mapBookPagesUList').removeChild(selectedPage);
            this._createPageSlider();
            this._setSliderWidth();
            if (this.mapBookDetails[appGlobals.currentBookIndex][pageIndex] === "EmptyContent") {
                this.currentIndex--;
            }
            //display page, which was next to the deleted page.
            this._gotoPage(this.currentIndex - 1);
            //update TOC after deleting page.
            this._updateTOC();
        }
    });
});
