// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ILendingPool {
    function ltv() external view returns (uint256);
    function collateralToken() external view returns (address);
    function borrowToken() external view returns (address);
    function supplyCollateral(uint256 amount) external;
    function supplyLiquidity(uint256 amount) external;
    function borrowDebt(uint256 amount, uint256 _chainId, uint256 _bridgeTokenSender) external payable;
    function repayWithSelectedToken(uint256 shares, address _token, bool _fromPosition) external;
    function totalSupplyAssets() external view returns (uint256);
    function totalSupplyShares() external view returns (uint256);
    function totalBorrowShares() external view returns (uint256);
    function totalBorrowAssets() external view returns (uint256);
    function lastAccrued() external view returns (uint256);
    function addressPositions(address _user) external view returns (address);
    function swapTokenByPosition(address _tokenFrom, address _tokenTo, uint256 amountIn) external returns (uint256 amountOut);
    function userBorrowShares(address _user) external view returns (uint256);
}