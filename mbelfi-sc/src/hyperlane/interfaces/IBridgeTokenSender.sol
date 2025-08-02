// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBridgeTokenSender {
    function bridge(uint256 amount, address recipient) external payable;
}