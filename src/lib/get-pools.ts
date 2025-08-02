import { getMockPools } from "../constants/mockPools";
import { enrichPoolWithTokenInfo } from "./pair-token-address";

// Temporarily using mock data instead of API due to API issues
export async function getPools(chainId?: number) {
  try {
  
    
    // Use mock data for Etherlink Testnet (128123) or default chain
    const defaultChainId = chainId || 128123;
    const mockPools = getMockPools(defaultChainId);
    
    // Enrich the mock pools with token information using existing logic
    const enrichedPools = mockPools.map(pool => enrichPoolWithTokenInfo(pool, defaultChainId));
    
  
    return enrichedPools;
      } catch (error) {
      return [];
    }
}