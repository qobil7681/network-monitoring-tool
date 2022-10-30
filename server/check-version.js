const { setSetting, setting } = require("./util-server");
const axios = require("axios");
const { log } = require("../src/util");

exports.version = require("../package.json").version;
exports.latestVersion = null;

const UPDATE_CHECKER_INTERVAL_MS = 3600 * 1000 * 48;
const UPDATE_CHECKER_LATEST_VERSION_URL = "https://uptime.kuma.pet/version";

let interval;

exports.startInterval = () => {
    let check = async () => {
        if (await setting("checkUpdate") === false) {
            return;
        }

        log.debug("update-checker", "retrieving latest versions");

        try {
            const res = await axios.get(UPDATE_CHECKER_LATEST_VERSION_URL);

            // For debug
            if (process.env.TEST_CHECK_VERSION === "1") {
                res.data.slow = "1000.0.0";
            }

            let checkBeta = await setting("checkBeta");

            if (checkBeta && res.data.beta) {
                exports.latestVersion = res.data.beta;
            }

            if (res.data.slow) {
                exports.latestVersion = res.data.slow;
            }

        } catch (_) {
            log.info("update-checker", "Update checker: failed to check for new versions");
        }

    };

    check();
    interval = setInterval(check, UPDATE_CHECKER_INTERVAL_MS);
};

/**
 * Enable the check update feature
 * @param {boolean} value Should the check update feature be enabled?
 * @returns {Promise<void>}
 */
exports.enableCheckUpdate = async (value) => {
    await setSetting("checkUpdate", value);

    clearInterval(interval);

    if (value) {
        exports.startInterval();
    }
};

exports.socket = null;
