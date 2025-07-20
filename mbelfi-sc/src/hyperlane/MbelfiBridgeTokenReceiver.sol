// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IMessageRecipient} from "@hyperlane-xyz/interfaces/IMessageRecipient.sol";
import {ITokenSwap} from "./interfaces/ITokenSwap.sol";
import {IHelperTestnet} from "./interfaces/IHelperTestnet.sol";

contract MbelfiBridgeTokenReceiver is IMessageRecipient {
    error MailboxNotSet();
    error NotMailbox();

    event ReceivedMessage(uint32 origin, bytes32 sender, bytes message);

    address public mailbox;
    address public token;
    address public helperTestnet;

    constructor(address _helperTestnet, address _token) {
        helperTestnet = _helperTestnet;
        (address _mailbox,,) = IHelperTestnet(helperTestnet).chains(block.chainid);
        if (_mailbox == address(0)) revert MailboxNotSet();
        mailbox = _mailbox;
        token = _token;
    }

    modifier onlyMailbox() {
        if (msg.sender != address(mailbox)) revert NotMailbox();
        _;
    }

    // Called by Hyperlane when message arrives
    function handle(uint32 _origin, bytes32 _sender, bytes calldata _messageBody) external override onlyMailbox {
        (address recipient, uint256 amount) = abi.decode(_messageBody, (address, uint256));
        // ITokenSwap(token).mint(recipient, amount);
        ITokenSwap(token).mintMock(recipient, amount);
        emit ReceivedMessage(_origin, _sender, _messageBody);
    }
}
