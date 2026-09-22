sap.ui.define([
    "sap/ui/base/Object"
], function(BaseObject) {
    "use strict";

    /**
     * View1 service.
     *test
     * Owns the navigation logic for View1. The controller only forwards calls here.
     */
    return BaseObject.extend("project1.service.util.View1", {

        /**
         * @param {sap.ui.core.mvc.Controller} oController the owning controller
         */
        constructor: function(oController) {
            BaseObject.call(this);
            this._oController = oController;
        },

        navToMyCycles: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this._oController);
            oRouter.navTo("RouteMyCycles");
        }

    });
});
