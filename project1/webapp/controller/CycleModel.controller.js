sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "project1/service/util/CycleModel.service"
], (BaseController, CycleModelService) => {
    "use strict";

    return BaseController.extend("project1.controller.CycleModel", {

        onInit: function() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteCycleModel").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function() {
            var oComponent = this.getOwnerComponent();
            var oSelectedModel = oComponent.getModel("selectedCycle");

            if (oSelectedModel) {
                this.getView().setModel(oSelectedModel, "selectedCycle");
            }
        },

        onNavBack: function() {
            window.history.go(-1);
        },

        formatCycleStatusState: function(sStatus) {
            return CycleModelService.formatCycleStatusState(sStatus);
        },

        formatUploadStatusState: function(sStatus) {
            return CycleModelService.formatUploadStatusState(sStatus);
        }

    });
});