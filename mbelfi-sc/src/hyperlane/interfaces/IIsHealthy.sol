// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IIsHealthy {
    function _isHealthy(
        address borrowToken,
        address factory,
        address addressPositions,
        uint256 ltv,
        uint256 totalBorrowAssets,
        uint256 totalBorrowShares,
        uint256 userBorrowShares
    ) external view;
}
