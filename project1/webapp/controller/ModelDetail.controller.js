sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/EventBus"
], function (Controller, JSONModel, MessageToast, MessageBox, EventBus) {
    "use strict";
    return Controller.extend("project1.controller.ModelDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteModelDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oComponent = this.getOwnerComponent();
            var oSelectedModel = oComponent.getModel("selectedModel");

            if (!oSelectedModel) {
                oSelectedModel = new JSONModel();
                oComponent.setModel(oSelectedModel, "selectedModel");
            }

            this.getView().setModel(oSelectedModel, "selectedModel");

            var oDropdownModel = oComponent.getModel("dropdowns");
            if (oDropdownModel) {
                this.getView().setModel(oDropdownModel, "dropdowns");
            }

            var oData = oSelectedModel.getData() || {};
            var sMode = oData._mode || "view";

            oSelectedModel.setProperty("/IsActiveIndex", oData.Status === "INACTIVE" ? 1 : 0);

            var oUiModel = this.getView().getModel("ui");
            if (!oUiModel) {
                oUiModel = new JSONModel();
                this.getView().setModel(oUiModel, "ui");
            }
            oUiModel.setData({ mode: sMode });

            this._sOriginalSnapshot = JSON.stringify(oData);
        },

        onClose: function () {
            this._navigateBack();
        },

        onSave: function () {
            var sMode = this.getView().getModel("ui").getProperty("/mode");
            var sMessage = sMode === "new"
                ? "Are you sure you want to save this record?"
                : "Are you sure you want to save these changes?";
            var that = this;

            MessageBox.confirm(sMessage, {
                title: "Confirm Save",
                actions: ["Confirm Save", MessageBox.Action.CANCEL],
                emphasizedAction: "Confirm Save",
                onClose: function (sAction) {
                    if (sAction === "Confirm Save") {
                        that._doSave();
                    }
                }
            });
        },

        _doSave: function () {
            var oSelectedModel = this.getView().getModel("selectedModel");
            var oData = oSelectedModel.getData();
            var sMode = this.getView().getModel("ui").getProperty("/mode");

            var oRecord = JSON.parse(JSON.stringify(oData));
            var sOriginalKey = oRecord._originalKey;
            delete oRecord._mode;
            delete oRecord._originalKey;

            oRecord.Status = (oRecord.IsActiveIndex === 1) ? "INACTIVE" : "ACTIVE";
            delete oRecord.IsActiveIndex;

            EventBus.getInstance().publish("app", "modelSaved", {
                mode: sMode,
                originalKey: sOriginalKey,
                record: oRecord
            });

            MessageToast.show(sMode === "new" ? "Record created successfully." : "Changes saved successfully.");

            this._sOriginalSnapshot = JSON.stringify(oData);
            this._navigateBack();
        },

        onCancel: function () {
            var oSelectedModel = this.getView().getModel("selectedModel");
            var sCurrentSnapshot = JSON.stringify(oSelectedModel.getData());

            if (sCurrentSnapshot !== this._sOriginalSnapshot) {
                var that = this;
                MessageBox.confirm("You have unsaved changes. Are you sure you want to cancel?", {
                    title: "Discard changes",
                    actions: ["Yes, Cancel", "Continue Editing"],
                    emphasizedAction: "Continue Editing",
                    onClose: function (sAction) {
                        if (sAction === "Yes, Cancel") {
                            that._navigateBack();
                        }
                    }
                });
            } else {
                this._navigateBack();
            }
        },

        _navigateBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteModelsWithMe");
        },

        onAddPropulsionType: function () {
            MessageToast.show("Add Propulsion Type not implemented yet.");
        },

        onActiveToggle: function (oEvent) {
            var iSelectedIndex = oEvent.getParameter("selectedIndex");
            var sStatus = iSelectedIndex === 1 ? "INACTIVE" : "ACTIVE";
            var oSelectedModel = this.getView().getModel("selectedModel");
            oSelectedModel.setProperty("/Status", sStatus);
            oSelectedModel.setProperty("/ModelStatus", sStatus);
        }
    });
});