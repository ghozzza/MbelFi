// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Helper} from "./Helper.sol";
import {ILendingPool} from "../../src/hyperlane/interfaces/ILendingPool.sol";

contract LPSupplyCollateralScript is Script, Helper {
    // --------- FILL THIS ----------
    address public yourWallet = vm.envAddress("ADDRESS");
    uint256 public amount = 2;
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

    // Make sure you have enough collateral in the wallet
    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address collateralToken = ILendingPool(ARB_lp).collateralToken();
        uint256 decimal = IERC20Metadata(collateralToken).decimals();

        vm.startBroadcast(privateKey);
        amount = decimal >= 6 ? 3 : amount;
        uint256 amountSupplyCollateral = amount * (10 ** decimal);

        uint256 balance = IERC20(collateralToken).balanceOf(yourWallet);

        if (balance < amountSupplyCollateral) {
            console.log("not enough collateral");
            console.log("balance", balance);
            return;
        } else {
            console.log("Your balance before supply collateral", balance);
            IERC20(collateralToken).approve(ARB_lp, amountSupplyCollateral);
            ILendingPool(ARB_lp).supplyCollateral(amountSupplyCollateral);
            console.log("success");
            console.log("Your balance after supply collateral", IERC20(collateralToken).balanceOf(yourWallet));
        }
        vm.stopBroadcast();
    }
    // RUN
    // forge script LPSupplyCollateralScript -vvv --broadcast
}
