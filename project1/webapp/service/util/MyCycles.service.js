sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/BusyIndicator"
], function(BaseObject, JSONModel, Fragment, MessageToast, MessageBox, Filter, FilterOperator, BusyIndicator) {
    "use strict";

    var SERVICE_BASE = "/odata/v4/cycles";

    // Cycle Status values the backend accepts. Anything else in an import row is error data.
    var ALLOWED_CYCLE_STATUSES = ["Completed", "WorkInProgress", "Stopped"];

    /**
     * MyCycles service.
     *
     * Owns everything for the MyCycles view: view-state, backend/draft-protocol calls,
     * business rules, pagination math, dialog handling and Excel import. The controller
     * only forwards raw UI events here.
     */
    return BaseObject.extend("project1.service.util.MyCycles", {

        /**
         * @param {sap.ui.core.mvc.Controller} oController the owning controller
         */
        constructor: function(oController) {
            BaseObject.call(this);

            this._oController = oController;
            this._oView = oController.getView();

            // ---- main table view-state ----
            this._iPageSize = 10;
            this._iCurrentPage = 1;
            this._aAllCycles = [];
            this._aAllCyclesUnfiltered = null;
            this._oContextsById = {};
            this._oSelectedContext = null;
            this._oSelectedODataContext = null;

            // ---- import error log view-state ----
            this._iErrPageSize = 10;
            this._iErrCurrentPage = 1;
            this._aAllImportErrors = [];

            // ---- lazily loaded dialogs ----
            this._oNewCycleDialog = null;
            this._oImportLogDialog = null;
        },

        // ===================== lifecycle =====================

        /**
         * Called from controller onInit. Boots the xlsx loader, sets up the
         * "cycles" model, loads data and wires the click-away de-selection.
         */
        init: function() {
            var that = this;

            this._xlsxReady = new Promise(function(resolve, reject) {
                if (typeof XLSX !== "undefined") {
                    resolve();
                    return;
                }
                var oScript = document.createElement("script");
                oScript.src = sap.ui.require.toUrl("project1/thirdparty/xlsx.full.min.js");
                oScript.onload = function() { resolve(); };
                oScript.onerror = function() { reject(new Error("Failed to load xlsx.full.min.js")); };
                document.head.appendChild(oScript);
            });

            this._oView.setModel(new JSONModel({ Cycles: [] }), "cycles");

            this.reloadCycles();

            var oPage = this._byId("MyCycles");
            oPage.addEventDelegate({
                onclick: function(oEvent) {
                    var oTable = that._byId("tblCycles");
                    var sTargetId = oEvent.target.id;
                    if (sTargetId.includes("btnDelete") || sTargetId.includes("btnView") || sTargetId.includes("btnStopCycle")) {
                        return;
                    }
                    var bIsRowClick = oTable.getItems().some(function(row) {
                        return row.getDomRef().contains(oEvent.target);
                    });
                    if (!bIsRowClick) {
                        that._disableRowActions();
                        oTable.getItems().forEach(function(row) {
                            row.removeStyleClass("rowSelected");
                        });
                    }
                }
            });
        },

        destroy: function() {
            if (this._oNewCycleDialog) {
                this._oNewCycleDialog.destroy();
                this._oNewCycleDialog = null;
            }
            if (this._oImportLogDialog) {
                this._oImportLogDialog.destroy();
                this._oImportLogDialog = null;
            }
            BaseObject.prototype.destroy.apply(this, arguments);
        },

        // ===================== small view helpers =====================

        _byId: function(sId) {
            return this._oController.byId(sId);
        },

        _disableRowActions: function() {
            this._byId("btnDelete").setEnabled(false);
            this._byId("btnView").setEnabled(false);
            this._byId("btnStopCycle").setEnabled(false);
        },

        _clearSelection: function() {
            var oTable = this._byId("tblCycles");
            oTable.getItems().forEach(function(oRow) {
                oRow.removeStyleClass("rowSelected");
            });
            this._oSelectedContext = null;
            this._oSelectedODataContext = null;
            this._disableRowActions();
        },

        // ===================== search =====================

        toggleSearch: function() {
            var oSearchWrapper = this._byId("hboxSearchWrapper");
            var oSearchButton = this._byId("btnSearch");
            var bVisible = oSearchWrapper.getVisible();

            oSearchWrapper.setVisible(!bVisible);

            if (bVisible) {
                this._resetSearch();
            } else {
                this._byId("sfCreatorSearch").focus();
                oSearchButton.addStyleClass("pillButtonActive");
            }
        },

        closeSearch: function() {
            this._byId("hboxSearchWrapper").setVisible(false);
            this._resetSearch();
        },

        _resetSearch: function() {
            this._byId("sfCreatorSearch").setValue("");
            this._aAllCycles = this._aAllCyclesUnfiltered || this._aAllCycles;
            this._iCurrentPage = 1;
            this._updatePage();
            this._byId("btnSearch").removeStyleClass("pillButtonActive");
        },

        searchLiveChange: function(sQuery) {
            if (!this._aAllCyclesUnfiltered) {
                this._aAllCyclesUnfiltered = this._aAllCycles;
            }
            this._aAllCycles = this.searchByCreator(this._aAllCyclesUnfiltered, sQuery);
            this._iCurrentPage = 1;
            this._updatePage();
        },

        // ===================== row actions =====================

        deleteSelected: function() {
            var that = this;

            if (this._oSelectedODataContext) {
                BusyIndicator.show(0);
                this.deleteCycle(this._oSelectedODataContext).then(function() {
                    that._clearSelection();
                    return that.reloadCycles();
                }).then(function() {
                    BusyIndicator.hide();
                    MessageToast.show("Row deleted!");
                }).catch(function(oError) {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to delete cycle: " + oError.message);
                });
            } else {
                this._disableRowActions();
            }
        },

        viewSelected: function() {
            this._disableRowActions();

            if (this._oSelectedContext) {
                var oSelectedData = this._oSelectedContext.getObject();

                var oComponent = this._oController.getOwnerComponent();
                var oSelectedModel = oComponent.getModel("selectedCycle");

                if (!oSelectedModel) {
                    oSelectedModel = new JSONModel();
                    oComponent.setModel(oSelectedModel, "selectedCycle");
                }
                oSelectedModel.setData(oSelectedData);

                var oRouter = sap.ui.core.UIComponent.getRouterFor(this._oController);
                this._clearSelection();
                oRouter.navTo("RouteCycleModel");
            }
        },

        stopSelected: function() {
            var that = this;

            if (this._oSelectedODataContext) {
                BusyIndicator.show(0);
                this.updateCycle(this._oSelectedODataContext, { cycleStatus: "Stopped" }).then(function() {
                    that._clearSelection();
                    return that.reloadCycles();
                }).then(function() {
                    BusyIndicator.hide();
                    MessageToast.show("Cycle stopped!");
                }).catch(function(oError) {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to stop cycle: " + oError.message);
                });
            } else {
                this._disableRowActions();
            }
        },

        selectRow: function(oItem) {
            var oTable = this._byId("tblCycles");

            oTable.getItems().forEach(function(row) {
                row.removeStyleClass("rowSelected");
            });
            oItem.addStyleClass("rowSelected");

            this._oSelectedContext = oItem.getBindingContext("cycles");

            this._byId("btnDelete").setEnabled(true);
            this._byId("btnView").setEnabled(true);

            if (this._oSelectedContext) {
                var oSelectedData = this._oSelectedContext.getObject();
                this._oSelectedODataContext = this._oContextsById[oSelectedData.ID];
                this._byId("btnStopCycle").setEnabled(this.isCycleStoppable(oSelectedData));
            }
        },

        // ===================== pagination: main table =====================

        goToFirstPage: function() {
            this._iCurrentPage = 1;
            this._updatePage();
        },

        goToPreviousPage: function() {
            if (this._iCurrentPage > 1) {
                this._iCurrentPage--;
                this._updatePage();
            }
        },

        goToNextPage: function() {
            if (this._iCurrentPage < this.getTotalPages(this._aAllCycles, this._iPageSize)) {
                this._iCurrentPage++;
                this._updatePage();
            }
        },

        goToLastPage: function() {
            this._iCurrentPage = this.getTotalPages(this._aAllCycles, this._iPageSize);
            this._updatePage();
        },

        _updatePage: function() {
            var oResult = this.getPageSlice(this._aAllCycles, this._iCurrentPage, this._iPageSize);
            var iTotalPages = this.getTotalPages(this._aAllCycles, this._iPageSize);

            this._oView.getModel("cycles").setProperty("/Cycles", oResult.slice);
            this._byId("txtPaginationInfo").setText(oResult.from + " to " + oResult.to + " of " + oResult.total);

            this._byId("btnFirstPage").setEnabled(this._iCurrentPage > 1);
            this._byId("btnPreviousPage").setEnabled(this._iCurrentPage > 1);
            this._byId("btnNextPage").setEnabled(this._iCurrentPage < iTotalPages);
            this._byId("btnLastPage").setEnabled(this._iCurrentPage < iTotalPages);
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

        // ===================== pagination: import error log dialog =====================

        goToErrFirstPage: function() {
            this._iErrCurrentPage = 1;
            this._updateErrorPage();
        },

        goToErrPreviousPage: function() {
            if (this._iErrCurrentPage > 1) {
                this._iErrCurrentPage--;
                this._updateErrorPage();
            }
        },

        goToErrNextPage: function() {
            if (this._iErrCurrentPage < this.getErrTotalPages(this._aAllImportErrors, this._iErrPageSize)) {
                this._iErrCurrentPage++;
                this._updateErrorPage();
            }
        },

        goToErrLastPage: function() {
            this._iErrCurrentPage = this.getErrTotalPages(this._aAllImportErrors, this._iErrPageSize);
            this._updateErrorPage();
        },

        _updateErrorPage: function() {
            var oResult = this.getErrPageSlice(this._aAllImportErrors, this._iErrCurrentPage, this._iErrPageSize);
            var iTotalPages = this.getErrTotalPages(this._aAllImportErrors, this._iErrPageSize);

            this._oImportLogDialog.getModel("importLog").setProperty("/errors", oResult.slice);

            var sViewId = this._oView.getId();
            Fragment.byId(sViewId, "txtErrPaginationInfo").setText(oResult.from + " to " + oResult.to + " of " + oResult.total);

            Fragment.byId(sViewId, "btnErrFirstPage").setEnabled(this._iErrCurrentPage > 1);
            Fragment.byId(sViewId, "btnErrPreviousPage").setEnabled(this._iErrCurrentPage > 1);
            Fragment.byId(sViewId, "btnErrNextPage").setEnabled(this._iErrCurrentPage < iTotalPages);
            Fragment.byId(sViewId, "btnErrLastPage").setEnabled(this._iErrCurrentPage < iTotalPages);
        },

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
        },

        // ===================== data load =====================

        reloadCycles: function() {
            var that = this;
            var oODataModel = this._oController.getOwnerComponent().getModel();
            var oListBinding = oODataModel.bindList("/Cycles", null, [], [
                new Filter("IsActiveEntity", FilterOperator.EQ, true),
                // Only show rows that have not been soft-deleted (deleted = 0).
                new Filter("deleted", FilterOperator.EQ, 0)
            ]);

            return oListBinding.requestContexts(0, 10000).then(function(aContexts) {
                var aData = [];
                that._oContextsById = {};

                aContexts.forEach(function(oContext) {
                    var oObj = oContext.getObject();
                    aData.push(oObj);
                    that._oContextsById[oObj.ID] = oContext;
                });

                that._aAllCycles = aData;
                that._aAllCyclesUnfiltered = aData;
                that._iCurrentPage = 1;
                that._updatePage();
            }).catch(function(oError) {
                MessageBox.error("Failed to load cycles: " + oError.message);
            });
        },

        // ===================== new cycle dialog =====================

        openNewCycleDialog: function() {
            var that = this;

            if (!this._oNewCycleDialog) {
                Fragment.load({
                    id: this._oView.getId(),
                    name: "project1.view.NewCycleDialog",
                    controller: this._oController
                }).then(function(oDialog) {
                    that._oNewCycleDialog = oDialog;
                    that._oView.addDependent(that._oNewCycleDialog);
                    that._oNewCycleDialog.open();
                });
            } else {
                this._oNewCycleDialog.open();
            }
        },

        triggerImportFilePicker: function() {
            var oFileUploader = Fragment.byId(this._oView.getId(), "fuExcelImport");
            oFileUploader.$().find("input[type=file]").trigger("click");
        },

        closeNewCycleDialog: function() {
            this._oNewCycleDialog.close();
        },

        createFromLast: function() {
            var that = this;

            if (!this._aAllCycles || this._aAllCycles.length === 0) {
                MessageBox.warning("No existing cycle to clone from.");
                return;
            }

            var oLastCycle = this._aAllCycles[this._aAllCycles.length - 1];

            BusyIndicator.show(0);
            this.createCycle({
                creator: oLastCycle.creator,
                title: oLastCycle.title,
                cycleStatus: oLastCycle.cycleStatus,
                uploadStatus: oLastCycle.uploadStatus
            }).then(function() {
                that._oNewCycleDialog.close();
                return that.reloadCycles();
            }).then(function() {
                BusyIndicator.hide();
                MessageToast.show("Cycle created from last!");
            }).catch(function(oError) {
                BusyIndicator.hide();
                MessageBox.error("Failed to create cycle: " + oError.message);
            });
        },

        // ===================== Excel import =====================

        handleExcelFileSelected: function(oEvent) {
            var oFileUploader = oEvent.getSource();
            var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];

            if (!oFile) {
                return;
            }

            var that = this;

            this._xlsxReady.then(function() {
                var oReader = new FileReader();

                oReader.onload = function(e) {
                    try {
                        var data = new Uint8Array(e.target.result);
                        var oWorkbook = XLSX.read(data, { type: "array" });

                        var sFirstSheetName = oWorkbook.SheetNames[0];
                        var oSheet = oWorkbook.Sheets[sFirstSheetName];
                        var aRows = XLSX.utils.sheet_to_json(oSheet, { defval: "" });

                        if (!aRows.length) {
                            MessageBox.warning("The Excel file is empty or has no readable rows.");
                            return;
                        }

                        var oResult = that.validateImportRows(aRows);

                        if (oResult.errors.length > 0) {
                            that._showImportLog(oResult.errors);
                        } else {
                            BusyIndicator.show(0);
                            that.createCyclesFromRows(oResult.valid).then(function() {
                                that._oNewCycleDialog.close();
                                return that.reloadCycles();
                            }).then(function() {
                                BusyIndicator.hide();
                                MessageToast.show(oResult.valid.length + " cycle(s) imported successfully!");
                            }).catch(function(oError) {
                                BusyIndicator.hide();
                                MessageBox.error("Failed to import cycles: " + oError.message);
                            });
                        }

                    } catch (oError) {
                        MessageBox.error("Failed to read Excel file: " + oError.message);
                    }
                };

                oReader.readAsArrayBuffer(oFile);
                oFileUploader.clear();
            }).catch(function(oError) {
                MessageBox.error("Could not load Excel library: " + oError.message);
            });
        },

        _showImportLog: function(aErrorLogs) {
            var that = this;

            this._aAllImportErrors = aErrorLogs;
            this._iErrPageSize = 10;
            this._iErrCurrentPage = 1;

            var oLogModel = new JSONModel({
                initiatedBy: "Current User", // TODO: wire to actual logged-in user
                createdDate: new Date().toLocaleString(),
                errorCount: aErrorLogs.length,
                importStatus: "Failed",
                errors: []
            });

            if (!this._oImportLogDialog) {
                Fragment.load({
                    id: this._oView.getId(),
                    name: "project1.view.ImportLogDialog",
                    controller: this._oController
                }).then(function(oDialog) {
                    that._oImportLogDialog = oDialog;
                    that._oView.addDependent(that._oImportLogDialog);
                    that._oImportLogDialog.setModel(oLogModel, "importLog");
                    that._updateErrorPage();
                    that._oImportLogDialog.open();
                });
            } else {
                this._oImportLogDialog.setModel(oLogModel, "importLog");
                this._updateErrorPage();
                this._oImportLogDialog.open();
            }
        },

        closeImportLog: function() {
            this._oImportLogDialog.close();
        },

        // ===================== filtering & business rules =====================

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

        // ===================== backend: draft protocol (direct OData calls) =====================
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

        // ===================== backend: public CRUD operations =====================

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

                if (ALLOWED_CYCLE_STATUSES.indexOf(sCycleStatus) === -1) {
                    aErrorLogs.push({
                        Creator: sCreator,
                        Title: sTitle,
                        CycleStatus: sCycleStatus,
                        UploadStatus: sUploadStatus,
                        Reason: "Invalid Cycle Status \"" + sCycleStatus + "\". Allowed values: " + ALLOWED_CYCLE_STATUSES.join(", ") + "."
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
        }

    });
});
