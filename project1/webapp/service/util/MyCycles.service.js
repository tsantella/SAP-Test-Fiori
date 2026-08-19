sap.ui.define([], function() {
    "use strict";

    var SERVICE_BASE = "/odata/v4/cycles";

    return {

        // ===================== Cycles: pagination =====================

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

        // ===================== Cycles: filtering & business rules =====================

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

        /**
         * Business rule: a cycle can only be "stopped" while WorkInProgress.
         */
        isCycleStoppable: function(oCycleData) {
            return !!oCycleData && oCycleData.cycleStatus === "WorkInProgress";
        },

        // ===================== Backend: draft protocol (direct OData calls) =====================
        // Called via fetch() instead of the ODataModel's bindContext/action API, since UI5 v4
        // caches context objects by path and got confused chaining draftEdit -> draftActivate
        // through the model layer.

        _discardDraft: function(oActiveContext) {
            var sActivePath = oActiveContext.getPath(); // '/Cycles(ID=...,IsActiveEntity=true)'
            var sDraftPath = sActivePath.replace("IsActiveEntity=true", "IsActiveEntity=false");
            var sUrl = SERVICE_BASE + sDraftPath;

            return fetch(sUrl, { method: "DELETE" })
                .then(function(oResponse) {
                    // 404 just means no draft existed - that's fine, treat as success
                    return oResponse.status;
                })
                .catch(function() {
                    // network hiccup on a best-effort cleanup call - safe to ignore
                    return null;
                });
        },

        _startEdit: function(oActiveContext) {
            var sActivePath = oActiveContext.getPath();
            var sUrl = SERVICE_BASE + sActivePath + "/CyclesService.draftEdit";

            return fetch(sUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ PreserveChanges: true })
            }).then(function(oResponse) {
                if (!oResponse.ok) {
                    throw new Error("draftEdit failed: " + oResponse.status);
                }
                return oResponse.json();
            }).then(function(oDraftEntity) {
                return "/Cycles(ID=" + oDraftEntity.ID + ",IsActiveEntity=false)";
            });
        },

        _patchDraft: function(sDraftPath, oChanges) {
            var sUrl = SERVICE_BASE + sDraftPath;

            return fetch(sUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oChanges)
            }).then(function(oResponse) {
                if (!oResponse.ok) {
                    throw new Error("Patch failed: " + oResponse.status);
                }
            });
        },

        _activateDraft: function(sDraftPath) {
            var sUrl = SERVICE_BASE + sDraftPath + "/CyclesService.draftActivate";

            return fetch(sUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            }).then(function(oResponse) {
                if (!oResponse.ok) {
                    throw new Error("draftActivate failed: " + oResponse.status);
                }
            });
        },

        // ===================== Backend: public CRUD operations =====================

        /**
         * Deletes the active (non-draft) entity directly.
         * oODataContext must be a real sap.ui.model.odata.v4.Context for the active entity.
         */
        deleteCycle: function(oODataContext) {
            return oODataContext.delete();
        },

        /**
         * Full draft cycle to update a field on an existing entity:
         * discard any leftover draft -> start edit -> patch -> activate.
         */
        updateCycle: function(oActiveContext, oChanges) {
            var that = this;

            return this._discardDraft(oActiveContext).then(function() {
                return that._startEdit(oActiveContext);
            }).then(function(sDraftPath) {
                return that._patchDraft(sDraftPath, oChanges).then(function() {
                    return that._activateDraft(sDraftPath);
                });
            });
        },

        /**
         * Creates a new Cycle (draft create) and immediately activates it.
         */
        createCycle: function(oData) {
            var that = this;
            var sUrl = SERVICE_BASE + "/Cycles";

            return fetch(sUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oData)
            }).then(function(oResponse) {
                if (!oResponse.ok) {
                    throw new Error("Create failed: " + oResponse.status);
                }
                return oResponse.json();
            }).then(function(oDraftEntity) {
                var sDraftPath = "/Cycles(ID=" + oDraftEntity.ID + ",IsActiveEntity=false)";
                return that._activateDraft(sDraftPath);
            });
        },

        /**
         * Creates multiple cycles one at a time (sequential, not parallel - avoids
         * hammering the backend with N simultaneous draft-create-then-activate chains,
         * and keeps errors easy to attribute to a row).
         * Expects rows shaped like the Excel import output: { Creator, Title, CycleStatus, UploadStatus }.
         */
        createCyclesFromRows: function(aRows) {
            var that = this;
            return aRows.reduce(function(oChain, oRow) {
                return oChain.then(function() {
                    return that.createCycle({
                        creator: oRow.Creator,
                        title: oRow.Title,
                        cycleStatus: oRow.CycleStatus,
                        uploadStatus: oRow.UploadStatus
                    });
                });
            }, Promise.resolve());
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