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
        this.byId("allRequestsInput").setVisible(true);
      },
      onSearchSubmit: function (oEvent) {
        sap.m.MessageToast.show(
          "Search submitted: " + oEvent.getParameter("value"),
        );
        this.byId("allRequestsInput").setVisible(false);
      },
      allRequestsView: function () {
        sap.m.MessageToast.show("View button clicked!");
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

        var oModel = this.getView().getModel("cycles");

        if (!oModel) {
          return;
        }

        var iApprovedCount = 0;

        // Update the complete dataset
        this._aAllCycles.forEach(function (oRow) {
          // Check if this row was selected
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus == "Pending"
          ) {
            // Update status
            oRow.RequestStatus = "Approved";

            iApprovedCount++;
          }
        }, this);

        // Refresh the table model
        this._allRequestUpdatePage();

        // Clear selected rows
        this._aSelectedRows = [];

        // Remove visual selection
        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        sap.m.MessageToast.show(iApprovedCount + " request(s) approved.");
      },
      allRequestsReject: function () {
        var oTable = this.byId("tbApprovalFlow");

        if (!oTable) {
          return;
        }

        var oModel = this.getView().getModel("cycles");

        if (!oModel) {
          return;
        }

        var iRejectedCount = 0;

        // Update the complete dataset
        this._aAllCycles.forEach(function (oRow) {
          // Check if this row was selected
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus == "Pending"
          ) {
            // Update status
            oRow.RequestStatus = "Rejected";

            iRejectedCount++;
          }
        }, this);

        // Refresh the table model
        this._allRequestUpdatePage();

        // Clear selected rows
        this._aSelectedRows = [];

        // Remove visual selection
        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        sap.m.MessageToast.show(iRejectedCount + " request(s) rejected.");
      },

      /*My Requests Actions*/
      myRequestView: function () {
        sap.m.MessageToast.show("View button clicked!");
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
        sap.m.MessageToast.show("Delete button clicked!");
      },
      myRequestSendRequest: function () {
        sap.m.MessageToast.show("Send Request button clicked!");
      },

      /* New Requests Actions */
      newRequestOpen: function () {
        sap.m.MessageToast.show("Open button clicked!");
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

        var oModel = this.getView().getModel("cycles");

        if (!oModel) {
          return;
        }

        var iApprovedCount = 0;

        // Update the complete dataset
        this._aAllCycles.forEach(function (oRow) {
          // Check if this row was selected
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus == "Pending"
          ) {
            // Update status
            oRow.RequestStatus = "Approved";

            iApprovedCount++;
          }
        }, this);

        // Refresh the table model
        this._newRequestUpdatePage();

        // Clear selected rows
        this._aSelectedRows = [];

        // Remove visual selection
        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        sap.m.MessageToast.show(iApprovedCount + " request(s) approved.");
      },
      newRequestReject: function () {
        var oTable = this.byId("newRequestTable");

        if (!oTable) {
          return;
        }

        var oModel = this.getView().getModel("cycles");

        if (!oModel) {
          return;
        }

        var iRejectedCount = 0;

        // Update the complete dataset
        this._aAllCycles.forEach(function (oRow) {
          // Check if this row was selected
          if (
            this._aSelectedRows.indexOf(oRow.ModelVersion) !== -1 &&
            oRow.RequestStatus == "Pending"
          ) {
            // Update status
            oRow.RequestStatus = "Rejected";

            iRejectedCount++;
          }
        }, this);

        // Refresh the table model
        this._newRequestUpdatePage();

        // Clear selected rows
        this._aSelectedRows = [];

        // Remove visual selection
        oTable.getItems().forEach(function (oItem) {
          oItem.removeStyleClass("rowSelected");
        });

        sap.m.MessageToast.show(iRejectedCount + " request(s) rejected.");
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

        // Use a unique value from your data
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
        }
        else if (sTableId === this.byId("myRequestTable").getId()) {
          this.byId("myRequestView").setEnabled(
            this._aSelectedRows.length === 1,
          );

          this.byId("myRequestDelete").setEnabled(
            this._aSelectedRows.length >= 1,
          );
        }
        else if (sTableId === this.byId("newRequestTable").getId()) {
          this.byId("newRequestOpen").setEnabled(
            this._aSelectedRows.length === 1,
          );
          this.byId("newRequestApprove").setEnabled(
            this._aSelectedRows.length >= 1,
          );
          this.byId("newRequestReject").setEnabled(
            this._aSelectedRows.length >= 1,
          );}
      },

      /* All Requests Pagination */
      onFirstPage: function () {
        this._iAllRequestCurrentPage = 1;
        this._allRequestUpdatePage();
      },

      onPreviousPage: function () {
        if (this._iAllRequestCurrentPage > 1) {
          this._iAllRequestCurrentPage--;
          this._allRequestUpdatePage();
        }
      },

      onNextPage: function () {
        var iTotalPages = this._getAllRequestTotalPages();

        if (this._iAllRequestCurrentPage < iTotalPages) {
          this._iAllRequestCurrentPage++;
          this._allRequestUpdatePage();
        }
      },

      onLastPage: function () {
        this._iAllRequestCurrentPage = this._getAllRequestTotalPages();
        this._allRequestUpdatePage();
      },

      _getAllRequestTotalPages: function () {
        return Math.max(
          1,
          Math.ceil(this._aAllCycles.length / this._iPageSize),
        );
      },

      _allRequestUpdatePage: function () {
        var oModel = this.getView().getModel("cycles");

        var iTotal = this._aAllCycles.length;
        var iTotalPages = this._getAllRequestTotalPages();

        var iStart = (this._iAllRequestCurrentPage - 1) * this._iPageSize;

        var iEnd = Math.min(iStart + this._iPageSize, iTotal);

        var aPageData = this._aAllCycles.slice(iStart, iEnd);

        oModel.setProperty("/ApprovalFlow", aPageData);

        var iFrom = iTotal === 0 ? 0 : iStart + 1;

        this.byId("txtPaginationInfos").setText(
          iFrom + " to " + iEnd + " of " + iTotal,
        );

        this.byId("btFirstPage").setEnabled(this._iAllRequestCurrentPage > 1);

        this.byId("btPreviousPage").setEnabled(
          this._iAllRequestCurrentPage > 1,
        );

        this.byId("btNextPage").setEnabled(
          this._iAllRequestCurrentPage < iTotalPages,
        );

        this.byId("btLastPage").setEnabled(
          this._iAllRequestCurrentPage < iTotalPages,
        );
      },
      

      /* My Requests Pagination */
      myRequestsFirstPage: function () {
        this._iMyRequestCurrentPage = 1;
        this._myRequestUpdatePage();
      },

      myRequestsPreviousPage: function () {
        if (this._iMyRequestCurrentPage > 1) {
          this._iMyRequestCurrentPage--;
          this._myRequestUpdatePage();
        }
      },

      myRequestsNextPage: function () {
        var iTotalPages = this._getMyRequestTotalPages();

        if (this._iMyRequestCurrentPage < iTotalPages) {
          this._iMyRequestCurrentPage++;
          this._myRequestUpdatePage();
        }
      },

      myRequestsLastPage: function () {
        this._iMyRequestCurrentPage = this._getMyRequestTotalPages();
        this._myRequestUpdatePage();
      },

      _getMyRequestTotalPages: function () {
        return Math.max(
          1,
          Math.ceil(this._aMyRequests.length / this._iPageSize),
        );
      },

      _myRequestUpdatePage: function () {
        var oModel = this.getView().getModel("cycles");

        if (!oModel) {
          return;
        }

        var iTotal = this._aMyRequests.length;
        var iTotalPages = this._getMyRequestTotalPages();

        // Make sure current page is valid
        if (this._iMyRequestCurrentPage > iTotalPages) {
          this._iMyRequestCurrentPage = iTotalPages;
        }

        var iStart = (this._iMyRequestCurrentPage - 1) * this._iPageSize;

        var iEnd = Math.min(iStart + this._iPageSize, iTotal);

        var aPageData = this._aMyRequests.slice(iStart, iEnd);

        // ONLY update My Requests
        oModel.setProperty("/MyRequests", aPageData);

        // Update pagination information
        var iFrom = iTotal === 0 ? 0 : iStart + 1;

        this.byId("myRequestPaginationInfo").setText(
          iFrom + " to " + iEnd + " of " + iTotal,
        );

        // Enable / disable buttons
        this.byId("myRequestFirstPage").setEnabled(
          this._iMyRequestCurrentPage > 1,
        );

        this.byId("myRequestPreviousPage").setEnabled(
          this._iMyRequestCurrentPage > 1,
        );

        this.byId("myRequestNextPage").setEnabled(
          this._iMyRequestCurrentPage < iTotalPages,
        );

        this.byId("myRequestLastPage").setEnabled(
          this._iMyRequestCurrentPage < iTotalPages,
        );
      },
      /* New Requests Pagination */
      newRequestsFirstPage: function () {
        this._iNewRequestCurrentPage = 1;
        this._newRequestUpdatePage();
      },

      newRequestsPreviousPage: function () {
        if (this._iNewRequestCurrentPage > 1) {
          this._iNewRequestCurrentPage--;
          this._newRequestUpdatePage();
        }
      },

      newRequestsNextPage: function () {
        var iTotalPages = this._getNewRequestTotalPages();

        if (this._iNewRequestCurrentPage < iTotalPages) {
          this._iNewRequestCurrentPage++;
          this._newRequestUpdatePage();
        }
      },

      newRequestsLastPage: function () {
        this._iNewRequestCurrentPage = this._getNewRequestTotalPages();
        this._newRequestUpdatePage();
      },

      _getNewRequestTotalPages: function () {
        return Math.max(
          1,
          Math.ceil(this._aMyRequests.length / this._iPageSize),
        );
      },

      _newRequestUpdatePage: function () {
        var oModel = this.getView().getModel("cycles");

        if (!oModel) {
          return;
        }

        var iTotal = this._aMyRequests.length;
        var iTotalPages = this._getNewRequestTotalPages();

        // Make sure current page is valid
        if (this._iNewRequestCurrentPage > iTotalPages) {
          this._iNewRequestCurrentPage = iTotalPages;
        }

        var iStart = (this._iNewRequestCurrentPage - 1) * this._iPageSize;

        var iEnd = Math.min(iStart + this._iPageSize, iTotal);

        var aPageData = this._aNewRequests.slice(iStart, iEnd);

        // ONLY update New Requests
        oModel.setProperty("/NewRequests", aPageData);

        // Update pagination information
        var iFrom = iTotal === 0 ? 0 : iStart + 1;

        this.byId("newRequestPaginationInfo").setText(
          iFrom + " to " + iEnd + " of " + iTotal,
        );

        // Enable / disable buttons
        this.byId("newRequestFirstPage").setEnabled(
          this._iNewRequestCurrentPage > 1,
        );

        this.byId("newRequestPreviousPage").setEnabled(
          this._iNewRequestCurrentPage > 1,
        );

        this.byId("newRequestNextPage").setEnabled(
          this._iNewRequestCurrentPage < iTotalPages,
        );

        this.byId("newRequestLastPage").setEnabled(
          this._iNewRequestCurrentPage < iTotalPages,
        );
      },

      onInit: function () {
        this._aSelectedRows = [];
        // ---- Pagination setup ----
        this._iPageSize = 10;
        this._iAllRequestCurrentPage = 1;
        this._iMyRequestCurrentPage = 1;
        this._iNewRequestCurrentPage = 1;

        this._aAllCycles = [];

        // ---- Load XLSX library ----
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

        var that = this;

        var oCyclesModel = new JSONModel({
          ApprovalFlow: [],
          MyRequests: [],
          NewRequests: [],
        });

        this.getView().setModel(oCyclesModel, "cycles");

        // ---- Load cycles.json ----
        var sPath = sap.ui.require.toUrl("project1/model/cycles.json");

        oCyclesModel.loadData(sPath);

        oCyclesModel.attachRequestCompleted(function () {
          // Keep the complete ApprovalFlow dataset
          that._aAllCycles = oCyclesModel.getProperty("/ApprovalFlow") || [];
          that._aMyRequests = oCyclesModel.getProperty("/ApprovalFlow") || [];
          that._aNewRequests = oCyclesModel.getProperty("/ApprovalFlow") || [];
          // Reset both pagination states
          that._iAllRequestCurrentPage = 1;
          that._iMyRequestCurrentPage = 1;
          that._iNewRequestCurrentPage = 1;

          // Display first page
          that._allRequestUpdatePage();
          that._myRequestUpdatePage();
          that._newRequestUpdatePage();
        });
      },
    });
  },
);
