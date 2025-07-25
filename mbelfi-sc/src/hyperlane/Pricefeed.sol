// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin-contracts/contracts/access/Ownable.sol";

contract Pricefeed is Ownable {
    address public token;
    uint80 public roundId;
    uint256 public price;
    uint256 public startedAt;
    uint256 public updatedAt;
    uint80 public answeredInRound;
    uint8 public decimals = 8;

    constructor(address _token) Ownable(msg.sender) {
        token = _token;
    }

    function setPrice(uint256 _price) public onlyOwner {
        roundId = 1;
        price = _price;
        startedAt = block.timestamp;
        updatedAt = block.timestamp;
        answeredInRound = 1;
    }

    function latestRoundData() public view returns (uint80, uint256, uint256, uint256, uint80) {
        return (roundId, price, startedAt, updatedAt, answeredInRound);
    }
}
