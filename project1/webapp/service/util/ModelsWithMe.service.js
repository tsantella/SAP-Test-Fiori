sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/EventBus",
    "sap/ui/core/BusyIndicator"
], function (BaseObject, JSONModel, Fragment, MessageToast, MessageBox, EventBus, BusyIndicator) {
    "use strict";

    /**
     * ModelsWithMe service.
     *
     * Owns everything for the Models with me view: view-state, data loading,
     * business rules, pagination math, search, and the Edit/New/View detail
     * hand-off. The controller only forwards raw UI events here.
     */
    return BaseObject.extend("project1.service.util.ModelsWithMe", {

        /**
         * @param {sap.ui.core.mvc.Controller} oController the owning controller
         */
        constructor: function (oController) {
            BaseObject.call(this);

            this._oController = oController;
            this._oView = oController.getView();

            this._iPageSize = 10;
            this._iCurrentPage = 1;
            this._aAllModels = [];
            this._aFilteredModels = [];
            this._oSelectedContext = null;
            this._oSelectedODataContext = null;
            this._oContextsById = {};
            this._oImportDialog = null;
        },

        // ===================== lifecycle =====================

        // Called from controller onInit. Sets up pagination state, loads the
        // model data, loads the defaults the Edit/New/View detail screen needs,
        // and wires up the "click outside the table" deselect + double-click-to-
        // view behavior.
        init: function () {
            var oModelsModel = new JSONModel({ Models: [] });
            this._oView.setModel(oModelsModel, "models");

            this.reloadModels();

            

            // Loads the static defaults the Edit/New/View detail screen needs (a
            // blank model template, mock budget rows, the year range, and the
            // default status) from modeldetail.json. onEdit/onNew/the double-click
            // handler all wait on this promise before opening the detail screen,
            // so those defaults are guaranteed to be ready by the time it needs them.
            this._pDefaultsLoaded = new Promise((resolve) => {
                var oDefaultsModel = new JSONModel();
                var sDefaultsPath = sap.ui.require.toUrl("project1/model/modeldetail.json");
                oDefaultsModel.loadData(sDefaultsPath);
                oDefaultsModel.attachRequestCompleted(() => {
                    this._oBlankModelTemplate = oDefaultsModel.getProperty("/BlankModel") || {};
                    this._aMockBudgetRows = oDefaultsModel.getProperty("/MockBudgetRows") || [];
                    this._aYears = oDefaultsModel.getProperty("/Years") || [];
                    this._sDefaultStatus = oDefaultsModel.getProperty("/DefaultStatus") || "";
                    resolve();
                });
            });

            // Listen for saves coming back from the detail (Edit/New) screen
            EventBus.getInstance().subscribe("app", "modelSaved", this._onModelSaved, this);

            // Click outside the table deselects the current row; double-click
            // opens the record for viewing (read-only)
            var oPage = this._byId("ModelsWithMe");
            oPage.addEventDelegate({
                onclick: (oEvent) => {
                    var oTable = this._byId("tblModels");
                    var sTargetId = oEvent.target.id;

                    if (sTargetId.includes("btnModelsEdit") || sTargetId.includes("btnModelsDelete")) {
                        return; // exit early with no value - let the Edit/Delete button's own press handler run instead of deselecting
                    }

                    // True if the click landed inside one of the table's rows;
                    // used right below to decide whether to clear the selection.
                    var bIsRowClick = oTable.getItems().some((row) => {
                        return row.getDomRef() && row.getDomRef().contains(oEvent.target);
                    });

                    if (!bIsRowClick) {
                        this._clearSelection();
                    }
                },

                // Double-click ONLY opens the record for viewing (read-only)
                ondblclick: (oEvent) => {
                    var oTable = this._byId("tblModels");

                    var bIsRowClick = oTable.getItems().some((row) => {
                        return row.getDomRef() && row.getDomRef().contains(oEvent.target)
                    });

                    if (bIsRowClick) {
                        this._pDefaultsLoaded.then(() => {
                            this._openModelDetail("view");
                        });
                    }
                }
            });

            // Auto-collapse the search field back into the Search button once it
            // loses focus, but only if it's empty - if there's still a query typed,
            // keep it open so the filtered results stay visible.
            var oSearchField = this._byId("sfModelsSearch");
            oSearchField.addEventDelegate({
                onsapfocusleave: () => {
                    if (!oSearchField.getValue()) {
                        this._byId("btnModelsSearch").setVisible(true);
                        oSearchField.setVisible(false);
                    }
                }
            });
        },


        // Unsubscribes from the EventBus when this view is destroyed, so a stale
        // listener doesn't linger and fire after the controller is gone.
        destroy: function () {
            EventBus.getInstance().unsubscribe("app", "modelSaved", this._onModelSaved, this);
            if (this._oImportDialog) {
                this._oImportDialog.destroy();
                this._oImportDialog = null;
            }
            BaseObject.prototype.destroy.apply(this, arguments);
        },

        // Loads the full Models dataset live from the CAP/OData service, replacing
        // the old static modelsWithMe.json read. Stores the full dataset, initializes
        // the filtered working set to match it (no search applied yet), rebuilds the
        // Edit/New dropdown options, and renders the first page - same as the old
        // loadData() completion handler did.
        reloadModels: function () {
            var that = this;
            var oODataModel = this._oController.getOwnerComponent().getModel();
            var oListBinding = oODataModel.bindList("/Models");

            return oListBinding.requestContexts(0, 10000).then(function (aContexts) {
                that._oContextsById = {};
                var aData = aContexts.map(function (oContext) {
                    var oObj = oContext.getObject();
                    that._oContextsById[oObj.ID] = oContext;
                    return oObj;
                });

                that._aAllModels = aData;
                that._aFilteredModels = aData.slice();
                that._iCurrentPage = 1;
                that._updatePage();
                that._rebuildDropdownOptions();
            }).catch(function (oError) {
                MessageBox.error("Failed to load models: " + oError.message);
            });
        },

        // ===================== small view helpers =====================

        _byId: function (sId) {
            return this._oController.byId(sId);
        },

        // Fires when a table row is clicked (bound via press="onRowPress" in the view).
        // Highlights the clicked row and enables the Edit/Delete buttons.
        selectRow: function (oEvent) {
            var oItem = oEvent.getSource();
            var oTable = this._byId("tblModels");

            oTable.getItems().forEach(function (row) {
                row.removeStyleClass("rowSelected");
            });
            oItem.addStyleClass("rowSelected");

            this._oSelectedContext = oItem.getBindingContext("models");

            this._byId("btnModelsEdit").setEnabled(true);
            this._byId("btnModelsDelete").setEnabled(true);

            if (this._oSelectedContext) {
                var oSelectedData = this._oSelectedContext.getObject();
                this._oSelectedODataContext = this._oContextsById[oSelectedData.ID];
            }
        },

        // Undoes selectRow: removes the highlight from every row and disables
        // Edit/Delete again. Called when the user clicks outside the table.
        _clearSelection: function () {
            var oTable = this._byId("tblModels");
            oTable.getItems().forEach(function (row) {
                row.removeStyleClass("rowSelected");
            });
            this._oSelectedContext = null;
            this._oSelectedODataContext = null;
            this._byId("btnModelsEdit").setEnabled(false);
            this._byId("btnModelsDelete").setEnabled(false);
        },

        // ===================== Search =====================

        // Fires when the Search button is pressed. Swaps the button out for the
        // SearchField (only one is visible at a time). Opening focuses the field
        // so the user can type right away; closing clears whatever was typed and
        // resets the table back to showing everything.
        toggleSearch: function () {
            var oSearchField = this._byId("sfModelsSearch");
            var oSearchButton = this._byId("btnModelsSearch");
            var bVisible = !oSearchField.getVisible();

            oSearchField.setVisible(bVisible);
            oSearchButton.setVisible(!bVisible);

            if (bVisible) {
                // setVisible() doesn't update the DOM synchronously - UI5 batches
                // rendering - so focusing immediately would target a not-yet-visible
                // element and silently fail. Deferring with setTimeout(0) runs this
                // right after the pending render completes.
                setTimeout(() => oSearchField.focus(), 0);
            } else {
                oSearchField.setValue("");
                this._applySearchFilter("");
            }
        },

        // Fires on every keystroke in the search field (bound via liveChange in
        // the view - not "search", which would only fire on Enter). Reads what's
        // currently typed and re-filters the table from it.
        searchLiveChange: function (sQuery) {
            this._applySearchFilter(sQuery);
        },

        // Returns the subset of _aAllModels matching the query - case-insensitive
        // substring match, checked across every column via Object.keys(oModel) so
        // it stays in sync automatically if fields are ever added/removed from the
        // JSON. Pure function (doesn't touch _aFilteredModels/page/table itself) so
        // live search, delete, and save can all reuse the same matching logic.
        _getFilteredModels: function (sQuery) {
            var sQueryLower = (sQuery || "").trim().toLowerCase();

            if (!sQueryLower) {
                return this._aAllModels.slice();
            }

            return this._aAllModels.filter(function (oModel) {
                return Object.keys(oModel).some(function (sKey) {
                    var vValue = oModel[sKey];
                    return vValue !== null && vValue !== undefined &&
                        String(vValue).toLowerCase().indexOf(sQueryLower) !== -1;
                });
            });
        },

        // Rebuilds _aFilteredModels from the query, always resetting back to page 1
        // and re-rendering - used for live search, where jumping to page 1 on every
        // keystroke is the expected behavior (unlike delete/save, which preserve the
        // current page - see _deleteSelectedModel/_onModelSaved).
        _applySearchFilter: function (sQuery) {
            this._aFilteredModels = this._getFilteredModels(sQuery);
            this._iCurrentPage = 1;
            this._updatePage();
        },

        // ===================== Edit / New / View (detail screen) =====================

        // Opens the detail screen in edit mode for the selected row, once the
        // detail screen's defaults (blank template, budget rows, years) are loaded.
        openEdit: function () {
            if (this._oSelectedContext) {
                this._pDefaultsLoaded.then(() => {
                    this._openModelDetail("edit");
                });
            }
        },

        // Opens the detail screen in "create new" mode - clears any current
        // selection first, since a new record isn't tied to an existing row.
        openNew: function () {
            this._oSelectedContext = null;
            this._pDefaultsLoaded.then(() => {
                this._openModelDetail("new");
            });
        },

        // Builds the record to show on the detail screen (blank for "new", a deep
        // copy of the selected row plus mock budget rows otherwise), stashes it on
        // a shared "selectedModel" Component model, and navigates to the detail
        // route. sMode ("view"/"edit"/"new") travels along on the record itself so
        // the detail screen knows which mode to render in.
        _openModelDetail: function (sMode) {
            var oSelectedData;

            if (sMode === "new") {
                oSelectedData = this._createBlankModel();
            } else {
                if (!this._oSelectedContext) {
                    return;
                }
                oSelectedData = this._toDetailModel(this._oSelectedContext.getObject());
                oSelectedData.BudgetRows = this._getMockBudgetRows();
                oSelectedData._odataPath = this._oSelectedODataContext && this._oSelectedODataContext.getPath();
            }

            oSelectedData._mode = sMode;
            oSelectedData._originalKey = oSelectedData.ID;

            var oComponent = this._oController.getOwnerComponent();
            var oSelectedModel = oComponent.getModel("selectedModel");

            if (!oSelectedModel) {
                oSelectedModel = new JSONModel();
                oComponent.setModel(oSelectedModel, "selectedModel");
            }
            oSelectedModel.setData(oSelectedData);

            var oRouter = oComponent.getRouter();
            this._clearSelection();
            oRouter.navTo("RouteModelDetail");
        },

        // Converts the lowercase property names returned by CAP into the
        // uppercase names used by the existing detail form bindings.
        _toDetailModel: function (oModel) {
            return {
                ID: oModel.ID,
                Status: oModel.status || oModel.modelStatus || "ACTIVE",
                ModelStatus: oModel.modelStatus || oModel.status || "ACTIVE",
                ModelVersion: oModel.modelVersion || "",
                Model: oModel.model || "",
                OEGroup: oModel.oeGroup || "",
                OEGroupNr: oModel.oeGroupNr || "",
                Brand: oModel.brand || "",
                BrandNr: oModel.brandNr || "",
                SubGroup: oModel.subGroup || "",
                Region: oModel.region || "",
                Country: oModel.country || "",
                PropulsionType: oModel.propulsionType || "",
                Platform: oModel.platform || "",
                PlatformNr: oModel.platformNr || "",
                VehicleSegment: oModel.vehicleSegment || "",
                DevelopmentCode: oModel.developmentCode || "",
                SOP: oModel.sop || null,
                EOP: oModel.eop || null
            };
        },

        // Starts a blank record from the modeldetail.json template, with blank
        // (not mock) budget rows since there's nothing to prefill for a new model.
        _createBlankModel: function () {
            var oTemplate = JSON.parse(JSON.stringify(this._oBlankModelTemplate || {}));
            oTemplate.BudgetRows = this._getBlankBudgetRows();
            return oTemplate;
        },

        // Deep copy of the mock budget rows loaded from modeldetail.json, used to
        // populate the budget table when viewing/editing an existing model.
        _getMockBudgetRows: function () {
            var aSource = this._aMockBudgetRows || [];
            return JSON.parse(JSON.stringify(aSource));
        },

        // Generates one blank row per year (from modeldetail.json's Years list) for
        // a brand-new model's budget table, since there's no data to show yet.
        _getBlankBudgetRows: function () {
            var aYears = this._aYears || [];
            return aYears.map(function (sYear) {
                return { Year: sYear, Budget: "", LastFC: "", NewFC: "", LastIV: "", NewIV: "", BudgetView: "" };
            });
        },

        // Fires when the detail screen publishes "modelSaved" on the EventBus
        // (after Save is confirmed). Updates the existing row (edit mode) or
        // appends a new one (new mode) in _aAllModels, then re-runs the current
        // search filter so _aFilteredModels stays in sync - same reasoning as
        // _deleteSelectedModel - and refreshes the dropdown options and table,
        // preserving the current page unless it's no longer valid.
        _onModelSaved: function () {
            return this.reloadModels();
        },

        // Fills in Status/ModelStatus and any missing Nr fields (OEGroupNr, BrandNr,
        // PlatformNr) on a record before it's saved, so hand-typed values in the
        // Edit/New form always end up with consistent derived data.
        _populateDerivedFields: function (oRecord) {
            var sStatus = oRecord.Status || oRecord.ModelStatus || this._sDefaultStatus;
            oRecord.Status = sStatus;
            oRecord.ModelStatus = sStatus;
            oRecord.OEGroupNr = oRecord.OEGroupNr || this._lookupOrAssignNr("OEGroup", "OEGroupNr", oRecord.OEGroup);
            oRecord.BrandNr = oRecord.BrandNr || this._lookupOrAssignNr("Brand", "BrandNr", oRecord.Brand);
            oRecord.PlatformNr = oRecord.PlatformNr || this._lookupOrAssignNr("Platform", "PlatformNr", oRecord.Platform);
            return oRecord;
        },

        // Given a text value (e.g. a Brand name), finds its existing Nr from other
        // rows that already have one, or - if this value has never been seen -
        // assigns the next number after the current highest, so every distinct
        // value gets a stable, unique Nr.
        _lookupOrAssignNr: function (sValueField, sNrField, sValue) {
            if (!sValue) {
                return "";
            }

            var aModels = this._aAllModels || [];

            var oExisting = aModels.find(function (oModel) {
                return oModel[sValueField] === sValue
                    && oModel[sNrField] !== undefined
                    && oModel[sNrField] !== null
                    && oModel[sNrField] !== "";
            });

            if (oExisting) {
                return oExisting[sNrField];
            }

            var iMax = 0;
            aModels.forEach(function (oModel) {
                var iNr = parseInt(oModel[sNrField], 10);
                if (!isNaN(iNr) && iNr > iMax) {
                    iMax = iNr;
                }
            });

            return String(iMax + 1);
        },

        // Rebuilds the "dropdowns" Component model (unique, sorted Brand/SubGroup/
        // PropulsionType/Platform values from the current dataset) that the
        // Edit/New detail screen's dropdown fields read from. Called whenever the
        // dataset changes (initial load, save, ...) so new values show up there too.
        _rebuildDropdownOptions: function () {
            var oComponent = this._oController.getOwnerComponent();
            var oDropdownModel = oComponent.getModel("dropdowns");

            if (!oDropdownModel) {
                oDropdownModel = new JSONModel();
                oComponent.setModel(oDropdownModel, "dropdowns");
            }

            var aModels = this._aAllModels || [];

            function uniqueSorted(sField) {
                var aSeen = [];
                aModels.forEach(function (oModel) {
                    var sValue = oModel[sField];
                    if (sValue !== undefined && sValue !== null && sValue !== "" && aSeen.indexOf(sValue) === -1) {
                        aSeen.push(sValue);
                    }
                });
                return aSeen.sort();
            }

            oDropdownModel.setData({
                Brands: uniqueSorted("brand"),
                SubGroups: uniqueSorted("subGroup"),
                PropulsionTypes: uniqueSorted("propulsionType"),
                Platforms: uniqueSorted("platform")
            });
        },

        // ===================== Import =====================
    

        sendMultiple: function () { MessageToast.show("Send Multiple Models not implemented yet."); },
        sendAll: function () { MessageToast.show("Send All Models not implemented yet."); },
        triggerImport: function () {
            var that = this;

            if (!this._oImportDialog) {
                Fragment.load({
                    id: this._oView.getId(),
                    name: "project1.view.NewModelDialog",
                    controller: this._oController
                }).then(function (oDialog) {
                    that._oImportDialog = oDialog;
                    that._oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oImportDialog.open();
            }
        },

        triggerImportFilePicker: function () {
            var oFileUploader = Fragment.byId(this._oView.getId(), "fuModelExcelImport");
            oFileUploader.$().find("input[type=file]").trigger("click");
        },

        closeImportDialog: function () {
            if (this._oImportDialog) {
                this._oImportDialog.close();
            }
        },

        createFromLast: function () {
            if (!this._aAllModels.length) {
                MessageBox.warning("No existing model to clone from.");
                return;
            }

            var oLastModel = this._aAllModels[this._aAllModels.length - 1];
            var oPayload = this._toODataImportPayload(oLastModel);
            var that = this;

            BusyIndicator.show(0);
            this._createModels([oPayload]).then(function () {
                that.closeImportDialog();
                return that.reloadModels();
            }).then(function () {
                MessageToast.show("Model created from last!");
            }).catch(function (oError) {
                MessageBox.error("Failed to create model: " + oError.message);
            }).finally(function () {
                BusyIndicator.hide();
            });
        },

        handleExcelFileSelected: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];

            if (!oFile) {
                return;
            }

            var that = this;
            this._loadXlsx().then(function () {
                return new Promise(function (resolve, reject) {
                    var oReader = new FileReader();
                    oReader.onload = function (oLoadEvent) {
                        try {
                            var oWorkbook = XLSX.read(new Uint8Array(oLoadEvent.target.result), { type: "array" });
                            var oSheet = oWorkbook.Sheets[oWorkbook.SheetNames[0]];
                            resolve(XLSX.utils.sheet_to_json(oSheet, { defval: "" }));
                        } catch (oError) {
                            reject(oError);
                        }
                    };
                    oReader.onerror = function () { reject(new Error("Could not read the selected file.")); };
                    oReader.readAsArrayBuffer(oFile);
                });
            }).then(function (aRows) {
                if (!aRows.length) {
                    throw new Error("The Excel file is empty or has no readable rows.");
                }

                var aPayloads = aRows.map(that._toODataImportPayload.bind(that));
                return that._createModels(aPayloads).then(function () {
                    that.closeImportDialog();
                    return that.reloadModels();
                }).then(function () {
                    MessageToast.show(aPayloads.length + " model(s) imported successfully!");
                });
            }).catch(function (oError) {
                MessageBox.error("Failed to import models: " + oError.message);
            }).finally(function () {
                oFileUploader.clear();
                BusyIndicator.hide();
            });

            BusyIndicator.show(0);
        },

        _loadXlsx: function () {
            if (this._xlsxReady) {
                return this._xlsxReady;
            }

            this._xlsxReady = new Promise(function (resolve, reject) {
                if (typeof XLSX !== "undefined") {
                    resolve();
                    return;
                }
                var oScript = document.createElement("script");
                oScript.src = sap.ui.require.toUrl("project1/thirdparty/xlsx.full.min.js");
                oScript.onload = resolve;
                oScript.onerror = function () { reject(new Error("Failed to load Excel support.")); };
                document.head.appendChild(oScript);
            });
            return this._xlsxReady;
        },

        _createModels: function (aPayloads) {
            var oListBinding = this._oController.getOwnerComponent().getModel().bindList("/Models");
            aPayloads.forEach(function (oPayload) {
                oListBinding.create(oPayload);
            });
            return this._oController.getOwnerComponent().getModel().submitBatch("$auto");
        },

        _toODataImportPayload: function (oRow) {
            var that = this;
            function value() {
                var aNames = Array.prototype.slice.call(arguments);
                var sName = aNames.find(function (sKey) {
                    return oRow[sKey] !== undefined && oRow[sKey] !== null && oRow[sKey] !== "";
                });
                return sName ? String(oRow[sName]).trim() : "";
            }

            var sStatus = value("Model Status", "modelStatus", "Status", "status") || "ACTIVE";
            return {
                modelStatus: sStatus,
                status: sStatus,
                oeGroupNr: value("OE grp Nr", "OE Group Nr", "oeGroupNr"),
                oeGroup: value("OE Group", "oeGroup"),
                brandNr: value("Brand nr", "Brand Nr", "brandNr"),
                brand: value("Brand", "brand"),
                subGroup: value("Sub group", "Sub Group", "subGroup"),
                region: value("Region", "region"),
                country: value("Country", "country"),
                modelVersion: value("Model version", "Model Version", "modelVersion"),
                model: value("Model", "model"),
                propulsionType: value("Propuls type", "Propulsion type", "Propulsion Type", "propulsionType"),
                developmentCode: value("Development code", "Development Code", "developmentCode"),
                platformNr: value("Platform Nr", "Platforr Nr", "platformNr"),
                platform: value("Platform", "platform"),
                vehicleSegment: value("Vehicle segment", "Vehicle Segment", "vehicleSegment"),
                sop: that._toDateValue(value("SOP", "sop")),
                eop: that._toDateValue(value("EOP", "eop")),
                deleted: 0
            };
        },

        _toDateValue: function (vDate) {
            if (!vDate) {
                return null;
            }

            if (typeof vDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(vDate)) {
                return vDate;
            }

            var oDate = vDate instanceof Date ? vDate : new Date(vDate);
            return isNaN(oDate.getTime()) ? null : oDate.toISOString().slice(0, 10);
        },

        exportExcel: function () {
            var aModels = this._aFilteredModels || [];

            if (!aModels.length) {
                MessageToast.show("There are no models to export.");
                return;
            }

            var that = this;
            BusyIndicator.show(0);

            this._loadSpreadsheetExport().then(function (oExport) {
                var oSpreadsheet = new oExport.Spreadsheet({
                    workbook: {
                        columns: that._getExportColumns(oExport.library)
                    },
                    dataSource: aModels,
                    fileName: "Models_with_me.xlsx",
                    worker: true
                });

                return oSpreadsheet.build().finally(function () {
                    oSpreadsheet.destroy();
                });
            }).then(function () {
                MessageToast.show(aModels.length + " model(s) exported successfully.");
            }).catch(function (oError) {
                MessageBox.error("Failed to export models: " + oError.message);
            }).finally(function () {
                BusyIndicator.hide();
            });
        },

        _loadSpreadsheetExport: function () {
            return new Promise(function (resolve, reject) {
                sap.ui.require([
                    "sap/ui/export/Spreadsheet",
                    "sap/ui/export/library"
                ], function (Spreadsheet, exportLibrary) {
                    if (!Spreadsheet || !exportLibrary) {
                        reject(new Error("SAPUI5 Excel export is unavailable."));
                        return;
                    }
                    resolve({ Spreadsheet: Spreadsheet, library: exportLibrary });
                }, reject);
            });
        },

        _getExportColumns: function (oExportLibrary) {
            var EdmType = oExportLibrary.EdmType;

            return [
                { label: "Model Status", property: "modelStatus", type: EdmType.String },
                { label: "OE grp Nr", property: "oeGroupNr", type: EdmType.String },
                { label: "OE Group", property: "oeGroup", type: EdmType.String },
                { label: "Brand nr", property: "brandNr", type: EdmType.String },
                { label: "Brand", property: "brand", type: EdmType.String },
                { label: "Sub group", property: "subGroup", type: EdmType.String },
                { label: "Region", property: "region", type: EdmType.String },
                { label: "Country", property: "country", type: EdmType.String },
                { label: "Model version", property: "modelVersion", type: EdmType.String },
                { label: "Model", property: "model", type: EdmType.String },
                { label: "Propuls type", property: "propulsionType", type: EdmType.String },
                { label: "Development code", property: "developmentCode", type: EdmType.String },
                { label: "Platform Nr", property: "platformNr", type: EdmType.String },
                { label: "Platform", property: "platform", type: EdmType.String }
            ];
        },

        // ===================== Delete =====================

        // Fires when the Delete button is pressed. Confirms with the user before
        // actually removing anything. Note: UI5's MessageBox.Action enum has no
        // built-in DELETE constant (only OK/CANCEL/YES/NO/RETRY/IGNORE/ABORT/CLOSE),
        // so a custom "Delete" string label is used for the affirmative action -
        // same pattern used for the detail screen's Save confirmation.
        deleteSelected: function () {
            if (!this._oSelectedContext) return;

            var that = this;
            var oSelectedData = this._oSelectedContext.getObject();
            MessageBox.confirm(
                "Are you sure you want to delete \"" + oSelectedData.model + "\"?",
                {
                    title: "Delete Model",
                    actions: ["Delete", MessageBox.Action.CANCEL],
                    emphasizedAction: "Delete",
                    onClose: function (sAction) {
                        if (sAction === "Delete") that._deleteSelectedModel();
                    }
                }
            );
        },

        // Soft-deletes the selected model via the real OData service (the
        // backend flips `deleted` to 1 rather than removing the row - see
        // CAP/srv/service.js), then reloads the list from the database so the
        // UI reflects the true server state.
        _deleteSelectedModel: function () {
            var that = this;

            if (!this._oSelectedODataContext) {
                this._clearSelection();
                return;
            }

            BusyIndicator.show(0);
            this._oSelectedODataContext.delete().then(function () {
                that._clearSelection();
                return that.reloadModels();
            }).then(function () {
                BusyIndicator.hide();
                MessageToast.show("Model deleted!");
            }).catch(function (oError) {
                BusyIndicator.hide();
                MessageBox.error("Failed to delete model: " + oError.message);
            });
        },

        // ===================== Pagination =====================
        // Design: this._aAllModels always holds the FULL dataset (all rows from
        // modelsWithMe.json). The "models" model bound to the table only ever
        // holds the current page's slice (this._iPageSize rows). The four
        // goToXxxPage handlers below just move this._iCurrentPage and call
        // _updatePage() to recompute and re-render that slice.

        // Jump to page 1.
        goToFirstPage: function () {
            this._iCurrentPage = 1;
            this._updatePage();
        },

        // Go back one page, if not already on the first page.
        goToPreviousPage: function () {
            if (this._iCurrentPage > 1) {
                this._iCurrentPage--;
                this._updatePage();
            }
        },

        // Go forward one page, if not already on the last page.
        goToNextPage: function () {
            var iTotalPages = this._getTotalPages();
            if (this._iCurrentPage < iTotalPages) {
                this._iCurrentPage++;
                this._updatePage();
            }
        },

        // Jump to the last page.
        goToLastPage: function () {
            this._iCurrentPage = this._getTotalPages();
            this._updatePage();
        },

        // How many pages exist for the CURRENT filtered set (all rows when no
        // search is active, a subset once one is), given the current page size.
        // Always at least 1, even when there's no data, so pagination math never divides by zero.
        _getTotalPages: function () {
            return Math.max(1, Math.ceil(this._aFilteredModels.length / this._iPageSize));
        },

        // Recomputes which slice of this._aFilteredModels belongs on the current
        // page, pushes it into the "models" model (which re-renders the table),
        // updates the "X to Y of Z" text, and enables/disables the pagination
        // buttons depending on whether we're at the first/last page.
        _updatePage: function () {
            var iTotal = this._aFilteredModels.length;
            var iTotalPages = this._getTotalPages();
            var iStart = (this._iCurrentPage - 1) * this._iPageSize;
            var iEnd = Math.min(iStart + this._iPageSize, iTotal);
            var aPageData = this._aFilteredModels.slice(iStart, iEnd);

            this._oView.getModel("models").setProperty("/Models", aPageData);

            var iFrom = iTotal === 0 ? 0 : iStart + 1;
            this._byId("txtModelsPaginationInfo").setText(iFrom + " to " + iEnd + " of " + iTotal);

            this._byId("btnModelsFirstPage").setEnabled(this._iCurrentPage > 1);
            this._byId("btnModelsPreviousPage").setEnabled(this._iCurrentPage > 1);
            this._byId("btnModelsNextPage").setEnabled(this._iCurrentPage < iTotalPages);
            this._byId("btnModelsLastPage").setEnabled(this._iCurrentPage < iTotalPages);
        }

    });
});
