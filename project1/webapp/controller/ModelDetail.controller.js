sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
            "sap/ui/core/EventBus",
            "sap/ui/core/BusyIndicator"
], function (Controller, JSONModel, MessageToast, MessageBox, EventBus, BusyIndicator) {
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
            var oODataModel = this.getOwnerComponent().getModel();
            var oPayload = this._toODataPayload(oData);
            var that = this;

            BusyIndicator.show(0);

            this._saveModel(oODataModel, oData, sMode, oPayload).then(function () {
                EventBus.getInstance().publish("app", "modelSaved", {
                    mode: sMode,
                    originalKey: oData.ID,
                    record: oData
                });

                MessageToast.show(sMode === "new" ? "Record created successfully." : "Changes saved successfully.");
                that._sOriginalSnapshot = JSON.stringify(oData);
                that._navigateBack();
            }).catch(function (oError) {
                MessageBox.error("Failed to save model: " + that._getErrorMessage(oError));
            }).finally(function () {
                BusyIndicator.hide();
            });
        },

        _saveModel: function (oODataModel, oData, sMode, oPayload) {
            var oContext;

            if (sMode === "new") {
                oContext = oODataModel.bindList("/Models").create(oPayload);
                return oODataModel.submitBatch("$auto").then(function () {
                    return oContext.created();
                });
            }

            if (!oData._odataPath) {
                return Promise.reject(new Error("The selected model has no database key."));
            }

            oContext = oODataModel.bindContext(oData._odataPath).getBoundContext();
            Object.keys(oPayload).forEach(function (sProperty) {
                oContext.setProperty(sProperty, oPayload[sProperty]);
            });

            return oODataModel.submitBatch("$auto");
        },

        _toODataPayload: function (oData) {
            var sStatus = oData.IsActiveIndex === 1 ? "INACTIVE" : "ACTIVE";

            return {
                modelStatus: sStatus,
                modelStatus: sStatus,
                oeGroupNr: oData.OEGroupNr || "",
                oeGroup: oData.OEGroup || "",
                brandNr: oData.BrandNr || "",
                brand: oData.Brand || "",
                subGroup: oData.SubGroup || "",
                region: oData.Region || "",
                country: oData.Country || "",
                modelVersion: oData.ModelVersion || "",
                model: oData.Model || "",
                propulsionType: oData.PropulsionType || "",
                developmentCode: oData.DevelopmentCode || "",
                platformNr: oData.PlatformNr || "",
                platform: oData.Platform || "",
                vehicleSegment: oData.VehicleSegment || "",
                sop: this._toDateValue(oData.SOP),
                eop: this._toDateValue(oData.EOP),
                deleted: 0
            };
        },

        _toDateValue: function (vDate) {
            if (!vDate) {
                return null;
            }

            if (typeof vDate === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(vDate)) {
                return vDate;
            }

            var oDate = vDate instanceof Date ? vDate : new Date(vDate);
            if (isNaN(oDate.getTime())) {
                return null;
            }

            return oDate.toISOString().slice(0, 10);
        },

        _getErrorMessage: function (oError) {
            if (oError && oError.cause && oError.cause.message) {
                return oError.cause.message;
            }
            return oError && oError.message ? oError.message : "Unknown database error";
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