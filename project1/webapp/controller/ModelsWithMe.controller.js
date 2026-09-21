sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "project1/service/util/ModelsWithMe.service"
], function (Controller, ModelsWithMeService) {
    "use strict";

    /**
     * ModelsWithMe controller.
     *
     * Intentionally logic-free: every handler just forwards the raw UI event to
     * ModelsWithMe.service, which owns all view-state, business rules and data.
     */
    return Controller.extend("project1.controller.ModelsWithMe", {

        onInit: function () {
            this._oService = new ModelsWithMeService(this);
            this._oService.init();
        },

        onExit: function () {
            this._oService.destroy();
        },

        // ---- row selection ----
        onRowPress: function (oEvent) {
            this._oService.selectRow(oEvent);
        },

        // ---- search ----
        onSearch: function () {
            this._oService.toggleSearch();
        },

        onSearchLiveChange: function (oEvent) {
            this._oService.searchLiveChange(oEvent.getParameter("newValue"));
        },

        // ---- Edit / New (detail screen) ----
        onEdit: function () {
            this._oService.openEdit();
        },

        onNew: function () {
            this._oService.openNew();
        },

        // ---- delete ----
        onDelete: function () {
            this._oService.deleteSelected();
        },

        // ---- toolbar stubs ----
        onSendMultiple: function () {
            this._oService.sendMultiple();
        },

        onSendAll: function () {
            this._oService.sendAll();
        },

        onImport: function () {
            this._oService.triggerImport();
        },

        onExportExcel: function () {
            this._oService.exportExcel();
        },

        // ---- pagination ----
        onFirstPage: function () {
            this._oService.goToFirstPage();
        },

        onPreviousPage: function () {
            this._oService.goToPreviousPage();
        },

        onNextPage: function () {
            this._oService.goToNextPage();
        },

        onLastPage: function () {
            this._oService.goToLastPage();
        }

    });
});
