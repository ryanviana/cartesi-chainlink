# cartesi-chainlink

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.0-363636?logo=solidity)](https://soliditylang.org/)
[![Chainlink](https://img.shields.io/badge/Chainlink-375BD2?logo=chainlink&logoColor=white)](https://chain.link/)
[![Cartesi](https://img.shields.io/badge/Cartesi-000000?logo=data:image/svg+xml;base64,&logoColor=white)](https://cartesi.io/)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

A library for integrating **Chainlink Automation** with **Cartesi DApps**. It enables Cartesi decentralized applications to programmatically register and manage Chainlink Automation upkeeps triggered by on-chain log events.

## Overview

Cartesi DApps run computation off-chain inside a deterministic Linux VM but need a way to react to on-chain events automatically. This library bridges that gap by wiring Chainlink's log-triggered Automation into the Cartesi input/voucher workflow, so your DApp can self-register upkeeps and respond to events without manual intervention.

## Architecture

The integration follows a **two-phase workflow**:

```
Phase 1 - Initiation                          Phase 2 - Execution
┌─────────────┐    InputBox     ┌──────────┐   GraphQL    ┌─────────────┐   transferAndCall   ┌───────────────────┐
│  Your DApp  │ ──────────────> │  Cartesi │ ──────────> │   Voucher   │ ──────────────────> │ Chainlink Keeper  │
│  (off-chain)│  registration   │  Backend │   polling    │  Executor   │   LINK + register   │    Registry       │
└─────────────┘    payload      └──────────┘              └─────────────┘                     └───────────────────┘
```

### Phase 1 -- Initiation

1. A registration request is sent to the Cartesi DApp through the **InputBox** contract.
2. The Cartesi backend processes the request and generates a **voucher** containing the encoded `register` call data for Chainlink's `AutomationRegistrar`.

### Phase 2 -- Execution

1. The **VoucherExecutor** polls the Cartesi GraphQL endpoint for the generated voucher.
2. Once retrieved, it executes the voucher on-chain, calling `transferAndCall` on the LINK token contract to register the upkeep with Chainlink Automation.

## Key Components

| Component | File | Description |
|---|---|---|
| **InputAutomation** | `contracts/InputAutomation.sol` | Solidity contract implementing Chainlink's `ILogAutomation` interface. Decodes log events in `checkLog` and executes actions in `performUpkeep`. |
| **LinkTokenInterface** | `contracts/LinkTokenInterface.sol` | Interface for the LINK token's `transferAndCall` function, used to fund and register upkeeps in a single transaction. |
| **Registration Sender** | `send.js` | Builds the `LogTriggerConfig` and encodes the full `register` call data, then sends LINK via `transferAndCall` to the Chainlink Automation Registrar. |
| **Event Listener** | `listen.js` | Listens for `Bumped` events emitted by `InputAutomation` to monitor upkeep execution. |
| **Contract Compiler** | `compile.js` | Compiles Solidity contracts using `solc` and outputs ABI/bytecode JSON artifacts. |
| **TransferAndCall Executor** | `index.js` | Executes a pre-encoded `transferAndCall` transaction on the LINK token contract. |

## Supported Networks

| Network | LINK Token Address |
|---|---|
| Ethereum Sepolia | `0x779877A7B0D9E8603169DdbD7836e478b4624789` |

> Additional networks (Ethereum Mainnet, Polygon, Polygon Mumbai, Base, Arbitrum One) can be configured by providing the corresponding LINK token and Automation Registrar contract addresses.

## Prerequisites

- **Node.js** >= 16
- **npm** or **yarn**
- A funded wallet with ETH (for gas) and LINK tokens on your target network
- Access to a JSON-RPC provider (Infura, Alchemy, or public RPC)

## Installation

```bash
git clone https://github.com/ryanviana/cartesi-chainlink.git
cd cartesi-chainlink
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
PROVIDER_URL=https://rpc2.sepolia.org
PRIVATE_KEY=your_private_key_here
USE_MOCK_LINK_TOKEN=false
```

> **Warning**: Never commit your `.env` file or expose your private key.

## Usage

### 1. Compile Contracts

Compile the Solidity contracts to generate ABI and bytecode artifacts:

```bash
npm run compile
```

This produces `InputAutomation.json` and `ILinkToken.json` in the project root.

### 2. Register a Chainlink Automation Upkeep

`send.js` demonstrates how to register a log-triggered upkeep. It:

1. Builds a `LogTriggerConfig` specifying which contract and event topics to monitor.
2. Encodes the Chainlink `AutomationRegistrar.register(...)` call data.
3. Sends LINK tokens via `transferAndCall` to the registrar, funding and registering the upkeep in one transaction.

```javascript
const { ethers } = require("ethers");

// Build log trigger configuration
const triggerConfig = buildLogTriggerConfig(
  "0xYourContractAddress",   // Contract emitting the events
  0,                          // filterSelector (0 = match all topics)
  "0xEventSignatureHash",    // topic0 - the event signature
  ethers.constants.HashZero, // topic1 - no filter
  ethers.constants.HashZero, // topic2 - no filter
  ethers.constants.HashZero  // topic3 - no filter
);

// Register via transferAndCall
await sendLinkWithRegisterData(
  providerUrl,
  privateKey,
  linkTokenAddress,
  automationRegistrarAddress,
  upkeepContractAddress,
  ethers.utils.parseUnits("2", 18), // 2 LINK
  500000                             // gas limit
);
```

### 3. Execute Pre-encoded Registration

If you already have encoded registration data (e.g., from a Cartesi voucher), use `index.js`:

```bash
npm start
```

This reads `PROVIDER_URL` and `PRIVATE_KEY` from your `.env` and executes `transferAndCall` with the pre-encoded data.

### 4. Listen for Upkeep Events

Monitor `Bumped` events emitted when Chainlink Automation triggers `performUpkeep`:

```bash
node listen.js
```

## How InputAutomation Works

The `InputAutomation` contract implements `ILogAutomation`:

- **`checkLog(Log log, bytes checkData)`** -- Called off-chain by Chainlink nodes. Decodes the Cartesi `InputBox` log event (DApp address, input index, sender, and input data) and returns `true` to signal that `performUpkeep` should run.

- **`performUpkeep(bytes performData)`** -- Called on-chain by the Chainlink Keeper. Decodes the perform data, increments an internal counter, and emits a `Bumped` event containing the log metadata and input data.

```
InputBox Event (on-chain)
       │
       ▼
  checkLog() ── decodes topics + data ── returns performData
       │
       ▼
  performUpkeep() ── increments counter ── emits Bumped event
```

## Tech Stack

- **JavaScript / Node.js** -- Runtime and scripting
- **ethers.js v5** -- Ethereum interaction and ABI encoding
- **Solidity ^0.8.0** -- Smart contracts
- **solc** -- Solidity compiler (used via `compile.js`)
- **dotenv** -- Environment variable management

## Project Structure

```
cartesi-chainlink/
├── contracts/
│   ├── InputAutomation.sol      # ILogAutomation implementation
│   └── LinkTokenInterface.sol   # LINK token interface
├── index.js                     # TransferAndCall executor
├── send.js                      # Upkeep registration sender
├── listen.js                    # Event listener
├── compile.js                   # Solidity compiler script
├── test.js                      # Test entry point
├── InputAutomation.json         # Compiled ABI + bytecode
├── ILinkToken.json              # Compiled LINK token ABI
├── package.json
└── .env                         # Environment config (not committed)
```

## License

This project is licensed under the [Apache License 2.0](LICENSE).
