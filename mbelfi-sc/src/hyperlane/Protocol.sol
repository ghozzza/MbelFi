// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

contract Protocol is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error InsufficientBalance(address token, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function withdraw(address token, uint256 amount) public nonReentrant onlyOwner {
        if (IERC20(token).balanceOf(address(this)) < amount) {
            revert InsufficientBalance(token, amount);
        }
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
