import { formatUnits } from "viem";

/**
 * Formats a BigInt value from wei to a human-readable number string
 * Avoids scientific notation for very small numbers
 */
export const formatWeiToNumber = (value: bigint | null | undefined, decimals: number): string => {
  if (value == null) return "0";
  
  try {
    const formatted = formatUnits(value, decimals);
    const num = parseFloat(formatted);
    
    // If the number is very small (less than 0.000001), format it properly
    if (num > 0 && num < 0.000001) {
      return num.toFixed(20).replace(/\.?0+$/, ''); // Remove trailing zeros
    }
    
    // For normal numbers, use toFixed to avoid scientific notation
    if (num === 0) return "0";
    if (num < 1) {
      return num.toFixed(6).replace(/\.?0+$/, ''); // Up to 6 decimal places for small numbers
    }
    if (num < 1000) {
      return num.toFixed(2).replace(/\.?0+$/, ''); // 2 decimal places for normal numbers
    }
    
    // For large numbers, use locale formatting
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.error('Error formatting wei to number:', error);
    return "0";
  }
};

/**
 * Formats a BigInt value from wei to a number for calculations
 * Returns 0 if the value is null/undefined
 */
export const formatWeiToNumberForCalculation = (value: bigint | null | undefined, decimals: number): number => {
  if (value == null) return 0;
  
  try {
    const formatted = formatUnits(value, decimals);
    return parseFloat(formatted);
  } catch (error) {
    console.error('Error formatting wei to number for calculation:', error);
    return 0;
  }
}; 