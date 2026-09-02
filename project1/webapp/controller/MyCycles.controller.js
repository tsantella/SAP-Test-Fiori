sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "project1/service/util/MyCycles.service"
], function(Controller, MyCyclesService) {
    "use strict";

    /**
     * MyCycles controller.
     *
     * Intentionally logic-free: every handler just forwards the raw UI event to
     * MyCycles.service, which owns all view-state, business rules and backend calls.
     */
    return Controller.extend("project1.controller.MyCycles", {

        onInit: function() {
            this._oService = new MyCyclesService(this);
            this._oService.init();
        },

        onExit: function() {
            this._oService.destroy();
        },

        // ---- navigation ----
        onNavBack: function() {
            this._oService.navBack();
        },

        // ---- search ----
        onSearch: function() {
            this._oService.toggleSearch();
        },

        onCloseSearch: function() {
            this._oService.closeSearch();
        },

        onSearchLiveChange: function(oEvent) {
            this._oService.searchLiveChange(oEvent.getParameter("newValue"));
        },

        // ---- row actions ----
        onDelete: function() {
            this._oService.deleteSelected();
        },

        onView: function() {
            this._oService.viewSelected();
        },

        onStopCycle: function() {
            this._oService.stopSelected();
        },

        onRowPress: function(oEvent) {
            this._oService.selectRow(oEvent.getSource());
        },

        // ---- pagination: main table ----
        onFirstPage: function() {
            this._oService.goToFirstPage();
        },

        onPreviousPage: function() {
            this._oService.goToPreviousPage();
        },

        onNextPage: function() {
            this._oService.goToNextPage();
        },

        onLastPage: function() {
            this._oService.goToLastPage();
        },

        // ---- pagination: import error log dialog ----
        onErrFirstPage: function() {
            this._oService.goToErrFirstPage();
        },

        onErrPreviousPage: function() {
            this._oService.goToErrPreviousPage();
        },

        onErrNextPage: function() {
            this._oService.goToErrNextPage();
        },

        onErrLastPage: function() {
            this._oService.goToErrLastPage();
        },

        // ---- new cycle dialog ----
        onNew: function() {
            this._oService.openNewCycleDialog();
        },

        onCreateWithImport: function() {
            this._oService.triggerImportFilePicker();
        },

        onCancelNewCycle: function() {
            this._oService.closeNewCycleDialog();
        },

        onExcelFileSelected: function(oEvent) {
            this._oService.handleExcelFileSelected(oEvent);
        },

        onCloseImportLog: function() {
            this._oService.closeImportLog();
        },

        onCreateFromLast: function() {
            this._oService.createFromLast();
        }

    });
});
