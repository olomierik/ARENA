// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ArenaToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;
    uint256 public constant DRIP_AMOUNT = 100 ether;
    uint256 public constant DRIP_COOLDOWN = 1 days;

    mapping(address => uint256) public lastDripAt;

    event Dripped(address indexed to, uint256 amount);

    constructor(address initialOwner) ERC20("ARENA", "ARENA") ERC20Permit("ARENA") Ownable(initialOwner) {
        _mintWithCap(initialOwner, 10_000_000 ether);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mintWithCap(to, amount);
    }

    function drip(address to) external {
        require(block.timestamp >= lastDripAt[msg.sender] + DRIP_COOLDOWN, "Drip cooldown active");
        lastDripAt[msg.sender] = block.timestamp;

        _mintWithCap(to, DRIP_AMOUNT);
        emit Dripped(to, DRIP_AMOUNT);
    }

    function _mintWithCap(address to, uint256 amount) internal {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}
