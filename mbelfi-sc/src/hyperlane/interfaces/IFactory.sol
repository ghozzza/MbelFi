// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IFactory {
    function tokenDataStream(address _token) external view returns (address);
    function basicTokenSender(uint256 _chainId) external view returns (address);
    function owner() external view returns (address);
    function isHealthy() external view returns (address);
    function addTokenDataStream(address _token, address _dataStream) external;
    function createLendingPool(address _collateralToken, address _borrowToken, uint256 _ltv) external returns (address);
    function protocol() external view returns (address);
    function poolCount() external view returns (uint256);
    function helper() external view returns (address);
}