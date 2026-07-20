sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "project1/model/models"
], (UIComponent, JSONModel, models) => {
    "use strict";

    return UIComponent.extend("project1.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // Load sample JSON data
            var oModel = new JSONModel(sap.ui.require.toUrl("project1/model/cycles.json"));
            this.setModel(oModel, "cycles");

            // enable routing
            this.getRouter().initialize();
        }
    });
});