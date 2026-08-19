sap.ui.define([
      "sap/ui/core/mvc/Controller",
      "sap/ui/model/json/JSONModel",
      "sap/m/MessageToast",
      "sap/m/MessageBox",
      "sap/ui/core/EventBus"
  ], function (Controller, JSONModel, MessageToast, MessageBox, EventBus) {
      "use strict";
      return Controller.extend("project1.controller.ModelsWithMe", {

          // Called automatically by UI5 once when this view is first created.
          // Sets up pagination state, loads the model data, loads the defaults the
          // Edit/New/View detail screen needs, and wires up the "click outside the
          // table" deselect + double-click-to-view behavior.
          onInit: function () {
              this._iPageSize = 10;
              this._iCurrentPage = 1;

              // The FLP shell wraps every screen in a width-limited "Cozy" container
              // by default (a fixed max width, centered with side margins). That's
              // shared across the whole app, so we can't fix it with CSS scoped to
              // this screen alone - SAP's own shell JS actively reapplies it. Instead,
              // toggle the shell's class only while THIS screen is showing: remove it
              // when we arrive here, restore it the moment any other route is matched
              // (i.e. when navigating away), so My Cycles keeps its normal layout.
              var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
              oRouter.getRoute("RouteModelsWithMe").attachPatternMatched(this._onModelsWithMeMatched, this);
              oRouter.attachRouteMatched(this._onAnyRouteMatched, this);

              // The "models" model only ever holds the CURRENT page's slice
              var oModelsModel = new JSONModel({ Models: [] });
              this.getView().setModel(oModelsModel, "models");

              var sPath = sap.ui.require.toUrl("project1/model/modelsWithMe.json");
              oModelsModel.loadData(sPath);

              // loadData() above is async, so this runs once modelsWithMe.json has
              // actually finished loading. Stores the full dataset, initializes the
              // filtered working set to match it (no search applied yet - pagination
              // reads from _aFilteredModels, not _aAllModels), rebuilds the Edit/New
              // dropdown options, and renders the first page.
              oModelsModel.attachRequestCompleted(() => {
                  this._aAllModels = oModelsModel.getProperty("/Models");
                  this._aFilteredModels = this._aAllModels.slice();
                  this._updatePage();
                  this._rebuildDropdownOptions();
              });

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
              var oPage = this.byId("ModelsWithMe");
              oPage.addEventDelegate({
                  onclick: (oEvent) => {
                      var oTable = this.byId("tblModels");
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
                      var oTable = this.byId("tblModels");

                      var bIsRowClick = oTable.getItems().some((row) => {
                          return row.getDomRef() && row.getDomRef().contains(oEvent.target);
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
              var oSearchField = this.byId("sfModelsSearch");
              oSearchField.addEventDelegate({
                  onsapfocusleave: () => {
                      if (!oSearchField.getValue()) {
                          this.byId("btnModelsSearch").setVisible(true);
                          oSearchField.setVisible(false);
                      }
                  }
              });
          },

          // Unsubscribes from the EventBus when this view is destroyed, so a stale
          // listener doesn't linger and fire after the controller is gone.
          onExit: function () {
              EventBus.getInstance().unsubscribe("app", "modelSaved", this._onModelSaved, this);
          },

          // Fires every time navigation lands on RouteModelsWithMe (unlike onInit,
          // this runs on every visit, not just the first). Removes the shell's
          // width-limiting class so this screen renders edge-to-edge.
          _onModelsWithMeMatched: function () {
              var oShellContainer = document.querySelector(".sapUShellApplicationContainer");
              if (oShellContainer) {
                  oShellContainer.classList.remove("sapUShellApplicationContainerLimitedWidth");
              }
          },

          // Fires on EVERY route match app-wide. Restores the shell's normal
          // width-limited layout as soon as the user navigates to any screen
          // other than this one, so My Cycles (and everything else) is unaffected.
          _onAnyRouteMatched: function (oEvent) {
              if (oEvent.getParameter("name") !== "RouteModelsWithMe") {
                  var oShellContainer = document.querySelector(".sapUShellApplicationContainer");
                  if (oShellContainer) {
                      oShellContainer.classList.add("sapUShellApplicationContainerLimitedWidth");
                  }
              }
          },

          // Fires when a table row is clicked (bound via press="onRowPress" in the view).
          // Highlights the clicked row and enables the Edit/Delete buttons.
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

          // Undoes onRowPress: removes the highlight from every row and disables
          // Edit/Delete again. Called when the user clicks outside the table.
          _clearSelection: function () {
              var oTable = this.byId("tblModels");
              oTable.getItems().forEach(function (row) {
                  row.removeStyleClass("rowSelected");
              });
              this._oSelectedContext = null;
              this.byId("btnModelsEdit").setEnabled(false);
              this.byId("btnModelsDelete").setEnabled(false);
          },

          // ===================== Search =====================

          // Fires when the Search button is pressed. Swaps the button out for the
          // SearchField (only one is visible at a time). Opening focuses the field
          // so the user can type right away; closing clears whatever was typed and
          // resets the table back to showing everything.
          onSearch: function () {
              var oSearchField = this.byId("sfModelsSearch");
              var oSearchButton = this.byId("btnModelsSearch");
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
          onSearchLiveChange: function (oEvent) {
              var sQuery = oEvent.getParameter("newValue");
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
          onEdit: function () {
              if (this._oSelectedContext) {
                  this._pDefaultsLoaded.then(() => {
                      this._openModelDetail("edit");
                  });
              }
          },

          // Opens the detail screen in "create new" mode - clears any current
          // selection first, since a new record isn't tied to an existing row.
          onNew: function () {
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

              var sCurrentQuery = this.byId("sfModelsSearch").getValue();
              this._aFilteredModels = this._getFilteredModels(sCurrentQuery);

              var iTotalPages = this._getTotalPages();
              if (this._iCurrentPage > iTotalPages) {
                  this._iCurrentPage = iTotalPages;
              }

              this._updatePage();
              this._rebuildDropdownOptions();
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

          // ===================== Toolbar button stubs =====================
          // None of these have real logic yet - each is just wired to its button's
          // press event in the view so the app doesn't error out. Replace the
          // MessageToast.show(...) call with real behavior as each feature gets built.

          onSendMultiple: function () { MessageToast.show("Send Multiple Models not implemented yet."); },
          onSendAll: function () { MessageToast.show("Send All Models not implemented yet."); },
          onImport: function () { MessageToast.show("Import not implemented yet."); },
          onExportExcel: function () { MessageToast.show("Export to Excel not implemented yet."); },

          // ===================== Delete =====================

          // Fires when the Delete button is pressed. Confirms with the user before
          // actually removing anything. Note: UI5's MessageBox.Action enum has no
          // built-in DELETE constant (only OK/CANCEL/YES/NO/RETRY/IGNORE/ABORT/CLOSE),
          // so a custom "Delete" string label is used for the affirmative action -
          // same pattern used for the detail screen's Save confirmation.
          onDelete: function () {
              if (!this._oSelectedContext) return;

              var oSelectedData = this._oSelectedContext.getObject();
              MessageBox.confirm(
                  "Are you sure you want to delete \"" + oSelectedData.Model + "\"?",
                  {
                      title: "Delete Model",
                      actions: ["Delete", MessageBox.Action.CANCEL],
                      emphasizedAction: "Delete",
                      onClose: (sAction) => {
                          if (sAction === "Delete") this._deleteSelectedModel();
                      }
                  }
              );
          },

          // Removes the selected model from both _aAllModels (source of truth) and
          // _aFilteredModels (keeps search results in sync if one's active), then
          // preserves the current page unless it was the last row on the last page.
          _deleteSelectedModel: function () {
              var oSelectedData = this._oSelectedContext.getObject();

              var iAllIndex = this._aAllModels.indexOf(oSelectedData);
              if (iAllIndex > -1) {
                  this._aAllModels.splice(iAllIndex, 1);
              }

              var sCurrentQuery = this.byId("sfModelsSearch").getValue();
              this._aFilteredModels = this._getFilteredModels(sCurrentQuery);

              var iTotalPages = this._getTotalPages();
              if (this._iCurrentPage > iTotalPages) {
                  this._iCurrentPage = iTotalPages;
              }

              this._clearSelection();
              this._updatePage();
              MessageToast.show("Model deleted!");
          },

          // ===================== Pagination =====================
          // Design: this._aAllModels always holds the FULL dataset (all rows from
          // modelsWithMe.json). The "models" model bound to the table only ever
          // holds the current page's slice (this._iPageSize rows). The four
          // onXxxPage handlers below just move this._iCurrentPage and call
          // _updatePage() to recompute and re-render that slice.

          // Jump to page 1.
          onFirstPage: function () {
              this._iCurrentPage = 1;
              this._updatePage();
          },

          // Go back one page, if not already on the first page.
          onPreviousPage: function () {
              if (this._iCurrentPage > 1) {
                  this._iCurrentPage--;
                  this._updatePage();
              }
          },

          // Go forward one page, if not already on the last page.
          onNextPage: function () {
              var iTotalPages = this._getTotalPages();
              if (this._iCurrentPage < iTotalPages) {
                  this._iCurrentPage++;
                  this._updatePage();
              }
          },

          // Jump to the last page.
          onLastPage: function () {
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
