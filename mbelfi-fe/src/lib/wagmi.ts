import { etherlinkTestnet } from "viem/chains";
import { createConfig, http } from 'wagmi'

export const config = createConfig({
  ssr: true,
  chains: [etherlinkTestnet],
  transports: {
    [etherlinkTestnet.id]: http(),
  },
})
