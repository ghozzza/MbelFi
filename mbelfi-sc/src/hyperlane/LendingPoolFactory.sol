// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ILPDeployer} from "./interfaces/ILPDeployer.sol";

/**
 * @title LendingPoolFactory
 * @author Mbelfi Protocol
 * @notice Factory contract for creating and managing lending pools
 * @dev This contract serves as the main entry point for creating new lending pools.
 * It maintains a registry of all created pools and manages token data streams
 * and cross-chain token senders.
 */
contract LendingPoolFactory {
    /**
     * @notice Emitted when a new lending pool is created
     * @param collateralToken The address of the collateral token
     * @param borrowToken The address of the borrow token
     * @param lendingPool The address of the created lending pool
     * @param ltv The Loan-to-Value ratio for the pool
     */
    event LendingPoolCreated(
        address indexed collateralToken, address indexed borrowToken, address lendingPool, uint256 ltv
    );
    
    /**
     * @notice Emitted when a token data stream is added
     * @param token The address of the token
     * @param dataStream The address of the data stream contract
     */
    event TokenDataStreamAdded(address indexed token, address indexed dataStream);
    
    /**
     * @notice Emitted when a basic token sender is added for a specific chain
     * @param chainId The chain ID where the token sender operates
     * @param basicTokenSender The address of the basic token sender contract
     */
    event BasicTokenSenderAdded(uint256 indexed chainId, address indexed basicTokenSender);

    /**
     * @notice Structure representing a lending pool
     * @param collateralToken The address of the collateral token
     * @param borrowToken The address of the borrow token
     * @param lendingPoolAddress The address of the lending pool contract
     */
    // solhint-disable-next-line gas-struct-packing
    struct Pool {
        address collateralToken;
        address borrowToken;
        address lendingPoolAddress;
    }

    /// @notice The owner of the factory contract
    address public owner;
    
    /// @notice The address of the IsHealthy contract for health checks
    address public isHealthy;
    
    /// @notice The address of the lending pool deployer contract
    address public lendingPoolDeployer;

    /// @notice The address of the protocol contract
    address public protocol;

    /// @notice The address of the bridge router contract
    address public helper;
    
    /// @notice Mapping from chain ID to basic token sender address
    mapping(uint256 => address) public basicTokenSender;
    
    /// @notice Mapping from token address to its data stream address
    mapping(address => address) public tokenDataStream;
    
    /// @notice Array of all created pools
    Pool[] public pools;
    
    /// @notice Total number of pools created
    uint256 public poolCount;

    /**
     * @notice Constructor for the LendingPoolFactory
     * @param _isHealthy The address of the IsHealthy contract
     * @param _lendingPoolDeployer The address of the lending pool deployer contract
     */
    constructor(address _isHealthy, address _lendingPoolDeployer, address _protocol, address _helper) {
        owner = msg.sender;
        isHealthy = _isHealthy;
        lendingPoolDeployer = _lendingPoolDeployer;
        protocol = _protocol;
        helper = _helper;
    }

    /**
     * @notice Modifier to restrict function access to the owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @notice Creates a new lending pool with the specified parameters
     * @param collateralToken The address of the collateral token
     * @param borrowToken The address of the borrow token
     * @param ltv The Loan-to-Value ratio for the pool (in basis points)
     * @return The address of the newly created lending pool
     * @dev This function deploys a new lending pool using the lending pool deployer
     * and adds it to the pools registry
     */
    function createLendingPool(address collateralToken, address borrowToken, uint256 ltv) public returns (address) {
        address lendingPool = ILPDeployer(lendingPoolDeployer).deployLendingPool(collateralToken, borrowToken, ltv);

        pools.push(Pool(collateralToken, borrowToken, address(lendingPool)));
        poolCount++;
        emit LendingPoolCreated(collateralToken, borrowToken, address(lendingPool), ltv);
        return address(lendingPool);
    }

    /**
     * @notice Adds a token data stream for price feeds and other data
     * @param _token The address of the token
     * @param _dataStream The address of the data stream contract
     * @dev Only callable by the owner
     */
    function addTokenDataStream(address _token, address _dataStream) public onlyOwner {
        tokenDataStream[_token] = _dataStream;
        emit TokenDataStreamAdded(_token, _dataStream);
    }
}
