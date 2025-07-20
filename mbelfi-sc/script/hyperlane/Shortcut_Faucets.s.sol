// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Helper} from "./Helper.sol";
import {ITokenSwap} from "../../src/hyperlane/interfaces/ITokenSwap.sol";

contract FaucetsScript is Script, Helper {
    // ------- FILL THIS ----------
    address public claimToken = ARB_USDC;
    uint256 public amount = 10_000;
    // ----------------------------

    function setUp() public {
        // vm.createSelectFork(vm.rpcUrl("rise_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("op_sepolia"));
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("avalanche_fuji"));
        // vm.createSelectFork(vm.rpcUrl("cachain_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("educhain"));
        // vm.createSelectFork(vm.rpcUrl("pharos_devnet"));
        // vm.createSelectFork(vm.rpcUrl("op_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        uint256 decimal = IERC20Metadata(claimToken).decimals();
        uint256 amountFaucets = amount * (10 ** decimal);

        vm.startBroadcast(privateKey);
        ITokenSwap(claimToken).mintMock(claimAddress, amountFaucets);
        console.log("faucet success amount", amountFaucets);
        console.log("faucet success address", claimAddress);
        vm.stopBroadcast();
    }
    // RUN
    // forge script FaucetsScript -vvv --broadcast
}
