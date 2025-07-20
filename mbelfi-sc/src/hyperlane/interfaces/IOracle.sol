// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IOracle {
    function tokenCalculator(uint256 _amount, address _tokenFrom, address _tokenTo) external view returns (uint256);
    function getPrice(address _collateral, address _borrow) external view returns (uint256);
    function getPriceTrade(address _tokenFrom, address _tokenTo) external view returns (uint256, uint256);
    function getQuoteDecimal(address _token) external view returns (uint256);
    function priceCollateral(address _token) external view returns (uint256);
}