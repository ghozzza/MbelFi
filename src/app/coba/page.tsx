"use client";

import { createThirdwebClient } from "thirdweb";
import { useNetworkSwitcherModal } from "thirdweb/react";
import { base, ethereum, polygon, sepolia, arbitrum } from "thirdweb/chains";
 
const client = createThirdwebClient({
 clientId: "6968b5741aff6ae8198c60cd52347a56",
});
 
export default function Example() {
  const networkSwitcher = useNetworkSwitcherModal();
 
  function handleClick() {
     networkSwitcher.open({
       client,
       theme: 'light',
       sections: [
         { label: 'Recently used', chains: [arbitrum, polygon] },
         { label: 'Popular', chains: [base, ethereum, sepolia] },
       ]
    });
  }
 
  return <button onClick={handleClick}> Switch Network </button>
}