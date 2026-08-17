sap.ui.define([
      "sap/ui/core/mvc/Controller",
      "sap/ui/model/json/JSONModel",
      "sap/m/MessageToast",
      "sap/ui/core/EventBus"
], function (Controller, JSONModel, MessageToast,EventBus) {
      "use strict";
      return Controller.extend("project1.controller.ModelsWithMe", {

          onInit: function () {
              this._iPageSize = 10;
              this._iCurrentPage = 1;

              var that = this;

              // The "models" model only ever holds the CURRENT page's slice
              var oModelsModel = new JSONModel({ Models: [] });
              this.getView().setModel(oModelsModel, "models");

              var sPath = sap.ui.require.toUrl("project1/model/modelsWithMe.json");
              oModelsModel.loadData(sPath);

              oModelsModel.attachRequestCompleted(function () {
                  that._aAllModels = oModelsModel.getProperty("/Models");
                  that._updatePage();
                 that._rebuildDropdownOptions();
              });

            var oDefaultsModel = new JSONModel();
            var sDefaultsPath = sap.ui.require.toUrl("project1/model/modeldetail.json");
            oDefaultsModel.loadData(sDefaultsPath);
            oDefaultsModel.attachRequestCompleted(function () {
                that._oBlankModelTemplate = oDefaultsModel.getProperty("/BlankModel") || {};
                that._aMockBudgetRows = oDefaultsModel.getProperty("/MockBudgetRows") || [];
            });

            // Listen for saves coming back from the detail (Edit/New) screen
            EventBus.getInstance().subscribe("app", "modelSaved", this._onModelSaved, this);

              // Click outside the table deselects the current row
              var oPage = this.byId("ModelsWithMe");
              oPage.addEventDelegate({
                  onclick: function (oEvent) {
                      var oTable = that.byId("tblModels");
                      var sTargetId = oEvent.target.id;

                      if (sTargetId.includes("btnModelsEdit") || sTargetId.includes("btnModelsDelete")) {
                          return;
                      }

                      var bIsRowClick = oTable.getItems().some(function (row) {
                          return row.getDomRef() && row.getDomRef().contains(oEvent.target);
                      });

                      if (!bIsRowClick) {
                          that._clearSelection();
                      }
                },

                // Double-click ONLY opens the record for viewing (read-only)
                ondblclick: function (oEvent) {
                    var oTable = that.byId("tblModels");

                    var bIsRowClick = oTable.getItems().some(function (row) {
                        return row.getDomRef() && row.getDomRef().contains(oEvent.target);
                    });

                    if (bIsRowClick) {
                        that._openModelDetail("view");
                     }
                  }
              });
          },

        onExit: function () {
            EventBus.getInstance().unsubscribe("app", "modelSaved", this._onModelSaved, this);
        },

          onRowPress: function (oEvent) {
              var oItem = oEvent.getSource();
              var oTable = this.byId("tblModels");

              oTable.getItems().forEach(function (row) {
                  row.removeStyleClass("rowSelected");
              });
              oItem.addStyleClass("rowSelected");

              this._oSelectedContext = oItem.getBindingContext("models");

              this.byId("btnModelsEdit").setEnabled(true);
              this.byId("btnModelsDelete").setEnabled(true);
          },

        onEdit: function () {
            if (this._oSelectedContext) {
                this._openModelDetail("edit");
            }
        },

        onNew: function () {
            this._oSelectedContext = null;
            this._openModelDetail("new");
        },

        _openModelDetail: function (sMode) {
            var oSelectedData;

            if (sMode === "new") {
                oSelectedData = this._createBlankModel();
            } else {
                if (!this._oSelectedContext) {
                    return;
                }
                oSelectedData = JSON.parse(JSON.stringify(this._oSelectedContext.getObject()));

                oSelectedData.BudgetRows = this._getMockBudgetRows();
            }

            oSelectedData._mode = sMode;
            oSelectedData._originalKey = oSelectedData.ModelVersion;

            var oComponent = this.getOwnerComponent();
            var oSelectedModel = oComponent.getModel("selectedModel");

            if (!oSelectedModel) {
                oSelectedModel = new JSONModel();
                oComponent.setModel(oSelectedModel, "selectedModel");
            }
            oSelectedModel.setData(oSelectedData);

            var oRouter = this.getOwnerComponent().getRouter();
            this._clearSelection();
            oRouter.navTo("RouteModelDetail");
        },

    
        _createBlankModel: function () {
            var oTemplate = JSON.parse(JSON.stringify(this._oBlankModelTemplate || {}));
            oTemplate.BudgetRows = this._getBlankBudgetRows();
            return oTemplate;
        },

       
        _getMockBudgetRows: function () {
            var aSource = this._aMockBudgetRows || [];
            return JSON.parse(JSON.stringify(aSource));
        },

        _getBlankBudgetRows: function () {
            var aYears = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035"];
            return aYears.map(function (sYear) {
                return { Year: sYear, Budget: "", LastFC: "", NewFC: "", LastIV: "", NewIV: "", BudgetView: "" };
            });
        },

        _onModelSaved: function (sChannel, sEvent, oData) {
            if (!this._aAllModels) {
                this._aAllModels = [];
            }

            var oRecord = this._populateDerivedFields(oData.record);

            if (oData.mode === "edit") {
                var iIndex = this._aAllModels.findIndex(function (oModel) {
                    return oModel.ModelVersion === oData.originalKey;
                });
                if (iIndex > -1) {
                    this._aAllModels[iIndex] = oRecord;
                } else {
                    this._aAllModels.push(oRecord);
                }
            } else if (oData.mode === "new") {
                this._aAllModels.push(oRecord);
            }

            this._updatePage();
            this._rebuildDropdownOptions();
        },

        _populateDerivedFields: function (oRecord) {
            var sStatus = oRecord.Status || oRecord.ModelStatus || "ACTIVE";
            oRecord.Status = sStatus;
            oRecord.ModelStatus = sStatus;
            oRecord.OEGroupNr = oRecord.OEGroupNr || this._lookupOrAssignNr("OEGroup", "OEGroupNr", oRecord.OEGroup);
            oRecord.BrandNr = oRecord.BrandNr || this._lookupOrAssignNr("Brand", "BrandNr", oRecord.Brand);
            oRecord.PlatformNr = oRecord.PlatformNr || this._lookupOrAssignNr("Platform", "PlatformNr", oRecord.Platform);
            return oRecord;
        },

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

        _rebuildDropdownOptions: function () {
            var oComponent = this.getOwnerComponent();
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
                Brands: uniqueSorted("Brand"),
                SubGroups: uniqueSorted("SubGroup"),
                PropulsionTypes: uniqueSorted("PropulsionType"),
                Platforms: uniqueSorted("Platform")
            });
          },

          _clearSelection: function () {
              var oTable = this.byId("tblModels");
              oTable.getItems().forEach(function (row) {
                  row.removeStyleClass("rowSelected");
              });
              this._oSelectedContext = null;
              this.byId("btnModelsEdit").setEnabled(false);
              this.byId("btnModelsDelete").setEnabled(false);
          },

          onSearch: function () { MessageToast.show("Search button clicked!"); },
          onSendMultiple: function () { MessageToast.show("Send Multiple Models not implemented yet."); },
          onSendAll: function () { MessageToast.show("Send All Models not implemented yet."); },
          onImport: function () { MessageToast.show("Import not implemented yet."); },
          onExportExcel: function () { MessageToast.show("Export to Excel not implemented yet."); },
          onDelete: function () { MessageToast.show("Delete not implemented yet."); },

          onFirstPage: function () {
              this._iCurrentPage = 1;
              this._updatePage();
          },

          onPreviousPage: function () {
              if (this._iCurrentPage > 1) {
                  this._iCurrentPage--;
                  this._updatePage();
              }
          },

          onNextPage: function () {
              var iTotalPages = this._getTotalPages();
              if (this._iCurrentPage < iTotalPages) {
                  this._iCurrentPage++;
                  this._updatePage();
              }
          },

          onLastPage: function () {
              this._iCurrentPage = this._getTotalPages();
              this._updatePage();
          },

          _getTotalPages: function () {
              return Math.max(1, Math.ceil(this._aAllModels.length / this._iPageSize));
          },

          _updatePage: function () {
              var iTotal = this._aAllModels.length;
              var iTotalPages = this._getTotalPages();
              var iStart = (this._iCurrentPage - 1) * this._iPageSize;
              var iEnd = Math.min(iStart + this._iPageSize, iTotal);
              var aPageData = this._aAllModels.slice(iStart, iEnd);

              this.getView().getModel("models").setProperty("/Models", aPageData);

              var iFrom = iTotal === 0 ? 0 : iStart + 1;
              this.byId("txtModelsPaginationInfo").setText(iFrom + " to " + iEnd + " of " + iTotal);

              this.byId("btnModelsFirstPage").setEnabled(this._iCurrentPage > 1);
              this.byId("btnModelsPreviousPage").setEnabled(this._iCurrentPage > 1);
              this.byId("btnModelsNextPage").setEnabled(this._iCurrentPage < iTotalPages);
              this.byId("btnModelsLastPage").setEnabled(this._iCurrentPage < iTotalPages);
          }
      });
  });