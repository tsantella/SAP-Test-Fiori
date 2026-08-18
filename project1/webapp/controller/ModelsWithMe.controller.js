sap.ui.define([
      "sap/ui/core/mvc/Controller",
      "sap/ui/model/json/JSONModel",
      "sap/m/MessageToast",
      "sap/m/MessageBox"
  ], function (Controller, JSONModel, MessageToast, MessageBox) {
      "use strict";
      return Controller.extend("project1.controller.ModelsWithMe", {

          // Called automatically by UI5 once when this view is first created.
          // Sets up pagination state, loads the model data, and wires up the
          // "click outside the table" deselect behavior.
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
              // reads from _aFilteredModels, not _aAllModels), and renders the first page.
              oModelsModel.attachRequestCompleted(() => {
                  this._aAllModels = oModelsModel.getProperty("/Models");
                  this._aFilteredModels = this._aAllModels.slice();
                  this._updatePage();
              });

              // Click outside the table deselects the current row
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

          // ===================== Toolbar button stubs =====================
          // None of these have real logic yet - each is just wired to its button's
          // press event in the view so the app doesn't error out. Replace the
          // MessageToast.show(...) call with real behavior as each feature gets built.

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
          // both live search and delete can reuse the same matching logic.
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
          // keystroke is the expected behavior (unlike delete, which preserves the
          // current page - see _deleteSelectedModel).
          _applySearchFilter: function (sQuery) {
              this._aFilteredModels = this._getFilteredModels(sQuery);
              this._iCurrentPage = 1;
              this._updatePage();
          },

          onNew: function () { MessageToast.show("New button clicked!"); },
          onEdit: function () { MessageToast.show("Edit not implemented yet."); },
          onSendMultiple: function () { MessageToast.show("Send Multiple Models not implemented yet."); },
          onSendAll: function () { MessageToast.show("Send All Models not implemented yet."); },
          onImport: function () { MessageToast.show("Import not implemented yet."); },
          onExportExcel: function () { MessageToast.show("Export to Excel not implemented yet."); },

          
          // Fires when the Delete button is pressed. Confirms with the user before
          // actually removing anything. Note: UI5's MessageBox.Action enum has no
          // built-in DELETE constant (only OK/CANCEL/YES/NO/RETRY/IGNORE/ABORT/CLOSE),
          // so a custom "Delete" string label is used for the affirmative action -
          // same pattern your fellow dev used for her Save confirmation.
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