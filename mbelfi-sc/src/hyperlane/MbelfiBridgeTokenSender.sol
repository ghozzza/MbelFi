// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMailbox} from "@hyperlane-xyz/interfaces/IMailbox.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IHelperTestnet} from "./interfaces/IHelperTestnet.sol";
import {ITokenSwap} from "./interfaces/ITokenSwap.sol";

contract MbelfiBridgeTokenSender {
    error SameChain();
    error TransferFailed();
    error MailboxNotSet();
    error InterchainGasPaymasterNotSet();
    error ReceiverBridgeNotSet();

    address public helperTestnet;
    address public mailbox;
    address public interchainGasPaymaster;
    address public token;
    address public receiverBridge; // ** OTHER CHAIN
    uint256 public chainId; // ** OTHER CHAIN

    constructor(address _helperTestnet, address _token, address _receiverBridge, uint256 _chainId) {
        helperTestnet = _helperTestnet;
        (address _mailbox, address _interchainGasPaymaster,) = IHelperTestnet(helperTestnet).chains(block.chainid);
        mailbox = _mailbox;
        interchainGasPaymaster = _interchainGasPaymaster;
        receiverBridge = _receiverBridge;
        chainId = _chainId;
        token = _token;

        _validateConstructorParams();
    }

    function _validateConstructorParams() private view {
        _validateSameChain();
        _validateDifferentChain();
    }

    function _validateSameChain() private view {
        if (mailbox == address(0)) revert MailboxNotSet();
        if (interchainGasPaymaster == address(0)) revert InterchainGasPaymasterNotSet();
    }

    function _validateDifferentChain() private view {
        if (receiverBridge == address(0)) revert ReceiverBridgeNotSet();
        if (block.chainid == chainId) revert SameChain();
    }

    function bridge(uint256 _amount, address _recipient, address _token) external payable returns (bytes32) {
        (,, uint32 destinationDomain) = IHelperTestnet(helperTestnet).chains(chainId); // ** OTHER CHAIN
        if (receiverBridge == address(0)) revert ReceiverBridgeNotSet();
        if (!IERC20(_token).transferFrom(msg.sender, address(this), _amount)) revert TransferFailed(); // TODO: BURN
        ITokenSwap(token).burn(_amount);
        // Encode payload
        bytes memory message = abi.encode(_recipient, _amount);
        // Send message to Chain B
        uint256 gasAmount = IInterchainGasPaymaster(interchainGasPaymaster).quoteGasPayment(destinationDomain, _amount);
        bytes32 recipientAddress = bytes32(uint256(uint160(receiverBridge)));
        bytes32 messageId = IMailbox(mailbox).dispatch{value: gasAmount}(destinationDomain, recipientAddress, message);
        return messageId;
    }
}
