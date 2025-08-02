// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ILendingPool} from "../../src/hyperlane/interfaces/ILendingPool.sol";
import {Helper} from "./Helper.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract Shortcut_SwapCollateral is Script, Helper {
    // --------- FILL THIS ----------
    address public yourWallet = vm.envAddress("ADDRESS");
    uint256 public amount = 1;
    address public tokenIn = ORIGIN_WETH;
    address public tokenOut = ORIGIN_USDC;
    // ----------------------------

    function setUp() public {
        // ***************** HOST CHAIN *****************
        vm.createSelectFork(vm.rpcUrl("etherlink_testnet"));
        // **********************************************
        // vm.createSelectFork(vm.rpcUrl("rise_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("op_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("avalanche_fuji"));
        // vm.createSelectFork(vm.rpcUrl("cachain_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("educhain"));
        // vm.createSelectFork(vm.rpcUrl("pharos_devnet"));
        // vm.createSelectFork(vm.rpcUrl("op_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address userPosition = ILendingPool(ORIGIN_lendingPool).addressPositions(yourWallet);

        vm.startBroadcast(privateKey);
        uint256 tokenInBefore = IERC20(tokenIn).balanceOf(userPosition);
        uint256 tokenOutBefore = IERC20(tokenOut).balanceOf(userPosition);
        console.log("tokenInBefore", tokenInBefore);
        console.log("tokenOutBefore", tokenOutBefore);
        ILendingPool(ORIGIN_lendingPool).swapTokenByPosition(tokenIn, tokenOut, amount * 1e17);
        uint256 tokenInAfter = IERC20(tokenIn).balanceOf(userPosition);
        uint256 tokenOutAfter = IERC20(tokenOut).balanceOf(userPosition);
        console.log("tokenInAfter", tokenInAfter);
        console.log("tokenOutAfter", tokenOutAfter);
        console.log("--------------------------------");
        vm.stopBroadcast();
    }
    // RUN
    // forge script Shortcut_SwapCollateral -vvv --broadcast
}
