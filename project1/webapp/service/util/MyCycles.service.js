sap.ui.define([], function() {
    "use strict";

    return {

        // ===================== Cycles: index & pagination =====================

        /**
         * Converts a local page-slice binding path (e.g. "/Cycles/3") into the
         * index within the full dataset.
         */
        getGlobalIndex: function(sPath, iCurrentPage, iPageSize) {
            var aParts = sPath.split("/");
            var iLocalIndex = parseInt(aParts[aParts.length - 1], 10);
            return (iCurrentPage - 1) * iPageSize + iLocalIndex;
        },

        /**
         * Removes an item from the full dataset by global index.
         * Returns the updated array.
         */
        deleteCycle: function(aAllCycles, iGlobalIndex) {
            aAllCycles.splice(iGlobalIndex, 1);
            return aAllCycles;
        },

        /**
         * Filters cycles by Creator only, live as-you-type.
         */
        searchByCreator: function(aAllCycles, sQuery) {
            if (!sQuery) {
                return aAllCycles;
            }
            var sLower = sQuery.toLowerCase();
            return aAllCycles.filter(function(oCycle) {
                return (oCycle.creator || "").toLowerCase().includes(sLower);
            });
        },

        getTotalPages: function(aAllCycles, iPageSize) {
            return Math.max(1, Math.ceil(aAllCycles.length / iPageSize));
        },

        /**
         * Returns the current page's slice plus display info for pagination text.
         */
        getPageSlice: function(aAllCycles, iCurrentPage, iPageSize) {
            var iTotal = aAllCycles.length;
            var iStart = (iCurrentPage - 1) * iPageSize;
            var iEnd = Math.min(iStart + iPageSize, iTotal);
            return {
                slice: aAllCycles.slice(iStart, iEnd),
                from: iTotal === 0 ? 0 : iStart + 1,
                to: iEnd,
                total: iTotal
            };
        },

        /**
         * Clamps the current page back within range after a deletion
         * (e.g. deleting the last item on the last page).
         */
        clampPage: function(iCurrentPage, iTotalPages) {
            return iCurrentPage > iTotalPages ? iTotalPages : iCurrentPage;
        },

        // ===================== Cycles: row state =====================

        /**
         * Business rule: a cycle can only be "stopped" while WorkInProgress.
         */
        isCycleStoppable: function(oCycleData) {
            return !!oCycleData && oCycleData.cycleStatus === "WorkInProgress";
        },

        // ===================== Excel import validation =====================

        /**
         * Validates imported Excel rows, splitting into valid cycles vs. error logs.
         */
        validateImportRows: function(aRows) {
            var aValidCycles = [];
            var aErrorLogs = [];

            aRows.forEach(function(oRow) {
                var sCreator = (oRow.Creator || "").toString().trim();
                var sTitle = (oRow.Title || "").toString().trim();
                var sCycleStatus = (oRow.CycleStatus || "").toString().trim();
                var sUploadStatus = (oRow.UploadStatus || "").toString().trim();

                var aMissingFields = [];
                if (!sCreator) { aMissingFields.push("Creator"); }
                if (!sTitle) { aMissingFields.push("Title"); }
                if (!sCycleStatus) { aMissingFields.push("Cycle Status"); }
                if (!sUploadStatus) { aMissingFields.push("Upload Status"); }

                if (aMissingFields.length > 0) {
                    aErrorLogs.push({
                        Creator: sCreator,
                        Title: sTitle,
                        CycleStatus: sCycleStatus,
                        UploadStatus: sUploadStatus,
                        Reason: "Missing required field(s): " + aMissingFields.join(", ") + "."
                    });
                    return;
                }

                aValidCycles.push({
                    Creator: sCreator,
                    Title: sTitle,
                    CycleStatus: sCycleStatus,
                    UploadStatus: sUploadStatus
                });
            });

            return { valid: aValidCycles, errors: aErrorLogs };
        },

        /**
         * Merges newly imported valid cycles into the full dataset.
         */
        mergeImportedCycles: function(aAllCycles, aValidCycles) {
            return aAllCycles.concat(aValidCycles);
        },

        // ===================== Import error log pagination =====================

        getErrTotalPages: function(aAllImportErrors, iErrPageSize) {
            return Math.max(1, Math.ceil(aAllImportErrors.length / iErrPageSize));
        },

        getErrPageSlice: function(aAllImportErrors, iErrCurrentPage, iErrPageSize) {
            var iTotal = aAllImportErrors.length;
            var iStart = (iErrCurrentPage - 1) * iErrPageSize;
            var iEnd = Math.min(iStart + iErrPageSize, iTotal);
            return {
                slice: aAllImportErrors.slice(iStart, iEnd),
                from: iTotal === 0 ? 0 : iStart + 1,
                to: iEnd,
                total: iTotal
            };
        }

    };
});