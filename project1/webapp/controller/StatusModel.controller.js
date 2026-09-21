sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/library"
    
  ],
  function (BaseController, JSONModel, coreLibrary) {
    "use strict";

    var ValueState = coreLibrary.ValueState;
    return BaseController.extend("project1.controller.StatusModel", {

      onInit: function () {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

        oRouter
          .getRoute("RouteStatusModel")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        var oArgs = oEvent.getParameter("arguments");
        var sModelVersion = oArgs.ModelVersion;

        console.log("ModelVersion from route:", sModelVersion);

        if (!sModelVersion) {
          console.warn("ModelVersion was not provided.");
          return;
        }

        var oCyclesModel = this.getOwnerComponent().getModel("cycles");

        if (!oCyclesModel) {
          console.error("cycles model not found.");
          return;
        }

        var aStatus = oCyclesModel.getProperty("/Status") || [];

        var oSelectedStatus = aStatus.find(function (oStatus) {
          return oStatus.ModelVersion === sModelVersion;
        });

        if (!oSelectedStatus) {
          console.warn(
            "No status found for ModelVersion:",
            sModelVersion
          );
          return;
        }

        console.log("Selected Status:", oSelectedStatus);

        var oSelectedStatusModel = new JSONModel(oSelectedStatus);

        this.getView().setModel(
          oSelectedStatusModel,
          "selectedStatus"
        );
      },

      onNavBack: function () {
        window.history.go(-1);
      },

      formatStatusModelState: function (sStatus) {
        switch (sStatus) {
          case "Active":
            return ValueState.Success;
          case "Pending":
            return ValueState.Warning;
          case "Development":
            return ValueState.None;
          default:
            return ValueState.Error;
        }
      },

    });
  }
);