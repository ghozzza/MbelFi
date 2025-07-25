// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package vrfv2_proxy_admin

import (
	"errors"
	"fmt"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
	"github.com/smartcontractkit/chainlink-evm/gethwrappers/generated"
)

var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

var VRFV2ProxyAdminMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"changeProxyAdmin\",\"inputs\":[{\"name\":\"proxy\",\"type\":\"address\",\"internalType\":\"contractITransparentUpgradeableProxy\"},{\"name\":\"newAdmin\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getProxyAdmin\",\"inputs\":[{\"name\":\"proxy\",\"type\":\"address\",\"internalType\":\"contractITransparentUpgradeableProxy\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getProxyImplementation\",\"inputs\":[{\"name\":\"proxy\",\"type\":\"address\",\"internalType\":\"contractITransparentUpgradeableProxy\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"owner\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"renounceOwnership\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"transferOwnership\",\"inputs\":[{\"name\":\"newOwner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"upgrade\",\"inputs\":[{\"name\":\"proxy\",\"type\":\"address\",\"internalType\":\"contractITransparentUpgradeableProxy\"},{\"name\":\"implementation\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"upgradeAndCall\",\"inputs\":[{\"name\":\"proxy\",\"type\":\"address\",\"internalType\":\"contractITransparentUpgradeableProxy\"},{\"name\":\"implementation\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false}]",
	Bin: "0x608060405234801561001057600080fd5b5061001a3361001f565b61006f565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6108438061007e6000396000f3fe60806040526004361061007b5760003560e01c80639623609d1161004e5780639623609d1461012b57806399a88ec41461013e578063f2fde38b1461015e578063f3b7dead1461017e57600080fd5b8063204e1c7a14610080578063715018a6146100c95780637eff275e146100e05780638da5cb5b14610100575b600080fd5b34801561008c57600080fd5b506100a061009b3660046105e6565b61019e565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200160405180910390f35b3480156100d557600080fd5b506100de610255565b005b3480156100ec57600080fd5b506100de6100fb366004610627565b610269565b34801561010c57600080fd5b5060005473ffffffffffffffffffffffffffffffffffffffff166100a0565b6100de610139366004610660565b6102f7565b34801561014a57600080fd5b506100de610159366004610627565b61038c565b34801561016a57600080fd5b506100de6101793660046105e6565b6103e8565b34801561018a57600080fd5b506100a06101993660046105e6565b6104a4565b60008060008373ffffffffffffffffffffffffffffffffffffffff166040516101ea907f5c60da1b00000000000000000000000000000000000000000000000000000000815260040190565b600060405180830381855afa9150503d8060008114610225576040519150601f19603f3d011682016040523d82523d6000602084013e61022a565b606091505b50915091508161023957600080fd5b8080602001905181019061024d919061060a565b949350505050565b61025d6104f0565b6102676000610571565b565b6102716104f0565b6040517f8f28397000000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8281166004830152831690638f283970906024015b600060405180830381600087803b1580156102db57600080fd5b505af11580156102ef573d6000803e3d6000fd5b505050505050565b6102ff6104f0565b6040517f4f1ef28600000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff841690634f1ef2869034906103559086908690600401610754565b6000604051808303818588803b15801561036e57600080fd5b505af1158015610382573d6000803e3d6000fd5b5050505050505050565b6103946104f0565b6040517f3659cfe600000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8281166004830152831690633659cfe6906024016102c1565b6103f06104f0565b73ffffffffffffffffffffffffffffffffffffffff8116610498576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201527f646472657373000000000000000000000000000000000000000000000000000060648201526084015b60405180910390fd5b6104a181610571565b50565b60008060008373ffffffffffffffffffffffffffffffffffffffff166040516101ea907ff851a44000000000000000000000000000000000000000000000000000000000815260040190565b60005473ffffffffffffffffffffffffffffffffffffffff163314610267576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260640161048f565b6000805473ffffffffffffffffffffffffffffffffffffffff8381167fffffffffffffffffffffffff0000000000000000000000000000000000000000831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6000602082840312156105f857600080fd5b813561060381610814565b9392505050565b60006020828403121561061c57600080fd5b815161060381610814565b6000806040838503121561063a57600080fd5b823561064581610814565b9150602083013561065581610814565b809150509250929050565b60008060006060848603121561067557600080fd5b833561068081610814565b9250602084013561069081610814565b9150604084013567ffffffffffffffff808211156106ad57600080fd5b818601915086601f8301126106c157600080fd5b8135818111156106d3576106d36107e5565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f01168101908382118183101715610719576107196107e5565b8160405282815289602084870101111561073257600080fd5b8260208601602083013760006020848301015280955050505050509250925092565b73ffffffffffffffffffffffffffffffffffffffff8316815260006020604081840152835180604085015260005b8181101561079e57858101830151858201606001528201610782565b818111156107b0576000606083870101525b50601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01692909201606001949350505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b73ffffffffffffffffffffffffffffffffffffffff811681146104a157600080fdfea164736f6c6343000806000a",
}

