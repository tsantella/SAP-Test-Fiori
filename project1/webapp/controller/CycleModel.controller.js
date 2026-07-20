sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/library"
], (BaseController, coreLibrary) => {
  "use strict";

  var ValueState = coreLibrary.ValueState;

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