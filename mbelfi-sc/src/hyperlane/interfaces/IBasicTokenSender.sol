// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Client} from "@chainlink-ccip/chains/evm/contracts/libraries/Client.sol";

interface IBasicTokenSender {
    enum PayFeesIn {
        Native,
        LINK
    }

    function send(
        uint64 destinationChainSelector,
        address receiver,
        Client.EVMTokenAmount[] memory tokensToSendDetails,
        PayFeesIn payFeesIn
    ) external;
}