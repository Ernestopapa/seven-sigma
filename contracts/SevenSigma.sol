// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title SEVEN SIGMA — 777 Sigma Nodes
/// @notice Binance Agent ID NFT mint, modelled on the proven Agent Harvest
///         Land pattern (0xacf150d9eC909E3d339Bf4c6D090b18495674E66) and on
///         Neon Fox Agents (NFOX, mainnet 0x87129068Faf8709c9A8E997eBaE70F6074475711),
///         ERC721 + Ownable + ReentrancyGuard, registry address passed in
///         the constructor, 1 free mint per Agent ID holder.
///         Supply: 777 total = 150 FREE (gas only, Agent ID holders
///         only, 1 per wallet ever) + 627 PAID at 0.00042 BNB each.
///         Paid price math: $0.30 / $710.40 per BNB = 0.000422 BNB,
///         rounded to 0.00042 ether. Paid minting only opens once the
///         free 150 are exhausted. 5% ERC-2981 royalties (500 bps)
///         to the owner on secondary sales, no allowlist, no oracle,
///         no extra signatures.
///         Mainnet registry: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
///         Testnet/local: deploy AgentIdRegistryMock first and pass its address.
///
///         *** CRITICAL, INTENTIONAL DIFFERENCE FROM NFOX ***
///         Paid mint() does NOT check the Agent ID registry. This is
///         deliberate and user-locked (2026-11-02, Gate 0: "Free Agent-only,
///         paid open to all"). Free mint is Agent ID only; paid mint is
///         open to EVERY wallet, Agent ID or not. Do NOT re-add a registry
///         check to mint() — that would break the locked spec and would be
///         unfixable after mainnet deploy. The NFOX playbook's M1 gate
///         ("grep for a registry check in BOTH freeMint and mint") does
///         NOT apply to this contract; the correct gate here is the
///         opposite: mint() must succeed for a non-agent after free
///         exhaustion, and freeMint() must still revert for a non-agent.
///         Both directions are covered by the local test suite.
///
///         NOT AUDITED: this contract has NOT been audited by a third
///         party. "Built on OpenZeppelin" is not an audit.
///         Owner CAN: withdraw all BNB, change metadata via setBaseURI(),
///         transfer/renounce ownership.
///         Owner CANNOT: change supply / free supply / price / max per tx /
///         registry, mint extra NFTs, pause, freeze, burn, or take holders'
///         NFTs.
contract SevenSigma is ERC721, ERC721Royalty, Ownable, ReentrancyGuard {
    IAgentIdRegistry public immutable agentIdRegistry;

    uint256 public constant MAX_SUPPLY = 777;
    // FREE_SUPPLY is the single knob for the free phase: change this one
    // line and PAID_SUPPLY below follows automatically.
    uint256 public constant FREE_SUPPLY = 150;
    uint256 public constant PAID_SUPPLY = MAX_SUPPLY - FREE_SUPPLY; // 627
    uint256 public constant PAID_PRICE = 0.00042 ether; // ~$0.30 at $710.40/BNB
    uint256 public constant MAX_PAID_PER_TX = 3;

    /// @notice True once an address has used its one free mint.
    mapping(address => bool) public freeMinted;

    uint256 public paidMinted;
    uint256 private _freeCount;
    uint256 private _nextId = 1;

    string private _base;

    event FreeMinted(address indexed to, uint256 indexed tokenId);
    event PaidMinted(address indexed to, uint256 indexed tokenId);
    event BnbWithdrawn(address indexed to, uint256 amount);

    constructor(address agentIdRegistry_, address initialOwner)
        ERC721("SEVEN SIGMA", "SIGMA")
        Ownable(initialOwner)
    {
        require(agentIdRegistry_ != address(0), "zero registry");
        agentIdRegistry = IAgentIdRegistry(agentIdRegistry_);
        // 5% ERC-2981 default royalty to the owner (500 / 10000 bps).
        _setDefaultRoyalty(initialOwner, 500);
    }

    /// @notice ERC-2981 + ERC-721 interface support (required override).
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ------------------------------------------------------------- metadata
    function setBaseURI(string calldata uri) external onlyOwner {
        _base = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }

    // ----------------------------------------------------------------- views
    function totalSupply() public view returns (uint256) {
        return _nextId - 1;
    }

    /// @notice Number of free mints used so far (0..150).
    function freeMintedCount() public view returns (uint256) {
        return _freeCount;
    }

    function freeRemaining() public view returns (uint256) {
        return FREE_SUPPLY - _freeCount;
    }

    function paidRemaining() public view returns (uint256) {
        return MAX_SUPPLY - FREE_SUPPLY - paidMinted;
    }

    function freeOpen() public view returns (bool) {
        return _freeCount < FREE_SUPPLY;
    }

    function paidOpen() public view returns (bool) {
        return _freeCount >= FREE_SUPPLY && totalSupply() < MAX_SUPPLY;
    }

    // ------------------------------------------------------------ free mint
    /// @notice Free mint: 1 per wallet ever, Agent ID holders only,
    ///         gas only. Non-payable, so any attached BNB reverts (value 0).
    function freeMint() external nonReentrant {
        require(_freeCount < FREE_SUPPLY, "free supply exhausted");
        require(!freeMinted[msg.sender], "already claimed free");
        require(agentIdRegistry.balanceOf(msg.sender) > 0, "no Agent ID");

        freeMinted[msg.sender] = true;
        _freeCount += 1;

        uint256 tokenId = _nextId++;
        _safeMint(msg.sender, tokenId);
        emit FreeMinted(msg.sender, tokenId);
    }

    // ------------------------------------------------------------ paid mint
    /// @notice Paid mint, only after the free 150 are exhausted.
    ///         OPEN TO ALL wallets — Agent ID holders AND non-Agent ID
    ///         holders alike. NO registry check here, by design (see the
    ///         contract header). Max 3 per tx, exact payment required.
    function mint(uint256 qty) external payable nonReentrant {
        require(qty > 0 && qty <= MAX_PAID_PER_TX, "qty 1..3");
        require(_freeCount >= FREE_SUPPLY, "paid mint not open yet");
        // NOTE: intentionally NO agentIdRegistry check here.
        // Paid phase is open to everyone (user-locked Gate 0).
        require(msg.value == PAID_PRICE * qty, "wrong price");
        require(totalSupply() + qty <= MAX_SUPPLY, "exceeds max supply");

        paidMinted += qty;
        for (uint256 i = 0; i < qty; i++) {
            uint256 tokenId = _nextId++;
            _safeMint(msg.sender, tokenId);
            emit PaidMinted(msg.sender, tokenId);
        }
    }

    // ----------------------------------------------------------------- BNB
    /// @notice Withdraw BNB revenue (paid mints). Only way BNB leaves.
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "nothing to withdraw");
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "BNB send failed");
        emit BnbWithdrawn(owner(), amount);
    }

    receive() external payable {}
}
