sap.ui.define([
    "sap/ui/core/library"
], function(coreLibrary) {
    "use strict";

    var ValueState = coreLibrary.ValueState;

    return {

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

    };
});