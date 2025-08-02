export const getBlockExplorerUrl = (chainId: number, txHash: string) => {
  const explorers = {
    128123: "https://testnet.explorer.etherlink.com", // Etherlink Testnet
  };

  const baseUrl =
    explorers[chainId as keyof typeof explorers] ||
    "https://testnet.explorer.etherlink.com";
  return `${baseUrl}/tx/${txHash}`;
}; 