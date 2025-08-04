# Mbel Finance

## Project Demo
[Go to site](https://mbelfi.vercel.app/)

![Project Screenshot](https://res.cloudinary.com/dpown64xj/image/upload/v1754304034/Screenshot_2025-08-04_at_17.40.23_vnaahn.png)

---
# Overview

## What Is Mbel Finance?

Mbel Finance is a permissionless cross-chain lending and borrowing protocol built on Etherlink. It is designed to provide fast, affordable, and seamless decentralized finance experiences across multiple blockchain environments.

Key components include:

- Etherlink, a fast and cost-efficient Layer 2 solution.

- Hyperlane, used for trustless cross-chain messaging and asset movement.

- RedStone, which supplies reliable, real-time data to the protocol.

## Key Features

### Near-Zero Fees

Mbel Finance is built on Etherlink, a fast and affordable Layer 2 network. Transactions are confirmed quickly and cost just a fraction of typical gas fees.

### Permissionless

Mbel Finance is open and accessible to anyone. Users can lend, borrow, and interact with the protocol without requiring approval, whitelisting, or intermediaries. 

### Fast Cross-Chain Messaging

Mbel Finance enables seamless cross-chain interactions using Hyperlane for secure, decentralized communication between blockchains, without centralized bridges.

# Why Built on Etherlink?

Mbel Finance is built on Etherlink, an EVM-compatible, non-custodial Layer 2 blockchain powered by Tezos Smart Rollup technology. Etherlink was chosen for its exceptional performance, developer experience, and strong security guarantees.

## What is Etherlink?

Etherlink enables seamless integration with Ethereum tools such as wallets and indexers, and allows fast asset transfers to and from other EVM-compatible chains.

Built on Tezos Layer 1, Etherlink offers a fast, fair, and (nearly) free environment for DeFi protocols and applications.

## Fast Confirmation

Etherlink provides low-latency confirmations under 500 milliseconds, allowing for real-time user experiences. By leveraging Tezos's 2-block finality and the speed of Smart Rollups, Etherlink ensures both fast and secure transaction execution.

## Fair and Open Governance

Etherlink governance integrates with Tezos’s permissionless fraud-proof mechanisms. Stakeholders can propose upgrades, vote on protocol changes, and challenge state commitments.
Participation is open to anyone, ensuring transparency and fairness without administrative keys or centralized controls. Users retain full control of their assets, reducing the risk of censorship or manipulation.

## Low Transaction Costs

Etherlink drastically reduces transaction costs by using enshrined Smart Rollups, which run in separate execution environments. These rollups avoid standard Layer 1 gas fees and only incur minimal charges when interacting with the base layer. This architecture supports scalable application development without cost barriers.

---
# Problems and Solutions

## High Gas Fees and Network Congestion

**Problem**: Many DeFi users face expensive gas fees and delayed transaction confirmations on congested Layer 1 networks like Ethereum, making lending and borrowing inefficient and costly.

**Mbel Finance's Solution**: Mbel Finance is built on Etherlink, an EVM-compatible Layer 2 that offers ultra-fast confirmations and nearly zero gas costs. This provides users with a smooth and affordable DeFi experience.

## Slow and Complex Cross-Chain Communication

**Problem**: Cross-chain DeFi protocols often suffer from slow message delivery, unreliable relayers, or centralized bridging systems. Leading to poor user experience and potential security risks.

**Mbel Finance's Solution**: Mbel Finance integrates Hyperlane, a permissionless interoperability protocol that enables fast and secure cross-chain messaging without relying on centralized infrastructure.

## Inaccurate or Delayed On-Chain Price Feeds

**Problem**: Access to real-time, reliable price data is critical in lending protocols. Many oracle solutions are either delayed, centralized, or expensive to maintain.

**Mbel Finance's Solution**: Mbel Finance uses Redstone, which offer fast, efficient, and decentralized data feeds tailored for DeFi applications, ensuring accurate pricing and protocol stability.

---

# Mbel Finance Tech Stack

## Hyperlane

### Cross-Chain Messaging Infrastructure

Hyperlane is the foundation that enables Mbel Finance to operate across multiple blockchain networks. It allows smart contracts to communicate with each other between chains, so when a user initiates a lending or borrowing action on one chain, it can be executed and reflected on another. This interoperability happens in a permissionless and decentralized way, without relying on centralized bridges.

By using Hyperlane’s modular security model, Mbel Finance can tailor its security settings to match its needs, ensuring messages and actions between chains are validated and secure. This allows for fast and flexible development of cross-chain DeFi features without compromising safety.

## Goldsky

### Real-Time Data Indexing

In Mbel Finance, Goldsky is used exclusively to power real-time indexing and querying of on-chain events. As a cross-chain lending and borrowing protocol, Mbel Finance requires accurate and up-to-date data to provide users with responsive interfaces, live lending/borrowing positions, and transaction histories.

Goldsky allows the frontend to instantly reflect changes on-chain by indexing events such as deposits, borrows, repayments, and cross-chain messages. This eliminates the need for complex backend infrastructure or manual data polling, enabling a seamless experience across different chains.

By integrating Goldsky, Mbel ensures that users always interact with live data improving transparency, performance, and responsiveness of the protocol interface.

## Thirdweb

### Frontend Integration Toolkit

In Mbel Finance, Thirdweb is primarily used as a frontend toolkit to simplify wallet connections, contract interactions, and user interface development. It helps integrate smart contract functionality into the frontend without requiring low-level coding or custom wallet logic.

By leveraging Thirdweb's SDK, Mbel Finance is able to provide users with a smooth and responsive experience when connecting wallets, signing transactions, and interacting with protocol features. It also supports multi-chain workflows, making it easier for users to access Mbel Finance's cross-chain functionalities directly from their browser.

## RedStone

### Decentralized Price Oracle

RedStone supplies real-time price feeds to the Mbel Finance protocol. In any lending and borrowing platform, accurate asset pricing is essential to determine collateral value, borrowing capacity, and liquidation thresholds. An unreliable oracle could create risks for the protocol and its users.

RedStone delivers price data in a decentralized and tamper-resistant way. Their unique approach allows Mbel Finance to securely access pricing info at the moment it’s needed keeping the platform efficient while maintaining strong protection against manipulation.

---

# How We Achieve Cross-Chain Capability
![Flowchart Screenshot](https://res.cloudinary.com/dpown64xj/image/upload/v1754303789/mbelarchitecture1_cdtjuo.jpg)
Mbel Finance introduces a modular cross-chain architecture built around a Origin Chain, a Messaging Layer, and Destination Chains.

The Origin Chain, Etherlink, serves as the core of the protocol. It stores all liquidity, manages lending and borrowing logic, and acts as the source of truth for user positions and protocol state. As a fast and low-cost optimistic rollup, Etherlink enables near-instant transactions and significantly reduces gas costs, providing an optimal base layer for Mbel Finance’s operations.

Cross-chain communication is powered by Hyperlane, a permissionless messaging protocol. Hyperlane ensures reliable and secure message delivery across chains without relying on centralized bridges. It handles the dispatch, transport, and verification of messages from Etherlink to other supported chains.

Destination Chains, such as Arbitrum Sepolia and Base Sepolia, do not hold protocol state or execute business logic. Instead, they act as endpoints where user balances are updated based on instructions from the Origin Chain. This separation enables scalability and modularity without duplicating core logic across chains.

When users perform actions such as borrowing or redeeming assets, the transaction is processed on Etherlink. Hyperlane then transmits the result to the appropriate Destination Chain, which reflects the outcome in the user's wallet or interface. This cross-chain interaction ensures consistency while maintaining performance and decentralization.

Mbel Finance's architecture enables permissionless lending and borrowing with fast cross-chain settlement, made possible by Etherlink’s performance and Hyperlane’s messaging capabilities.

![Flowchart Screenshot](https://res.cloudinary.com/dpown64xj/image/upload/v1754303871/mbelfiarchinew_atfeax.png)
At its core, Hyperlane enables arbitrary message passing between blockchains via on-chain Mailbox contracts. Mbel Finance uses this to send encoded lending-related data like position information or user actions across chains for processing or finalization.

When a user interacts with the lending protocol (for example, initiating a deposit), a smart contract on the origin chain (Etherlink) uses the Mailbox contract to dispatch a message. This message contains the necessary information about the user action and is emitted as an event on-chain.

A Relayer service monitors these Mailbox contracts and picks up the emitted messages. The Relayer then delivers the message to the destination chain (e.g., Arbitrum Sepolia), where another Mailbox contract receives it.

On the destination chain, Mbel has deployed a settlement or verification smart contract that consumes the message. But before it is executed, the message is verified by an Interchain Security Module (ISM) a plug-and-play component in Hyperlane that validates the authenticity and origin of the message.

Once verified, the message is processed by the target contract, updating balances, recording settlement, or taking another action, depending on the payload.

## Components Used
- Mailbox Contracts
Deployed by Hyperlane on all chains. These contracts provide the interface for sending and receiving interchain messages.

- Relayer
A service that listens to Mailbox dispatch events on the source chain and delivers them to the Mailbox on the destination chain. This can be run by anyone, including Mbel Finance operators or independent relayers.

- Interchain Security Module (ISM)
Each application using Hyperlane can define a custom ISM. In Mbel Finance, ISMs verify that messages are valid and not spoofed, before allowing the target contract to process them. 

- Sender Contract
A smart contract on Etherlink that interacts with the Mailbox to send encoded lending-related data such as position ID, amount, or user address.

- Receiver Contract
A contract on Arbitrum Sepolia that consumes the verified message and updates the protocol’s internal state accordingly.

## Why Hyperlane for Mbel Finance?
Mbel Finance chose Hyperlane because it aligns with Mbel Finance’s permissionless and modular design principles:

- Permissionless Deployment: Mbel Finance doesn’t need approval to use Hyperlane. Any developer can deploy Mailbox contracts and integrate them.

- Customizable Security: With modular ISMs, Mbel can define different trust models per message type or chain pair.

- Efficient Cross-Chain Messaging: By removing the need for centralized bridges, Mbel Finance achieves fast, secure, and cost-effective interoperability.

- This architecture ensures that lending activity on Mbel Finance remains decentralized and composable across chains while minimizing operational risk.

---

## Swap Collateral
![Swap Screenshot](https://res.cloudinary.com/dpown64xj/image/upload/v1754304092/mbelfiswapcolarchi_f8qsop.jpg)
Mbel Finance incorporates a purpose-built collateral swap mechanism that enables users to modify their collateral composition directly within the protocol without exiting lending or borrowing positions. Inspired by the architecture of Automated Market Makers (AMM), the system is tightly integrated into the Mbel Finance Pool to facilitate real-time, on-chain token exchange with minimal friction.

## 1. Liquidity Provision and Pool Structure

Liquidity Providers (LPs) contribute token pairs such as Token A and Token B into the Mbel Finance Pool, which serves as the central liquidity reserve for swap operations. In return, LPs receive Pool Tokens, representing their proportional ownership and entitling them to a share of the accrued transaction fees from swaps.

The Mbel Finance Pool maintains segregated reserves for each token and continuously adjusts these balances as swaps are executed.

## 2. Liquidity Provision and Pool Structure

Only users with active lending or borrowing positions are permitted to access the swap functionality. This requirement ensures that all swap operations are tied directly to collateral management, thereby improving capital efficiency and reducing unnecessary speculative activity.

When a user initiates a swap such as swapping Token A for Token B the swap logic references current reserve ratios and applies an AMM pricing formula (e.g., constant product model) to calculate the output amount. 

## 3. Oracle Integration for Price Validation

To maintain accurate valuation of the swapped collateral, Mbel Finance utilizes RedStone Oracles. These oracles deliver tamper-proof, real-time price feeds for all supported tokens, ensuring that each swap maintains alignment with market value. This is critical for maintaining healthy collateralization ratios and reducing systemic risk across lending positions.

## 4. Incentivization through Fees

Each swap transaction incurs a small liquidity fee, which is distributed among active LPs based on their share of the pool. This fee structure incentivizes continued liquidity provision and supports the long-term sustainability of the swap module.

---

# Mbel Finance Contract Address
## Protocol Addresses

- **Etherlink Testnet**
  - **Chain ID**: 128123
  - **Contracts**:
    - protocol: 0x4d7AfBf8f6d093ca49E9F6fB321483Fa6F68A64b
    - isHealthy: 0x20fb77D94bbE2efee76FC0321EA3290204a4bB7B
    - lendingPoolDeployer: 0x15b469dA6a57f8E67EE3fdA0CCd3699e159DeeE9
    - lendingPoolFactory: 0x86CA4a34eB2C11F7406220E402cc689bb811C0CD
    - lendingPool: 0xb4F8A55030a9e2b3B52d6267223915846eB2d3EC
    - position: 0x8A1c8f849f0C109bAE01A3d57264d453D23d6329
    - Block Explorer: `https://testnet.explorer.etherlink.com`

## Supported Tokens

- **WETH**
  - **Addresses**:
    - Etherlink Testnet (128123): `0x0355360B7F943974404277936a5C7536B51B9A77`
    - Arbitrum Sepolia (421614): `0x9eCee5E6a7D23703Ae46bEA8c293Fa63954E8525`
    - Base Sepolia (84532): `0x9A2Da2FA519AFCcCc6B33CA48dFa07fE3a9887eF`

- **WBTC**
  - **Addresses**:
    - Etherlink Testnet (128123): `0x50df5e25AB60e150f753B9444D160a80f0279559`
    - Arbitrum Sepolia (421614): `0xa998cBD0798F827a5Ed40A5c461E5052c06ff7C6`
    - Base Sepolia (84532): `0x11603bf689910b9312bd0915749095C12cc92ac1`

- **USDC**
  - **Addresses**:
    - Etherlink Testnet (128123): `0xB8DB4FcdD486a031a3B2CA27B588C015CB99F5F0`
    - Arbitrum Sepolia (421614): `0x93Abc28490836C3f50eF44ee7B300E62f4bda8ab`
    - Base Sepolia (84532): `0xdfd290562Ce8aB4A4CCBfF3FC459D504a628f8eD`

- **USDT**
  - **Addresses**:
    - Etherlink Testnet (128123): `0x2761372682FE39A53A5b1576467a66b258C3fec2`
    - Arbitrum Sepolia (421614): `0x8B34f890d496Ff9FCdcDb113d3d464Ee54c35623`
    - Base Sepolia (84532): `0xF597525130e6295CFA0C75EA968FBf89D486c528`

- **WXTZ**
  - **Addresses**:
    - Etherlink Testnet (128123): `0x0320aC8A299b3da6469bE3Da9ED6c84D09309418`
    - Arbitrum Sepolia (421614): `0x64D3ee701c5d649a8a1582f19812416c132c9700`
    - Base Sepolia (84532): `0x10d3743F6A987082CB7B0680cA2283F5839e77CD`

## 🔗 Links

- 🌐 Website: [https://mbelfi.vercel.app/](https://mbelfi.vercel.app/)
- 🏢 Repo: [https://github.com/ghozzza/MbelFi](https://github.com/ghozzza/MbelFi)
- Demo Video [https://youtu.be/dOilptG8U0s](https://youtu.be/dOilptG8U0s)
- Documentation (Gitbook) [Mbel Finance Gitbook](https://mbel-finance.gitbook.io/mbel-finance-docs)
---


## License

MIT License © 2025 Embacon Finance

---

