// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Helper} from "./Helper.sol";
import {ILendingPool} from "../../src/hyperlane/interfaces/ILendingPool.sol";

contract LPRepayFromPositionScript is Script, Helper {
    // --------- FILL THIS ----------
    address public yourWallet = vm.envAddress("ADDRESS");
    uint256 public amount = 1;
    // ----------------------------

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("avalanche_fuji"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address borrowToken = ILendingPool(ARB_lp).borrowToken();
        uint256 decimals = 10 ** IERC20Metadata(borrowToken).decimals();
        uint256 amountToPay = amount * decimals;

        uint256 debtBefore = ILendingPool(ARB_lp).userBorrowShares(yourWallet);
        console.log("debtBefore", debtBefore);
        vm.startBroadcast(privateKey);
        // approve
        uint256 shares = ((amountToPay * ILendingPool(ARB_lp).totalBorrowShares()) / ILendingPool(ARB_lp).totalBorrowAssets());
        IERC20(borrowToken).approve(ARB_lp, amountToPay + 1e6);
        ILendingPool(ARB_lp).repayWithSelectedToken(shares, address(ARB_USDC), true);
        uint256 debtAfter = ILendingPool(ARB_lp).userBorrowShares(yourWallet);
        console.log("-------------------------------- repay from position --------------------------------");
        console.log("debtAfter", debtAfter);
        vm.stopBroadcast();
    }

    // RUN
    // forge script LPRepayFromPositionScript -vvv --broadcast
}