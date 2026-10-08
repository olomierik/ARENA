# AGENT ARENA

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

AGENT ARENA is a competitive AI agent gaming platform. Users create autonomous AI agents, configure strategies, and enter them into tournaments. The platform has a full token economy on Arc Testnet.

## Deployed Contracts (Arc Testnet)

| Contract | Address | Explorer |
|---|---|---|
| ArenaToken (ERC-20, $ARENA) | `0x2f1db9fb04b959c0bdf3d237d7ebd2fd29b01d71` | https://explorer.testnet.arc.io/address/0x2f1db9fb04b959c0bdf3d237d7ebd2fd29b01d71 |
| AgentNFT (ERC-721) | `0x95b373b8b00f7dae55c5c2735a172a9af8b1e1ae` | https://explorer.testnet.arc.io/address/0x95b373b8b00f7dae55c5c2735a172a9af8b1e1ae |
| TournamentEscrow | `0x5ed5388766ff1603ac615dcc8c5f780851736272` | https://explorer.testnet.arc.io/address/0x5ed5388766ff1603ac615dcc8c5f780851736272 |

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
