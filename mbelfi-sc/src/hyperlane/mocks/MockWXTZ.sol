// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {IMbelfiBridgeTokenSender} from "../interfaces/IMbelfiBridgeTokenSender.sol";
import {ERC20} from "@openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract MockWXTZ is ERC20 {
    error InvalidChainId();
    error NotOwner();

    address public owner;
    address public helperTestnet;
    mapping(uint256 => address[]) public bridgeTokenSenders;

    event BridgeTokenSenderAdded(address indexed bridgeTokenSender, uint256 indexed chainId);

    constructor(address _helperTestnet) ERC20("Wrapped Tezos", "WXTZ") {
        helperTestnet = _helperTestnet;
        owner = msg.sender;
    }

    modifier _onlyOwner() {
        __onlyOwner();
        _;
    }

    function __onlyOwner() internal view {
        if (msg.sender != owner) revert NotOwner();
    }

    // this function for hackathon purposes
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    function mintMock(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burnMock(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function addBridgeTokenSender(address _bridgeTokenSender) public _onlyOwner {
        uint256 _chainId = IMbelfiBridgeTokenSender(_bridgeTokenSender).chainId();
        if (_chainId == 0) revert InvalidChainId();
        bridgeTokenSenders[_chainId].push(_bridgeTokenSender);
        emit BridgeTokenSenderAdded(_bridgeTokenSender, _chainId);
    }

    function getBridgeTokenSendersLength(uint256 _chainId) external view returns (uint256) {
        return bridgeTokenSenders[_chainId].length;
    }
}
