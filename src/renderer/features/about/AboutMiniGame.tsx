import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EPOCH_RUNNER_BEST_SCORE_STORAGE_KEY,
  EPOCH_RUNNER_TARGET_EPOCHS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  type EpochRunnerCollectible,
  type EpochRunnerObstacle,
  type EpochRunnerRunStats,
  type EpochRunnerState,
  createInitialEpochRunnerState,
  startEpochRunner,
  stepEpochRunner
} from './about-game-engine'

interface AboutMiniGameProps {
  isRewardUnlocked: boolean
  onExit: () => void
  onUnlockReward: () => Promise<void>
}

interface OverlayConfig {
  title: string
  detail: string
  actionLabel: string
}

function formatSeconds(timeMs: number): string {
  return (timeMs / 1000).toFixed(1)
}

function drawPixelRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  context.fillStyle = color
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height))
}

function drawPlayer(context: CanvasRenderingContext2D, state: EpochRunnerState): void {
  const { player } = state

  drawPixelRect(context, player.x + 8, player.y + 6, 18, 26, '#93ff84')
  drawPixelRect(context, player.x + 12, player.y + 1, 10, 8, '#d9ffd1')
  drawPixelRect(context, player.x + 4, player.y + 14, 6, 10, '#93ff84')
  drawPixelRect(context, player.x + 24, player.y + 14, 6, 10, '#93ff84')
  drawPixelRect(context, player.x + 10, player.y + 31, 5, 10, '#d9ffd1')
  drawPixelRect(context, player.x + 20, player.y + 31, 5, 10, '#d9ffd1')
  drawPixelRect(context, player.x + 15, player.y + 13, 4, 4, '#001b00')
}

function drawObstacle(context: CanvasRenderingContext2D, obstacle: EpochRunnerObstacle): void {
  if (obstacle.type === 'amp-stack') {
    drawPixelRect(context, obstacle.x, obstacle.y + 12, obstacle.width, obstacle.height - 12, '#39ff88')
    drawPixelRect(context, obstacle.x + 6, obstacle.y + 4, obstacle.width - 12, 10, '#a7ffce')
    drawPixelRect(context, obstacle.x + 6, obstacle.y + 22, obstacle.width - 12, 6, '#001b00')
    return
  }

  if (obstacle.type === 'cab-wall') {
    drawPixelRect(context, obstacle.x, obstacle.y, obstacle.width, obstacle.height, '#39ff88')
    drawPixelRect(context, obstacle.x + 6, obstacle.y + 6, obstacle.width - 12, obstacle.height - 12, '#001b00')
    drawPixelRect(context, obstacle.x + 10, obstacle.y + 10, obstacle.width - 20, obstacle.height - 20, '#a7ffce')
    return
  }

  drawPixelRect(context, obstacle.x + 2, obstacle.y + 6, obstacle.width - 4, obstacle.height - 6, '#39ff88')
  drawPixelRect(context, obstacle.x + 8, obstacle.y, obstacle.width - 16, obstacle.height, '#a7ffce')
}

function drawCollectible(
  context: CanvasRenderingContext2D,
  collectible: EpochRunnerCollectible
): void {
  const bobOffset = Math.sin(collectible.bobPhase) * 4
  const x = collectible.x
  const y = collectible.y + bobOffset

  drawPixelRect(context, x + 6, y, 10, 22, '#d8ffd8')
  drawPixelRect(context, x, y + 6, 22, 10, '#49ff95')
  drawPixelRect(context, x + 8, y + 8, 6, 6, '#001b00')
}

