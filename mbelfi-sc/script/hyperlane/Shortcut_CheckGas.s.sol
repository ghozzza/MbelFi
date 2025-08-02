// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Helper} from "./Helper.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";

contract CheckGasScript is Script, Helper {
    //     domainRoutingIsmFactory: "0x8F9CbC0b137E1edf26a41c6f9DFca77966a67b80"
    // interchainAccountRouter: "0xA0C8fB5206642Bf3693176D2369Bdd0e51271b67"
    // mailbox: "0x58545de70CeF725c3F9623f8fAB5e53000Cd3B7D"
    // merkleTreeHook: "0xA4eBaF7D6fa7a84bE5736ecB0E57aA364CB49171"
    // proxyAdmin: "0xd5b7F355a6ABbeaa8F894a65fb515c730e8286d8"
    // staticAggregationHookFactory: "0x18270bB77624b4257f527d6b9Dbd5fAf53a5dAF7"
    // staticAggregationIsmFactory: "0xeF7e2C4Cc0b7a3AB906AD06582d37098e721DaF9"
    // staticMerkleRootMultisigIsmFactory: "0x1e554A3a57490c65dfBEE414a8aEF10D1777316B"
    // staticMerkleRootWeightedMultisigIsmFactory: "0x62bF56D1385dCA7fc1e3A312782a2b9954cd9145"
    // staticMessageIdMultisigIsmFactory: "0xAe22cccF389cA522E5317608324836b08DCbc26d"
    // staticMessageIdWeightedMultisigIsmFactory: "0x2d23E1914247C3B75e6786167Ecde2c086505046"
    // testRecipient: "0xcb32106E32Ca136cbC54ca913025bc87FcFa8ECD"
    // validatorAnnounce: "0x1Ae6C5604AfDFd8A0Cc9753166987A6E97ced42e"

    // staticMerkleRootMultisigIsmFactory: "0x0D56c59F236eb40038adBAb88F497f5eEfF787CD"
    //     staticMessageIdMultisigIsmFactory: "0xA7c337D09b9e6A44f54869dB63683aFbf330dC2c"
    //     staticAggregationIsmFactory: "0x02A7dA42C5f68444120B1090E8f6a8bB45A0FBC5"
    //     staticAggregationHookFactory: "0x870d67Ae620e746Fb137ceA8E5b7bDC780b45bfE"
    //     domainRoutingIsmFactory: "0x46791E8B9F684E5C6A1533c94C9B6e39A7920ADf"
    //     staticMerkleRootWeightedMultisigIsmFactory: "0x6EA0efb264ea292171F662421D6D030106A07300"
    //     staticMessageIdWeightedMultisigIsmFactory: "0x7Ca08DdDc6E647870667C8E831C0DF905eC95Ff1"
    //     proxyAdmin: "0x8168c4E878B917E272fBA4889Dc4279e0974E38b"
    //     mailbox: "0x79751361d1Ee82Fd1310E95CeD5A1f23B2D76de0"
    //     interchainAccountRouter: "0x7DA57352Bf5e129612Fc2aCA6C7EBae6F144e6bf"
    //     validatorAnnounce: "0x732788f4671aA3cA49457aa88520F2aAA0E32096"
    //     testRecipient: "0x45C650e87fE5df1CC2D4F1aceD142FA9EB2eb3AA"
    //     merkleTreeHook: "0x8e1327D6aDa9Da68ddd0F2b212D52ef6166a429C"
    address public interchainGasPaymaster = 0xF2eeC8fD0eDE71006E7f423200e8615E48A73890;

    function setUp() public {
        // vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        uint256 gasAmount = IInterchainGasPaymaster(0xb72A63Cd4148aD41F86f9d22dCe1eCEB65C811e8).quoteGasPayment(
            uint32(Base_Sepolia), 1e6
        );
        console.log("gasAmount", gasAmount);

        vm.stopBroadcast();
    }

    // RUN
    // forge script Shortcut_CheckGasScript --rpc-url etherlink_testnet --broadcast --verify -vvvv
    // forge script CheckGasScript -vvv --broadcast
    //1100071.500000000000000000
    // 1100071500000
}
