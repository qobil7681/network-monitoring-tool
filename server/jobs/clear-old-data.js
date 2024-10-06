const { R } = require("redbean-node");
const { log } = require("../../src/util");
const Database = require("../database");
const { Settings } = require("../settings");

const DEFAULT_KEEP_PERIOD = 180;

/**
 * Clears old data from the heartbeat table of the database.
 * @returns {Promise<void>} A promise that resolves when the data has been cleared.
 */

const clearOldData = async () => {

    /*
    * TODO:
    * Since we have aggregated table now, we don't need so much data in heartbeat table.
    * But we still need to keep the important rows, because they contain the message.
    *
    * In the heartbeat table:
    *    - important rows: keep according to the setting (keepDataPeriodDays) (default 180 days)
    *    - not important rows: keep 2 days
    *
    * stat_* tables:
    *   - keep according to the setting (keepDataPeriodDays) (default 180 days)
    */

    let period = await Settings.get("keepDataPeriodDays");

    // Set Default Period
    if (period == null) {
        await Settings.set("keepDataPeriodDays", DEFAULT_KEEP_PERIOD, "general");
        period = DEFAULT_KEEP_PERIOD;
    }

    // Try parse setting
    let parsedPeriod;
    try {
        parsedPeriod = parseInt(period);
    } catch (_) {
        log.warn("clearOldData", "Failed to parse setting, resetting to default..");
        await Settings.set("keepDataPeriodDays", DEFAULT_KEEP_PERIOD, "general");
        parsedPeriod = DEFAULT_KEEP_PERIOD;
    }

    if (parsedPeriod < 1) {
        log.info("clearOldData", `Data deletion has been disabled as period is less than 1. Period is ${parsedPeriod} days.`);
    } else {

        log.debug("clearOldData", `Clearing Data older than ${parsedPeriod} days...`);

        const sqlHourOffset = Database.sqlHourOffset();

        try {
            await R.exec(
                "DELETE FROM heartbeat WHERE time < " + sqlHourOffset,
                [ parsedPeriod * -24 ]
            );

            if (Database.dbConfig.type === "sqlite") {
                await R.exec("PRAGMA optimize;");
            }
        } catch (e) {
            log.error("clearOldData", `Failed to clear old data: ${e.message}`);
        }
    }
};

module.exports = {
    clearOldData,
};
