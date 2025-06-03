require("dotenv").config();
const { createAutomation } = require("cartesi-chainlink-integration");

(async () => {
  const privateKey = process.env.PRIVATE_KEY;

  const automationOptions = {
    name: "Log Automation",
    adminAddress: process.env.ADMIN_ADDRESS,
    triggerType: 1,
    triggerLogConfigs: {
      contractAddress: process.env.CONTRACT_ADDRESS,
      filterSelector: 0,
      topic0: process.env.TOPIC0,
      topic1: process.env.TOPIC1,
      topic2: process.env.TOPIC2,
      topic3: process.env.TOPIC3,
    },
  };

  createAutomation(privateKey, automationOptions)
    .then(() => {
      console.log("Automation created successfully!");
    })
    .catch((error) => {
      console.error("Error creating automation:", error);
    });
})();