function renderGameFrame(context: CanvasRenderingContext2D, state: EpochRunnerState, tickMs: number): void {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  context.imageSmoothingEnabled = false

  const gradient = context.createLinearGradient(0, 0, 0, GAME_HEIGHT)
  gradient.addColorStop(0, '#011006')
  gradient.addColorStop(1, '#000000')
  context.fillStyle = gradient
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  for (let row = 0; row < 14; row += 1) {
    context.fillStyle = row % 2 === 0 ? 'rgba(25,255,120,0.04)' : 'rgba(0,0,0,0)'
    context.fillRect(0, row * 20, GAME_WIDTH, 10)
  }

  const scroll = -(state.distance * 6) % 70
  context.strokeStyle = 'rgba(70, 255, 140, 0.18)'
  context.lineWidth = 1
  for (let index = -1; index < 14; index += 1) {
    const x = scroll + (index * 70)
    context.beginPath()
    context.moveTo(x, GROUND_Y - 2)
    context.lineTo(x + 30, GROUND_Y - 40)
    context.lineTo(x + 60, GROUND_Y - 2)
    context.stroke()
  }

  drawPixelRect(context, 0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, '#04260d')
  for (let index = 0; index < 26; index += 1) {
    const x = ((index * 40) + scroll * 1.2) % (GAME_WIDTH + 40)
    drawPixelRect(context, x, GROUND_Y + 8, 18, 8, 'rgba(97,255,149,0.22)')
  }

  state.collectibles.forEach((collectible) => drawCollectible(context, collectible))
  state.obstacles.forEach((obstacle) => drawObstacle(context, obstacle))
  drawPlayer(context, state)

  context.fillStyle = 'rgba(160, 255, 200, 0.8)'
  context.font = '12px monospace'
  context.fillText('EPOCH RUNNER', 16, 20)
  context.fillText(`SPD ${Math.round(state.speed)}`, GAME_WIDTH - 90, 20)

  if (state.status === 'ready') {
    const pulse = 0.55 + (Math.sin(tickMs / 240) * 0.25)
    context.fillStyle = `rgba(210,255,220,${pulse})`
    context.font = '20px monospace'
    context.fillText('PRESS SPACE TO START', 230, 132)
    context.font = '12px monospace'
    context.fillText('Collect 100 epochs. Avoid amps, cabs, and signal bursts.', 180, 160)
  }
}

