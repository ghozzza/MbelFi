// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Helper} from "./Helper.sol";
import {IFactory} from "../../src/hyperlane/interfaces/IFactory.sol";

contract CreateLPScript is Script, Helper {
    // --------- FILL THIS ----------
    address collateralToken = ARB_WETH;
    address borrowToken = ARB_USDC;
    uint256 ltv = 7e17;
    // ----------------------------

    address factory = ARB_factory;

    function setUp() public {
        // ***************** HOST CHAIN *****************
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        // **********************************************

        // vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        // pool count
        uint256 poolCount = IFactory(factory).poolCount();
        console.log("poolCount Before", poolCount);
        address pool = IFactory(factory).createLendingPool(collateralToken, borrowToken, ltv);
        console.log("pool", pool);
        poolCount = IFactory(factory).poolCount();
        console.log("poolCount After", poolCount);
        vm.stopBroadcast();
    }

    // RUN
    // forge script CreateLPScript -vvv --broadcast
}
