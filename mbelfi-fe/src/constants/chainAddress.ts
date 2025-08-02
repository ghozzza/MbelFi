import { Chain } from "@/types";

export const chains: Chain[] = [
  {
    id: 11155111,
    name: "Ethereum",
    logo: "/chain/ethereum.png",
    color: "bg-yellow-500",
    destination: 0,
    contracts: {
      lendingPool: "",
      factory: "",
      position: "",
      protocol: "",
      isHealthy: "",
      lendingPoolDeployer: "",
      blockExplorer: "https://sepolia.etherscan.io",
    },
  },

  {
    id: 43113,
    name: "Avalanche Fuji",
    logo: "/chain/avax-logo.png",
    color: "bg-blue-600",
    destination: 1,
    contracts: {
      lendingPool: "",
      factory: "",
      position: "",
      protocol: "",
      isHealthy: "",
      lendingPoolDeployer: "",
      blockExplorer: "https://testnet.snowtrace.io",
    },
  },

  {
    id: 421614,
    name: "Arbitrum",
    logo: "/chain/arbitrum.png",
    color: "bg-purple-600",
    destination: 2,
    contracts: {
      lendingPool: "0x0a97cC170B77362Fd29edC650D0BFf009B7b30eD",
      factory: "0xB1fa9e45fBd6668d287FcAfE7ed9f37F7F24a8Ed",
      position: "0x616ea99db493b2200b62f13a15675954C0647C8e",
      protocol: "",
      isHealthy: "",
      lendingPoolDeployer: "",
      blockExplorer: "https://sepolia.arbiscan.io",
    },
  },
  {
    id: 84532,
    name: "Base",
    logo: "/chain/base.png",
    color: "bg-red-500",
    destination: 3,
    contracts: {
      lendingPool: "",
      factory: "",
      position: "",
      protocol: "",
      isHealthy: "",
      lendingPoolDeployer: "",
      blockExplorer: "https://sepolia.basescan.org",
    },
  },
  {
    id: 128123,
    name: "Etherlink Testnet",
    logo: "/chain/etherlink-logo.jpeg", // Using Ethereum logo as placeholder
    color: "bg-green-600",
    destination: 4,
    contracts: {
      lendingPool: "0xb4F8A55030a9e2b3B52d6267223915846eB2d3EC",
      factory: "0x86CA4a34eB2C11F7406220E402cc689bb811C0CD",
      position: "0x8A1c8f849f0C109bAE01A3d57264d453D23d6329",
      protocol: "0x4d7AfBf8f6d093ca49E9F6fB321483Fa6F68A64b",
      isHealthy: "0x20fb77D94bbE2efee76FC0321EA3290204a4bB7B",
      lendingPoolDeployer: "0x15b469dA6a57f8E67EE3fdA0CCd3699e159DeeE9",
      blockExplorer: "https://testnet.explorer.etherlink.com/",
    },
  },
];
