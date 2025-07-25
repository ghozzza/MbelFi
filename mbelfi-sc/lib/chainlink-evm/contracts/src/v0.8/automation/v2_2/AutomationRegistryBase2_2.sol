// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.19;

import {EnumerableSet} from "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
import {Address} from "@openzeppelin/contracts@4.9.6/utils/Address.sol";
import {StreamsLookupCompatibleInterface} from "../interfaces/StreamsLookupCompatibleInterface.sol";
import {ILogAutomation, Log} from "../interfaces/ILogAutomation.sol";
import {IAutomationForwarder} from "../interfaces/IAutomationForwarder.sol";
import {ConfirmedOwner} from "../../shared/access/ConfirmedOwner.sol";
import {AggregatorV3Interface} from "../../shared/interfaces/AggregatorV3Interface.sol";
import {LinkTokenInterface} from "../../shared/interfaces/LinkTokenInterface.sol";
import {KeeperCompatibleInterface} from "../interfaces/KeeperCompatibleInterface.sol";
import {UpkeepFormat} from "../interfaces/UpkeepTranscoderInterface.sol";
import {IChainModule} from "../interfaces/IChainModule.sol";

/**
 * @notice Base Keeper Registry contract, contains shared logic between
 * AutomationRegistry and AutomationRegistryLogic
 * @dev all errors, events, and internal functions should live here
 */
