// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import {IMailbox} from "@hyperlane-xyz/interfaces/IMailbox.sol";
// import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";

import {IMailbox} from "../../../lib/hyperlane-monorepo/solidity/contracts/interfaces/IMailbox.sol";
import {IInterchainGasPaymaster} from "../../../lib/hyperlane-monorepo/solidity/contracts/interfaces/IInterchainGasPaymaster.sol";
import {IERC20} from "../../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract BridgeTokenSender {
    address public mailbox;
    address public token;
    uint32 public destinationDomain;
    address public receiverBridge;
    address public interchainGasPaymaster;

    constructor(
        address _mailbox,
        address _token,
        uint32 _destinationDomain,
        address _receiverBridge,
        address _interchainGasPaymaster
    ) {
        mailbox = _mailbox;
        token = _token;
        destinationDomain = _destinationDomain;
        receiverBridge = _receiverBridge;
        interchainGasPaymaster = _interchainGasPaymaster;
    }

    function bridge(uint256 amount, address recipient) external payable returns (bytes32) {
        // Transfer token from user ke kontrak (lock)
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Encode payload
        bytes memory message = abi.encode(recipient, amount);
        // bytes memory message = bytes("Hello World");

        // Kirim pesan ke Chain B
        uint256 gasAmount = IInterchainGasPaymaster(interchainGasPaymaster).quoteGasPayment(destinationDomain, amount);
        bytes32 recipientAddress = bytes32(uint256(uint160(receiverBridge)));

        bytes32 messageId = IMailbox(mailbox).dispatch{value: gasAmount}(destinationDomain, recipientAddress, message);
        return messageId;
    }
}
