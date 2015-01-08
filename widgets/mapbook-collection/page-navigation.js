/*global define,dojo*/
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
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/dnd/Source",
    "dojo/on",
    "dojo/query",
    "dojo/i18n!nls/localized-strings"
], function (declare, lang, domConstruct, domAttr, domStyle, domClass, dom, DndSource, on, query, nls) {
    return declare([], {
        pageIndex: null,
        /**
        * create mapbook page navigation widget
        *
        * @class
        * @name widgets/mapbook-collection/page-navigation
        */
        /**
        * create page carousal for edit page
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _createPageSlider: function () {
            var divPageSlider, dndPageList = [], divPageSliderLeft, divPageSliderContent, divPageSliderRight, listItem,
                ulist, bookPagesLength, uListDndCont, divLeftArrowIcon, divRightArrowIcon, bookPageIndex, _self = this;
            divPageSlider = query('.esriPageSliderContainer')[0];
            if (divPageSlider) {
                domConstruct.empty(divPageSlider);
            }
            bookPagesLength = dojo.bookInfo[dojo.currentBookIndex].BookConfigData.BookPages.length;
            //create page carousal UI.
            if (bookPagesLength > 0) {
                //create left/previous arrow in page carousal.
                divPageSliderLeft = domConstruct.create("div", { "class": "esriPageSliderLeft" }, divPageSlider);
                divLeftArrowIcon = domConstruct.create("div", { "class": "esriLeftArrowIcon esriLeftArrowDisable" }, divPageSliderLeft);
                //attach event on left arrow to slide carousal to left.
                on(divLeftArrowIcon, "click", function () {
                    if (!domClass.contains(this, "esriLeftArrowDisable")) {
                        _self._slidePage(true);
                    }
                });

                divPageSliderContent = domConstruct.create("div", { "class": "esriPageSliderContent" }, divPageSlider);
                //create right/next arrow in page carousal.
                divPageSliderRight = domConstruct.create("div", { "class": "esriPageSliderRight" }, divPageSlider);
                divRightArrowIcon = domConstruct.create("div", { "class": "esriRightArrowIcon" }, divPageSliderRight);
                //attach event on right arrow to slide carousal to right.
                on(divRightArrowIcon, "click", function () {
                    if (!domClass.contains(this, "esriRightArrowDisable")) {
                        _self._slidePage(false);
                    }
                });
                //start page carousal from first page.
                _self.pageIndex = 0;
                ulist = domConstruct.create("ul", { "dndContType": "pageCarousal", "class": "esriPageSliderUlist" }, divPageSliderContent);
                //create dnd container in carousal to swap pages.
                uListDndCont = new DndSource(ulist, { accept: ["carousalPage"] });
                //create page icon UI in page carousal.
                for (bookPageIndex = 0; bookPageIndex < bookPagesLength; bookPageIndex++) {
                    listItem = domConstruct.create("li", { "class": "esriPageSliderListItem" }, null);
                    domAttr.set(listItem, "index", bookPageIndex + 2);
                    domConstruct.create("div", { "class": "esriPageSliderDiv esriBookPage", "index": bookPageIndex + 2, "innerHTML": nls.pageText + (bookPageIndex + 1) }, listItem);
                    on(listItem, "click", lang.hitch(this, this._viewSelectedpage));
                    listItem.dndType = "carousalPage";
                    dndPageList.push(listItem);
                }
                uListDndCont.insertNodes(false, dndPageList);
                uListDndCont.forInItems(function (item, id, map) {
                    domClass.add(id, "carousalPage");
                });
                uListDndCont.sync();
                if (bookPagesLength === 0) {
                    domStyle.set(divPageSlider, "display", "none");
                } else {
                    domStyle.set(divPageSlider, "display", "inline-block");
                }
            }
        },

        /**
        * display selected page in book
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _viewSelectedpage: function (event) {
            var target = event.currentTarget || event.srcElement;
            this._gotoPage(parseInt(domAttr.get(target, "index"), 10));
        },

        /**
        * navigate to next/previous page
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _handlePageNavigation: function (currentObj, isSlideLeft) {
            var currentClass, totalPageLength;
            totalPageLength = this.mapBookDetails[dojo.currentBookIndex].length;
            //allow user to change the page if page navigation is enabled.
            if (this.isNavigationEnabled) {
                //check which arrow is clicked.
                currentClass = isSlideLeft ? "esriPrevDisabled" : "esriNextDisabled";
                //update current index value.increment it if next arrow is clicked else decrement.
                if (!domClass.contains(currentObj, currentClass)) {
                    if (totalPageLength - 1 === this.currentIndex && !isSlideLeft) {
                        this.currentIndex = 0;
                    } else {
                        if (isSlideLeft) {
                            this.currentIndex--;
                        } else {
                            this.currentIndex++;
                        }
                    }
                    //skip content page and display next/previous page if content page is not created.
                    if (this.mapBookDetails[dojo.currentBookIndex][this.currentIndex] === "EmptyContent") {
                        if (isSlideLeft) { this.currentIndex = 0; } else { this.currentIndex++; }
                    }
                    this._slideBookPage();
                }
            }
        },

        /**
        * on changing of page set visibility of left & right arrows
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _setArrowVisibility: function () {
            var totalPageLength = this.mapBookDetails[dojo.currentBookIndex].length;
            if (this.mapBookDetails[dojo.currentBookIndex][1] === "EmptyContent") {
                totalPageLength--;
            }
            if (this.currentIndex === 0) {
                //show next arrow disable if only one page is available in book else show it enable.
                if (totalPageLength > 1) {
                    this._removeClass(this.mapBookNextPage, "esriNextDisabled");
                } else {
                    domClass.add(this.mapBookNextPage, "esriNextDisabled");
                }
                domClass.add(this.mapBookPreviousPage, "esriPrevDisabled");
            } else {
                //display next and previous arrow enabled if currenty opened page is not the first page.
                this._removeClass(this.mapBookNextPage, "esriNextDisabled");
                this._removeClass(this.mapBookPreviousPage, "esriPrevDisabled");
            }
        },

        /**
        * slide current page to next/previous page
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _slideBookPage: function () {
            var pageWidth, left;
            pageWidth = domStyle.get(query(".esriMapBookPageListItem")[0], "width");
            if (this.mapBookDetails[dojo.currentBookIndex][1] === "EmptyContent" && this.currentIndex !== 0) {
                //slide page carousal to right.
                left = (this.currentIndex - 1) * Math.ceil(pageWidth);
            } else {
                //slide page carousal to left.
                left = (this.currentIndex) * Math.ceil(pageWidth);
            }
            dom.byId("mapBookPagesUList").style.marginLeft = -left + 'px';
            //hide TOC panel if page gets changed.
            if (domClass.contains(dom.byId("divContentListPanel"), "esriContentPanelOpened")) {
                domClass.remove(dom.byId("divContentListPanel"), "esriContentPanelOpened");
                domClass.remove(query('.esriTocIcon')[0], "esriHeaderIconSelected");
            }
            this._highlightSelectedPage();
            this._setArrowVisibility();
            this._setPageNavigation();
        },

        /**
        * set parameters for page navigation by page slider in edit page
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _setPageNavigation: function () {
            var pageNavigationTitle;
            if (this.currentIndex >= 2) {
                //display delete page icon on application header for book pages(not for cover and content page), if book is in edit mode.
                if (dojo.appConfigData.AuthoringMode && this.isEditModeEnable) {
                    domStyle.set(query(".esriDeleteIcon")[0], "display", "block");
                }
                //display selected page status for book pages.
                domStyle.set(query(".esriFooterDiv")[0], "display", "block");
                pageNavigationTitle = dojo.string.substitute(nls.pageText + " ${pageIndex} " + nls.ofText + " ${totalPages}", { pageIndex: this.currentIndex - 1, totalPages: (this.mapBookDetails[dojo.currentBookIndex].length - 2) });
                domAttr.set(dom.byId("esriPaginationSpan"), "innerHTML", pageNavigationTitle);
            } else {
                if (dojo.appConfigData.AuthoringMode) {
                    domStyle.set(query(".esriDeleteIcon")[0], "display", "none");
                }
                domStyle.set(query(".esriFooterDiv")[0], "display", "none");
            }
            query(".esriFooterDiv")[0].appendChild(query(".esriPaginationDiv")[0]);
        },

        /**
        * highlight selected page in page slider/carousal of edit page
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _highlightSelectedPage: function () {
            var preSelectedPage, bookPageList, sliderContentWidth, totalUlistWidth;
            if (this.mapBookDetails[dojo.currentBookIndex][this.currentIndex] === "EmptyContent") {
                this.currentIndex++;
            }
            preSelectedPage = query('.esriPageSelected');
            bookPageList = query('.esriBookPage');
            if (bookPageList.length > 0) {
                //remove highlighting from earlier selected page
                if (preSelectedPage[0]) {
                    domClass.remove(preSelectedPage[0], "esriPageSelected");
                }
                //show currently selected page icon highlighted in page carousal.
                if (bookPageList[this.currentIndex]) {
                    domClass.add(bookPageList[this.currentIndex], "esriPageSelected");
                }
                //disable next arrow of page carousal if all page icon are vissible in it.
                if (domStyle.get(query(".esriPageSliderContainer")[0], "display") === "inline-block") {
                    if (query('.esriPageSliderListItem')[0]) {
                        sliderContentWidth = domStyle.get(query('.esriPageSliderContent')[0], 'width');
                        totalUlistWidth = domStyle.get(query('.esriPageSliderListItem')[0], "width") * (bookPageList.length - 2);
                        if (totalUlistWidth <= sliderContentWidth) {
                            domClass.add(query('.esriRightArrowIcon')[0], "esriRightArrowDisable");
                        }
                    }
                }
            }
        },

        /**
        * slide page left/right
        * @param{boolean} isSlideLeft is true if left arrow is clicked
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _slidePage: function (isSlideLeft) {
            var pageWidth, pageUList, sliderLeft = 0;
            //slide page carousal to left/right when navigation arrows get clicked.
            if (domStyle.get(query(".esriPageSliderContainer")[0], "display") === "inline-block") {
                pageWidth = domStyle.get(query('.esriPageSliderListItem')[0], "width");
                pageUList = query('.esriPageSliderUlist')[0];
                //identify which arrow is clicked.
                if (isSlideLeft) { this.pageIndex++; } else { this.pageIndex--; }
                sliderLeft = this.pageIndex * pageWidth;
                domStyle.set(pageUList, "margin-left", sliderLeft + 'px');
                pageUList.style.marginLeft = sliderLeft + 'px';
                this._setSliderArrows();
            }
        },

        /**
        * set edit page's page slider/page carousal's arrow visibility on page navigation
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _setSliderArrows: function () {
            var sliderleft, pageUlistWidth, sliderContentWidth, pageWidth, pageUList;
            if (query('.esriPageSliderContent')[0]) {
                sliderContentWidth = domStyle.get(query('.esriPageSliderContent')[0], 'width');
                pageUList = query('.esriPageSliderUlist')[0];
                if (domStyle.get(query(".esriPageSliderContainer")[0], "display") === "inline-block") {
                    pageWidth = domStyle.get(query('.esriPageSliderListItem')[0], "width");
                    pageUlistWidth = pageWidth * pageUList.childNodes.length;
                    sliderleft = pageWidth * this.pageIndex;
                    if (this.pageIndex === 0) {
                        //show left arrow disable if first page is selected.
                        domClass.add(query('.esriLeftArrowIcon')[0], "esriLeftArrowDisable");
                        if (sliderContentWidth < pageUlistWidth) {
                            //show right arrow enable if last page is not visible in page carousal.
                            this._removeClass(query('.esriRightArrowIcon')[0], "esriRightArrowDisable");
                        } else {
                            //show right arrow disable if last page is visible in page carousal.
                            domClass.add(query('.esriRightArrowIcon')[0], "esriRightArrowDisable");
                        }
                    } else {
                        this._removeClass(query('.esriLeftArrowIcon')[0], "esriLeftArrowDisable");
                        //show right arrow disable if last page is visible in page carousal.
                        if (sliderContentWidth >= pageUlistWidth + sliderleft) {
                            domClass.add(query('.esriRightArrowIcon')[0], "esriRightArrowDisable");
                        } else {
                            //show right arrow enable if last page is not visible in page carousal.
                            this._removeClass(query('.esriRightArrowIcon')[0], "esriRightArrowDisable");
                        }
                    }
                }
            }
        },

        /**
        * set page carousal width of edit page
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _setSliderWidth: function () {
            var sliderContainer, sliderContainerWidth;
            sliderContainer = query('.esriPageSliderContainer')[0];
            //calculate width of page carousal to display it in edit page header.
            sliderContainerWidth = domStyle.get(query('.esriEditPageHeader')[0], "width") - domStyle.get(query('.esriEditPageOptionList')[0], "width") - domStyle.get(query('.esriAddNewPageDiv')[0], "width");
            if (sliderContainer) {
                if (sliderContainerWidth > 0) {
                    domStyle.set(sliderContainer, "width", sliderContainerWidth - 20 + 'px');
                }
                sliderContainerWidth = domStyle.get(sliderContainer, "width");
                if (query('.esriPageSliderContent')[0]) {
                    if (sliderContainerWidth > 0) {
                        domStyle.set(query('.esriPageSliderContent')[0], "width", sliderContainerWidth - 80 + 'px');
                    }
                }
            }
        },

        /**
        * go to selected page
        * @param{int} pageIndex is the selected page index
        * @memberOf widgets/mapbook-collection/page-navigation
        */
        _gotoPage: function (pageIndex) {
            //display selected page if navigation is not disabled.
            if (this.isNavigationEnabled) {
                this.currentIndex = pageIndex;
                this._slideBookPage();
            }
        }
    });
});
