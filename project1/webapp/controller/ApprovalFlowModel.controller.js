sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/library"],
  (BaseController, coreLibrary) => {
    "use strict";

    var ValueState = coreLibrary.ValueState;
    return BaseController.extend("project1.controller.ApprovalFlowModel", {
      onInit: function () {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter
          .getRoute("RouteApprovalFlowModel")
          .attachPatternMatched(this._onRouteMatched, this);
      },
      _onRouteMatched: function () {
        var oComponent = this.getOwnerComponent();
        var oSelectedModel = oComponent.getModel("selectedApprovalFlow");
        if (oSelectedModel) {
          this.getView().setModel(oSelectedModel, "selectedApprovalFlow");
          // Do something with the selected data
        }
      },
      onNavBack: function () {
        window.history.go(-1);
      },
      formatApprovalFlowStatusState: function (sStatus) {
        switch (sStatus) {
          case "Approved":
            return ValueState.Success;
          case "Pending":
            return ValueState.Warning;
          case "Rejected":
            return ValueState.Error;
          default:
            return ValueState.None;
        }
      },
    });
  },
);
