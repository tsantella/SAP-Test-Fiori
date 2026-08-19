sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
  ],
  function (Controller, JSONModel, MessageToast, Fragment, MessageBox) {
    "use strict";

    return Controller.extend("project1.controller.Status", {
      onNavBack: function () {
        window.history.go(-1);
      },
    });
});