// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TournamentEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum TournamentState {
        CREATED,
        REGISTRATION,
        LOCKED,
        RUNNING,
        COMPLETED,
        CANCELLED
    }

    struct Tournament {
        uint256 id;
        address prizeToken;
        uint256 prizePool;
        uint256 entryFee;
        uint8 maxParticipants;
        address[] participants;
        address winner;
        TournamentState state;
        uint256 startTime;
        uint256 endTime;
    }

    uint256 private _nextTournamentId = 1;
    mapping(uint256 => Tournament) private _tournaments;
    mapping(uint256 => mapping(address => bool)) private _isParticipant;
    mapping(address => uint256) private _accruedFees;
    mapping(uint256 => mapping(address => uint256)) private _pendingRefunds;

    event TournamentCreated(uint256 indexed id, address indexed prizeToken, uint256 entryFee, uint8 maxParticipants);
    event ParticipantRegistered(uint256 indexed id, address indexed participant);
    event TournamentCompleted(uint256 indexed id, address indexed winner, uint256 prize);
    event TournamentCancelled(uint256 indexed id);
    event RefundClaimed(uint256 indexed tournamentId, address indexed participant, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createTournament(address prizeToken, uint256 entryFee, uint8 maxParticipants)
        external
        onlyOwner
        returns (uint256 tournamentId)
    {
        require(maxParticipants > 0, "maxParticipants is zero");
        if (entryFee > 0) {
            require(prizeToken != address(0), "prizeToken is zero");
        }

        tournamentId = _nextTournamentId;
        _nextTournamentId += 1;

        Tournament storage t = _tournaments[tournamentId];
        t.id = tournamentId;
        t.prizeToken = prizeToken;
        t.prizePool = 0;
        t.entryFee = entryFee;
        t.maxParticipants = maxParticipants;
        t.state = TournamentState.CREATED;

        emit TournamentCreated(tournamentId, prizeToken, entryFee, maxParticipants);
    }

    function enterTournament(uint256 tournamentId) external nonReentrant {
        Tournament storage t = _tournaments[tournamentId];

        require(t.id != 0, "Tournament not found");
        require(t.state == TournamentState.REGISTRATION, "Registration closed");
        require(!_isParticipant[tournamentId][msg.sender], "Already registered");
        require(t.participants.length < t.maxParticipants, "Max participants reached");

        _isParticipant[tournamentId][msg.sender] = true;
        t.participants.push(msg.sender);

        if (t.entryFee > 0) {
            IERC20 prizeToken = IERC20(t.prizeToken);
            uint256 balanceBefore = prizeToken.balanceOf(address(this));
            prizeToken.safeTransferFrom(msg.sender, address(this), t.entryFee);
            uint256 received = prizeToken.balanceOf(address(this)) - balanceBefore;
            t.prizePool += received;
        }

        emit ParticipantRegistered(tournamentId, msg.sender);
    }

    function startRegistration(uint256 id) external onlyOwner {
        Tournament storage t = _tournaments[id];

        require(t.id != 0, "Tournament not found");
        require(t.state == TournamentState.CREATED, "Invalid state transition");

        t.state = TournamentState.REGISTRATION;
    }

    function lockTournament(uint256 id) external onlyOwner {
        Tournament storage t = _tournaments[id];

        require(t.id != 0, "Tournament not found");
        require(t.state == TournamentState.REGISTRATION, "Invalid state transition");

        t.state = TournamentState.LOCKED;
    }

    function startTournament(uint256 id) external onlyOwner {
        Tournament storage t = _tournaments[id];

        require(t.id != 0, "Tournament not found");
        require(t.state == TournamentState.LOCKED, "Invalid state transition");

        t.state = TournamentState.RUNNING;
        t.startTime = block.timestamp;
    }

    function completeTournament(uint256 tournamentId, address winner) external onlyOwner nonReentrant {
        Tournament storage t = _tournaments[tournamentId];

        require(t.id != 0, "Tournament not found");
        require(t.state == TournamentState.RUNNING, "Tournament not running");
        require(_isParticipant[tournamentId][winner], "Winner not participant");

        t.winner = winner;
        t.state = TournamentState.COMPLETED;
        t.endTime = block.timestamp;

        uint256 prize = (t.prizePool * 90) / 100;
        uint256 platformFee = t.prizePool - prize;

        _accruedFees[t.prizeToken] += platformFee;

        if (prize > 0) {
            IERC20(t.prizeToken).safeTransfer(winner, prize);
        }

        t.prizePool = platformFee;

        emit TournamentCompleted(tournamentId, winner, prize);
    }

    function cancelTournament(uint256 tournamentId) external onlyOwner nonReentrant {
        Tournament storage t = _tournaments[tournamentId];

        require(t.id != 0, "Tournament not found");
        require(t.state != TournamentState.COMPLETED, "Tournament completed");
        require(t.state != TournamentState.CANCELLED, "Tournament cancelled");

        t.state = TournamentState.CANCELLED;
        t.endTime = block.timestamp;

        if (t.entryFee > 0) {
            uint256 participantsLength = t.participants.length;
            for (uint256 i = 0; i < participantsLength; ++i) {
                _pendingRefunds[tournamentId][t.participants[i]] = t.entryFee;
            }
        }

        t.prizePool = 0;

        emit TournamentCancelled(tournamentId);
    }

    function claimRefund(uint256 tournamentId) external nonReentrant {
        Tournament storage t = _tournaments[tournamentId];
        uint256 amount = _pendingRefunds[tournamentId][msg.sender];

        require(t.id != 0, "Tournament not found");
        require(amount > 0, "No refund available");

        _pendingRefunds[tournamentId][msg.sender] = 0;
        IERC20(t.prizeToken).safeTransfer(msg.sender, amount);

        emit RefundClaimed(tournamentId, msg.sender, amount);
    }

    function withdrawFees(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "to is zero");
        require(amount <= _accruedFees[token], "Exceeds accrued fees");

        _accruedFees[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
    }

    function getTournament(uint256 id) external view returns (Tournament memory) {
        Tournament storage t = _tournaments[id];
        require(t.id != 0, "Tournament not found");
        return t;
    }

    function getParticipants(uint256 id) external view returns (address[] memory) {
        Tournament storage t = _tournaments[id];
        require(t.id != 0, "Tournament not found");
        return t.participants;
    }
}
