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

    return Controller.extend("project1.controller.Status", {
      onNavBack: function () {
        window.history.go(-1);
      },
      onUncollapse: function (oEvent) {
        var oButton = oEvent.getSource();
        var sButtonId = oButton.getId();

        if (sButtonId.indexOf("marketingUncollapseButton") !== -1) {
          this.byId("marketingIntelligenceBox").setVisible(true);
          this.byId("marketingCollapseButton").setVisible(true);
          this.byId("marketingUncollapseButton").setVisible(false);
        }
        else if (sButtonId.indexOf("kamGlobalUncollapseButton") !== -1) {
          this.byId("kamGlobalBox").setVisible(true);
          this.byId("kamGlobalCollapseButton").setVisible(true);
          this.byId("kamGlobalUncollapseButton").setVisible(false);
        }
        else if (sButtonId.indexOf("kamLocalUncollapseButton") !== -1) {
          this.byId("kamLocalBox").setVisible(true);
          this.byId("kamLocalCollapseButton").setVisible(true);
          this.byId("kamLocalUncollapseButton").setVisible(false);
        }
        else if (sButtonId.indexOf("buUncollapseButton") !== -1) {
          this.byId("buBox").setVisible(true);
          this.byId("buCollapseButton").setVisible(true);
          this.byId("buUncollapseButton").setVisible(false);
        }
        else if (sButtonId.indexOf("regionUncollapseButton") !== -1) {
          this.byId("regionBox").setVisible(true);
          this.byId("regionCollapseButton").setVisible(true);
          this.byId("regionUncollapseButton").setVisible(false);
        }
      },
      onCollapse: function (oEvent) {
        var oButton = oEvent.getSource();
        var sButtonId = oButton.getId();
        if (sButtonId.indexOf("marketingCollapseButton") !== -1) {
          this.byId("marketingIntelligenceBox").setVisible(false);
          this.byId("marketingCollapseButton").setVisible(false);
          this.byId("marketingUncollapseButton").setVisible(true);
        }
        else if (sButtonId.indexOf("kamGlobalCollapseButton") !== -1) {
          this.byId("kamGlobalBox").setVisible(false);
          this.byId("kamGlobalCollapseButton").setVisible(false);
          this.byId("kamGlobalUncollapseButton").setVisible(true);
        }
        else if (sButtonId.indexOf("kamLocalCollapseButton") !== -1) {
          this.byId("kamLocalBox").setVisible(false);
          this.byId("kamLocalCollapseButton").setVisible(false);
          this.byId("kamLocalUncollapseButton").setVisible(true);
        }
        else if (sButtonId.indexOf("buCollapseButton") !== -1) {
          this.byId("buBox").setVisible(false);
          this.byId("buCollapseButton").setVisible(false);
          this.byId("buUncollapseButton").setVisible(true);
        }
        else if (sButtonId.indexOf("regionCollapseButton") !== -1) {
          this.byId("regionBox").setVisible(false);
          this.byId("regionCollapseButton").setVisible(false);
          this.byId("regionUncollapseButton").setVisible(true);
        }
      },

      statusSearch: function (oEvent) {
        var oButton = oEvent.getSource();
        var sButtonId = oButton.getId();
        if (sButtonId.indexOf("statusSearch") !== -1) {
          this.byId("statusSearch").setEnabled(false);
          this.byId("miFilterToolbar").setVisible(true);
        } 
        else if (sButtonId.indexOf("kamGlobalStatusSearch") !== -1) {
          this.byId("kamGlobalStatusSearch").setEnabled(false);
          this.byId("kgFilterToolbar").setVisible(true);
        }
        else if (sButtonId.indexOf("kamLocalStatusSearch") !== -1) {
          this.byId("kamLocalStatusSearch").setEnabled(false);
          this.byId("klFilterToolbar").setVisible(true);
        }
        else if (sButtonId.indexOf("buStatusSearch") !== -1) {
          this.byId("buStatusSearch").setEnabled(false);
          this.byId("buFilterToolbar").setVisible(true);
        }
        else if (sButtonId.indexOf("regionStatusSearch") !== -1) {
          this.byId("regionStatusSearch").setEnabled(false);
          this.byId("regionFilterToolbar").setVisible(true);
        }
      },
      onSearchSubmit: function (oEvent) {
        var oButton = oEvent.getSource();
        var sButtonId = oButton.getId();

        var oModelVersionInput;
        var oModelInput;
        var oModelStatus;
        var oRegion;
        var oTable;

        if (sButtonId.includes("miFilterSearch")) {
          oModelVersionInput = this.byId("miModelVersionInput");
          oModelInput = this.byId("miModelInput");
          oModelStatus = this.byId("miModelStatusInput");
          oRegion = this.byId("miRegionInput");

          oTable = this.byId("miStatusTable");
        } 
        else if (sButtonId.includes("kgFilterSearch")) {
          oModelVersionInput = this.byId("kgModelVersionInput");
          oModelInput = this.byId("kgModelInput");
          oModelStatus = this.byId("kgModelStatusInput");
          oRegion = this.byId("kgRegionInput");

          oTable = this.byId("kgStatusTable");
        }
        else if (sButtonId.includes("klFilterSearch")) {
          oModelVersionInput = this.byId("klModelVersionInput");
          oModelInput = this.byId("klModelInput");
          oModelStatus = this.byId("klModelStatusInput");
          oRegion = this.byId("klRegionInput");

          oTable = this.byId("klStatusTable");
        }
        else if (sButtonId.includes("buFilterSearch")) {
          oModelVersionInput = this.byId("buModelVersionInput");
          oModelInput = this.byId("buModelInput");
          oModelStatus = this.byId("buModelStatusInput");
          oRegion = this.byId("buRegionInput");

          oTable = this.byId("buStatusTable");
        }
        else if (sButtonId.includes("regionFilterSearch")) {
          oModelVersionInput = this.byId("regionModelVersionInput");
          oModelInput = this.byId("regionModelInput");
          oModelStatus = this.byId("regionModelStatusInput");
          oRegion = this.byId("regionRegionInput");

          oTable = this.byId("regionStatusTable");
        }

        if (!oTable) {
          sap.m.MessageToast.show("Table not found.");
          return;
        }

        var sModelVersion = oModelVersionInput.getValue().trim();
        var sModel = oModelInput.getValue().trim();
        var sModelStatus = oModelStatus.getValue().trim();
        var sRegion = oRegion.getValue().trim();

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

        if (sModelStatus) {
          aFilters.push(
            new sap.ui.model.Filter(
              "ModelStatus",
              sap.ui.model.FilterOperator.Contains,
              sModelStatus,
            ),
          );
        }

        if (sRegion) {
          aFilters.push(
            new sap.ui.model.Filter(
              "Region",
              sap.ui.model.FilterOperator.Contains,
              sRegion,
            ),
          );
        }

        oBinding.filter(aFilters);
      },
      onSearchClear: function (oEvent) {
        var oButton = oEvent.getSource();
        var sButtonId = oButton.getId();

        var oModelVersionInput;
        var oModelInput;
        var oModelStatus;
        var oRegion;
        var oTable;

        if (sButtonId.includes("miFilterClear")) {
          oModelVersionInput = this.byId("miModelVersionInput");
          oModelInput = this.byId("miModelInput");
          oModelStatus = this.byId("miModelStatusInput");
          oRegion = this.byId("miRegionInput");

          oTable = this.byId("miStatusTable");
        } 
        else if (sButtonId.includes("kgFilterClear")) {
          oModelVersionInput = this.byId("kgModelVersionInput");
          oModelInput = this.byId("kgModelInput");
          oModelStatus = this.byId("kgModelStatusInput");
          oRegion = this.byId("kgRegionInput");

          oTable = this.byId("kgStatusTable");
        }
        else if (sButtonId.includes("klFilterClear")) {
          oModelVersionInput = this.byId("klModelVersionInput");
          oModelInput = this.byId("klModelInput");
          oModelStatus = this.byId("klModelStatusInput");
          oRegion = this.byId("klRegionInput");

          oTable = this.byId("klStatusTable");
        }
        else if (sButtonId.includes("buFilterClear")) {
          oModelVersionInput = this.byId("buModelVersionInput");
          oModelInput = this.byId("buModelInput");
          oModelStatus = this.byId("buModelStatusInput");
          oRegion = this.byId("buRegionInput");

          oTable = this.byId("buStatusTable");
        }
        else if (sButtonId.includes("regionFilterClear")) {
          oModelVersionInput = this.byId("regionModelVersionInput");
          oModelInput = this.byId("regionModelInput");
          oModelStatus = this.byId("regionModelStatusInput");
          oRegion = this.byId("regionRegionInput");

          oTable = this.byId("regionStatusTable");
        }

        if (!oTable) {
          return;
        }

        oModelVersionInput.setValue("");
        oModelInput.setValue("");
        oModelStatus.setValue("");
        oRegion.setValue("");

        var oBinding = oTable.getBinding("items");

        if (oBinding) {
          oBinding.filter([]);
        }
      },
      onCloseFilters: function (oEvent) {
        var oButton = oEvent.getSource();
        var sButtonId = oButton.getId();

        var oModelVersionInput;
        var oModelInput;
        var oModelStatus;
        var oRegion;
        var oTable;
        var oSearchButton;
        var oFilterToolbar;

        if (sButtonId.includes("miCloseFilters")) {
          oModelVersionInput = this.byId("miModelVersionInput");
          oModelInput = this.byId("miModelInput");
          oModelStatus = this.byId("miModelStatusInput");
          oRegion = this.byId("miRegionInput");

          oTable = this.byId("miStatusTable");
          oSearchButton = this.byId("statusSearch");
          oFilterToolbar = this.byId("miFilterToolbar");
        } 
        else if (sButtonId.includes("kgCloseFilters")) {
          oModelVersionInput = this.byId("kgModelVersionInput");
          oModelInput = this.byId("kgModelInput");
          oModelStatus = this.byId("kgModelStatusInput");
          oRegion = this.byId("kgRegionInput");

          oTable = this.byId("kgStatusTable");
          oSearchButton = this.byId("kamGlobalStatusSearch");
          oFilterToolbar = this.byId("kgFilterToolbar");
        }
        else if (sButtonId.includes("klCloseFilters")) {
          oModelVersionInput = this.byId("klModelVersionInput");
          oModelInput = this.byId("klModelInput");
          oModelStatus = this.byId("klModelStatusInput");
          oRegion = this.byId("klRegionInput");

          oTable = this.byId("klStatusTable");
          oSearchButton = this.byId("kamLocalStatusSearch");
          oFilterToolbar = this.byId("klFilterToolbar");
        }
        else if (sButtonId.includes("buCloseFilters")) {
          oModelVersionInput = this.byId("buModelVersionInput");
          oModelInput = this.byId("buModelInput");
          oModelStatus = this.byId("buModelStatusInput");
          oRegion = this.byId("buRegionInput");

          oTable = this.byId("buStatusTable");
          oSearchButton = this.byId("buStatusSearch");
          oFilterToolbar = this.byId("buFilterToolbar");
        }
        else if (sButtonId.includes("regionCloseFilters")) {
          oModelVersionInput = this.byId("regionModelVersionInput");
          oModelInput = this.byId("regionModelInput");
          oModelStatus = this.byId("regionModelStatusInput");
          oRegion = this.byId("regionRegionInput");

          oTable = this.byId("regionStatusTable");
          oSearchButton = this.byId("regionStatusSearch");
          oFilterToolbar = this.byId("regionFilterToolbar");
        }

        if (!oTable) {
          return;
        }

        oModelVersionInput.setValue("");
        oModelInput.setValue("");
        oModelStatus.setValue("");
        oRegion.setValue("");

        var oBinding = oTable.getBinding("items");

        if (oBinding) {
          oBinding.filter([]);
        }

        oSearchButton.setEnabled(true);
        oFilterToolbar.setVisible(false);
      },
      onRowPress: function (oEvent) {
        var oItem = oEvent.getSource();
        var oContext = oItem.getBindingContext("cycles");

        if (!oContext) {
          return;
        }

        var oTable = oItem.getParent();
        var oData = oContext.getObject();
        var sKey = oData.ModelVersion;

        if (!sKey) {
          return;
        }

        // Initialize selection
        if (!this._aSelectedRows) {
          this._aSelectedRows = [];
        }

        // If the same row is pressed again, deselect it
        if (
          this._aSelectedRows.length === 1 &&
          this._aSelectedRows[0] === sKey
        ) {
          this._aSelectedRows = [];
          oItem.removeStyleClass("rowSelected");

          return;
        }

        // Remove previous visual selection
        var aItems = oTable.getItems();

        aItems.forEach(function (oRow) {
          oRow.removeStyleClass("rowSelected");
        });

        // Keep only the newly selected row
        this._aSelectedRows = [sKey];

        // Highlight the newly selected row
        oItem.addStyleClass("rowSelected");
      },
      _getPaginationConfig: function (sTableId) {
        var mPagination = {
          miStatusTable: {
            data: this._aMarketingIntellegence,
            currentPage: "_iMarketingIntellegence",
            modelPath: "/MarketingIntellegence",
            infoId: "statusPaginationInfos",
            firstId: "statusFirstPage",
            previousId: "statusPreviousPage",
            nextId: "statusNextPage",
            lastId: "statusLastPage",
          },

          kgStatusTable: {
            data: this._aKamGlobal,
            currentPage: "_iKamGlobal",
            modelPath: "/KamGlobal",
            infoId: "kamGlobalStatusPaginationInfos",
            firstId: "kamGlobalStatusFirstPage",
            previousId: "kamGlobalStatusPreviousPage",
            nextId: "kamGlobalStatusNextPage",
            lastId: "kamGlobalStatusLastPage",
          },

          klStatusTable: {
            data: this._aKamLocal,
            currentPage: "_iKamLocal",
            modelPath: "/KamLocal",
            infoId: "kamLocalStatusPaginationInfos",
            firstId: "kamLocalStatusFirstPage",
            previousId: "kamLocalStatusPreviousPage",
            nextId: "kamLocalStatusNextPage",
            lastId: "kamLocalStatusLastPage",
          },

          buStatusTable: {
            data: this._aBusinessUnit,
            currentPage: "_iBusinessUnit",
            modelPath: "/BusinessUnit",
            infoId: "buStatusPaginationInfos",
            firstId: "buStatusFirstPage",
            previousId: "buStatusPreviousPage",
            nextId: "buStatusNextPage",
            lastId: "buStatusLastPage",
          },

          regionStatusTable: {
            data: this._aRegion,
            currentPage: "_iRegion",
            modelPath: "/Region",
            infoId: "regionStatusPaginationInfos",
            firstId: "regionStatusFirstPage",
            previousId: "regionStatusPreviousPage",
            nextId: "regionStatusNextPage",
            lastId: "regionStatusLastPage",
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
          sButtonId.indexOf("statusFirstPage") !== -1 ||
          sButtonId.indexOf("statusPreviousPage") !== -1 ||
          sButtonId.indexOf("statusNextPage") !== -1 ||
          sButtonId.indexOf("statusLastPage") !== -1
        ) {
          return "miStatusTable";
        }
        else if (
          sButtonId.indexOf("kamGlobalStatusFirstPage") !== -1 ||
          sButtonId.indexOf("kamGlobalStatusPreviousPage") !== -1 ||
          sButtonId.indexOf("kamGlobalStatusNextPage") !== -1 ||
          sButtonId.indexOf("kamGlobalStatusLastPage") !== -1
        ) {
          return "kgStatusTable";
        }
        else if (
          sButtonId.indexOf("kamLocalStatusFirstPage") !== -1 ||
          sButtonId.indexOf("kamLocalStatusPreviousPage") !== -1 ||
          sButtonId.indexOf("kamLocalStatusNextPage") !== -1 ||
          sButtonId.indexOf("kamLocalStatusLastPage") !== -1
        ) {
          return "klStatusTable";
        }
        else if (
          sButtonId.indexOf("buStatusFirstPage") !== -1 ||
          sButtonId.indexOf("buStatusPreviousPage") !== -1 ||
          sButtonId.indexOf("buStatusNextPage") !== -1 ||
          sButtonId.indexOf("buStatusLastPage") !== -1
        ) {
          return "buStatusTable";
        }
        else if (
          sButtonId.indexOf("regionStatusFirstPage") !== -1 ||
          sButtonId.indexOf("regionStatusPreviousPage") !== -1 ||
          sButtonId.indexOf("regionStatusNextPage") !== -1 ||
          sButtonId.indexOf("regionStatusLastPage") !== -1
        ) {
          return "regionStatusTable";
        }

        return null;
      },
      onInit: function () {
        this._aSelectedRows = [];

        this._iPageSize = 10;

        // Current page for each table
        this._iMarketingIntellegence = 1;
        this._iKamGlobal = 1;
        this._iKamLocal = 1;
        this._iBusinessUnit = 1;
        this._iRegion = 1;

        // Complete datasets
        this._aMarketingIntellegence = [];
        this._aKamGlobal = [];
        this._aKamLocal = [];
        this._aBusinessUnit = [];
        this._aRegion = [];

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
          MarketingIntellegence: [],
          KamGlobal: [],
          KamLocal: [],
          BusinessUnit: [],
          Region: [],
        });

        this.getView().setModel(oCyclesModel, "cycles");

        var sPath = sap.ui.require.toUrl("project1/model/cycles.json");

        oCyclesModel.loadData(sPath);

        oCyclesModel.attachRequestCompleted(() => {
          // Get complete dataset
          var aApprovalFlow = oCyclesModel.getProperty("/Status") || [];

          // Keep complete datasets
          this._aMarketingIntellegence = JSON.parse(JSON.stringify(aApprovalFlow));
          this._aKamGlobal = JSON.parse(JSON.stringify(aApprovalFlow));
          this._aKamLocal = JSON.parse(JSON.stringify(aApprovalFlow));
          this._aBusinessUnit = JSON.parse(JSON.stringify(aApprovalFlow));
          this._aRegion = JSON.parse(JSON.stringify(aApprovalFlow));

          // Reset pagination
          this._iMarketingIntellegence = 1;
          this._iKamGlobal = 1;
          this._iKamLocal = 1;
          this._iBusinessUnit = 1;
          this._iRegion = 1;

          // Display first page of each table
          this._updatePagination("miStatusTable");
          this._updatePagination("kgStatusTable");
          this._updatePagination("klStatusTable");
          this._updatePagination("buStatusTable");
          this._updatePagination("regionStatusTable");
        });
      },
    });
  },
);
