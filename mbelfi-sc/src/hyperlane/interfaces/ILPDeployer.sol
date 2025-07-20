// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ILPDeployer {
    function deployLendingPool(address collateralToken, address borrowToken, uint256 ltv) external returns (address);
    function setFactory(address factory) external;
}