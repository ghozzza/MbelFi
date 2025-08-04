# Mbel Finance

## Project Demo
[Go to site](https://mbelfi.vercel.app/)

![Project Screenshot](https://github.com/ahmadstiff/embacon-finance/blob/master/embacon-fe/public/home.png)

---
# Overview

## What Is Embacon Finance?

Mbel Finance is a permissionless cross-chain lending and borrowing protocol built on Etherlink. It is designed to provide fast, affordable, and seamless decentralized finance experiences across multiple blockchain environments.

Key components include:

Etherlink, a fast and cost-efficient Layer 2 solution.

Hyperlane, used for trustless cross-chain messaging and asset movement.

RedStone, which supplies reliable, real-time data to the protocol.

## Key Features

### Near-Zero Fees

Mbel Finance is built on Etherlink, a fast and affordable Layer 2 network. Transactions are confirmed quickly and cost just a fraction of typical gas fees.

### Permissionless

Mbel Finance is open and accessible to anyone. Users can lend, borrow, and interact with the protocol without requiring approval, whitelisting, or intermediaries. 

### Fast Cross-Chain Messaging

Mbel Finance enables seamless cross-chain interactions using Hyperlane for secure, decentralized communication between blockchains, without centralized bridges.

# Why Built on Etherlink?

## Join Us

Embacon Finance is a next-generation cross-chain lending protocol built with a focus on seamless user experience, accessibility, and secure interoperability. At the core of this experience is the MetaMask SDK, which empowers developers and users alike to interact with Embacon’s multi-chain features through persistent, secure wallet sessions and intuitive connection flows across platforms. By eliminating unnecessary friction in onboarding, transaction signing, and network switching, Embacon makes cross-chain DeFi interactions feel as seamless as single-chain ones.

We believe the future of DeFi lies in simplicity, accessibility, and open collaboration. With MetaMask SDK enabling effortless access and reliable wallet connectivity, Embacon provides a solid foundation for developers to build secure, user-friendly cross-chain financial applications.

We invite builders, contributors, and curious minds to collaborate with us. Whether you're integrating Embacon into your dApp, extending functionality, or helping shape the future of interoperable DeFi. Let’s create a world where capital flows freely across chains and users stay in full control, no matter where they are.

---
# Problems and Solutions

In building a permissionless cross-chain lending protocol, we identified the most pressing challenges in multichain DeFi and designed focused solutions through integrations that prioritize security, real-time data, and user accessibility, including with the MetaMask SDK.

## Fragmented Liquidity Across Chains

**Problem**: DeFi users are often constrained by isolated liquidity pools on individual blockchains, limiting access to optimal borrowing or lending opportunities.

**Embacon Finance's Solution**: Embacon Finance solves this through secure cross-chain functionality powered by atomic messaging protocols, enabling users to deposit collateral on one chain and borrow on another without relying on centralized bridges or wrapped assets. This unlocks multichain capital access and improves capital efficiency across ecosystems. With the integration of the MetaMask SDK, users can interact with cross-chain features through a seamless and persistent wallet connection, removing the friction of managing multiple chains manually.

## Delayed Price Feeds

**Problem**: Traditional oracles often suffer from latency or low update frequency, resulting in outdated collateral pricing, miscalculated LTV ratios, and increased exposure to market volatility.

**Embacon Finance's Solution**: By integrating real-time price data feeds, Embacon ensures up-to-date collateral valuations and dynamic loan tracking, empowering users with accurate, real-time position insights. Combined with MetaMask SDK's session persistence, users receive these updates without needing to constantly reauthorize wallet access, maintaining a consistent and uninterrupted view of their loan health and exposure.

## Closed and Restrictive Protocols Hinder Broader Participation

**Problem**: A significant number of lending platforms operate within closed ecosystems, relying on mechanisms such as whitelisting, centralized governance, or limited collateral support. These restrictions reduce accessibility, limit user autonomy, and compromise the principles of transparency and decentralization.

**Embacon Finance's Solution**: Embacon Finance is designed as a fully permissionless protocol, enabling any user to engage in lending or borrowing activities without the need for prior approval or reliance on centralized intermediaries. This open-access architecture fosters inclusivity, enhances transparency, and aligns with the core ethos of decentralized finance by supporting unrestricted global participation. MetaMask SDK integration reinforces this open design by allowing any user to connect instantly from supported platforms, without requiring complex configurations or centralized access control.

## Collateral Management is Inflexible

**Problem**: Other lending protocols require users to exit positions to adjust their collateral, incurring costs and friction during portfolio adjustments.

**Embacon Finance's Solution**: Embacon introduces a native in-protocol collateral swap mechanism, allowing users to seamlessly change their collateral type without closing positions. This feature is backed by real-time pricing infrastructure to ensure accurate valuations during the swap process. The experience is further streamlined through MetaMask SDK, which enables users to execute swaps, approvals, and confirmations through a unified interface, reducing friction and maintaining a smooth, responsive interaction flow.

---

# Challenges

## Challenges Faced by Embacon Finance

### Secure Cross-Chain Messaging Without Centralization

**Challenge**: Implementing cross-chain functionality in DeFi often relies on custodial bridges or wrapped assets, which introduce significant security risks and systemic vulnerabilities. Embacon’s challenge was to deliver secure and verifiable cross-chain communication without compromising decentralization. While building on top of atomic messaging frameworks, Embacon had to ensure not only the integrity of token transfers but also the safe orchestration of protocol logic across multiple blockchain environments. This required careful handling of message validation, failure recovery, and trust minimization throughout the system. Additionally, ensuring that users could interact with these complex cross-chain operations securely and intuitively led to the integration of the MetaMask SDK, which played a key role in abstracting away the technical overhead of multi-network interaction, allowing users to focus on their intent rather than the underlying infrastructure.

### Real-Time Price Delivery and On-Chain Integration

**Challenge**: Other lending protocols may function with delayed price updates, but in a cross-chain setting, real-time valuation is essential. Embacon’s integration of real-time data infrastructure introduces challenges related to on-chain data consumption, synchronization across networks, and ensuring consistency during periods of volatility. These data feeds must be integrated in a way that balances responsiveness with gas efficiency. Moreover, to ensure that users can act on real-time information without interruption, Embacon relies on the MetaMask SDK to maintain persistent wallet sessions. Enabling seamless access to up-to-date borrowing limits and collateral health metrics, without forcing users to repeatedly reconnect or approve interactions across different networks.

### Maintaining Protocol Resilience Against Oracle Manipulation

**Challenge**: Relying on a single source of truth can expose lending protocols to manipulation or failure. Even when leveraging decentralized data aggregation, integrating real-time feeds into core protocol operations requires safeguards such as deviation thresholds, update throttling, and fallback logic. Embacon must ensure that external data, especially when used for critical functions like collateral evaluation or eligibility enforcement, does not become a vector for systemic failure. This challenge also extends to how users interact with sensitive data-driven processes. Through the MetaMask SDK, Embacon enhances user-facing reliability by reducing signature prompts and streamlining the UX around price-triggered events. Making data-heavy operations feel smoother and more transparent to end users.

### Operational Coordination Across Multiple Chain Environments

**Challenge**: Running a lending protocol across chains introduces significant operational complexity. Embacon must account for chain-specific behaviors, execution timing, token standards, and fluctuating gas costs. Managing processes like token burning, message confirmation, and minting across heterogeneous environments requires precise coordination and extensive testing. Furthermore, maintaining a consistent user experience across chains is nontrivial. By leveraging the MetaMask SDK, Embacon ensures that users don’t have to manually switch networks or troubleshoot connection issues across environments. This abstraction enables the protocol to focus on cross-chain logic while the SDK handles network detection, session management, and secure access. All contributing to a more unified and frictionless user journey.

# How We Achieve Cross-Chain Capability
![Flowchart Screenshot](https://github.com/ahmadstiff/embacon-finance/blob/master/embacon-fe/public/embaconhowcross.gif)
Embacon Finance achieves secure and verifiable cross-chain lending by leveraging Chainlink’s Cross-Chain Interoperability Protocol (CCIP) to facilitate communication and token transfer between blockchain networks. The protocol enables users to deposit collateral on one chain and borrow stablecoins on another without relying on centralized bridges or wrapped assets by utilizing a secure burn-and-mint mechanism.

In our current architecture, as illustrated:

- On the **Source Chain (Arbitrum Sepolia)**, users deposit collateral (e.g., MockWETH) into the Embacon Liquidity Pool. The deposited tokens are handled by `BasicTokenSender.sol`, which interacts with the Chainlink CCIP Router. This Router prepares a cross-chain message, processes transaction fees (in LINK or Native Gas Token), and initiates a burn operation of the deposited tokens, removing them from circulation and preventing supply duplication.

- The burn-and-mint method, native to Chainlink CCIP’s token pool mechanism, ensures that tokens exist on only one chain at any time. The burn event is cryptographically verified and transmitted by Chainlink’s decentralized oracle network (DON), forming a secure proof of collateral transfer.

- Once received on the **Destination Chain (Base Sepolia)**, the corresponding CCIP Router invokes the `LendingPool.sol` contract. This contract verifies the message and proof, and accordingly credits the user with the right to borrow stablecoins (e.g., MockUSDC), which are minted or released from liquidity on the destination chain.

- Both MockWETH and MockUSDC are continuously priced using Chainlink Data Streams, a low-latency oracle feed that ensures accurate and high-frequency pricing. These feeds are crucial for determining borrowing capacity, monitoring risk exposure, and enabling dynamic collateral swap logic within the protocol.

By combining CCIP and Data Streams, Embacon Finance unlocks native cross-chain borrowing with high levels of security, precision, and capital efficiency without relying on wrapped tokens or centralized liquidity hubs. This positions Embacon as a modular, interoperable DeFi primitive ready to scale across blockchain ecosystems.

---

## Swap
![Swap Screenshot](https://github.com/ahmadstiff/embacon-finance/blob/master/embacon-fe/public/embaconswap.png)
Embacon Finance incorporates a purpose-built collateral swap mechanism that enables users to modify their collateral composition directly within the protocol without exiting lending or borrowing positions. Inspired by the architecture of Automated Market Makers (AMM), the system is tightly integrated into the Embacon Pool to facilitate real-time, on-chain token exchange with minimal friction.

## 1. Liquidity Provision and Pool Structure
Liquidity Providers (LPs) contribute token pairs such as Token A and Token B into the Embacon Pool, which serves as the central liquidity reserve for swap operations. In return, LPs receive Pool Tokens, representing their proportional ownership and entitling them to a share of the accrued transaction fees from swaps.

The Embacon Pool maintains segregated reserves for each token and continuously adjusts these balances as swaps are executed.

## 2. Swap Execution
Only users with active lending or borrowing positions are permitted to access the swap functionality. This requirement ensures that all swap operations are tied directly to collateral management, thereby improving capital efficiency and reducing unnecessary speculative activity.

When a user initiates a swap, such as swapping Token A for Token B, the swap logic references current reserve ratios and applies an AMM pricing formula (e.g., constant product model) to calculate the output amount. The system also integrates with Chainlink Data Streams to fetch real-time price references, ensuring fair execution and slippage protection.

## 3. Oracle Integration for Price Validation
To maintain accurate valuation of the swapped collateral, Embacon utilizes Chainlink Oracles. These oracles deliver tamper-proof, real-time price feeds for all supported tokens, ensuring that each swap maintains alignment with market value. This is critical for maintaining healthy collateralization ratios and reducing systemic risk across lending positions.

## 4. Incentivization through Fees
Each swap transaction incurs a small liquidity fee, which is distributed among active LPs based on their share of the pool. This fee structure incentivizes continued liquidity provision and supports the long-term sustainability of the swap module.

---

Chainlink Integrations in Embacon Finance
Embacon Finance leverages industry-leading oracle infrastructure from Chainlink to enable secure, real-time, and trust-minimized cross-chain lending. Two core Chainlink services, CCIP (Cross-Chain Interoperability Protocol) and Data Streams, form the foundation of Embacon’s decentralized architecture.
1. Chainlink CCIP: Secure Cross-Chain Messaging
To support native cross-chain lending and borrowing, Embacon integrates Chainlink CCIP, a generalized interoperability protocol that enables smart contracts on different chains to securely communicate and transfer data
When a user deposits collateral on a source chain (e.g., Avalanche Fuji) and initiates a borrow on a destination chain (e.g., Arbitrum Sepolia), CCIP executes a burn-and-mint mechanism. The token is burned on the origin chain, and a CCIP Router relays a cryptographically verifiable message to the destination chain. Upon verification, equivalent value is minted or registered, enabling the borrow transaction without reliance on centralized bridges or wrapped assets.
3. Chainlink Data Streams: Real-Time Price Feeds
In addition to cross-chain messaging, Embacon uses Chainlink Data Streams to power its real-time pricing and risk assessment infrastructure. Data Streams provide high-frequency, low-latency market data sourced from multiple institutional-grade providers and updated directly on-chain.
This integration enables Embacon to:

Monitor collateral valuation with sub-second latency
Perform accurate borrowing limit calculations (e.g., LTV (Loan-to-Value))
Support collateral swap operations with live price validation
Mitigate manipulation through multi-source aggregation
Maintain transparency and determinism for all economic actions

By combining CCIP and Data Streams, Embacon achieves a robust and composable infrastructure for permissionless lending across chains. The synergy of these technologies ensures users enjoy a seamless, secure, and real-time DeFi experience without sacrificing decentralization, speed, or integrity.

---

# Embacon Finance Contract Token Configuration
## Supported Chains

- **Ethereum Sepolia**
  - **Chain ID**: 11155111
  - **Contracts**:
    - Lending Pool: (Not yet deployed)
    - Factory: (Not yet deployed)
    - Position: (Not yet deployed)
    - Block Explorer: `https://sepolia.etherscan.io`
  - **Destination ID**: 0

- **Avalanche Fuji**
  - **Chain ID**: 43113
  - **Contracts**:
    - Lending Pool: `0xe10e79324c133DA09426972c9401b503a7b48186`
    - Factory: `0x694B5A70f83062308aa60ecf12074Bc8f694612d`
    - Position: `0x9ee9F9158b872fe812C3F2204588dfc8b0FC4Eda`
    - Block Explorer: `https://testnet.snowtrace.io`
  - **Destination ID**: 1

- **Arbitrum Sepolia**
  - **Chain ID**: 421614
  - **Contracts**:
    - Lending Pool: `0x19b0b0F7895BFf7D32b0b6f0239EB76787BC4963`
    - Factory: `0x0128FA2b8254359A3493AC9782059F7bb3508AA4`
    - Position: `0x1D8aF8e5925397a4977734b4CeeA4bA1F526E69C`
    - Block Explorer: `https://sepolia.arbiscan.io`
  - **Destination ID**: 2

- **Base Sepolia**
  - **Chain ID**: 84532
  - **Contracts**:
    - Lending Pool: (Not yet deployed)
    - Factory: (Not yet deployed)
    - Position: (Not yet deployed)
    - Block Explorer: `https://sepolia.basescan.org`
  - **Destination ID**: 3

## Supported Tokens

- **WETH**
  - **Addresses**:
    - Ethereum Sepolia (11155111): `0x89d3acb10fc9f9bee444c05e1363e514e8a748da`
    - Avalanche Fuji (43113): `0x63CFd5c58332c38d89B231feDB5922f5817DF180`
    - Arbitrum Sepolia (421614): `0xCC1A31502Bd096d7AAdEBE25670ebe634671aD31`
    - Base Sepolia (84532): `0x2769a1ce97cc2d21e3723ee986b29173de3fe4ac`
  - **Price Feeds**:
    - Ethereum Sepolia (11155111): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Avalanche Fuji (43113): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Arbitrum Sepolia (421614): `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165`
    - Base Sepolia (84532): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`

- **WBTC**
  - **Addresses**:
    - Ethereum Sepolia (11155111): `0xbe4d4858eb0849b038a0b5ecd38a7599d73bd923`
    - Avalanche Fuji (43113): `0xa7A93C5F0691a5582BAB12C0dE7081C499aECE7f`
    - Arbitrum Sepolia (421614): `0x773D46F1Ad10110459D84535A664B59Ae98CAC7E`
    - Base Sepolia (84532): `0x548c22d340eb79915316f01e45b4133203a24e90`
  - **Price Feeds**:
    - Ethereum Sepolia (11155111): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Avalanche Fuji (43113): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Arbitrum Sepolia (421614): `0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69`
    - Base Sepolia (84532): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`

- **WAVAX**
  - **Addresses**:
    - Ethereum Sepolia (11155111): `0x4314bb3ad93206ee8f7f18dbcc49943366503bbf`
    - Avalanche Fuji (43113): `0xA61Eb0D33B5d69DC0D0CE25058785796296b1FBd`
    - Arbitrum Sepolia (421614): `0x9b9d709ACAB5c4C784a7ADce5530ce8b98FcD662`
    - Base Sepolia (84532): `0x322b3326b5f7de4abd7554f6a32217825770fd41`
  - **Price Feeds**:
    - Ethereum Sepolia (11155111): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Avalanche Fuji (43113): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Arbitrum Sepolia (421614): `0xe27498c9Cc8541033F265E63c8C29A97CfF9aC6D`
    - Base Sepolia (84532): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`

- **USDC**
  - **Addresses**:
    - Ethereum Sepolia (11155111): `0xab0c196dba12297e4c5b9a414013230a527b4a4b`
    - Avalanche Fuji (43113): `0xC014F158EbADce5a8e31f634c0eb062Ce8CDaeFe`
    - Arbitrum Sepolia (421614): `0xEB7262b444F450178D25A5690F49bE8E2Fe5A178`
    - Base Sepolia (84532): `0xcba01c75d035ca98ffc7710dae710435ca53c03c`
  - **Price Feeds**:
    - Ethereum Sepolia (11155111): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Avalanche Fuji (43113): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Arbitrum Sepolia (421614): `0x0153002d20B96532C639313c2d54c3dA09109309`
    - Base Sepolia (84532): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`

- **USDT**
  - **Addresses**:
    - Ethereum Sepolia (11155111): `0xe8add858b8a2f6e41d67008a58058010b9c0ba04`
    - Avalanche Fuji (43113): `0x1E713E704336094585c3e8228d5A8d82684e4Fb0`
    - Arbitrum Sepolia (421614): `0x02d811A7959994e4861781bC65c58813D4678949`
    - Base Sepolia (84532): `0x49f82b20894e6a1e66238fb50278ac60b57676ee`
  - **Price Feeds**:
    - Ethereum Sepolia (11155111): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Avalanche Fuji (43113): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`
    - Arbitrum Sepolia (421614): `0x80EDee6f667eCc9f63a0a6f55578F870651f06A4`
    - Base Sepolia (84532): `0x86d67c3D38D2bCeE722E601025C25a575021c6EA`

## Integration with Embacon Finance

These tokens are used for cross-chain lending, borrowing, and collateral swaps on testnet chains (Ethereum Sepolia, Avalanche Fuji, Arbitrum Sepolia, Base Sepolia). Chainlink price feeds ensure accurate, real-time valuation for collateral management, LTV calculations, and swaps, enabling a secure and efficient cross-chain DeFi ecosystem.

## 🔗 Links

- 🌐 Website: [https://embacon-fnance.vercel.app/](https://embacon-fnance.vercel.app/)
- 🏢 Organization: [https://github.com/ahmadstiff/embacon-finance](https://github.com/ahmadstiff/embacon-finance)
- Demo Video [https://www.youtube.com](https://www.youtube.com/watch?v=YN4QYPe-Uxg)

---


## License

MIT License © 2025 Embacon Finance

---

