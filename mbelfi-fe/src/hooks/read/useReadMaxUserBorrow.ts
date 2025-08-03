import { useAccount, useReadContract } from "wagmi";
import { helperAbi } from "@/lib/abis/helperAbi";
import { helperAddress } from "@/constants/tokenAddress";

export const useReadMaxUserBorrow = (
  lendingPoolAddress: string,
  decimals: number
) => {
  const { address } = useAccount();

  const {
    data: maxUserBorrow,
    isLoading: isLoadingMaxUserBorrow,
    refetch: refetchMaxUserBorrow,
  } = useReadContract({
    address: helperAddress,
    abi: helperAbi,
    functionName: "getMaxBorrowAmount",
    args: [lendingPoolAddress, address as `0x${string}`],
  });

  return {
    maxUserBorrow,
    isLoadingMaxUserBorrow,
    refetchMaxUserBorrow,
  };
};