var VRFV2ProxyAdminABI = VRFV2ProxyAdminMetaData.ABI

var VRFV2ProxyAdminBin = VRFV2ProxyAdminMetaData.Bin

func DeployVRFV2ProxyAdmin(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *VRFV2ProxyAdmin, error) {
	parsed, err := VRFV2ProxyAdminMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(VRFV2ProxyAdminBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &VRFV2ProxyAdmin{address: address, abi: *parsed, VRFV2ProxyAdminCaller: VRFV2ProxyAdminCaller{contract: contract}, VRFV2ProxyAdminTransactor: VRFV2ProxyAdminTransactor{contract: contract}, VRFV2ProxyAdminFilterer: VRFV2ProxyAdminFilterer{contract: contract}}, nil
}

type VRFV2ProxyAdmin struct {
	address common.Address
	abi     abi.ABI
	VRFV2ProxyAdminCaller
	VRFV2ProxyAdminTransactor
	VRFV2ProxyAdminFilterer
}

type VRFV2ProxyAdminCaller struct {
	contract *bind.BoundContract
}

type VRFV2ProxyAdminTransactor struct {
	contract *bind.BoundContract
}

type VRFV2ProxyAdminFilterer struct {
	contract *bind.BoundContract
}

type VRFV2ProxyAdminSession struct {
	Contract     *VRFV2ProxyAdmin
	CallOpts     bind.CallOpts
	TransactOpts bind.TransactOpts
}

type VRFV2ProxyAdminCallerSession struct {
	Contract *VRFV2ProxyAdminCaller
	CallOpts bind.CallOpts
}

type VRFV2ProxyAdminTransactorSession struct {
	Contract     *VRFV2ProxyAdminTransactor
	TransactOpts bind.TransactOpts
}

type VRFV2ProxyAdminRaw struct {
	Contract *VRFV2ProxyAdmin
}

type VRFV2ProxyAdminCallerRaw struct {
	Contract *VRFV2ProxyAdminCaller
}

type VRFV2ProxyAdminTransactorRaw struct {
	Contract *VRFV2ProxyAdminTransactor
}

func NewVRFV2ProxyAdmin(address common.Address, backend bind.ContractBackend) (*VRFV2ProxyAdmin, error) {
	abi, err := abi.JSON(strings.NewReader(VRFV2ProxyAdminABI))
	if err != nil {
		return nil, err
	}
	contract, err := bindVRFV2ProxyAdmin(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &VRFV2ProxyAdmin{address: address, abi: abi, VRFV2ProxyAdminCaller: VRFV2ProxyAdminCaller{contract: contract}, VRFV2ProxyAdminTransactor: VRFV2ProxyAdminTransactor{contract: contract}, VRFV2ProxyAdminFilterer: VRFV2ProxyAdminFilterer{contract: contract}}, nil
}

func NewVRFV2ProxyAdminCaller(address common.Address, caller bind.ContractCaller) (*VRFV2ProxyAdminCaller, error) {
	contract, err := bindVRFV2ProxyAdmin(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &VRFV2ProxyAdminCaller{contract: contract}, nil
}

func NewVRFV2ProxyAdminTransactor(address common.Address, transactor bind.ContractTransactor) (*VRFV2ProxyAdminTransactor, error) {
	contract, err := bindVRFV2ProxyAdmin(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &VRFV2ProxyAdminTransactor{contract: contract}, nil
}

func NewVRFV2ProxyAdminFilterer(address common.Address, filterer bind.ContractFilterer) (*VRFV2ProxyAdminFilterer, error) {
	contract, err := bindVRFV2ProxyAdmin(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &VRFV2ProxyAdminFilterer{contract: contract}, nil
}

func bindVRFV2ProxyAdmin(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := VRFV2ProxyAdminMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _VRFV2ProxyAdmin.Contract.VRFV2ProxyAdminCaller.contract.Call(opts, result, method, params...)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.VRFV2ProxyAdminTransactor.contract.Transfer(opts)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.VRFV2ProxyAdminTransactor.contract.Transact(opts, method, params...)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _VRFV2ProxyAdmin.Contract.contract.Call(opts, result, method, params...)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.contract.Transfer(opts)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.contract.Transact(opts, method, params...)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminCaller) GetProxyAdmin(opts *bind.CallOpts, proxy common.Address) (common.Address, error) {
	var out []interface{}
	err := _VRFV2ProxyAdmin.contract.Call(opts, &out, "getProxyAdmin", proxy)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) GetProxyAdmin(proxy common.Address) (common.Address, error) {
	return _VRFV2ProxyAdmin.Contract.GetProxyAdmin(&_VRFV2ProxyAdmin.CallOpts, proxy)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminCallerSession) GetProxyAdmin(proxy common.Address) (common.Address, error) {
	return _VRFV2ProxyAdmin.Contract.GetProxyAdmin(&_VRFV2ProxyAdmin.CallOpts, proxy)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminCaller) GetProxyImplementation(opts *bind.CallOpts, proxy common.Address) (common.Address, error) {
	var out []interface{}
	err := _VRFV2ProxyAdmin.contract.Call(opts, &out, "getProxyImplementation", proxy)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) GetProxyImplementation(proxy common.Address) (common.Address, error) {
	return _VRFV2ProxyAdmin.Contract.GetProxyImplementation(&_VRFV2ProxyAdmin.CallOpts, proxy)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminCallerSession) GetProxyImplementation(proxy common.Address) (common.Address, error) {
	return _VRFV2ProxyAdmin.Contract.GetProxyImplementation(&_VRFV2ProxyAdmin.CallOpts, proxy)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _VRFV2ProxyAdmin.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) Owner() (common.Address, error) {
	return _VRFV2ProxyAdmin.Contract.Owner(&_VRFV2ProxyAdmin.CallOpts)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminCallerSession) Owner() (common.Address, error) {
	return _VRFV2ProxyAdmin.Contract.Owner(&_VRFV2ProxyAdmin.CallOpts)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactor) ChangeProxyAdmin(opts *bind.TransactOpts, proxy common.Address, newAdmin common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.contract.Transact(opts, "changeProxyAdmin", proxy, newAdmin)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) ChangeProxyAdmin(proxy common.Address, newAdmin common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.ChangeProxyAdmin(&_VRFV2ProxyAdmin.TransactOpts, proxy, newAdmin)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactorSession) ChangeProxyAdmin(proxy common.Address, newAdmin common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.ChangeProxyAdmin(&_VRFV2ProxyAdmin.TransactOpts, proxy, newAdmin)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactor) RenounceOwnership(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.contract.Transact(opts, "renounceOwnership")
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) RenounceOwnership() (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.RenounceOwnership(&_VRFV2ProxyAdmin.TransactOpts)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactorSession) RenounceOwnership() (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.RenounceOwnership(&_VRFV2ProxyAdmin.TransactOpts)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactor) TransferOwnership(opts *bind.TransactOpts, newOwner common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.contract.Transact(opts, "transferOwnership", newOwner)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.TransferOwnership(&_VRFV2ProxyAdmin.TransactOpts, newOwner)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactorSession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.TransferOwnership(&_VRFV2ProxyAdmin.TransactOpts, newOwner)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactor) Upgrade(opts *bind.TransactOpts, proxy common.Address, implementation common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.contract.Transact(opts, "upgrade", proxy, implementation)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) Upgrade(proxy common.Address, implementation common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.Upgrade(&_VRFV2ProxyAdmin.TransactOpts, proxy, implementation)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactorSession) Upgrade(proxy common.Address, implementation common.Address) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.Upgrade(&_VRFV2ProxyAdmin.TransactOpts, proxy, implementation)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactor) UpgradeAndCall(opts *bind.TransactOpts, proxy common.Address, implementation common.Address, data []byte) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.contract.Transact(opts, "upgradeAndCall", proxy, implementation, data)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminSession) UpgradeAndCall(proxy common.Address, implementation common.Address, data []byte) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.UpgradeAndCall(&_VRFV2ProxyAdmin.TransactOpts, proxy, implementation, data)
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminTransactorSession) UpgradeAndCall(proxy common.Address, implementation common.Address, data []byte) (*types.Transaction, error) {
	return _VRFV2ProxyAdmin.Contract.UpgradeAndCall(&_VRFV2ProxyAdmin.TransactOpts, proxy, implementation, data)
}

type VRFV2ProxyAdminOwnershipTransferredIterator struct {
	Event *VRFV2ProxyAdminOwnershipTransferred

	contract *bind.BoundContract
	event    string

	logs chan types.Log
	sub  ethereum.Subscription
	done bool
	fail error
}

func (it *VRFV2ProxyAdminOwnershipTransferredIterator) Next() bool {

	if it.fail != nil {
		return false
	}

	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(VRFV2ProxyAdminOwnershipTransferred)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}

	select {
	case log := <-it.logs:
		it.Event = new(VRFV2ProxyAdminOwnershipTransferred)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

func (it *VRFV2ProxyAdminOwnershipTransferredIterator) Error() error {
	return it.fail
}

func (it *VRFV2ProxyAdminOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

type VRFV2ProxyAdminOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*VRFV2ProxyAdminOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _VRFV2ProxyAdmin.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &VRFV2ProxyAdminOwnershipTransferredIterator{contract: _VRFV2ProxyAdmin.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *VRFV2ProxyAdminOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _VRFV2ProxyAdmin.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:

				event := new(VRFV2ProxyAdminOwnershipTransferred)
				if err := _VRFV2ProxyAdmin.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdminFilterer) ParseOwnershipTransferred(log types.Log) (*VRFV2ProxyAdminOwnershipTransferred, error) {
	event := new(VRFV2ProxyAdminOwnershipTransferred)
	if err := _VRFV2ProxyAdmin.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdmin) ParseLog(log types.Log) (generated.AbigenLog, error) {
	switch log.Topics[0] {
	case _VRFV2ProxyAdmin.abi.Events["OwnershipTransferred"].ID:
		return _VRFV2ProxyAdmin.ParseOwnershipTransferred(log)

	default:
		return nil, fmt.Errorf("abigen wrapper received unknown log topic: %v", log.Topics[0])
	}
}

func (VRFV2ProxyAdminOwnershipTransferred) Topic() common.Hash {
	return common.HexToHash("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0")
}

func (_VRFV2ProxyAdmin *VRFV2ProxyAdmin) Address() common.Address {
	return _VRFV2ProxyAdmin.address
}

type VRFV2ProxyAdminInterface interface {
	GetProxyAdmin(opts *bind.CallOpts, proxy common.Address) (common.Address, error)

	GetProxyImplementation(opts *bind.CallOpts, proxy common.Address) (common.Address, error)

	Owner(opts *bind.CallOpts) (common.Address, error)

	ChangeProxyAdmin(opts *bind.TransactOpts, proxy common.Address, newAdmin common.Address) (*types.Transaction, error)

	RenounceOwnership(opts *bind.TransactOpts) (*types.Transaction, error)

	TransferOwnership(opts *bind.TransactOpts, newOwner common.Address) (*types.Transaction, error)

	Upgrade(opts *bind.TransactOpts, proxy common.Address, implementation common.Address) (*types.Transaction, error)

	UpgradeAndCall(opts *bind.TransactOpts, proxy common.Address, implementation common.Address, data []byte) (*types.Transaction, error)

	FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*VRFV2ProxyAdminOwnershipTransferredIterator, error)

	WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *VRFV2ProxyAdminOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error)

	ParseOwnershipTransferred(log types.Log) (*VRFV2ProxyAdminOwnershipTransferred, error)

	ParseLog(log types.Log) (generated.AbigenLog, error)

	Address() common.Address
}
