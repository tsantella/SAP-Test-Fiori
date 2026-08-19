sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device"
], function (UIComponent, Device) {
    "use strict";

    function forceDesktop() {
        Device.system.phone = false;
        Device.system.tablet = false;
        Device.system.combi = false;
        Device.system.desktop = true;
    }

    return UIComponent.extend("project1.Component", {
        metadata: {
            manifest: "json",
            interfaces: ["sap.ui.core.IAsyncContentCreation"]
        },

        init: function () {
            forceDesktop();

            Device.resize.attachHandler(forceDesktop);

            UIComponent.prototype.init.apply(this, arguments);
        }
    });
});