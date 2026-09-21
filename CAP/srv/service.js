const cds = require('@sap/cds');

  /**
   * CyclesService custom logic.
   *
   * Implements soft delete for both Cycles and Models: a DELETE does not remove
   * the row, it just flips `deleted` to 1. Soft-deleted rows are filtered out of
   * every READ, so from the outside each entity behaves like a normal deletable one.
   */
  module.exports = cds.service.impl(function () {

    // Hide soft-deleted rows from every read (list + by-key + navigation).
    this.before('READ', 'Cycles', (req) => {
        req.query.where('deleted = 0 or deleted is null');
    });

    // Turn "delete an active Cycle" into "set deleted = 1".
    this.on('DELETE', 'Cycles', async (req, next) => {
        // Draft rows (IsActiveEntity = false) are throw-away edit copies -
        // let the draft framework delete those for real.
        if (req.data.IsActiveEntity === false) {
            return next();
        }

        const { ID } = req.data;
        await UPDATE('cycles.Cycles').set({ deleted: 1 }).where({ ID });
        // Fall through with no result -> CAP responds 204 No Content, like a real DELETE.
    });

    // Same soft-delete pattern for Models. Models isn't draft-enabled, so
    // there's no IsActiveEntity branch to worry about - every DELETE here is real.
    this.before('READ', 'Models', (req) => {
        req.query.where('deleted = 0 or deleted is null');
    });

    this.on('DELETE', 'Models', async (req, next) => {
        const { ID } = req.data;
        await UPDATE('cycles.Models').set({ deleted: 1 }).where({ ID });
    });
  });