// Mock lending pool data to replace API temporarily
export const mockPools = [
  {
    id: "0x47dAF2E09737E065b40d13271Bc46f89b783329D",
    collateralToken: "0x0355360B7F943974404277936a5C7536B51B9A77",
    borrowToken: "0xB8DB4FcdD486a031a3B2CA27B588C015CB99F5F0",
    ltv: "800000000000000000", // 80% in wei
  },
  {
    id: "0x96709785a965C639F92649F9Ce4b998BA7D1B67A",
    collateralToken: "0x0355360B7F943974404277936a5C7536B51B9A77",
    borrowToken: "0x2761372682FE39A53A5b1576467a66b258C3fec2",
    ltv: "800000000000000000", // 80% in wei
  },
  {
    id: "0xdBeEB36f5B0BfB492cBDce94C335328ED01282A2",
    collateralToken: "0x50df5e25AB60e150f753B9444D160a80f0279559",
    borrowToken: "0x2761372682FE39A53A5b1576467a66b258C3fec2",
    ltv: "800000000000000000", // 80% in wei
  },
];

export const getMockPools = (chainId: number) => {

  if (chainId === 128123) {
    return mockPools;
  }
  return [];
};

// Helper function to get a specific pool by ID
export const getMockPoolById = (poolId: string) => {
  return mockPools.find(pool => pool.id === poolId) || null;
}; 