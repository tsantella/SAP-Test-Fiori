const cds = require('@sap/cds');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const cron = require('node-cron');

// ---- sendModels settings ----
const MAIL_FROM_NAME = 'AUMOVIO LVPF Acceptance - Automotive';
const MAX_RECIPIENTS = 10;
const MAX_BODY_ROWS = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Short summary shown in the email body - kept narrow so it reads well in email clients.
const SUMMARY_COLUMNS = [
    { label: 'Model', property: 'model' },
    { label: 'Model Version', property: 'modelVersion' },
    { label: 'Brand', property: 'brand' },
    { label: 'OE Group', property: 'oeGroup' },
    { label: 'Model Status', property: 'modelStatus' }
];

// Full column set for the .xlsx attachment - same labels and order as Export to Excel.
const EXPORT_COLUMNS = [
    { label: 'Model Status', property: 'modelStatus' },
    { label: 'OE grp Nr', property: 'oeGroupNr' },
    { label: 'OE Group', property: 'oeGroup' },
    { label: 'Brand nr', property: 'brandNr' },
    { label: 'Brand', property: 'brand' },
    { label: 'Sub group', property: 'subGroup' },
    { label: 'Region', property: 'region' },
    { label: 'Country', property: 'country' },
    { label: 'Model version', property: 'modelVersion' },
    { label: 'Model', property: 'model' },
    { label: 'Propuls type', property: 'propulsionType' },
    { label: 'Development code', property: 'developmentCode' },
    { label: 'Platform Nr', property: 'platformNr' },
    { label: 'Platform', property: 'platform' }
];

// Makes a value safe to put inside HTML, so text like "<b>" in model data
// shows up as literal text instead of being interpreted as markup.
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Builds the email body: a short intro plus a 5-column summary table,
// capped at MAX_BODY_ROWS rows. The attachment always has everything.
function buildEmailBody(models) {
    const cellStyle = 'border:1px solid #ccc;padding:4px 8px;text-align:left;';

    const header = SUMMARY_COLUMNS
        .map((col) => `<th style="${cellStyle}background:#f2f2f2;">${col.label}</th>`)
        .join('');

    const rows = models.slice(0, MAX_BODY_ROWS)
        .map((model) => '<tr>' + SUMMARY_COLUMNS
            .map((col) => `<td style="${cellStyle}">${escapeHtml(model[col.property])}</td>`)
            .join('') + '</tr>')
        .join('');

    const remaining = models.length - MAX_BODY_ROWS;
    const moreNote = remaining > 0
        ? `<p>...and ${remaining} more. See the attached file for the full list.</p>`
        : '';

    return `<p>Hello,</p>
  <p>Please find ${models.length} model(s) below. The attached Excel file contains the full details.</p>
  <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">
  <thead><tr>${header}</tr></thead>
  <tbody>${rows}</tbody>
  </table>
  ${moreNote}
  <br>
  <p>Best regards,<br><br>AUMOVIO LVPF Acceptance - Automotive</p>
  <br>
  <br>
  <p style="color:#888;font-size:11px;">This is an automated message. Please do not reply to this email.</p>`;
}

// Builds the .xlsx attachment in memory (nothing is written to disk)
// with all 14 columns, and returns it as a buffer nodemailer can attach.
async function buildWorkbook(models) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Models');

    sheet.columns = EXPORT_COLUMNS.map((col) => ({ header: col.label, key: col.property, width: 18 }));
    sheet.getRow(1).font = { bold: true };
    models.forEach((model) => sheet.addRow(model));

    return workbook.xlsx.writeBuffer();
}

