// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IMailbox} from "@hyperlane-xyz/interfaces/IMailbox.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IHelperTestnet} from "./interfaces/IHelperTestnet.sol";

contract BridgeTokenRouter {
    error NotMailbox();
    error TransferFailed();
    error SameChain();
    error ReceiverBridgeNotSet();
    error MailboxNotSet();
    error InterchainGasPaymasterNotSet();

    event ReceivedMessage(uint32 origin, bytes32 sender, bytes message);

    address public helperTestnet;
    address public mailbox;
    address public interchainGasPaymaster;
    address public token;

    constructor(address _helperTestnet, address _token) {
        helperTestnet = _helperTestnet;
        (address _mailbox, address _interchainGasPaymaster,) =
            IHelperTestnet(helperTestnet).chains(block.chainid);
        if (_mailbox == address(0)) revert MailboxNotSet();
        if (_interchainGasPaymaster == address(0)) revert InterchainGasPaymasterNotSet();

        mailbox = _mailbox;
        interchainGasPaymaster = _interchainGasPaymaster;
        token = _token;
    }

    modifier onlyMailbox() {
        if (msg.sender != address(mailbox)) revert NotMailbox();
        _;
    }

    function bridge(uint256 _amount, address _recipient, uint256 _chainId) external payable returns (bytes32) {
        if (block.chainid == _chainId) revert SameChain();

        (,, uint32 destinationDomain) = IHelperTestnet(helperTestnet).chains(_chainId);
        address receiverBridge = IHelperTestnet(helperTestnet).receiverBridge(_chainId);

        if (receiverBridge == address(0)) revert ReceiverBridgeNotSet();
        if (!IERC20(token).transferFrom(msg.sender, address(this), _amount)) revert TransferFailed();

        // Encode payload
        bytes memory message = abi.encode(_recipient, _amount);

        // Kirim pesan ke Chain B
        uint256 gasAmount = IInterchainGasPaymaster(interchainGasPaymaster).quoteGasPayment(destinationDomain, _amount);
        bytes32 recipientAddress = bytes32(uint256(uint160(receiverBridge)));

        bytes32 messageId = IMailbox(mailbox).dispatch{value: gasAmount}(destinationDomain, recipientAddress, message);
        return messageId;
    }
}