// solhint-disable-next-line max-states-count
abstract contract AutomationRegistryBase2_2 is ConfirmedOwner {
  using Address for address;
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.AddressSet;

  address internal constant ZERO_ADDRESS = address(0);
  address internal constant IGNORE_ADDRESS = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;
  bytes4 internal constant CHECK_SELECTOR = KeeperCompatibleInterface.checkUpkeep.selector;
  bytes4 internal constant PERFORM_SELECTOR = KeeperCompatibleInterface.performUpkeep.selector;
  bytes4 internal constant CHECK_CALLBACK_SELECTOR = StreamsLookupCompatibleInterface.checkCallback.selector;
  bytes4 internal constant CHECK_LOG_SELECTOR = ILogAutomation.checkLog.selector;
  uint256 internal constant PERFORM_GAS_MIN = 2_300;
  uint256 internal constant CANCELLATION_DELAY = 50;
  uint256 internal constant PERFORM_GAS_CUSHION = 5_000;
  uint256 internal constant PPB_BASE = 1_000_000_000;
  uint32 internal constant UINT32_MAX = type(uint32).max;
  uint96 internal constant LINK_TOTAL_SUPPLY = 1e27;
  // The first byte of the mask can be 0, because we only ever have 31 oracles
  uint256 internal constant ORACLE_MASK = 0x0001010101010101010101010101010101010101010101010101010101010101;
  /**
   * @dev UPKEEP_TRANSCODER_VERSION_BASE is temporary necessity for backwards compatibility with
   * MigratableAutomationRegistryInterfaceV1 - it should be removed in future versions in favor of
   * UPKEEP_VERSION_BASE and MigratableAutomationRegistryInterfaceV2
   */
  UpkeepFormat internal constant UPKEEP_TRANSCODER_VERSION_BASE = UpkeepFormat.V1;
  uint8 internal constant UPKEEP_VERSION_BASE = 3;

  // Next block of constants are only used in maxPayment estimation during checkUpkeep simulation
  // These values are calibrated using hardhat tests which simulates various cases and verifies that
  // the variables result in accurate estimation
  uint256 internal constant REGISTRY_CONDITIONAL_OVERHEAD = 60_000; // Fixed gas overhead for conditional upkeeps
  uint256 internal constant REGISTRY_LOG_OVERHEAD = 85_000; // Fixed gas overhead for log upkeeps
  uint256 internal constant REGISTRY_PER_SIGNER_GAS_OVERHEAD = 5_600; // Value scales with f
  uint256 internal constant REGISTRY_PER_PERFORM_BYTE_GAS_OVERHEAD = 24; // Per perform data byte overhead

  // The overhead (in bytes) in addition to perform data for upkeep sent in calldata
  // This includes overhead for all struct encoding as well as report signatures
  // There is a fixed component and a per signer component. This is calculated exactly by doing abi encoding
  uint256 internal constant TRANSMIT_CALLDATA_FIXED_BYTES_OVERHEAD = 932;
  uint256 internal constant TRANSMIT_CALLDATA_PER_SIGNER_BYTES_OVERHEAD = 64;

  // Next block of constants are used in actual payment calculation. We calculate the exact gas used within the
  // tx itself, but since payment processing itself takes gas, and it needs the overhead as input, we use fixed constants
  // to account for gas used in payment processing. These values are calibrated using hardhat tests which simulates various cases and verifies that
  // the variables result in accurate estimation
  uint256 internal constant ACCOUNTING_FIXED_GAS_OVERHEAD = 22_000; // Fixed overhead per tx
  uint256 internal constant ACCOUNTING_PER_UPKEEP_GAS_OVERHEAD = 7_000; // Overhead per upkeep performed in batch

  LinkTokenInterface internal immutable i_link;
  AggregatorV3Interface internal immutable i_linkNativeFeed;
  AggregatorV3Interface internal immutable i_fastGasFeed;
  address internal immutable i_automationForwarderLogic;
  address internal immutable i_allowedReadOnlyAddress;

  /**
   * @dev - The storage is gas optimised for one and only one function - transmit. All the storage accessed in transmit
   * is stored compactly. Rest of the storage layout is not of much concern as transmit is the only hot path
   */

  // Upkeep storage
  EnumerableSet.UintSet internal s_upkeepIDs;
  mapping(uint256 => Upkeep) internal s_upkeep; // accessed during transmit
  mapping(uint256 => address) internal s_upkeepAdmin;
  mapping(uint256 => address) internal s_proposedAdmin;
  mapping(uint256 => bytes) internal s_checkData;
  mapping(bytes32 => bool) internal s_dedupKeys;
  // Registry config and state
  EnumerableSet.AddressSet internal s_registrars;
  mapping(address => Transmitter) internal s_transmitters;
  mapping(address => Signer) internal s_signers;
  address[] internal s_signersList; // s_signersList contains the signing address of each oracle
  address[] internal s_transmittersList; // s_transmittersList contains the transmission address of each oracle
  mapping(address => address) internal s_transmitterPayees; // s_payees contains the mapping from transmitter to payee.
  mapping(address => address) internal s_proposedPayee; // proposed payee for a transmitter
  bytes32 internal s_latestConfigDigest; // Read on transmit path in case of signature verification
  HotVars internal s_hotVars; // Mixture of config and state, used in transmit
  Storage internal s_storage; // Mixture of config and state, not used in transmit
  uint256 internal s_fallbackGasPrice;
  uint256 internal s_fallbackLinkPrice;
  uint256 internal s_expectedLinkBalance; // Used in case of erroneous LINK transfers to contract
  mapping(address => MigrationPermission) internal s_peerRegistryMigrationPermission; // Permissions for migration to and fro
  mapping(uint256 => bytes) internal s_upkeepTriggerConfig; // upkeep triggers
  mapping(uint256 => bytes) internal s_upkeepOffchainConfig; // general config set by users for each upkeep
  mapping(uint256 => bytes) internal s_upkeepPrivilegeConfig; // general config set by an administrative role for an upkeep
  mapping(address => bytes) internal s_adminPrivilegeConfig; // general config set by an administrative role for an admin

  error ArrayHasNoEntries();
  error CannotCancel();
  error CheckDataExceedsLimit();
  error ConfigDigestMismatch();
  error DuplicateEntry();
  error DuplicateSigners();
  error GasLimitCanOnlyIncrease();
  error GasLimitOutsideRange();
  error IncorrectNumberOfFaultyOracles();
  error IncorrectNumberOfSignatures();
  error IncorrectNumberOfSigners();
  error IndexOutOfRange();
  error InvalidDataLength();
  error InvalidTrigger();
  error InvalidPayee();
  error InvalidRecipient();
  error InvalidReport();
  error InvalidSigner();
  error InvalidTransmitter();
  error InvalidTriggerType();
  error MaxCheckDataSizeCanOnlyIncrease();
  error MaxPerformDataSizeCanOnlyIncrease();
  error MigrationNotPermitted();
  error NotAContract();
  error OnlyActiveSigners();
  error OnlyActiveTransmitters();
  error OnlyCallableByAdmin();
  error OnlyCallableByLINKToken();
  error OnlyCallableByOwnerOrAdmin();
  error OnlyCallableByOwnerOrRegistrar();
  error OnlyCallableByPayee();
  error OnlyCallableByProposedAdmin();
  error OnlyCallableByProposedPayee();
  error OnlyCallableByUpkeepPrivilegeManager();
  error OnlyPausedUpkeep();
  error OnlySimulatedBackend();
  error OnlyUnpausedUpkeep();
  error ParameterLengthError();
  error PaymentGreaterThanAllLINK();
  error ReentrantCall();
  error RegistryPaused();
  error RepeatedSigner();
  error RepeatedTransmitter();
  error TargetCheckReverted(bytes reason);
  error TooManyOracles();
  error TranscoderNotSet();
  error UpkeepAlreadyExists();
  error UpkeepCancelled();
  error UpkeepNotCanceled();
  error UpkeepNotNeeded();
  error ValueNotChanged();

  enum MigrationPermission {
    NONE,
    OUTGOING,
    INCOMING,
    BIDIRECTIONAL
  }

  enum Trigger {
    CONDITION,
    LOG
  }

  enum UpkeepFailureReason {
    NONE,
    UPKEEP_CANCELLED,
    UPKEEP_PAUSED,
    TARGET_CHECK_REVERTED,
    UPKEEP_NOT_NEEDED,
    PERFORM_DATA_EXCEEDS_LIMIT,
    INSUFFICIENT_BALANCE,
    CALLBACK_REVERTED,
    REVERT_DATA_EXCEEDS_LIMIT,
    REGISTRY_PAUSED
  }

  /**
   * @notice OnchainConfig of the registry
   * @dev used only in setConfig()
   * @member paymentPremiumPPB payment premium rate oracles receive on top of
   * being reimbursed for gas, measured in parts per billion
   * @member flatFeeMicroLink flat fee paid to oracles for performing upkeeps,
   * priced in MicroLink; can be used in conjunction with or independently of
   * paymentPremiumPPB
   * @member checkGasLimit gas limit when checking for upkeep
   * @member stalenessSeconds number of seconds that is allowed for feed data to
   * be stale before switching to the fallback pricing
   * @member gasCeilingMultiplier multiplier to apply to the fast gas feed price
   * when calculating the payment ceiling for keepers
   * @member minUpkeepSpend minimum LINK that an upkeep must spend before cancelling
   * @member maxPerformGas max performGas allowed for an upkeep on this registry
   * @member maxCheckDataSize max length of checkData bytes
   * @member maxPerformDataSize max length of performData bytes
   * @member maxRevertDataSize max length of revertData bytes
   * @member fallbackGasPrice gas price used if the gas price feed is stale
   * @member fallbackLinkPrice LINK price used if the LINK price feed is stale
   * @member transcoder address of the transcoder contract
   * @member registrars addresses of the registrar contracts
   * @member upkeepPrivilegeManager address which can set privilege for upkeeps
   * @member reorgProtectionEnabled if this registry enables re-org protection checks
   * @member chainModule the chain specific module
   */
  // solhint-disable-next-line gas-struct-packing
  struct OnchainConfig {
    uint32 paymentPremiumPPB;
    uint32 flatFeeMicroLink; // min 0.000001 LINK, max 4294 LINK
    uint32 checkGasLimit;
    uint24 stalenessSeconds;
    uint16 gasCeilingMultiplier;
    uint96 minUpkeepSpend;
    uint32 maxPerformGas;
    uint32 maxCheckDataSize;
    uint32 maxPerformDataSize;
    uint32 maxRevertDataSize;
    uint256 fallbackGasPrice;
    uint256 fallbackLinkPrice;
    address transcoder;
    address[] registrars;
    address upkeepPrivilegeManager;
    IChainModule chainModule;
    bool reorgProtectionEnabled;
  }

  /**
   * @notice relevant state of an upkeep which is used in transmit function
   * @member paused if this upkeep has been paused
   * @member performGas the gas limit of upkeep execution
   * @member maxValidBlocknumber until which block this upkeep is valid
   * @member forwarder the forwarder contract to use for this upkeep
   * @member amountSpent the amount this upkeep has spent
   * @member balance the balance of this upkeep
   * @member lastPerformedBlockNumber the last block number when this upkeep was performed
   */
  struct Upkeep {
    bool paused;
    uint32 performGas;
    uint32 maxValidBlocknumber;
    IAutomationForwarder forwarder;
    // 0 bytes left in 1st EVM word - not written to in transmit
    uint96 amountSpent;
    uint96 balance;
    uint32 lastPerformedBlockNumber;
    // 2 bytes left in 2nd EVM word - written in transmit path
  }

  /// @dev Config + State storage struct which is on hot transmit path
  struct HotVars {
    uint96 totalPremium; // ─────────╮ total historical payment to oracles for premium
    uint32 paymentPremiumPPB; //     │ premium percentage charged to user over tx cost
    uint32 flatFeeMicroLink; //      │ flat fee charged to user for every perform
    uint32 latestEpoch; //           │ latest epoch for which a report was transmitted
    uint24 stalenessSeconds; //      │ Staleness tolerance for feeds
    uint16 gasCeilingMultiplier; //  │ multiplier on top of fast gas feed for upper bound
    uint8 f; //                      │ maximum number of faulty oracles
    bool paused; //                  │ pause switch for all upkeeps in the registry
    bool reentrancyGuard; // ────────╯ guard against reentrancy
    bool reorgProtectionEnabled; //    if this registry should enable re-org protection mechanism
    IChainModule chainModule; //       the interface of chain specific module
  }

  /// @dev Config + State storage struct which is not on hot transmit path
  struct Storage {
    uint96 minUpkeepSpend; // Minimum amount an upkeep must spend
    address transcoder; // Address of transcoder contract used in migrations
    // 1 EVM word full
    uint96 ownerLinkBalance; // Balance of owner, accumulates minUpkeepSpend in case it is not spent
    uint32 checkGasLimit; // Gas limit allowed in checkUpkeep
    uint32 maxPerformGas; // Max gas an upkeep can use on this registry
    uint32 nonce; // Nonce for each upkeep created
    uint32 configCount; // incremented each time a new config is posted, The count
    // is incorporated into the config digest to prevent replay attacks.
    uint32 latestConfigBlockNumber; // makes it easier for offchain systems to extract config from logs
    // 2 EVM word full
    uint32 maxCheckDataSize; // max length of checkData bytes
    uint32 maxPerformDataSize; // max length of performData bytes
    uint32 maxRevertDataSize; // max length of revertData bytes
    address upkeepPrivilegeManager; // address which can set privilege for upkeeps
    // 3 EVM word full
  }

  /// @dev Report transmitted by OCR to transmit function
  struct Report {
    uint256 fastGasWei;
    uint256 linkNative;
    uint256[] upkeepIds;
    uint256[] gasLimits;
    bytes[] triggers;
    bytes[] performDatas;
  }

  /**
   * @dev This struct is used to maintain run time information about an upkeep in transmit function
   * @member upkeep the upkeep struct
   * @member earlyChecksPassed whether the upkeep passed early checks before perform
   * @member performSuccess whether the perform was successful
   * @member triggerType the type of trigger
   * @member gasUsed gasUsed by this upkeep in perform
   * @member calldataWeight weight assigned to this upkeep for its contribution to calldata. It is used to split L1 fee
   * @member dedupID unique ID used to dedup an upkeep/trigger combo
   */
  struct UpkeepTransmitInfo {
    Upkeep upkeep;
    bool earlyChecksPassed;
    bool performSuccess;
    Trigger triggerType;
    uint256 gasUsed;
    uint256 calldataWeight;
    bytes32 dedupID;
  }

  struct Transmitter {
    bool active;
    uint8 index; // Index of oracle in s_signersList/s_transmittersList
    uint96 balance;
    uint96 lastCollected;
  }

  struct Signer {
    bool active;
    // Index of oracle in s_signersList/s_transmittersList
    uint8 index;
  }

  /**
   * @notice the trigger structure conditional trigger type
   */
  struct ConditionalTrigger {
    uint32 blockNum;
    bytes32 blockHash;
  }

  /**
   * @notice the trigger structure of log upkeeps
   * @dev NOTE that blockNum / blockHash describe the block used for the callback,
   * not necessarily the block number that the log was emitted in!!!!
   */
  struct LogTrigger {
    bytes32 logBlockHash;
    bytes32 txHash;
    uint32 logIndex;
    uint32 blockNum;
    bytes32 blockHash;
  }

  event AdminPrivilegeConfigSet(address indexed admin, bytes privilegeConfig);
  event CancelledUpkeepReport(uint256 indexed id, bytes trigger);
  event ChainSpecificModuleUpdated(address newModule);
  event DedupKeyAdded(bytes32 indexed dedupKey);
  event FundsAdded(uint256 indexed id, address indexed from, uint96 amount);
  event FundsWithdrawn(uint256 indexed id, uint256 amount, address to);
  event InsufficientFundsUpkeepReport(uint256 indexed id, bytes trigger);
  event OwnerFundsWithdrawn(uint96 amount);
  event Paused(address account);
  event PayeesUpdated(address[] transmitters, address[] payees);
  event PayeeshipTransferRequested(address indexed transmitter, address indexed from, address indexed to);
  event PayeeshipTransferred(address indexed transmitter, address indexed from, address indexed to);
  event PaymentWithdrawn(address indexed transmitter, uint256 indexed amount, address indexed to, address payee);
  event ReorgedUpkeepReport(uint256 indexed id, bytes trigger);
  event StaleUpkeepReport(uint256 indexed id, bytes trigger);
  event UpkeepAdminTransferred(uint256 indexed id, address indexed from, address indexed to);
  event UpkeepAdminTransferRequested(uint256 indexed id, address indexed from, address indexed to);
  event UpkeepCanceled(uint256 indexed id, uint64 indexed atBlockHeight);
  event UpkeepCheckDataSet(uint256 indexed id, bytes newCheckData);
  event UpkeepGasLimitSet(uint256 indexed id, uint96 gasLimit);
  event UpkeepMigrated(uint256 indexed id, uint256 remainingBalance, address destination);
  event UpkeepOffchainConfigSet(uint256 indexed id, bytes offchainConfig);
  event UpkeepPaused(uint256 indexed id);
  event UpkeepPerformed(
    uint256 indexed id,
    bool indexed success,
    uint96 totalPayment,
    uint256 gasUsed,
    uint256 gasOverhead,
    bytes trigger
  );
  event UpkeepPrivilegeConfigSet(uint256 indexed id, bytes privilegeConfig);
  event UpkeepReceived(uint256 indexed id, uint256 startingBalance, address importedFrom);
  event UpkeepRegistered(uint256 indexed id, uint32 performGas, address admin);
  event UpkeepTriggerConfigSet(uint256 indexed id, bytes triggerConfig);
  event UpkeepUnpaused(uint256 indexed id);
  event Unpaused(address account);

  /**
   * @param link address of the LINK Token
   * @param linkNativeFeed address of the LINK/Native price feed
   * @param fastGasFeed address of the Fast Gas price feed
   * @param automationForwarderLogic the address of automation forwarder logic
   * @param allowedReadOnlyAddress the address of the allowed read only address
   */
  constructor(
    address link,
    address linkNativeFeed,
    address fastGasFeed,
    address automationForwarderLogic,
    address allowedReadOnlyAddress
  ) ConfirmedOwner(msg.sender) {
    i_link = LinkTokenInterface(link);
    i_linkNativeFeed = AggregatorV3Interface(linkNativeFeed);
    i_fastGasFeed = AggregatorV3Interface(fastGasFeed);
    i_automationForwarderLogic = automationForwarderLogic;
    i_allowedReadOnlyAddress = allowedReadOnlyAddress;
  }

  // ================================================================
  // |                   INTERNAL FUNCTIONS ONLY                    |
  // ================================================================

  /**
   * @dev creates a new upkeep with the given fields
   * @param id the id of the upkeep
   * @param upkeep the upkeep to create
   * @param admin address to cancel upkeep and withdraw remaining funds
   * @param checkData data which is passed to user's checkUpkeep
   * @param triggerConfig the trigger config for this upkeep
   * @param offchainConfig the off-chain config of this upkeep
   */
  function _createUpkeep(
    uint256 id,
    Upkeep memory upkeep,
    address admin,
    bytes memory checkData,
    bytes memory triggerConfig,
    bytes memory offchainConfig
  ) internal {
    if (s_hotVars.paused) revert RegistryPaused();
    if (checkData.length > s_storage.maxCheckDataSize) revert CheckDataExceedsLimit();
    if (upkeep.performGas < PERFORM_GAS_MIN || upkeep.performGas > s_storage.maxPerformGas)
      revert GasLimitOutsideRange();
    if (address(s_upkeep[id].forwarder) != address(0)) revert UpkeepAlreadyExists();
    s_upkeep[id] = upkeep;
    s_upkeepAdmin[id] = admin;
    s_checkData[id] = checkData;
    s_expectedLinkBalance = s_expectedLinkBalance + upkeep.balance;
    s_upkeepTriggerConfig[id] = triggerConfig;
    s_upkeepOffchainConfig[id] = offchainConfig;
    s_upkeepIDs.add(id);
  }

  /**
   * @dev creates an ID for the upkeep based on the upkeep's type
   * @dev the format of the ID looks like this:
   * ****00000000000X****************
   * 4 bytes of entropy
   * 11 bytes of zeros
   * 1 identifying byte for the trigger type
   * 16 bytes of entropy
   * @dev this maintains the same level of entropy as eth addresses, so IDs will still be unique
   * @dev we add the "identifying" part in the middle so that it is mostly hidden from users who usually only
   * see the first 4 and last 4 hex values ex 0x1234...ABCD
   */
  function _createID(Trigger triggerType) internal view returns (uint256) {
    bytes1 empty;
    IChainModule chainModule = s_hotVars.chainModule;
    bytes memory idBytes = abi.encodePacked(
      keccak256(abi.encode(chainModule.blockHash((chainModule.blockNumber() - 1)), address(this), s_storage.nonce))
    );
    for (uint256 idx = 4; idx < 15; idx++) {
      idBytes[idx] = empty;
    }
    idBytes[15] = bytes1(uint8(triggerType));
    return uint256(bytes32(idBytes));
  }

  /**
   * @dev retrieves feed data for fast gas/native and link/native prices. if the feed
   * data is stale it uses the configured fallback price. Once a price is picked
   * for gas it takes the min of gas price in the transaction or the fast gas
   * price in order to reduce costs for the upkeep clients.
   */
  function _getFeedData(HotVars memory hotVars) internal view returns (uint256 gasWei, uint256 linkNative) {
    uint32 stalenessSeconds = hotVars.stalenessSeconds;
    bool staleFallback = stalenessSeconds > 0;
    uint256 timestamp;
    int256 feedValue;
    (, feedValue, , timestamp, ) = i_fastGasFeed.latestRoundData();
    if (
      feedValue <= 0 || block.timestamp < timestamp || (staleFallback && stalenessSeconds < block.timestamp - timestamp)
    ) {
      gasWei = s_fallbackGasPrice;
    } else {
      gasWei = uint256(feedValue);
    }
    (, feedValue, , timestamp, ) = i_linkNativeFeed.latestRoundData();
    if (
      feedValue <= 0 || block.timestamp < timestamp || (staleFallback && stalenessSeconds < block.timestamp - timestamp)
    ) {
      linkNative = s_fallbackLinkPrice;
    } else {
      linkNative = uint256(feedValue);
    }
    return (gasWei, linkNative);
  }

  /**
   * @dev calculates LINK paid for gas spent plus a configure premium percentage
   * @param gasLimit the amount of gas used
   * @param gasOverhead the amount of gas overhead
   * @param l1CostWei the amount to be charged for L1 fee in wei
   * @param fastGasWei the fast gas price
   * @param linkNative the exchange ratio between LINK and Native token
   * @param isExecution if this is triggered by a perform upkeep function
   */
  function _calculatePaymentAmount(
    HotVars memory hotVars,
    uint256 gasLimit,
    uint256 gasOverhead,
    uint256 l1CostWei,
    uint256 fastGasWei,
    uint256 linkNative,
    bool isExecution
  ) internal view returns (uint96, uint96) {
    uint256 gasWei = fastGasWei * hotVars.gasCeilingMultiplier;
    // in case it's actual execution use actual gas price, capped by fastGasWei * gasCeilingMultiplier
    if (isExecution && tx.gasprice < gasWei) {
      gasWei = tx.gasprice;
    }
    uint256 gasPayment = ((gasWei * (gasLimit + gasOverhead) + l1CostWei) * 1e18) / linkNative;
    uint256 premium = (((gasWei * gasLimit) + l1CostWei) * 1e9 * hotVars.paymentPremiumPPB) /
      linkNative +
      uint256(hotVars.flatFeeMicroLink) *
      1e12;
    // LINK_TOTAL_SUPPLY < UINT96_MAX
    if (gasPayment + premium > LINK_TOTAL_SUPPLY) revert PaymentGreaterThanAllLINK();
    return (uint96(gasPayment), uint96(premium));
  }

  /**
   * @dev calculates the max LINK payment for an upkeep. Called during checkUpkeep simulation and assumes
   * maximum gas overhead, L1 fee
   */
  function _getMaxLinkPayment(
    HotVars memory hotVars,
    Trigger triggerType,
    uint32 performGas,
    uint256 fastGasWei,
    uint256 linkNative
  ) internal view returns (uint96) {
    uint256 maxGasOverhead;
    if (triggerType == Trigger.CONDITION) {
      maxGasOverhead = REGISTRY_CONDITIONAL_OVERHEAD;
    } else if (triggerType == Trigger.LOG) {
      maxGasOverhead = REGISTRY_LOG_OVERHEAD;
    } else {
      revert InvalidTriggerType();
    }
    uint256 maxCalldataSize = s_storage.maxPerformDataSize +
      TRANSMIT_CALLDATA_FIXED_BYTES_OVERHEAD +
      (TRANSMIT_CALLDATA_PER_SIGNER_BYTES_OVERHEAD * (hotVars.f + 1));
    (uint256 chainModuleFixedOverhead, uint256 chainModulePerByteOverhead) = s_hotVars.chainModule.getGasOverhead();
    maxGasOverhead +=
      (REGISTRY_PER_SIGNER_GAS_OVERHEAD * (hotVars.f + 1)) +
      ((REGISTRY_PER_PERFORM_BYTE_GAS_OVERHEAD + chainModulePerByteOverhead) * maxCalldataSize) +
      chainModuleFixedOverhead;

    uint256 maxL1Fee = hotVars.gasCeilingMultiplier * hotVars.chainModule.getMaxL1Fee(maxCalldataSize);

    (uint96 reimbursement, uint96 premium) = _calculatePaymentAmount(
      hotVars,
      performGas,
      maxGasOverhead,
      maxL1Fee,
      fastGasWei,
      linkNative,
      false //isExecution
    );

    return reimbursement + premium;
  }

  /**
   * @dev move a transmitter's balance from total pool to withdrawable balance
   */
  function _updateTransmitterBalanceFromPool(
    address transmitterAddress,
    uint96 totalPremium,
    uint96 payeeCount
  ) internal returns (uint96) {
    Transmitter memory transmitter = s_transmitters[transmitterAddress];

    if (transmitter.active) {
      uint96 uncollected = totalPremium - transmitter.lastCollected;
      uint96 due = uncollected / payeeCount;
      transmitter.balance += due;
      transmitter.lastCollected += due * payeeCount;
      s_transmitters[transmitterAddress] = transmitter;
    }

    return transmitter.balance;
  }

  /**
   * @dev gets the trigger type from an upkeepID (trigger type is encoded in the middle of the ID)
   */
  function _getTriggerType(uint256 upkeepId) internal pure returns (Trigger) {
    bytes32 rawID = bytes32(upkeepId);
    bytes1 empty = bytes1(0);
    for (uint256 idx = 4; idx < 15; idx++) {
      if (rawID[idx] != empty) {
        // old IDs that were created before this standard and migrated to this registry
        return Trigger.CONDITION;
      }
    }
    return Trigger(uint8(rawID[15]));
  }

  function _checkPayload(
    uint256 upkeepId,
    Trigger triggerType,
    bytes memory triggerData
  ) internal view returns (bytes memory) {
    if (triggerType == Trigger.CONDITION) {
      return abi.encodeWithSelector(CHECK_SELECTOR, s_checkData[upkeepId]);
    } else if (triggerType == Trigger.LOG) {
      Log memory log = abi.decode(triggerData, (Log));
      return abi.encodeWithSelector(CHECK_LOG_SELECTOR, log, s_checkData[upkeepId]);
    }
    revert InvalidTriggerType();
  }

  /**
   * @dev _decodeReport decodes a serialized report into a Report struct
   */
  function _decodeReport(bytes calldata rawReport) internal pure returns (Report memory) {
    Report memory report = abi.decode(rawReport, (Report));
    uint256 expectedLength = report.upkeepIds.length;
    if (
      report.gasLimits.length != expectedLength ||
      report.triggers.length != expectedLength ||
      report.performDatas.length != expectedLength
    ) {
      revert InvalidReport();
    }
    return report;
  }

  /**
   * @dev Does some early sanity checks before actually performing an upkeep
   * @return bool whether the upkeep should be performed
   * @return bytes32 dedupID for preventing duplicate performances of this trigger
   */
  function _prePerformChecks(
    uint256 upkeepId,
    uint256 blocknumber,
    bytes memory rawTrigger,
    UpkeepTransmitInfo memory transmitInfo,
    HotVars memory hotVars
  ) internal returns (bool, bytes32) {
    bytes32 dedupID;
    if (transmitInfo.triggerType == Trigger.CONDITION) {
      if (!_validateConditionalTrigger(upkeepId, blocknumber, rawTrigger, transmitInfo, hotVars))
        return (false, dedupID);
    } else if (transmitInfo.triggerType == Trigger.LOG) {
      bool valid;
      (valid, dedupID) = _validateLogTrigger(upkeepId, blocknumber, rawTrigger, hotVars);
      if (!valid) return (false, dedupID);
    } else {
      revert InvalidTriggerType();
    }
    if (transmitInfo.upkeep.maxValidBlocknumber <= blocknumber) {
      // Can happen when an upkeep got cancelled after report was generated.
      // However we have a CANCELLATION_DELAY of 50 blocks so shouldn't happen in practice
      emit CancelledUpkeepReport(upkeepId, rawTrigger);
      return (false, dedupID);
    }
    return (true, dedupID);
  }

  /**
   * @dev Does some early sanity checks before actually performing an upkeep
   */
  function _validateConditionalTrigger(
    uint256 upkeepId,
    uint256 blocknumber,
    bytes memory rawTrigger,
    UpkeepTransmitInfo memory transmitInfo,
    HotVars memory hotVars
  ) internal returns (bool) {
    ConditionalTrigger memory trigger = abi.decode(rawTrigger, (ConditionalTrigger));
    if (trigger.blockNum < transmitInfo.upkeep.lastPerformedBlockNumber) {
      // Can happen when another report performed this upkeep after this report was generated
      emit StaleUpkeepReport(upkeepId, rawTrigger);
      return false;
    }
    if (
      (hotVars.reorgProtectionEnabled &&
        (trigger.blockHash != bytes32("") && hotVars.chainModule.blockHash(trigger.blockNum) != trigger.blockHash)) ||
      trigger.blockNum >= blocknumber
    ) {
      // There are two cases of reorged report
      // 1. trigger block number is in future: this is an edge case during extreme deep reorgs of chain
      // which is always protected against
      // 2. blockHash at trigger block number was same as trigger time. This is an optional check which is
      // applied if DON sends non empty trigger.blockHash. Note: It only works for last 256 blocks on chain
      // when it is sent
      emit ReorgedUpkeepReport(upkeepId, rawTrigger);
      return false;
    }
    return true;
  }

  function _validateLogTrigger(
    uint256 upkeepId,
    uint256 blocknumber,
    bytes memory rawTrigger,
    HotVars memory hotVars
  ) internal returns (bool, bytes32) {
    LogTrigger memory trigger = abi.decode(rawTrigger, (LogTrigger));
    bytes32 dedupID = keccak256(abi.encodePacked(upkeepId, trigger.logBlockHash, trigger.txHash, trigger.logIndex));
    if (
      (hotVars.reorgProtectionEnabled &&
        (trigger.blockHash != bytes32("") && hotVars.chainModule.blockHash(trigger.blockNum) != trigger.blockHash)) ||
      trigger.blockNum >= blocknumber
    ) {
      // Reorg protection is same as conditional trigger upkeeps
      emit ReorgedUpkeepReport(upkeepId, rawTrigger);
      return (false, dedupID);
    }
    if (s_dedupKeys[dedupID]) {
      emit StaleUpkeepReport(upkeepId, rawTrigger);
      return (false, dedupID);
    }
    return (true, dedupID);
  }

  /**
   * @dev Verify signatures attached to report
   */
  function _verifyReportSignature(
    bytes32[3] calldata reportContext,
    bytes calldata report,
    bytes32[] calldata rs,
    bytes32[] calldata ss,
    bytes32 rawVs
  ) internal view {
    bytes32 h = keccak256(abi.encode(keccak256(report), reportContext));
    // i-th byte counts number of sigs made by i-th signer
    uint256 signedCount = 0;

    Signer memory signer;
    address signerAddress;
    for (uint256 i = 0; i < rs.length; i++) {
      signerAddress = ecrecover(h, uint8(rawVs[i]) + 27, rs[i], ss[i]);
      signer = s_signers[signerAddress];
      if (!signer.active) revert OnlyActiveSigners();
      unchecked {
        signedCount += 1 << (8 * signer.index);
      }
    }

    if (signedCount & ORACLE_MASK != signedCount) revert DuplicateSigners();
  }

  /**
   * @dev updates a storage marker for this upkeep to prevent duplicate and out of order performances
   * @dev for conditional triggers we set the latest block number, for log triggers we store a dedupID
   */
  function _updateTriggerMarker(
    uint256 upkeepID,
    uint256 blocknumber,
    UpkeepTransmitInfo memory upkeepTransmitInfo
  ) internal {
    if (upkeepTransmitInfo.triggerType == Trigger.CONDITION) {
      s_upkeep[upkeepID].lastPerformedBlockNumber = uint32(blocknumber);
    } else if (upkeepTransmitInfo.triggerType == Trigger.LOG) {
      s_dedupKeys[upkeepTransmitInfo.dedupID] = true;
      emit DedupKeyAdded(upkeepTransmitInfo.dedupID);
    }
  }

  /**
   * @dev calls the Upkeep target with the performData param passed in by the
   * transmitter and the exact gas required by the Upkeep
   */
  function _performUpkeep(
    IAutomationForwarder forwarder,
    uint256 performGas,
    bytes memory performData
  ) internal nonReentrant returns (bool success, uint256 gasUsed) {
    performData = abi.encodeWithSelector(PERFORM_SELECTOR, performData);
    return forwarder.forward(performGas, performData);
  }

  /**
   * @dev does postPerform payment processing for an upkeep. Deducts upkeep's balance and increases
   * amount spent.
   */
  function _postPerformPayment(
    HotVars memory hotVars,
    uint256 upkeepId,
    uint256 gasUsed,
    uint256 fastGasWei,
    uint256 linkNative,
    uint256 gasOverhead,
    uint256 l1Fee
  ) internal returns (uint96 gasReimbursement, uint96 premium) {
    (gasReimbursement, premium) = _calculatePaymentAmount(
      hotVars,
      gasUsed,
      gasOverhead,
      l1Fee,
      fastGasWei,
      linkNative,
      true // isExecution
    );

    uint96 balance = s_upkeep[upkeepId].balance;
    uint96 payment = gasReimbursement + premium;

    // this shouldn't happen, but in rare edge cases, we charge the full balance in case the user
    // can't cover the amount owed
    if (balance < gasReimbursement) {
      payment = balance;
      gasReimbursement = balance;
      premium = 0;
    } else if (balance < payment) {
      payment = balance;
      premium = payment - gasReimbursement;
    }

    s_upkeep[upkeepId].balance -= payment;
    s_upkeep[upkeepId].amountSpent += payment;

    return (gasReimbursement, premium);
  }

  /**
   * @dev ensures the upkeep is not cancelled and the caller is the upkeep admin
   */
  function _requireAdminAndNotCancelled(uint256 upkeepId) internal view {
    if (msg.sender != s_upkeepAdmin[upkeepId]) revert OnlyCallableByAdmin();
    if (s_upkeep[upkeepId].maxValidBlocknumber != UINT32_MAX) revert UpkeepCancelled();
  }

  /**
   * @dev replicates Open Zeppelin's ReentrancyGuard but optimized to fit our storage
   */
  modifier nonReentrant() {
    if (s_hotVars.reentrancyGuard) revert ReentrantCall();
    s_hotVars.reentrancyGuard = true;
    _;
    s_hotVars.reentrancyGuard = false;
  }

  /**
   * @notice only allows a pre-configured address to initiate offchain read
   */
  function _preventExecution() internal view {
    // solhint-disable-next-line avoid-tx-origin
    if (tx.origin != i_allowedReadOnlyAddress) {
      revert OnlySimulatedBackend();
    }
  }
}
