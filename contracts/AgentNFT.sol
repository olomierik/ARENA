// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract AgentNFT is ERC721, ERC721Enumerable, Ownable {
    struct AgentStats {
        string name;
        uint8 level;
        uint32 wins;
        uint32 losses;
        uint32 gamesPlayed;
        uint8 rankTier;
        string gameSpecialty;
        bool isForRent;
        uint256 rentPricePerMatch;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 => AgentStats) private _agentStats;

    event AgentMinted(uint256 indexed tokenId, address indexed owner, string name);
    event StatsUpdated(uint256 indexed tokenId, uint32 wins, uint32 losses, uint8 level, uint8 rankTier);
    event ListedForRent(uint256 indexed tokenId, uint256 pricePerMatch);
    event DelistedFromRent(uint256 indexed tokenId);

    constructor(address initialOwner) ERC721("AgentArenaAgent", "AGENT") Ownable(initialOwner) {}

    function mintAgent(address to, string calldata name, string calldata gameSpecialty) external onlyOwner {
        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(to, tokenId);

        _agentStats[tokenId] = AgentStats({
            name: name,
            level: 1,
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            rankTier: 0,
            gameSpecialty: gameSpecialty,
            isForRent: false,
            rentPricePerMatch: 0
        });

        emit AgentMinted(tokenId, to, name);
    }

    function recordWin(uint256 tokenId) external onlyOwner {
        _requireOwned(tokenId);

        AgentStats storage stats = _agentStats[tokenId];
        stats.wins += 1;
        stats.gamesPlayed += 1;
        stats.level = _computeLevel(stats.wins);
        stats.rankTier = _computeRankTier(stats.wins);

        emit StatsUpdated(tokenId, stats.wins, stats.losses, stats.level, stats.rankTier);
    }

    function recordLoss(uint256 tokenId) external onlyOwner {
        _requireOwned(tokenId);

        AgentStats storage stats = _agentStats[tokenId];
        stats.losses += 1;
        stats.gamesPlayed += 1;

        emit StatsUpdated(tokenId, stats.wins, stats.losses, stats.level, stats.rankTier);
    }

    function listForRent(uint256 tokenId, uint256 pricePerMatch) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        AgentStats storage stats = _agentStats[tokenId];
        stats.isForRent = true;
        stats.rentPricePerMatch = pricePerMatch;

        emit ListedForRent(tokenId, pricePerMatch);
    }

    function delistFromRent(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        AgentStats storage stats = _agentStats[tokenId];
        stats.isForRent = false;
        stats.rentPricePerMatch = 0;

        emit DelistedFromRent(tokenId);
    }

    function getStats(uint256 tokenId) external view returns (AgentStats memory) {
        _requireOwned(tokenId);
        return _agentStats[tokenId];
    }

    function _computeLevel(uint32 wins) internal pure returns (uint8) {
        uint32 computed = 1 + (wins / 10);
        if (computed > 50) {
            return 50;
        }
        return uint8(computed);
    }

    function _computeRankTier(uint32 wins) internal pure returns (uint8) {
        if (wins >= 100) {
            return 4;
        }
        if (wins >= 60) {
            return 3;
        }
        if (wins >= 30) {
            return 2;
        }
        if (wins >= 10) {
            return 1;
        }
        return 0;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
