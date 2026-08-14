sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "project1/service/util/MyCycles.service"
], function(Controller, JSONModel, Fragment, MessageToast, MessageBox, MyCyclesService) {
    "use strict";
    return Controller.extend("project1.controller.MyCycles", {

        onNavBack: function() {
            // Example navigation back
            // window.history.go(-1);
        },

        onSearch: function() {
            var oSearchWrapper = this.byId("hboxSearchWrapper");
            var oSearchButton = this.byId("btnSearch");
            var bVisible = oSearchWrapper.getVisible();

            oSearchWrapper.setVisible(!bVisible);

            if (bVisible) {
                this._resetSearch();
            } else {
                this.byId("sfCreatorSearch").focus();
                oSearchButton.addStyleClass("pillButtonActive");
            }
        },

        onCloseSearch: function() {
            this.byId("hboxSearchWrapper").setVisible(false);
            this._resetSearch();
        },

        _resetSearch: function() {
            this.byId("sfCreatorSearch").setValue("");
            this._aAllCycles = this._aAllCyclesUnfiltered || this._aAllCycles;
            this._iCurrentPage = 1;
            this._updatePage();
            this.byId("btnSearch").removeStyleClass("pillButtonActive");
        },

        onSearchLiveChange: function(oEvent) {
            var sQuery = oEvent.getParameter("newValue");

            if (!this._aAllCyclesUnfiltered) {
                this._aAllCyclesUnfiltered = this._aAllCycles;
            }

            this._aAllCycles = MyCyclesService.searchByCreator(this._aAllCyclesUnfiltered, sQuery);
            this._iCurrentPage = 1;
            this._updatePage();
        },

        // ===================== Row actions =====================

        onDelete: function() {
            if (this._oSelectedContext) {
                var sPath = this._oSelectedContext.getPath();
                var iGlobalIndex = MyCyclesService.getGlobalIndex(sPath, this._iCurrentPage, this._iPageSize);

                this._aAllCycles = MyCyclesService.deleteCycle(this._aAllCycles, iGlobalIndex);

                var iTotalPages = MyCyclesService.getTotalPages(this._aAllCycles, this._iPageSize);
                this._iCurrentPage = MyCyclesService.clampPage(this._iCurrentPage, iTotalPages);

                this._oSelectedContext = null;
                this._updatePage();

                this._clearSelection();
                MessageToast.show("Row deleted!");
            }

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
                    oSelectedModel = new JSONModel();
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
                this._oSelectedContext.getModel().setProperty(
                    this._oSelectedContext.getPath() + "/CycleStatus",
                    "Stopped"
                );

                this._clearSelection();
                MessageToast.show("Cycle stopped!");
            }

            this.byId("btnDelete").setEnabled(false);
            this.byId("btnView").setEnabled(false);
            this.byId("btnStopCycle").setEnabled(false);
        },

        onRowPress: function(oEvent) {
            var oItem = oEvent.getSource();

            var oTable = this.byId("tblCycles");
            oTable.getItems().forEach(function(row) {
                row.removeStyleClass("rowSelected");
            });

            oItem.addStyleClass("rowSelected");

            this._oSelectedContext = oItem.getBindingContext("cycles");

            this.byId("btnDelete").setEnabled(true);
            this.byId("btnView").setEnabled(true);

            if (this._oSelectedContext) {
                var oSelectedData = this._oSelectedContext.getObject();
                this.byId("btnStopCycle").setEnabled(MyCyclesService.isCycleStoppable(oSelectedData));
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
            var iTotalPages = MyCyclesService.getTotalPages(this._aAllCycles, this._iPageSize);
            if (this._iCurrentPage < iTotalPages) {
                this._iCurrentPage++;
                this._updatePage();
            }
        },

        onLastPage: function() {
            this._iCurrentPage = MyCyclesService.getTotalPages(this._aAllCycles, this._iPageSize);
            this._updatePage();
        },

        _updatePage: function() {
            var oResult = MyCyclesService.getPageSlice(this._aAllCycles, this._iCurrentPage, this._iPageSize);
            var iTotalPages = MyCyclesService.getTotalPages(this._aAllCycles, this._iPageSize);

            this.getView().getModel("cycles").setProperty("/Cycles", oResult.slice);
            this.byId("txtPaginationInfo").setText(oResult.from + " to " + oResult.to + " of " + oResult.total);

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
            var iTotalPages = MyCyclesService.getErrTotalPages(this._aAllImportErrors, this._iErrPageSize);
            if (this._iErrCurrentPage < iTotalPages) {
                this._iErrCurrentPage++;
                this._updateErrorPage();
            }
        },

        onErrLastPage: function() {
            this._iErrCurrentPage = MyCyclesService.getErrTotalPages(this._aAllImportErrors, this._iErrPageSize);
            this._updateErrorPage();
        },

        _updateErrorPage: function() {
            var oResult = MyCyclesService.getErrPageSlice(this._aAllImportErrors, this._iErrCurrentPage, this._iErrPageSize);
            var iTotalPages = MyCyclesService.getErrTotalPages(this._aAllImportErrors, this._iErrPageSize);

            this._oImportLogDialog.getModel("importLog").setProperty("/errors", oResult.slice);

            var sViewId = this.getView().getId();
            Fragment.byId(sViewId, "txtErrPaginationInfo").setText(oResult.from + " to " + oResult.to + " of " + oResult.total);

            Fragment.byId(sViewId, "btnErrFirstPage").setEnabled(this._iErrCurrentPage > 1);
            Fragment.byId(sViewId, "btnErrPreviousPage").setEnabled(this._iErrCurrentPage > 1);
            Fragment.byId(sViewId, "btnErrNextPage").setEnabled(this._iErrCurrentPage < iTotalPages);
            Fragment.byId(sViewId, "btnErrLastPage").setEnabled(this._iErrCurrentPage < iTotalPages);
        },

        // ===================== Init =====================

        onInit: function() {
            this._iPageSize = 10;
            this._iCurrentPage = 1;

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

            var oCyclesModel = new JSONModel({ Cycles: [] });
            this.getView().setModel(oCyclesModel, "cycles");

            var sPath = sap.ui.require.toUrl("project1/model/cycles.json");
            oCyclesModel.loadData(sPath);

            oCyclesModel.attachRequestCompleted(function() {
                that._aAllCycles = oCyclesModel.getProperty("/Cycles");
                that._aAllCyclesUnfiltered = that._aAllCycles;
                that._updatePage();
            });

            var oPage = this.byId("MyCycles");

            oPage.addEventDelegate({
                onclick: function(oEvent) {
                    var oTable = that.byId("tblCycles");

                    var sTargetId = oEvent.target.id;
                    if (sTargetId.includes("btnDelete") || sTargetId.includes("btnView") || sTargetId.includes("btnStopCycle")) {
                        return;
                    }

                    var bIsRowClick = oTable.getItems().some(function(row) {
                        return row.getDomRef().contains(oEvent.target);
                    });

                    if (!bIsRowClick) {
                        that.byId("btnDelete").setEnabled(false);
                        that.byId("btnView").setEnabled(false);
                        that.byId("btnStopCycle").setEnabled(false);

                        oTable.getItems().forEach(function(row) {
                            row.removeStyleClass("rowSelected");
                        });
                    }
                }
            });
        },

        // ===================== New Cycle dialog =====================

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
            var oFileUploader = Fragment.byId(this.getView().getId(), "fuExcelImport");
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

                        var oResult = MyCyclesService.validateImportRows(aRows);

                        if (oResult.errors.length > 0) {
                            that._showImportLog(oResult.errors);
                        } else {
                            that._aAllCycles = MyCyclesService.mergeImportedCycles(that._aAllCycles, oResult.valid);
                            that._iCurrentPage = MyCyclesService.getTotalPages(that._aAllCycles, that._iPageSize);
                            that._updatePage();

                            MessageToast.show(oResult.valid.length + " cycle(s) imported successfully!");
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

        _clearSelection: function() {
            var oTable = this.byId("tblCycles");

            oTable.getItems().forEach(function(oRow) {
                oRow.removeStyleClass("rowSelected");
            });

            this._oSelectedContext = null;

            this.byId("btnDelete").setEnabled(false);
            this.byId("btnView").setEnabled(false);
            this.byId("btnStopCycle").setEnabled(false);
        }
    });
});