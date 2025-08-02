// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";
import {Helper} from "./Helper.sol";
import {ILendingPool} from "../../src/hyperlane/interfaces/ILendingPool.sol";
import {IHelperTestnet} from "../../src/hyperlane/interfaces/IHelperTestnet.sol";
import {IFactory} from "../../src/hyperlane/interfaces/IFactory.sol";

contract LPBorrowScript is Script, Helper {
    // --------- FILL THIS ----------
    address public yourWallet = vm.envAddress("ADDRESS");
    uint256 public amount = 1;
    // uint32 public chainId = 421614;
    uint32 public chainId = 84532;
    // uint256 public chainId = 128123;
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
        address borrowToken = ILendingPool(ORIGIN_lendingPool).borrowToken();
        uint256 lpBorrowBalance = IERC20(borrowToken).balanceOf(ORIGIN_lendingPool);
        uint256 decimal = IERC20Metadata(borrowToken).decimals();
        uint256 amountBorrow = amount * (10 ** decimal);

        vm.startBroadcast(privateKey);
        if (lpBorrowBalance < amountBorrow) {
            console.log("not enough borrow balance");
            console.log("lpBorrowBalance", lpBorrowBalance);
            console.log("Your debt amount application", amountBorrow);
            return;
        } else {
            console.log("LP balance before borrow", lpBorrowBalance);
            console.log("borrow token address", borrowToken);

            address helperTestnet = IFactory(ORIGIN_lendingPoolFactory).helper();
            (,, uint32 destinationDomain) = IHelperTestnet(helperTestnet).chains(uint256(chainId));
            console.log("destinationDomain", destinationDomain);
            (, address interchainGasPaymaster,) = IHelperTestnet(helperTestnet).chains(uint256(block.chainid));
            console.log("interchainGasPaymaster", interchainGasPaymaster);
            uint256 gasAmount;
            if (block.chainid == chainId) {
                gasAmount = 0;
            } else {
                gasAmount =
                    IInterchainGasPaymaster(interchainGasPaymaster).quoteGasPayment(destinationDomain, amountBorrow);
                console.log("gasAmount", gasAmount);
            }
            ILendingPool(ORIGIN_lendingPool).borrowDebt{value: gasAmount}(amountBorrow, chainId, 0);

            console.log("success");
            console.log("LP balance after borrow", IERC20(borrowToken).balanceOf(ORIGIN_lendingPool));
        }
        vm.stopBroadcast();
    }
    // RUN
    // forge script LPBorrowScript -vvv --broadcast
}
