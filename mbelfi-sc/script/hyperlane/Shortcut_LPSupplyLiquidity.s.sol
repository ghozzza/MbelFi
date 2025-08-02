// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Helper} from "./Helper.sol";
import {ILendingPool} from "../../src/hyperlane/interfaces/ILendingPool.sol";

contract LPSupplyLiquidityScript is Script, Helper {
    // --------- FILL THIS ----------
    address public yourWallet = vm.envAddress("ADDRESS");
    uint256 public amount = 1000;
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

    // Make sure you have enough collateral in the wallet
    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address borrowToken = ILendingPool(ORIGIN_lendingPool).borrowToken();
        uint256 decimal = IERC20Metadata(borrowToken).decimals();

        vm.startBroadcast(privateKey);
        amount = decimal > 6 ? 3 : amount;
        uint256 amountSupplyLiquidity = amount * (10 ** decimal);

        uint256 balance = IERC20(borrowToken).balanceOf(yourWallet);

        if (balance < amountSupplyLiquidity) {
            console.log("not enough borrowToken");
            console.log("Your balance", balance);
            console.log("Your supply liquidity", amountSupplyLiquidity);
            return;
        } else {
            console.log("Your balance before supply liquidity", balance);
            IERC20(borrowToken).approve(ORIGIN_lendingPool, amountSupplyLiquidity);
            ILendingPool(ORIGIN_lendingPool).supplyLiquidity(amountSupplyLiquidity);
            console.log("success");
            console.log("Your balance after supply liquidity", IERC20(borrowToken).balanceOf(yourWallet));
        }
        vm.stopBroadcast();
    }
    // RUN
    // forge script LPSupplyLiquidityScript -vvv --broadcast
}
