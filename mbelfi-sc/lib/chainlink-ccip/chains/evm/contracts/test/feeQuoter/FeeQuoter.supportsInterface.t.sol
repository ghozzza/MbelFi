// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {IReceiver} from "@chainlink/contracts/src/v0.8/keystone/interfaces/IReceiver.sol";

import {IFeeQuoter} from "../../interfaces/IFeeQuoter.sol";
import {FeeQuoterSetup} from "./FeeQuoterSetup.t.sol";
import {IERC165} from
  "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v5.0.2/contracts/interfaces/IERC165.sol";

contract FeeQuoter_supportsInterface is FeeQuoterSetup {
  function test_SupportsInterface() public view {
    assertTrue(s_feeQuoter.supportsInterface(type(IReceiver).interfaceId));
    assertTrue(s_feeQuoter.supportsInterface(type(IFeeQuoter).interfaceId));
    assertTrue(s_feeQuoter.supportsInterface(type(IERC165).interfaceId));
  }
}
