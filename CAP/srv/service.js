const cds = require('@sap/cds');

/**
 * CyclesService custom logic.
 *
 * Implements soft delete: a DELETE on an active Cycle does not remove the row,
 * it just flips `deleted` to 1. Soft-deleted rows are filtered out of every READ,
 * so from the outside the entity behaves like a normal deletable entity.
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
});
