sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
  ],
  function (Controller, JSONModel, MessageToast, Fragment, MessageBox) {
    "use strict";

    return Controller.extend("project1.controller.ApprovalFlow", {
      onNavBack: function () {
        window.history.go(-1);
      },
      /* All Requests Actions */
      allRequestsSearch: function () {
        this.byId("filtersToolbar").setVisible(true);
        this.byId("allRequestsSearch").setEnabled(false);
      },
      onSearchSubmit: function () {
        var oModelVersionInput = this.byId("modelVersionInput");
        var oModelInput = this.byId("modelInput");

        var sModelVersion = oModelVersionInput.getValue().trim();
        var sModel = oModelInput.getValue().trim();

        var oTable = this.byId("tbApprovalFlow");

        if (!oTable) {
          sap.m.MessageToast.show("Table not found.");
          return;
        }

        var oBinding = oTable.getBinding("items");

        if (!oBinding) {
          return;
        }

        var aFilters = [];

        if (sModelVersion) {
          aFilters.push(
            new sap.ui.model.Filter(
              "ModelVersion",
              sap.ui.model.FilterOperator.Contains,
              sModelVersion,
            ),
          );
        }

        if (sModel) {
          aFilters.push(
            new sap.ui.model.Filter(
              "Model",
              sap.ui.model.FilterOperator.Contains,
              sModel,
            ),
          );
        }

        oBinding.filter(aFilters);
      },
      onSearchClear: function () {
        var oModelVersionInput = this.byId("modelVersionInput");
        var oModelInput = this.byId("modelInput");

        oModelVersionInput.setValue("");
        oModelInput.setValue("");

        var oTable = this.byId("tbApprovalFlow");

        if (!oTable) {
          return;
        }

        var oBinding = oTable.getBinding("items");

        if (!oBinding) {
          return;
        }

        oBinding.filter([]);
      },
      onCloseFilters: function () {
        this.byId("modelVersionInput").setValue("");
        this.byId("modelInput").setValue("");

        var oTable = this.byId("tbApprovalFlow");

        if (oTable) {
          var oBinding = oTable.getBinding("items");

          if (oBinding) {
            oBinding.filter([]);
          }
        }

        this.byId("filtersToolbar").setVisible(false);
        this.byId("allRequestsSearch").setEnabled(true);
      },
      allRequestsView: function () {
        var oTable = this.byId("tbApprovalFlow");
        var sSelectedModelVersion = this._aSelectedRows[0];

        console.log("Selected ModelVersion:", sSelectedModelVersion);

        var oCyclesModel = this.getView().getModel("cycles");

        if (!oCyclesModel) {
          sap.m.MessageToast.show("ApprovalFlow data not found.");
          return;
        }

        var aApprovalFlow = oCyclesModel.getProperty("/ApprovalFlow");

        var oSelectedApprovalFlow = aApprovalFlow.find(function (oRow) {
          return oRow.ModelVersion === sSelectedModelVersion;
        });

        if (!oSelectedApprovalFlow) {
          sap.m.MessageToast.show("Selected request not found.");
          return;
        }

        console.log("Selected ApprovalFlow:", oSelectedApprovalFlow);

        var oComponent = this.getOwnerComponent();
        var oSelectedModel = oComponent.getModel("selectedApprovalFlow");

        if (!oSelectedModel) {
          oSelectedModel = new sap.ui.model.json.JSONModel();
          oComponent.setModel(oSelectedModel, "selectedApprovalFlow");
        }

        oSelectedModel.setData(oSelectedApprovalFlow);

        console.log("selectedApprovalFlow model:", oSelectedModel.getData());

        this._clearSelection(oTable);

        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("RouteApprovalFlowModel");
      },
      allRequestsExport: function () {
        sap.m.MessageToast.show("Export button clicked!");
      },
      allRequestsSelectAll: function () {
        var oTable = this.byId("tbApprovalFlow");

        if (!oTable) {
          return;
        }

        if (!this._aSelectedRows) {
          this._aSelectedRows = [];
        }

        oTable.getItems().forEach(function (oItem) {
          var oContext = oItem.getBindingContext("cycles");

          if (!oContext) {
            return;
          }

          var oData = oContext.getObject();

          // Use a unique value from your data
          var sKey = oData.ModelVersion;

          if (!sKey) {
            return;
          }

          // Only add if not already selected
          if (this._aSelectedRows.indexOf(sKey) === -1) {
            this._aSelectedRows.push(sKey);
          }

          this.byId("allRequestsView").setEnabled(
            this._aSelectedRows.length === 1,
          );
          this.byId("allRequestsApprove").setEnabled(
            this._aSelectedRows.length >= 1,
          );
          this.byId("allRequestsReject").setEnabled(
            this._aSelectedRows.length >= 1,
          );

          // Make sure the row is visually selected
          oItem.addStyleClass("rowSelected");
        }, this);
      },
      allRequestsDeselectAll: function () {
        var oTable = this.byId("tbApprovalFlow");

        if (!oTable) {
          return;
        }

        oTable.getItems().forEach(function (oItem) {
          var oContext = oItem.getBindingContext("cycles");

          if (!oContext) {
            return;
          }

          var oData = oContext.getObject();

          var sKey = oData.ModelVersion;

          if (!sKey) {
            return;
          }

          var iIndex = this._aSelectedRows.indexOf(sKey);

          if (iIndex !== -1) {
            this._aSelectedRows.splice(iIndex, 1);
          }
          this.byId("allRequestsView").setEnabled(false);
          this.byId("allRequestsApprove").setEnabled(false);
          this.byId("allRequestsReject").setEnabled(false);

          oItem.removeStyleClass("rowSelected");
        }, this);
      },
      allRequestsApprove: function () {
        var oTable = this.byId("tbApprovalFlow");

        if (!oTable) {
          return;
        }

        if (!this._aSelectedRows || this._aSelectedRows.length === 0) {
          MessageToast.show("Please select at least one request.");
          return;
        }

        var iApprovedCount = 0;

        this._aAllCycles.forEach(function (oRow) {
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus === "Pending"
          ) {
            oRow.RequestStatus = "Approved";
            iApprovedCount++;
          }
        }, this);

        this._updatePagination("tbApprovalFlow");

        this._aSelectedRows = [];

        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        if (oTable.getMode() === "MultiSelect") {
          oTable.removeSelections(true);
        }

        // Disable buttons
        this.byId("allRequestsView").setEnabled(false);
        this.byId("allRequestsApprove").setEnabled(false);
        this.byId("allRequestsReject").setEnabled(false);

        MessageToast.show(iApprovedCount + " request(s) approved.");
      },
      allRequestsReject: function () {
        var oTable = this.byId("tbApprovalFlow");

        if (!oTable) {
          return;
        }

        var iRejectedCount = 0;

        this._aAllCycles.forEach(function (oRow) {
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus === "Pending"
          ) {
            oRow.RequestStatus = "Rejected";
            iRejectedCount++;
          }
        }, this);

        this._updatePagination("tbApprovalFlow");

        this._aSelectedRows = [];

        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        if (oTable.getMode() === "MultiSelect") {
          oTable.removeSelections(true);
        }

        // Disable buttons
        this.byId("allRequestsView").setEnabled(false);
        this.byId("allRequestsApprove").setEnabled(false);
        this.byId("allRequestsReject").setEnabled(false);

        MessageToast.show(iRejectedCount + " request(s) rejected.");
      },

      /*My Requests Actions*/
      myRequestView: function () {
        var oTable = this.byId("myRequestTable");
        var sSelectedModelVersion = this._aSelectedRows[0];

        console.log("Selected ModelVersion:", sSelectedModelVersion);

        var oCyclesModel = this.getView().getModel("cycles");

        if (!oCyclesModel) {
          sap.m.MessageToast.show("ApprovalFlow data not found.");
          return;
        }

        var aApprovalFlow = oCyclesModel.getProperty("/MyRequests");

        var oSelectedApprovalFlow = aApprovalFlow.find(function (oRow) {
          return oRow.ModelVersion === sSelectedModelVersion;
        });

        if (!oSelectedApprovalFlow) {
          sap.m.MessageToast.show("Selected request not found.");
          return;
        }

        console.log("Selected ApprovalFlow:", oSelectedApprovalFlow);

        var oComponent = this.getOwnerComponent();
        var oSelectedModel = oComponent.getModel("selectedApprovalFlow");

        if (!oSelectedModel) {
          oSelectedModel = new sap.ui.model.json.JSONModel();
          oComponent.setModel(oSelectedModel, "selectedApprovalFlow");
        }

        oSelectedModel.setData(oSelectedApprovalFlow);

        console.log("selectedApprovalFlow model:", oSelectedModel.getData());

        this._clearSelection(oTable);

        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("RouteApprovalFlowModel");
      },
      myRequestSelectAll: function () {
        var oTable = this.byId("myRequestTable");

        if (!oTable) {
          return;
        }

        if (!this._aSelectedRows) {
          this._aSelectedRows = [];
        }

        oTable.getItems().forEach(function (oItem) {
          var oContext = oItem.getBindingContext("cycles");

          if (!oContext) {
            return;
          }

          var oData = oContext.getObject();

          // Use a unique value from your data
          var sKey = oData.ModelVersion;

          if (!sKey) {
            return;
          }

          // Only add if not already selected
          if (this._aSelectedRows.indexOf(sKey) === -1) {
            this._aSelectedRows.push(sKey);
          }
          this.byId("myRequestView").setEnabled(
            this._aSelectedRows.length === 1,
          );
          this.byId("myRequestDelete").setEnabled(
            this._aSelectedRows.length >= 1,
          );

          // Make sure the row is visually selected
          oItem.addStyleClass("rowSelected");
        }, this);

        console.log("Selected rows:", this._aSelectedRows);
      },
      myRequestDeselectAll: function () {
        var oTable = this.byId("myRequestTable");

        if (!oTable) {
          return;
        }

        oTable.getItems().forEach(function (oItem) {
          var oContext = oItem.getBindingContext("cycles");

          if (!oContext) {
            return;
          }

          var oData = oContext.getObject();

          var sKey = oData.ModelVersion;

          if (!sKey) {
            return;
          }

          var iIndex = this._aSelectedRows.indexOf(sKey);

          if (iIndex !== -1) {
            this._aSelectedRows.splice(iIndex, 1);
          }
          this.byId("myRequestView").setEnabled(false);
          this.byId("myRequestDelete").setEnabled(false);

          oItem.removeStyleClass("rowSelected");
        }, this);

        console.log("Selected rows:", this._aSelectedRows);
      },
      myRequestDelete: function () {
        var oTable = this.byId("myRequestTable");

        if (!oTable) {
          return;
        }

        var aSelectedModelVersions = this._aSelectedRows.slice();

        this._aMyRequests = this._aMyRequests.filter(function (oRow) {
          return aSelectedModelVersions.indexOf(oRow.ModelVersion) === -1;
        });

        console.log("Remaining My Requests:", this._aMyRequests);

        var iTotalPages = this._getTotalPages("myRequestTable");

        if (this._iMyRequestCurrentPage > iTotalPages) {
          this._iMyRequestCurrentPage = iTotalPages;
        }

        if (this._iMyRequestCurrentPage < 1) {
          this._iMyRequestCurrentPage = 1;
        }

        this._updatePagination("myRequestTable");

        this._aSelectedRows = [];

        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        if (oTable.getMode() === "MultiSelect") {
          oTable.removeSelections(true);
        }

        this.byId("myRequestView").setEnabled(false);
        this.byId("myRequestDelete").setEnabled(false);

        sap.m.MessageToast.show(
          aSelectedModelVersions.length + " request(s) deleted.",
        );
      },
      myRequestSendRequest: function () {
        sap.m.MessageToast.show("Send Request button clicked!");
      },

      /* New Requests Actions */
      newRequestOpen: function () {
        var oTable = this.byId("newRequestTable");
        var sSelectedModelVersion = this._aSelectedRows[0];

        console.log("Selected ModelVersion:", sSelectedModelVersion);

        var oCyclesModel = this.getView().getModel("cycles");

        if (!oCyclesModel) {
          sap.m.MessageToast.show("ApprovalFlow data not found.");
          return;
        }

        var aApprovalFlow = oCyclesModel.getProperty("/NewRequests");

        var oSelectedApprovalFlow = aApprovalFlow.find(function (oRow) {
          return oRow.ModelVersion === sSelectedModelVersion;
        });

        if (!oSelectedApprovalFlow) {
          sap.m.MessageToast.show("Selected request not found.");
          return;
        }

        console.log("Selected ApprovalFlow:", oSelectedApprovalFlow);

        var oComponent = this.getOwnerComponent();
        var oSelectedModel = oComponent.getModel("selectedApprovalFlow");

        if (!oSelectedModel) {
          oSelectedModel = new sap.ui.model.json.JSONModel();
          oComponent.setModel(oSelectedModel, "selectedApprovalFlow");
        }

        oSelectedModel.setData(oSelectedApprovalFlow);

        console.log("selectedApprovalFlow model:", oSelectedModel.getData());

        this._clearSelection(oTable);

        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("RouteApprovalFlowModel");
      },
      newRequestSelectAll: function () {
        var oTable = this.byId("newRequestTable");

        if (!oTable) {
          return;
        }

        if (!this._aSelectedRows) {
          this._aSelectedRows = [];
        }

        oTable.getItems().forEach(function (oItem) {
          var oContext = oItem.getBindingContext("cycles");

          if (!oContext) {
            return;
          }

          var oData = oContext.getObject();

          // Use a unique value from your data
          var sKey = oData.ModelVersion;

          if (!sKey) {
            return;
          }

          // Only add if not already selected
          if (this._aSelectedRows.indexOf(sKey) === -1) {
            this._aSelectedRows.push(sKey);
          }

          this.byId("newRequestOpen").setEnabled(
            this._aSelectedRows.length === 1,
          );
          this.byId("newRequestApprove").setEnabled(
            this._aSelectedRows.length >= 1,
          );
          this.byId("newRequestReject").setEnabled(
            this._aSelectedRows.length >= 1,
          );

          // Make sure the row is visually selected
          oItem.addStyleClass("rowSelected");
        }, this);
      },
      newRequestApprove: function () {
        var oTable = this.byId("newRequestTable");

        if (!oTable) {
          return;
        }

        var iApprovedCount = 0;

        this._aNewRequests.forEach(function (oRow) {
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus === "Pending"
          ) {
            oRow.RequestStatus = "Approved";
            iApprovedCount++;
          }
        }, this);

        this._updatePagination("newTableRequest");

        this._aSelectedRows = [];

        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        if (oTable.getMode() === "MultiSelect") {
          oTable.removeSelections(true);
        }

        // Disable buttons
        this.byId("newRequestOpen").setEnabled(false);
        this.byId("newRequestApprove").setEnabled(false);
        this.byId("newRequestReject").setEnabled(false);

        MessageToast.show(iApprovedCount + " request(s) approved.");
      },
      newRequestReject: function () {
        var oTable = this.byId("newRequestTable");

        if (!oTable) {
          return;
        }

        var iRejectedCount = 0;

        this._aNewRequests.forEach(function (oRow) {
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus === "Pending"
          ) {
            oRow.RequestStatus = "Rejected";
            iRejectedCount++;
          }
        }, this);

        this._updatePagination("newTableRequest");

        this._aSelectedRows = [];

        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        if (oTable.getMode() === "MultiSelect") {
          oTable.removeSelections(true);
        }

        // Disable buttons
        this.byId("newRequestOpen").setEnabled(false);
        this.byId("newRequestApprove").setEnabled(false);
        this.byId("newRequestReject").setEnabled(false);

        MessageToast.show(iRejectedCount + " request(s) rejected.");
      },

      onRowPress: function (oEvent) {
        var oItem = oEvent.getSource();
        var oContext = oItem.getBindingContext("cycles");

        if (!oContext) {
          return;
        }

        // Get the table that contains the pressed row
        var oTable = oItem.getParent();
        var sTableId = oTable.getId();

        if (!this._aSelectedRows) {
          this._aSelectedRows = [];
        }

        var oData = oContext.getObject();

        var sKey = oData.ModelVersion;

        if (!sKey) {
          return;
        }

        var iIndex = this._aSelectedRows.indexOf(sKey);

        if (iIndex === -1) {
          // Select row
          this._aSelectedRows.push(sKey);
          oItem.addStyleClass("rowSelected");
        } else {
          // Deselect row
          this._aSelectedRows.splice(iIndex, 1);
          oItem.removeStyleClass("rowSelected");
        }

        if (sTableId === this.byId("tbApprovalFlow").getId()) {
          this.byId("allRequestsView").setEnabled(
            this._aSelectedRows.length === 1,
          );

          this.byId("allRequestsApprove").setEnabled(
            this._aSelectedRows.length >= 1,
          );

          this.byId("allRequestsReject").setEnabled(
            this._aSelectedRows.length >= 1,
          );
        } else if (sTableId === this.byId("myRequestTable").getId()) {
          this.byId("myRequestView").setEnabled(
            this._aSelectedRows.length === 1,
          );

          this.byId("myRequestDelete").setEnabled(
            this._aSelectedRows.length >= 1,
          );
        } else if (sTableId === this.byId("newRequestTable").getId()) {
          this.byId("newRequestOpen").setEnabled(
            this._aSelectedRows.length === 1,
          );
          this.byId("newRequestApprove").setEnabled(
            this._aSelectedRows.length >= 1,
          );
          this.byId("newRequestReject").setEnabled(
            this._aSelectedRows.length >= 1,
          );
        }
      },

      /* Pagination */

      _getPaginationConfig: function (sTableId) {
        var mPagination = {
          tbApprovalFlow: {
            data: this._aAllCycles,
            currentPage: "_iAllRequestCurrentPage",
            modelPath: "/ApprovalFlow",
            infoId: "txtPaginationInfos",
            firstId: "btFirstPage",
            previousId: "btPreviousPage",
            nextId: "btNextPage",
            lastId: "btLastPage",
          },

          myRequestTable: {
            data: this._aMyRequests,
            currentPage: "_iMyRequestCurrentPage",
            modelPath: "/MyRequests",
            infoId: "myRequestPaginationInfo",
            firstId: "myRequestFirstPage",
            previousId: "myRequestPreviousPage",
            nextId: "myRequestNextPage",
            lastId: "myRequestLastPage",
          },

          newTableRequest: {
            data: this._aNewRequests,
            currentPage: "_iNewRequestCurrentPage",
            modelPath: "/NewRequests",
            infoId: "newRequestPaginationInfo",
            firstId: "newRequestFirstPage",
            previousId: "newRequestPreviousPage",
            nextId: "newRequestNextPage",
            lastId: "newRequestLastPage",
          },
        };

        return mPagination[sTableId];
      },

      onFirstPage: function (oEvent) {
        var sTableId = this._getTableIdFromPaginationButton(oEvent);
        var oConfig = this._getPaginationConfig(sTableId);

        if (!oConfig) {
          return;
        }

        this[oConfig.currentPage] = 1;
        this._updatePagination(sTableId);
      },

      onPreviousPage: function (oEvent) {
        var sTableId = this._getTableIdFromPaginationButton(oEvent);
        var oConfig = this._getPaginationConfig(sTableId);

        if (!oConfig) {
          return;
        }

        if (this[oConfig.currentPage] > 1) {
          this[oConfig.currentPage]--;
          this._updatePagination(sTableId);
        }
      },

      onNextPage: function (oEvent) {
        var sTableId = this._getTableIdFromPaginationButton(oEvent);
        var oConfig = this._getPaginationConfig(sTableId);

        if (!oConfig) {
          return;
        }

        var iTotalPages = this._getTotalPages(sTableId);

        if (this[oConfig.currentPage] < iTotalPages) {
          this[oConfig.currentPage]++;
          this._updatePagination(sTableId);
        }
      },

      onLastPage: function (oEvent) {
        var sTableId = this._getTableIdFromPaginationButton(oEvent);
        var oConfig = this._getPaginationConfig(sTableId);

        if (!oConfig) {
          return;
        }

        this[oConfig.currentPage] = this._getTotalPages(sTableId);
        this._updatePagination(sTableId);
      },

      _getTotalPages: function (sTableId) {
        var oConfig = this._getPaginationConfig(sTableId);

        if (!oConfig) {
          return 1;
        }

        return Math.max(1, Math.ceil(oConfig.data.length / this._iPageSize));
      },

      _updatePagination: function (sTableId) {
        var oModel = this.getView().getModel("cycles");
        var oConfig = this._getPaginationConfig(sTableId);

        if (!oModel || !oConfig) {
          return;
        }

        var aData = oConfig.data;
        var iTotal = aData.length;
        var iTotalPages = this._getTotalPages(sTableId);

        // Make sure current page is valid
        if (this[oConfig.currentPage] > iTotalPages) {
          this[oConfig.currentPage] = iTotalPages;
        }

        var iCurrentPage = this[oConfig.currentPage];

        var iStart = (iCurrentPage - 1) * this._iPageSize;

        var iEnd = Math.min(iStart + this._iPageSize, iTotal);

        var aPageData = aData.slice(iStart, iEnd);

        // Update the correct model property
        oModel.setProperty(oConfig.modelPath, aPageData);

        // Pagination text
        var iFrom = iTotal === 0 ? 0 : iStart + 1;

        this.byId(oConfig.infoId).setText(
          iFrom + " to " + iEnd + " of " + iTotal,
        );

        // Pagination buttons
        this.byId(oConfig.firstId).setEnabled(iCurrentPage > 1);

        this.byId(oConfig.previousId).setEnabled(iCurrentPage > 1);

        this.byId(oConfig.nextId).setEnabled(iCurrentPage < iTotalPages);

        this.byId(oConfig.lastId).setEnabled(iCurrentPage < iTotalPages);
      },

      _getTableIdFromPaginationButton: function (oEvent) {
        var oButton = oEvent.getSource();

        var sButtonId = oButton.getId();

        if (
          sButtonId.indexOf("btFirstPage") !== -1 ||
          sButtonId.indexOf("btPreviousPage") !== -1 ||
          sButtonId.indexOf("btNextPage") !== -1 ||
          sButtonId.indexOf("btLastPage") !== -1
        ) {
          return "tbApprovalFlow";
        }

        if (
          sButtonId.indexOf("myRequestFirstPage") !== -1 ||
          sButtonId.indexOf("myRequestPreviousPage") !== -1 ||
          sButtonId.indexOf("myRequestNextPage") !== -1 ||
          sButtonId.indexOf("myRequestLastPage") !== -1
        ) {
          return "myRequestTable";
        }

        if (
          sButtonId.indexOf("newRequestFirstPage") !== -1 ||
          sButtonId.indexOf("newRequestPreviousPage") !== -1 ||
          sButtonId.indexOf("newRequestNextPage") !== -1 ||
          sButtonId.indexOf("newRequestLastPage") !== -1
        ) {
          return "newTableRequest";
        }

        return null;
      },

      onInit: function () {
        this._aSelectedRows = [];

        this._iPageSize = 10;

        // Current page for each table
        this._iAllRequestCurrentPage = 1;
        this._iMyRequestCurrentPage = 1;
        this._iNewRequestCurrentPage = 1;

        // Complete datasets
        this._aAllCycles = [];
        this._aMyRequests = [];
        this._aNewRequests = [];

        this._xlsxReady = new Promise(function (resolve, reject) {
          if (typeof XLSX !== "undefined") {
            resolve();
            return;
          }

          var oScript = document.createElement("script");
          oScript.src = sap.ui.require.toUrl(
            "project1/thirdparty/xlsx.full.min.js",
          );

          oScript.onload = function () {
            resolve();
          };

          oScript.onerror = function () {
            reject(new Error("Failed to load xlsx.full.min.js"));
          };

          document.head.appendChild(oScript);
        });

        var oCyclesModel = new JSONModel({
          ApprovalFlow: [],
          MyRequests: [],
          NewRequests: [],
        });

        this.getView().setModel(oCyclesModel, "cycles");

        var sPath = sap.ui.require.toUrl("project1/model/cycles.json");

        oCyclesModel.loadData(sPath);

        oCyclesModel.attachRequestCompleted(() => {
          // Get complete dataset
          var aApprovalFlow = oCyclesModel.getProperty("/ApprovalFlow") || [];

          // Keep complete datasets
          this._aAllCycles = JSON.parse(JSON.stringify(aApprovalFlow));
          this._aMyRequests = JSON.parse(JSON.stringify(aApprovalFlow));
          this._aNewRequests = JSON.parse(JSON.stringify(aApprovalFlow));

          // Reset pagination
          this._iAllRequestCurrentPage = 1;
          this._iMyRequestCurrentPage = 1;
          this._iNewRequestCurrentPage = 1;

          // Display first page of each table
          this._updatePagination("tbApprovalFlow");
          this._updatePagination("myRequestTable");
          this._updatePagination("newTableRequest");
        });
      },
      _clearSelection: function (oTable) {
        if (!oTable) {
          return;
        }

        var sTableId = oTable.getId();

        oTable.getItems().forEach(function (oRow) {
          oRow.removeStyleClass("rowSelected");
        });

        if (oTable.getMode() === "MultiSelect") {
          oTable.removeSelections(true);
        }

        this._aSelectedRows = [];

        this._oSelectedContext = null;

        if (sTableId === this.byId("tbApprovalFlow").getId()) {
          this.byId("allRequestsView").setEnabled(false);
          this.byId("allRequestsApprove").setEnabled(false);
          this.byId("allRequestsReject").setEnabled(false);
        } else if (sTableId === this.byId("myRequestTable").getId()) {
          this.byId("myRequestView").setEnabled(false);
          this.byId("myRequestDelete").setEnabled(false);
        } else if (sTableId === this.byId("newRequestTable").getId()) {
          this.byId("newRequestOpen").setEnabled(false);
          this.byId("newRequestApprove").setEnabled(false);
          this.byId("newRequestReject").setEnabled(false);
        }
      },
    });
  },
);
