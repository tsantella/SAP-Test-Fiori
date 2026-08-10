sap.ui.define([
      "sap/ui/core/mvc/Controller",
      "sap/ui/model/json/JSONModel",
      "sap/m/MessageToast"
  ], function (Controller, JSONModel, MessageToast) {
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
              });

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
                  }
              });
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

          _clearSelection: function () {
              var oTable = this.byId("tblModels");
              oTable.getItems().forEach(function (row) {
                  row.removeStyleClass("rowSelected");
              });
              this._oSelectedContext = null;
              this.byId("btnModelsEdit").setEnabled(false);
              this.byId("btnModelsDelete").setEnabled(false);
          },

          // ===================== Toolbar button stubs =====================

          onSearch: function () { MessageToast.show("Search button clicked!"); },
          onNew: function () { MessageToast.show("New button clicked!"); },
          onEdit: function () { MessageToast.show("Edit not implemented yet."); },
          onSendMultiple: function () { MessageToast.show("Send Multiple Models not implemented yet."); },
          onSendAll: function () { MessageToast.show("Send All Models not implemented yet."); },
          onImport: function () { MessageToast.show("Import not implemented yet."); },
          onExportExcel: function () { MessageToast.show("Export to Excel not implemented yet."); },
          onDelete: function () { MessageToast.show("Delete not implemented yet."); },

          // ===================== Pagination =====================

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