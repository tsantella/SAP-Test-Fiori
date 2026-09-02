sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "project1/service/util/View1.service"
], function(Controller, View1Service) {
    "use strict";

    /**
     * View1 controller.
     *
     * Intentionally logic-free: navigation lives in View1.service.
     */
    return Controller.extend("project1.controller.View1", {

        onInit: function() {
            this._oService = new View1Service(this);
        },

        onExit: function() {
            this._oService.destroy();
        },

        onNavToMyCycles: function() {
            this._oService.navToMyCycles();
        },
        onNavToApprovalFlow: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteApprovalFlow");
        },
        onNavToStatus: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteStatus");
        }
    });
});
