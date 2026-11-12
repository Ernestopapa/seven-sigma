// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentIdRegistryMock — TESTNET ONLY
/// @notice Stand-in for the real Binance Agent ID registry
///         (mainnet 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F), which does
///         not exist on BSC testnet. The deployer marks test wallets as
///         Agent ID holders; balanceOf returns 1 for them, 0 otherwise.
///         Never deploy this on mainnet — pass the real registry there.
contract AgentIdRegistryMock is Ownable {
    mapping(address => bool) public isAgent;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setAgent(address wallet, bool value) external onlyOwner {
        isAgent[wallet] = value;
    }

    function setAgents(address[] calldata wallets, bool value) external onlyOwner {
        for (uint256 i = 0; i < wallets.length; i++) {
            isAgent[wallets[i]] = value;
        }
    }

    function balanceOf(address owner) external view returns (uint256) {
        return isAgent[owner] ? 1 : 0;
    }
}