// Connects to the SMTP server using the credentials from default-env.json.
function createTransport() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

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

    // Emails a summary of models (plus a full .xlsx attachment) to the given recipients.
    this.on('sendModels', async (req) => {
        const { modelIds, sendAll, recipients } = req.data;

        // 1. Validate the recipients.
        const toList = (recipients || []).map((r) => String(r).trim()).filter(Boolean);
        if (!toList.length) {
            return req.error(400, 'Enter at least one recipient email address.');
        }
        if (toList.length > MAX_RECIPIENTS) {
            return req.error(400, `You can send to at most ${MAX_RECIPIENTS} recipients at a time.`);
        }
        const invalid = toList.filter((r) => !EMAIL_PATTERN.test(r));
        if (invalid.length) {
            return req.error(400, `Invalid email address: ${invalid.join(', ')}`);
        }

        // 2. Load the models from the database ourselves - never trust model data sent by the browser.
        let models;
        if (sendAll) {
            models = await SELECT.from('cycles.Models').where('deleted = 0 or deleted is null').orderBy('oeGroup', 'brand', 'model', 'ID');
        } else {
            if (!modelIds || !modelIds.length) {
                return req.error(400, 'Select at least one model to send.');
            }
            const found = await SELECT.from('cycles.Models').where({ ID: { in: modelIds } }).orderBy('oeGroup', 'brand', 'model', 'ID');
            models = found.filter((m) => !m.deleted);
        }
        if (!models.length) {
            return req.error(404, 'No models found to send.');
        }

        // 3. Build the attachment and send one email.
        try {
            const attachment = await buildWorkbook(models);
            const info = await createTransport().sendMail({
                from: { name: MAIL_FROM_NAME, address: process.env.MAIL_FROM },
                to: toList.join(', '),
                subject: `Models with me - ${models.length} model(s)`,
                html: buildEmailBody(models),
                attachments: [{ filename: 'Models_with_me.xlsx', content: Buffer.from(attachment) }]
            });

            // Only Ethereal returns a preview link; real providers return false here.
            const previewUrl = nodemailer.getTestMessageUrl(info);
            return `Email sent to ${toList.join(', ')} with ${models.length} model(s).`
                + (previewUrl ? ` Preview: ${previewUrl}` : '');
        } catch (err) {
            return req.error(502, `Failed to send email: ${err.message}`);
        }
    });

    this.on('schedulerRemoveDuplicates', async(req) => {
        const { removed, dryRun } = await removeDuplicateCycles(req.data.dryRun);
        return dryRun
            ? `Dry run: ${removed} duplicates would be set to deleted.`
            : `Marked ${removed} duplicates deleted.`
    });

    async function removeDuplicateCycles(dryRun) {
        const cycles = await SELECT.from('cycles.Cycles')
            .where('deleted = 0 or deleted is null')
            .orderBy('ID');

        const seenTitles = new Set();
        const duplicateIds = [];

        for (const cycle of cycles) {
            if (!cycle.title) continue;

            if (seenTitles.has(cycle.title)) {
                duplicateIds.push(cycle.ID);
            } else {
                seenTitles.add(cycle.title);
            }
        }

        if (!dryRun && duplicateIds.length) {
            await UPDATE('cycles.Cycles').set({ deleted: 1 }).where({ ID: { in: duplicateIds } });
        }

        return { removed: duplicateIds.length, dryRun: !!dryRun };
    }

    if (process.env.ENABLE_SCHEDULER == 'true') {
        const expression = process.env.SCHEDULER_INTERVAL;
        const timezone = process.env.SCHEDULER_TIMEZONE
            ? { timezone: process.env.SCHEDULER_TIMEZONE}
            : {};

        if (!cron.validate(expression)) {
            console.error(`[SCHEDULER] Invalid cron expression "${expression}"`);
        } else {
            cron.schedule(expression, async () => {
                try {
                    await cds.tx({ user: cds.User.privileged }, async() => {
                        const { removed } = await removeDuplicateCycles(true);
                        console.log(`[SCHEDULER] Removed duplicates ${removed}`);
                    });
                } catch(error) {
                    console.error('[SCHEDULER] removeDuplicates failed: ', error.message);
                }
            }, timezone);
        }
    }
  });