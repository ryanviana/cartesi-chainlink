// test.js
const { main } = require("./index.js");
require("dotenv").config(); // Ensure you have dotenv installed and a .env file

const providerUrl = process.env.PROVIDER_URL;
const privateKey = process.env.PRIVATE_KEY;
const useMockLinkToken = process.env.USE_MOCK_LINK_TOKEN === "true"; // Optional: Set to 'true' to use MockLinkToken

if (!providerUrl || !privateKey) {
  console.error("Please set PROVIDER_URL and PRIVATE_KEY in your .env file");
  process.exit(1);
}

main(providerUrl, privateKey, useMockLinkToken);