function loadBestScore(): number {
  const raw = window.localStorage.getItem(EPOCH_RUNNER_BEST_SCORE_STORAGE_KEY)
  const parsed = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

export default function AboutMiniGame({
  isRewardUnlocked,
  onExit,
  onUnlockReward
}: AboutMiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const jumpQueuedRef = useRef<boolean>(false)
  const stateRef = useRef<EpochRunnerState>(createInitialEpochRunnerState())
  const lastFrameMsRef = useRef<number | null>(null)
  const [viewState, setViewState] = useState<EpochRunnerState>(() => createInitialEpochRunnerState())
  const [bestScore, setBestScore] = useState<number>(() => loadBestScore())
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)

  useEffect(() => {
    stateRef.current = createInitialEpochRunnerState()
    setViewState(stateRef.current)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
        return
      }

      if (event.key !== ' ') {
        return
      }

      event.preventDefault()
      const currentState = stateRef.current
      if (currentState.status === 'ready') {
        const nextState = startEpochRunner(currentState)
        stateRef.current = nextState
        setViewState(nextState)
        setUnlockError(null)
        return
      }

      if (currentState.status === 'crashed' || currentState.status === 'won') {
        const nextState = createInitialEpochRunnerState()
        stateRef.current = nextState
        setViewState(nextState)
        setUnlockError(null)
        return
      }

      jumpQueuedRef.current = true
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) {
      return
    }

    let animationFrameId = 0

    const frame = (timestamp: number): void => {
      if (lastFrameMsRef.current == null) {
        lastFrameMsRef.current = timestamp
      }

      const deltaMs = Math.min(32, timestamp - lastFrameMsRef.current)
      lastFrameMsRef.current = timestamp

      const currentState = stateRef.current
      const nextState = stepEpochRunner(currentState, deltaMs, jumpQueuedRef.current)
      jumpQueuedRef.current = false

      if (nextState !== currentState) {
        stateRef.current = nextState
        setViewState(nextState)

        if ((nextState.status === 'crashed' || nextState.status === 'won') && nextState.score > bestScore) {
          setBestScore(nextState.score)
          window.localStorage.setItem(EPOCH_RUNNER_BEST_SCORE_STORAGE_KEY, String(nextState.score))
        }
      }

      renderGameFrame(context, stateRef.current, timestamp)
      animationFrameId = window.requestAnimationFrame(frame)
    }

    animationFrameId = window.requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(animationFrameId)
      lastFrameMsRef.current = null
    }
  }, [bestScore])

  const overlay = useMemo<OverlayConfig | null>(() => {
    if (viewState.status === 'ready') {
      return null
    }

    if (viewState.status === 'crashed') {
      return {
        title: viewState.resultHeadline,
        detail: viewState.resultDetail,
        actionLabel: 'Press SPACE to rerun'
      }
    }

    if (viewState.status === 'won') {
      return {
        title: viewState.resultHeadline,
        detail: viewState.resultDetail,
        actionLabel: 'Press SPACE to victory-lap'
      }
    }

    return null
  }, [viewState])

  const handleUnlockClick = async (): Promise<void> => {
    setIsUnlocking(true)
    setUnlockError(null)

    try {
      await onUnlockReward()
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsUnlocking(false)
    }
  }

  const stats: EpochRunnerRunStats = {
    epochsCollected: viewState.epochsCollected,
    score: viewState.score,
    distance: viewState.distance,
    timeMs: viewState.timeMs
  }

  return (
    <div className="epoch-runner-shell">
      <div className="epoch-runner-header">
        <span className="epoch-runner-title">EPOCH RUNNER</span>
        <span className="epoch-runner-help">SPACE jump / start / retry | ESC exit</span>
      </div>

      <div className="epoch-runner-stage">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="epoch-runner-canvas"
        />

        {overlay && (
          <div className="epoch-runner-overlay">
            <h3>{overlay.title}</h3>
            <p>{overlay.detail}</p>
            <p className="epoch-runner-overlay-action">{overlay.actionLabel}</p>

            {viewState.status === 'won' && (
              <>
                <button
                  type="button"
                  className={`btn btn-sm ${isRewardUnlocked ? 'btn-secondary' : 'btn-green'}`}
                  onClick={() => void handleUnlockClick()}
                  disabled={isRewardUnlocked || isUnlocking}
                >
                  {isRewardUnlocked ? 'Reward Preset Already Added' : isUnlocking ? 'Adding Reward...' : 'Add Reward Preset'}
                </button>
                {unlockError && <p className="epoch-runner-error">{unlockError}</p>}
              </>
            )}
          </div>
        )}
      </div>

      <div className="epoch-runner-hud">
        <div className="epoch-runner-hud-stat">
          <span className="label">Epochs</span>
          <span className="value">{stats.epochsCollected} / {EPOCH_RUNNER_TARGET_EPOCHS}</span>
        </div>
        <div className="epoch-runner-hud-stat">
          <span className="label">Score</span>
          <span className="value">{stats.score}</span>
        </div>
        <div className="epoch-runner-hud-stat">
          <span className="label">Distance</span>
          <span className="value">{stats.distance.toFixed(1)}</span>
        </div>
        <div className="epoch-runner-hud-stat">
          <span className="label">Time</span>
          <span className="value">{formatSeconds(stats.timeMs)}s</span>
        </div>
        <div className="epoch-runner-hud-stat">
          <span className="label">Best Score</span>
          <span className="value">{bestScore}</span>
        </div>
      </div>

      {viewState.status === 'won' && isRewardUnlocked && (
        <p className="epoch-runner-success">Reward preset is already in your library and ready in Jobs.</p>
      )}

      <style>{`
        .epoch-runner-shell {
          margin-top: 18px;
          border: 1px solid rgba(110, 255, 150, 0.35);
          padding: 14px;
          background: rgba(0, 12, 2, 0.82);
          box-shadow: inset 0 0 40px rgba(0, 255, 128, 0.06);
          position: relative;
          z-index: 3;
        }

        .epoch-runner-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .epoch-runner-title {
          color: var(--neon-cyan);
          letter-spacing: 0.18em;
          font-size: 16px;
        }

        .epoch-runner-help {
          color: var(--text-steel);
          font-size: 11px;
        }

        .epoch-runner-stage {
          position: relative;
          border: 1px solid rgba(140, 255, 182, 0.28);
          background: #000;
        }

        .epoch-runner-canvas {
          display: block;
          width: 100%;
          height: auto;
          image-rendering: pixelated;
          aspect-ratio: ${GAME_WIDTH} / ${GAME_HEIGHT};
        }

        .epoch-runner-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          gap: 10px;
        }

        .epoch-runner-overlay h3 {
          color: var(--neon-green);
          font-size: 24px;
          margin: 0;
        }

        .epoch-runner-overlay p {
          color: var(--text-steel);
          margin: 0;
          max-width: 520px;
        }

        .epoch-runner-overlay-action {
          color: var(--neon-cyan) !important;
        }

        .epoch-runner-hud {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .epoch-runner-hud-stat {
          border: 1px solid rgba(102, 255, 146, 0.22);
          background: rgba(7, 17, 8, 0.65);
          padding: 10px;
        }

        .epoch-runner-hud-stat .label {
          display: block;
          color: var(--text-steel);
          font-size: 11px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .epoch-runner-hud-stat .value {
          color: var(--neon-green);
          font-size: 16px;
        }

        .epoch-runner-success {
          margin-top: 10px;
          color: var(--neon-cyan);
          font-size: 12px;
        }

        .epoch-runner-error {
          color: var(--neon-magenta) !important;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
