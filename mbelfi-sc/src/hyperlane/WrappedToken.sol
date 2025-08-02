// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract WrappedToken is ERC20 {
    address public bridge;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        bridge = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
