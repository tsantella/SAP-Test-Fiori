sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/core/library"
], function(BaseObject, coreLibrary) {
    "use strict";

    var ValueState = coreLibrary.ValueState;

    /**
     * CycleModel service.
     *
     * Owns the route handling and the status -> ValueState mapping for the
     * CycleModel view. The controller only forwards calls here.
     */
    return BaseObject.extend("project1.service.util.CycleModel", {

        /**
         * @param {sap.ui.core.mvc.Controller} oController the owning controller
         */
        constructor: function(oController) {
            BaseObject.call(this);
            this._oController = oController;
        },

        // ===================== routing =====================

        /**
         * Called from controller onInit. Subscribes to the route so the selected
         * cycle model is copied onto the view when the route is matched.
         */
        init: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this._oController);
            oRouter.getRoute("RouteCycleModel").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function() {
            var oComponent = this._oController.getOwnerComponent();
            var oSelectedModel = oComponent.getModel("selectedCycle");

            if (oSelectedModel) {
                this._oController.getView().setModel(oSelectedModel, "selectedCycle");
            }
        },

        navBack: function() {
            window.history.go(-1);
        },

        // ===================== status formatting =====================

        formatCycleStatusState: function(sStatus) {
            switch (sStatus) {
                case "Completed": return ValueState.Success;
                case "WorkInProgress": return ValueState.Warning;
                case "Stopped": return ValueState.Error;
                default: return ValueState.None;
            }
        },

        formatUploadStatusState: function(sStatus) {
            switch (sStatus) {
                case "Finished": return ValueState.Success;
                case "Pending": return ValueState.Warning;
                case "Failed": return ValueState.Error;
                default: return ValueState.None;
            }
        }

    });
});
