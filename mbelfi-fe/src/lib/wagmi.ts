import { etherlinkTestnet, arbitrumSepolia, baseSepolia } from "viem/chains";
import { createConfig, http } from "wagmi";

export const config = createConfig({
  ssr: true,
  chains: [etherlinkTestnet, arbitrumSepolia, baseSepolia],
  transports: {
    [etherlinkTestnet.id]: http(),
    [arbitrumSepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});
