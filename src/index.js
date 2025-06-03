const { createAutomation } = require("./services/AutomationService");
const { buildLogTriggerConfig } = require("./triggers/LogTrigger");
const config = require("./config"); // Export config for users to see defaults

module.exports = {
  createAutomation,
  buildLogTriggerConfig,
  config, // Allows users to access default addresses, URLs, etc.
}; 