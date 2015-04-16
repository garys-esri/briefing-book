/*global define */
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
define({
    root: {
        tocContentsCaption: "Contents", //Shown as header title in the TOC panel.
        homeTitle: "Home", //Command button to view gallery page of the application.
        addPageTitle: "Add Page", //Shown below the pagination header to display page layout option to add new page in selected book.
        alertDialogTitle: "Alert",  //Shown as the title of the customized alert box.
        confirmDialogTitle: "Confirm", //Shown as the title of the customized confirmation box.
        refreshBookTitle: "Refresh", //Command button to reload the application.
        editTitle: "Edit Book", //Command button to enable editing of selected book.
        deleteTitle: "Delete Page", //Command button to delete opened page of the book.
        descriptionNotAvailable: "summary is not available", //Shown in the webmap thumbnail of webmap dialog on hovering it if webmap summary not available.
        removeBookTitle: "Remove Book", //Command button to delete book from gallery and AGOL.
        tocTitle: "Contents", //Command button to open TOC panel.
        addPageText: "Add", //Shown on button in layout option page.
        addBookTitle: "New Book", //Command button to add new book in gallery.
        saveBookTitle: "Save Book", //Command button to save new book in gallery and AGOL.
        copyBookTitle: "Copy Book", //Command button to create copy of selected book.
        defaultItemId: "newItem", //Set default id for new book which is not yet saved on AGOL.
        contentsPageTitle: "Contents", //Command button of header of the TOC module in book.
        pageText: "Page ", //Shown at the bottom of the page in page slider.
        ofText: " of ", //Shown at the bottom of the book pages to display opened page status.
        okButtonText: "OK", //Shown at the button in customized alert dialog.
        saveButtonText: "Save",//Shown at the button in module setting dialog.
        cancelButtonText: "Cancel",//Shown at the button in customized alert dialog.
        closeButtonTitle: "Close", //Command button to close dijit dialog.
        untitled: "Untitled",//Shown as the default title value of the module.
        legendTitle: "Legend", //Command button to open legend panel in webmap module container.
        fullScreen: "Toggle full screen", //Command button to toggle full view of webmap
        dndModuleText: "Drag and Drop Modules",//Shown as header in edit page below the page slider.
        selectAnyLayout: "Select a page layout",//Shown as title in the layout option page.
        fieldIsEmpty: "Field can not be empty",//Shown in alert message if any required field is not filled.
        webMapIconTitle: "Map", //Command button to create webmap module .
        freeFormIconTitle: "HTML", //Command button to create HTML module.
        textAreaIconTitle: "Text Area", //Command button to create text area module.
        imageIconTitle: "Image", //Command button to create image module.
        videoIconTitle: "Video", //Command button to create video module.
        flickrIconTitle: "Flickr", //Command button to create flickr module.
        editMentEditTitle: "Edit", //Command button to open module setting dialog to update module.
        editMentDeleteTitle: "Delete", //Command button to delete module.
        confirmModuleDeleting: "Do you want to delete this module?",//Show in alert dialog when delete module button is clicked.
        authorName: "Author name",//Shown as default value in author name module.
        settingDialogTitle: "Edit ${modType}",//Shown as title of the module setting dialog
        mapbookDefaultTitle: "Briefing Book Title Goes Here",//Shown as default title of the newly created book.
        confirmPageDeleting: "This page will be removed. Click Ok to confirm.",//Shown in alert dialog when delete page button is clicked.
        confirmCopyOfSelectedBook: "Do you want to copy this book?", //Shown in alert dialog when copy book button is clicked.
        confirmDeletingOfSelectedBook: "${bookName} will be removed. Click 'OK' to confirm removal.", //Shown in alert dialog when delete book button is clicked.
        confirmAppReloading: "Briefing book gallery will be reloaded and you may lose the edits.", //Shown in alert dialog when refresh book button is clicked
        validateBookOwner: "You do not have permission to edit this book.", //Shown in alert dialog when edit button is clicked and user is not the owner of that book.
        validateOrganizationUser: "You are not the member of this Organization.", //Shown in alert dialog when user enters credentials which is not belongs to the configured organization.
        copyKeyword: "Copy - ", //Shown as teh prefix of the title of the copied book.
        signInText: "Sign In", //Command button to 'sign in' to the application.
        signOutText: "Sign Out", //Command button to 'sign out' from the application.
        searchWebmapPlaceHolder: "Enter search term",//Shown as place holder for textbox in webmap search dialog
        nextWebmapPageText: "Next",//Shown at the bottom in webmap search dialog.
        preWebmapPageText: "Previous", //Shown at the bottom in webmap search dialog.
        validateUnSavedEdits: 'There are unsaved changes in this book. Click "Cancel" to stay on this page. Click "OK" to continue without saving. <br/> Warning: If you do not save this book, all edits done in this session may be lost.',
        //Shown in alert dialog when user clicks on home,copy or delete button with some unsaved changes in book.
        bookNotSaved: 'This book is not saved yet. Click "Save" icon to save this book.',//Shown in alert dialog when user tries to share the unsaved book.
        webmapCountStatus: "${start} - ${end} of ${total}",//Shown at the bottom of the webmap thumbnail container.
        noWebmapFound: "No map found", //Shown in webmap search dialog if no results found with applied search options.
        loadingWebmap: "Loading...", //Shown in webmap search dialog when app searches webmap on portal.
        shareBtnText: "Share",//Shown at the button in share option dialog.
        shareBookTitle: "Share Book",//Command to share book on AGOL.
        shareBookDialogTitle: "Sharing Options",//Shown as the title of the share dialog.
        shareToOrgText: "Organization", //Shown as the option in share dialog to share the book with configured organization.
        shareToEveryoneText: "Everyone (public)", //Shown as the option in share dialog to share the book with every one.
        protectCopyBookText: "Copy protect this book", //Shown as the option in share dialog to protect the book from being copied by other users.
        copyRestricted: "Cannot copy, the owner of this book has protected it from copying.",//Shown in alert dialog, when user tries to copy the book which is made copy protected by its owner.
        orientationNotSupported: "App does not support this orientation", //Shown in portrait mode of i-pad/tab devices.
        coverPageText: "Cover page",//Shown below the cover page of the page slider in edit page.
        contentPageText: "Content page", //Shown below the content page of the page slider in edit page.
        webmapSearchBtnText: "Go",//Show on button in webmap search dialog
        printTitle: "print", //Command button to see print preview page of selected book.
        webmapDialogTitle: "Map", //Shown the title of the module setting dialog for webmap module.
        HTMLDialogTitle: "HTML",//Shown as the title of the module setting dialog for HTML module.
        imageDialogTitle: "Image", //Shown as the title of the module setting dialog for image module.
        logoDialogTitle: "Logo", //Shown as the title of the module setting dialog for logo module.
        textDialogTitle: "Text", //Shown as the title of the module setting dialog for text area module.
        flickrDialogTitle: "Flickr", //Shown as the title of the module setting dialog for flickr module.
        videoDialogTitle: "Video", //Shown as the title of the module setting dialog for video module.
        webmapModuleTitleText: "Map title goes here",//Shown as default text in title field of setting dialog for webmap module.
        webmapModuleCaptionText: "Map caption goes here", //Shown as default text in caption field of setting dialog for webmap module
        textModuleDefaultText: "Enter text here", //Shown as default text in text field of setting dialog for text module
        HTMLModuleDefaultText: "<p>Add HTML here</p>", //Shown as default text in setting dialog for HTML module
        videoModuleTitleText: "Video title", //Shown as default text in title field of setting dialog for video module
        videoModuleCaptionText: "The video caption", //Shown as default text in caption field of setting dialog for video module
        dateModuleText: "Date and/or other information here", //Shown as default text in setting dialog for date module
        subtitleModuleText: "This is a subtitle or brief descriptive blurb about my map book. It's optional, but recommended. People will get a better sense of what the book is about if there's a descriptive subtitle here.",
        //Shown as default text in setting dialog for text module.
        printPageTitle: "Print Book", //Shown as title of print page
        modulesNotLoaded: "All modules are not loaded yet",//Shown in alert dialog on clicking of print button if all modules are not loaded.
        arcgisOptionText: "ArcGIS Online",//Shown as option in select webmap dialog to search webmaps on ArcGIS.
        myContentOptionText: "My Content", //Shown as option in select webmap dialog to search webmaps in logged in user's content.
        organizationOptionText: "My Organization", //Shown as option in select webmap dialog to search webmaps in configured organization.
        errorMessages: {
            webmapSearchFailed: "An error occurred while searching the map",//Shown in select webmap dialog if app fails to search webmaps.
            updatingItemError: "Updating of the selected item failed",//Shown in alert message if app fails to update/save any item on AGOL.
            fieldInputIsNotValid: "Invalid input", //Shown in alert message if provided input values are not valid to create module.
            addingItemError: "Adding new item failed", //Shown in alert message if app fails to create an item on AGOL.
            deletingItemError: "Deleting selected item failed", //Shown in alert message if app fails to delete an item on AGOL.
            copyItemError: "Copying of selected item failed", //Shown in alert message if app fails to create copy of an item on AGOL.
            contentQueryError: "Failed to load user contents", //Shown in alert message if app fails to search book items on portal.
            webmapError: "An error occurred while loading the map", //Shown in webmap module if webmap gets failed to load.
            permissionDenied: "You do not have permissions to access this resource.", //Shown in alert dialog if logged in user do not have access to perform any operation on item.
            shareItemError: "Updating selected item failed", //Shown in alert dialog if share request gets failed.
            organizationNotSet: "Please configure your URL for your ArcGIS Online Organization or Portal for ArcGIS site.", //Shown in alert dialog if portal URL is not configured.
            configurationError: "Please check your configuration", //Shown in alert dialog if logged in user is not the member of the current organization.
            groupIdNotConfigured: "Group id is not configured."////Shown in alert dialog if displayBook is set to true in config, but group id is not configured.
        }
    },
    fr: true
});
