sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "project1/service/util/CycleModel.service"
], function(Controller, CycleModelService) {
    "use strict";

    /**
     * CycleModel controller.
     *
     * Intentionally logic-free: route handling and formatting live in
     * CycleModel.service. Formatters stay declared here only so the XML
     * bindings can resolve them, and just delegate to the service.
     */
    return Controller.extend("project1.controller.CycleModel", {

        onInit: function() {
            this._oService = new CycleModelService(this);
            this._oService.init();
        },

        onExit: function() {
            this._oService.destroy();
        },

        onNavBack: function() {
            this._oService.navBack();
        },

        formatCycleStatusState: function(sStatus) {
            return this._oService.formatCycleStatusState(sStatus);
        },

        formatUploadStatusState: function(sStatus) {
            return this._oService.formatUploadStatusState(sStatus);
        }

    });
});
