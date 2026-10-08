/**
 * AGENT ARENA — Live Arc Testnet contract config
 * Auto-generated after deployment — do not edit addresses manually.
 */
import ArenaTokenArtifact   from '../../contracts/out/ArenaToken.sol/ArenaToken.json'
import AgentNFTArtifact      from '../../contracts/out/AgentNFT.sol/AgentNFT.json'
import TournamentEscrowArtifact from '../../contracts/out/TournamentEscrow.sol/TournamentEscrow.json'

export const ARENA_TOKEN = {
  address: '0x2f1db9fb04b959c0bdf3d237d7ebd2fd29b01d71' as const,
  abi: ArenaTokenArtifact.abi,
  symbol: 'ARENA',
  decimals: 18,
}

export const AGENT_NFT = {
  address: '0x95b373b8b00f7dae55c5c2735a172a9af8b1e1ae' as const,
  abi: AgentNFTArtifact.abi,
}

export const TOURNAMENT_ESCROW = {
  address: '0x5ed5388766ff1603ac615dcc8c5f780851736272' as const,
  abi: TournamentEscrowArtifact.abi,
}

export const ARC_TESTNET_EXPLORER = 'https://explorer.testnet.arc.io'

export function explorerAddress(addr: string) {
  return `${ARC_TESTNET_EXPLORER}/address/${addr}`
}

export function explorerTx(tx: string) {
  return `${ARC_TESTNET_EXPLORER}/tx/${tx}`
}
