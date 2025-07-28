// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Helper} from "./Helper.sol";
import {IHelperTestnet} from "../../src/hyperlane/interfaces/IHelperTestnet.sol";

contract HelperTestnetScript is Script, Helper {
    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
    }
}