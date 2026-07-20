sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function(Controller, JSONModel, Fragment, MessageToast, MessageBox) {
    "use strict";
    return Controller.extend("project1.controller.MyCycles", {

        onNavBack: function() {
            // Example navigation back
            window.history.go(-1);
        },

        onSearch: function() { sap.m.MessageToast.show("Search button clicked!"); },
        onNew: function() { sap.m.MessageToast.show("New button clicked!"); },

        onDelete: function() {
            if (this._oSelectedContext) {
                // Local index within the current page's slice (e.g. "/Cycles/3")
                var sPath = this._oSelectedContext.getPath();
                var aParts = sPath.split("/");
                var iLocalIndex = parseInt(aParts[aParts.length - 1], 10);

                // Convert to the index in the FULL dataset
                var iGlobalIndex = (this._iCurrentPage - 1) * this._iPageSize + iLocalIndex;

                // Remove from the full dataset, not the page slice
                this._aAllCycles.splice(iGlobalIndex, 1);

                // If we deleted the last item on the last page, step back a page
                var iTotalPages = this._getTotalPages();
                if (this._iCurrentPage > iTotalPages) {
                    this._iCurrentPage = iTotalPages;
                }

                this._oSelectedContext = null;
                this._updatePage();

                this._clearSelection();
                sap.m.MessageToast.show("Row deleted!");
            }

            // Disable again until another row is selected
            this.byId("btnDelete").setEnabled(false);
            this.byId("btnView").setEnabled(false);
            this.byId("btnStopCycle").setEnabled(false);
        },

        onView: function() {
            this.byId("btnDelete").setEnabled(false);
            this.byId("btnView").setEnabled(false);
            this.byId("btnStopCycle").setEnabled(false);

            if (this._oSelectedContext) {
                var oSelectedData = this._oSelectedContext.getObject();

                var oComponent = this.getOwnerComponent();
                var oSelectedModel = oComponent.getModel("selectedCycle");

                if (!oSelectedModel) {
                    oSelectedModel = new sap.ui.model.json.JSONModel();
                    oComponent.setModel(oSelectedModel, "selectedCycle");
                }
                oSelectedModel.setData(oSelectedData);

                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                this._clearSelection();
                oRouter.navTo("RouteCycleModel");
            }
        },

        onStopCycle: function() {
            if (this._oSelectedContext) {
                // Update the CycleStatus property of the selected row
                // (works directly on the page-slice context, which is fine since
                // the slice array elements are the SAME object references as in
                // _aAllCycles, so the underlying data stays in sync)
                this._oSelectedContext.getModel().setProperty(
                    this._oSelectedContext.getPath() + "/CycleStatus",
                    "Stopped"
                );

                this._clearSelection();
                sap.m.MessageToast.show("Cycle stopped!");
            }

            // Disable again until another row is selected
            this.byId("btnDelete").setEnabled(false);
            this.byId("btnView").setEnabled(false);
            this.byId("btnStopCycle").setEnabled(false);
        },

        onRowPress: function(oEvent) {
            var oItem = oEvent.getSource();

            // Reset all rows first
            var oTable = this.byId("tblCycles");
            oTable.getItems().forEach(function(row) {
                row.removeStyleClass("rowSelected");
            });

            // Highlight the clicked row
            oItem.addStyleClass("rowSelected");

            // Save the binding context of the selected row
            this._oSelectedContext = oItem.getBindingContext("cycles");

            // Enable the button
            this.byId("btnDelete").setEnabled(true);
            this.byId("btnView").setEnabled(true);

            if(this._oSelectedContext) {
                var oSelectedData = this._oSelectedContext.getObject();
                if (oSelectedData.CycleStatus === "WorkInProgress") {
                    this.byId("btnStopCycle").setEnabled(true);
                } else {
                    this.byId("btnStopCycle").setEnabled(false);
                }
            }
        },

        // ===================== Pagination (Main Table) =====================

        onFirstPage: function() {
            this._iCurrentPage = 1;
            this._updatePage();
        },

        onPreviousPage: function() {
            if (this._iCurrentPage > 1) {
                this._iCurrentPage--;
                this._updatePage();
            }
        },

        onNextPage: function() {
            var iTotalPages = this._getTotalPages();
            if (this._iCurrentPage < iTotalPages) {
                this._iCurrentPage++;
                this._updatePage();
            }
        },

        onLastPage: function() {
            this._iCurrentPage = this._getTotalPages();
            this._updatePage();
        },

        _getTotalPages: function() {
            return Math.max(1, Math.ceil(this._aAllCycles.length / this._iPageSize));
        },

        _updatePage: function() {
            var iTotal = this._aAllCycles.length;
            var iTotalPages = this._getTotalPages();
            var iStart = (this._iCurrentPage - 1) * this._iPageSize;
            var iEnd = Math.min(iStart + this._iPageSize, iTotal);
            var aPageData = this._aAllCycles.slice(iStart, iEnd);

            // Push the current page's slice into the table's model
            this.getView().getModel("cycles").setProperty("/Cycles", aPageData);

            // Update "X to Y of Z" text
            var iFrom = iTotal === 0 ? 0 : iStart + 1;
            this.byId("txtPaginationInfo").setText(iFrom + " to " + iEnd + " of " + iTotal);

            // Enable/disable nav buttons at the edges
            this.byId("btnFirstPage").setEnabled(this._iCurrentPage > 1);
            this.byId("btnPreviousPage").setEnabled(this._iCurrentPage > 1);
            this.byId("btnNextPage").setEnabled(this._iCurrentPage < iTotalPages);
            this.byId("btnLastPage").setEnabled(this._iCurrentPage < iTotalPages);
        },

        // ===================== Pagination (Import Error Log Dialog) =====================

        onErrFirstPage: function() {
            this._iErrCurrentPage = 1;
            this._updateErrorPage();
        },

        onErrPreviousPage: function() {
            if (this._iErrCurrentPage > 1) {
                this._iErrCurrentPage--;
                this._updateErrorPage();
            }
        },

        onErrNextPage: function() {
            var iTotalPages = this._getErrTotalPages();
            if (this._iErrCurrentPage < iTotalPages) {
                this._iErrCurrentPage++;
                this._updateErrorPage();
            }
        },

        onErrLastPage: function() {
            this._iErrCurrentPage = this._getErrTotalPages();
            this._updateErrorPage();
        },

        _getErrTotalPages: function() {
            return Math.max(1, Math.ceil(this._aAllImportErrors.length / this._iErrPageSize));
        },

        _updateErrorPage: function() {
            var iTotal = this._aAllImportErrors.length;
            var iTotalPages = this._getErrTotalPages();
            var iStart = (this._iErrCurrentPage - 1) * this._iErrPageSize;
            var iEnd = Math.min(iStart + this._iErrPageSize, iTotal);
            var aPageData = this._aAllImportErrors.slice(iStart, iEnd);

            // Push current page slice into the dialog's model
            this._oImportLogDialog.getModel("importLog").setProperty("/errors", aPageData);

            // Update "X to Y of Z" text
            var iFrom = iTotal === 0 ? 0 : iStart + 1;
            Fragment.byId(this.getView().getId(), "txtErrPaginationInfo").setText(iFrom + " to " + iEnd + " of " + iTotal);

            // Enable/disable nav buttons at the edges
            Fragment.byId(this.getView().getId(), "btnErrFirstPage").setEnabled(this._iErrCurrentPage > 1);
            Fragment.byId(this.getView().getId(), "btnErrPreviousPage").setEnabled(this._iErrCurrentPage > 1);
            Fragment.byId(this.getView().getId(), "btnErrNextPage").setEnabled(this._iErrCurrentPage < iTotalPages);
            Fragment.byId(this.getView().getId(), "btnErrLastPage").setEnabled(this._iErrCurrentPage < iTotalPages);
        },

        // ===================== Init =====================

        onInit: function() {
            // ---- Pagination setup ----
            this._iPageSize = 10;
            this._iCurrentPage = 1;

            if (typeof XLSX === "undefined") {
                var oScript = document.createElement("script");
                oScript.src = sap.ui.require.toUrl("project1/thirdparty/xlsx.full.min.js");
                document.head.appendChild(oScript);
            }

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

            var that = this;

            // The "cycles" model only ever holds the CURRENT page's slice
            var oCyclesModel = new JSONModel({ Cycles: [] });
            this.getView().setModel(oCyclesModel, "cycles");

            // Load your existing static file
            // NOTE: "webapp" is your project root and is NOT part of the resolved URL.
            // Adjust this path to match where cycles.json actually sits under webapp/.
            var sPath = sap.ui.require.toUrl("project1/model/cycles.json");
            oCyclesModel.loadData(sPath);

            oCyclesModel.attachRequestCompleted(function() {
                // Store the full dataset once it's loaded, THEN render the first page
                that._aAllCycles = oCyclesModel.getProperty("/Cycles");
                that._updatePage();
            });

            // ---- Existing outside-click deselect logic ----
            var oPage = this.byId("MyCycles");

            oPage.addEventDelegate({
                onclick: function(oEvent) {
                    var oTable = that.byId("tblCycles");

                    // Ignore clicks on the action buttons
                    var sTargetId = oEvent.target.id;
                    if (sTargetId.includes("btnDelete") || sTargetId.includes("btnView") || sTargetId.includes("btnStopCycle")) {
                        return; // let the button press handler run
                    }

                    var bIsRowClick = oTable.getItems().some(function(row) {
                        return row.getDomRef().contains(oEvent.target);
                    });

                    if (!bIsRowClick) {
                        // Disable buttons if click is outside table or on header
                        that.byId("btnDelete").setEnabled(false);
                        that.byId("btnView").setEnabled(false);
                        that.byId("btnStopCycle").setEnabled(false);

                        // Remove row highlight
                        oTable.getItems().forEach(function(row) {
                            row.removeStyleClass("rowSelected");
                        });
                    }
                }
            });
        },

        onNew: function() {
            var oView = this.getView();

            if (!this._oNewCycleDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "project1.view.NewCycleDialog",
                    controller: this
                }).then(function(oDialog) {
                    this._oNewCycleDialog = oDialog;
                    oView.addDependent(this._oNewCycleDialog);
                    this._oNewCycleDialog.open();
                }.bind(this));
            } else {
                this._oNewCycleDialog.open();
            }
        },

        onCreateWithImport: function() {
            // Don't close the dialog yet — open the native file picker instead
            var oFileUploader = sap.ui.core.Fragment.byId(this.getView().getId(), "fuExcelImport");
            oFileUploader.$().find("input[type=file]").trigger("click");
        },

        onCancelNewCycle: function() {
            this._oNewCycleDialog.close();
        },

        onExcelFileSelected: function(oEvent) {
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

                        var aValidCycles = [];
                        var aErrorLogs = [];

                        aRows.forEach(function(oRow) {
                        var sCreator = (oRow.Creator || "").toString().trim();
                        var sTitle = (oRow.Title || "").toString().trim();
                        var sCycleStatus = (oRow.CycleStatus || "").toString().trim();
                        var sUploadStatus = (oRow.UploadStatus || "").toString().trim();

                        var aMissingFields = [];
                        if (!sCreator) aMissingFields.push("Creator");
                        if (!sTitle) aMissingFields.push("Title");
                        if (!sCycleStatus) aMissingFields.push("Cycle Status");
                        if (!sUploadStatus) aMissingFields.push("Upload Status");

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

                        if (aErrorLogs.length > 0) {
                            that._showImportLog(aErrorLogs);
                        } else {
                            // No validation errors — proceed with import as before
                            that._aAllCycles = that._aAllCycles.concat(aValidCycles);
                            that._iCurrentPage = that._getTotalPages();
                            that._updatePage();

                            MessageToast.show(aValidCycles.length + " cycle(s) imported successfully!");
                            that._oNewCycleDialog.close();
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
            var oView = this.getView();
            var that = this;

            // Store full error list + pagination state separately from the dialog model
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
                    id: oView.getId(),
                    name: "project1.view.ImportLogDialog",
                    controller: this
                }).then(function(oDialog) {
                    that._oImportLogDialog = oDialog;
                    oView.addDependent(that._oImportLogDialog);
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

        onCloseImportLog: function() {
            this._oImportLogDialog.close();
        },

        onCreateFromLast: function() {
            this._oNewCycleDialog.close();
            MessageToast.show("Create cycle from last goes here");
            // TODO: clone the most recent cycle
        },

        _clearSelection: function () {
            var oTable = this.byId("tblCycles");

            // Remove highlight from all rows
            oTable.getItems().forEach(function (oRow) {
                oRow.removeStyleClass("rowSelected");
            });

            // Clear selected context
            this._oSelectedContext = null;

            // Disable action buttons
            this.byId("btnDelete").setEnabled(false);
            this.byId("btnView").setEnabled(false);
            this.byId("btnStopCycle").setEnabled(false);
        }
    });
});