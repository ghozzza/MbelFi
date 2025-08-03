// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {HelperUtils} from "../../src/hyperlane/HelperUtils.sol";

contract HelperUtilsScript is Script {
    HelperUtils public helperUtils;
    address public factory = 0x86CA4a34eB2C11F7406220E402cc689bb811C0CD;

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("etherlink_testnet"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        helperUtils = new HelperUtils(factory);

        vm.stopBroadcast();

        console.log("helperUtils", address(helperUtils));
    }

    // RUN
    // forge script HelperUtilsScript --broadcast -vvv --verify

//     forge verify-contract \
//   --rpc-url https://node.ghostnet.etherlink.com \
//   --verifier blockscout \
//   --verifier-url 'https://testnet.explorer.etherlink.com/api/' \
//   0x4eB5359245A1B4436757E74aE1B8a7c645f90c2e \
//   src/hyperlane/HelperUtils.sol:HelperUtils
}
