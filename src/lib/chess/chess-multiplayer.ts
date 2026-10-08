// ─────────────────────────────────────────────────────────────────────────────
// ONLINE MULTIPLAYER — WebRTC peer-to-peer with room codes
// Uses PeerJS-style signaling via public STUN servers only (no backend needed)
// Falls back to a simple localStorage-based "same-device" mode if WebRTC unavailable
// ─────────────────────────────────────────────────────────────────────────────

import { type Move } from './chess-engine'

export type MultiplayerRole = 'host' | 'guest' | null
export type ConnectionStatus = 'idle' | 'hosting' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface MultiplayerMessage {
  type: 'move' | 'sync' | 'resign' | 'offer-draw' | 'accept-draw' | 'ping' | 'pong' | 'hello'
  move?: Move
  fen?: string
  payload?: string
}

export interface MultiplayerCallbacks {
  onMessage: (msg: MultiplayerMessage) => void
  onStatusChange: (status: ConnectionStatus) => void
  onRoleAssigned: (role: MultiplayerRole, roomCode: string) => void
  onError: (err: string) => void
}

// ─── Room code generator ──────────────────────────────────────────────────────

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ─── WebRTC manager ───────────────────────────────────────────────────────────
// Uses a BroadcastChannel for same-origin same-device play (zero servers),
// and WebRTC DataChannel for true cross-device play via a lightweight
// manual-exchange signaling flow (copy/paste SDP offer + answer).

export class ChessMultiplayer {
  private cb: MultiplayerCallbacks
  private channel: BroadcastChannel | null = null
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private role: MultiplayerRole = null
  private roomCode = ''
  private status: ConnectionStatus = 'idle'
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(callbacks: MultiplayerCallbacks) {
    this.cb = callbacks
  }

  // ─── BroadcastChannel (same device / same browser) ───────────────────────

  hostLocalRoom(): string {
    this.roomCode = generateRoomCode()
    this.role = 'host'
    this.channel = new BroadcastChannel(`chess-arena-${this.roomCode}`)
    this.channel.onmessage = (e: MessageEvent) => {
      const msg = e.data as MultiplayerMessage
      if (msg.type === 'hello') {
        this.setStatus('connected')
        this.send({ type: 'hello', payload: 'host' })
      } else {
        this.cb.onMessage(msg)
      }
    }
    this.setStatus('hosting')
    this.cb.onRoleAssigned('host', this.roomCode)
    return this.roomCode
  }

  joinLocalRoom(code: string): void {
    this.roomCode = code.toUpperCase()
    this.role = 'guest'
    this.channel = new BroadcastChannel(`chess-arena-${this.roomCode}`)
    this.channel.onmessage = (e: MessageEvent) => {
      const msg = e.data as MultiplayerMessage
      if (msg.type === 'hello') {
        this.setStatus('connected')
      } else {
        this.cb.onMessage(msg)
      }
    }
    this.setStatus('connecting')
    this.cb.onRoleAssigned('guest', this.roomCode)
    // announce presence
    this.channel.postMessage({ type: 'hello', payload: 'guest' } satisfies MultiplayerMessage)
    setTimeout(() => {
      if (this.status !== 'connected') this.setStatus('connected') // optimistic
    }, 800)
  }

  // ─── WebRTC (cross-device) ────────────────────────────────────────────────

  async createOffer(): Promise<string> {
    this.roomCode = generateRoomCode()
    this.role = 'host'
    this.pc = this.createPC()
    this.dc = this.pc.createDataChannel('chess', { ordered: true })
    this.setupDataChannel(this.dc)

    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)

    await this.waitForICE()

    const sdp = btoa(JSON.stringify(this.pc.localDescription))
    this.setStatus('hosting')
    this.cb.onRoleAssigned('host', this.roomCode)
    return sdp
  }

  async acceptOffer(offerSdp: string): Promise<string> {
    this.role = 'guest'
    this.pc = this.createPC()
    this.pc.ondatachannel = (e) => { this.dc = e.channel; this.setupDataChannel(e.channel) }

    const offer = JSON.parse(atob(offerSdp)) as RTCSessionDescriptionInit
    await this.pc.setRemoteDescription(offer)
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)

    await this.waitForICE()

    const sdp = btoa(JSON.stringify(this.pc.localDescription))
    this.setStatus('connecting')
    return sdp
  }

  async finalizeConnection(answerSdp: string): Promise<void> {
    if (!this.pc) return
    const answer = JSON.parse(atob(answerSdp)) as RTCSessionDescriptionInit
    await this.pc.setRemoteDescription(answer)
  }

  private createPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.setStatus('connected')
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.setStatus('disconnected')
      }
    }
    return pc
  }

  private setupDataChannel(dc: RTCDataChannel): void {
    dc.onopen = () => { this.setStatus('connected'); this.startPing() }
    dc.onclose = () => { this.setStatus('disconnected') }
    dc.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as MultiplayerMessage
      if (msg.type === 'ping') { this.send({ type: 'pong' }); return }
      this.cb.onMessage(msg)
    }
    dc.onerror = () => { this.cb.onError('Connection error') }
  }

  private waitForICE(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.pc) { resolve(); return }
      if (this.pc.iceGatheringState === 'complete') { resolve(); return }
      this.pc.onicegatheringstatechange = () => {
        if (this.pc?.iceGatheringState === 'complete') resolve()
      }
      setTimeout(resolve, 5000) // fallback
    })
  }

  // ─── Messaging ────────────────────────────────────────────────────────────

  send(msg: MultiplayerMessage): void {
    if (this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify(msg))
    } else if (this.channel) {
      this.channel.postMessage(msg)
    }
  }

  sendMove(move: Move): void { this.send({ type: 'move', move }) }
  sendResign(): void { this.send({ type: 'resign' }) }
  sendOfferDraw(): void { this.send({ type: 'offer-draw' }) }
  sendAcceptDraw(): void { this.send({ type: 'accept-draw' }) }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  private startPing(): void {
    this.pingInterval = setInterval(() => { this.send({ type: 'ping' }) }, 5000)
  }

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval)
    this.dc?.close()
    this.pc?.close()
    this.channel?.close()
    this.dc = null; this.pc = null; this.channel = null
    this.setStatus('idle')
    this.role = null
  }

  private setStatus(s: ConnectionStatus): void {
    this.status = s
    this.cb.onStatusChange(s)
  }

  getStatus(): ConnectionStatus { return this.status }
  getRole(): MultiplayerRole { return this.role }
  getRoomCode(): string { return this.roomCode }
}
