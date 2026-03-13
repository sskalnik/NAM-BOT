export const EPOCH_RUNNER_TARGET_EPOCHS = 100
export const EPOCH_RUNNER_BEST_SCORE_STORAGE_KEY = 'nam-bot:epoch-runner-best-score'

export const GAME_WIDTH = 800
export const GAME_HEIGHT = 280
export const GROUND_HEIGHT = 42
export const GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT
export const PLAYER_X = 112
export const PLAYER_WIDTH = 34
export const PLAYER_HEIGHT = 42

const GRAVITY = 1500
const JUMP_VELOCITY = -560
const BASE_SPEED = 240
const MAX_SPEED_BONUS = 180
const OBSTACLE_SPAWN_BASE_MS = 1450
const COLLECTIBLE_SPAWN_BASE_MS = 520

export type EpochRunnerOutcome = 'none' | 'crashed' | 'won'
export type EpochRunnerStateStatus = 'ready' | 'running' | 'crashed' | 'won'
export type EpochRunnerObstacleType = 'amp-stack' | 'noise-burst' | 'cab-wall'

export interface EpochRunnerPlayer {
  x: number
  y: number
  width: number
  height: number
  velocityY: number
  isGrounded: boolean
}

export interface EpochRunnerObstacle {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: EpochRunnerObstacleType
}

export interface EpochRunnerCollectible {
  id: number
  x: number
  y: number
  width: number
  height: number
  bobPhase: number
}

export interface EpochRunnerRunStats {
  epochsCollected: number
  score: number
  distance: number
  timeMs: number
}

export interface EpochRunnerState extends EpochRunnerRunStats {
  status: EpochRunnerStateStatus
  outcome: EpochRunnerOutcome
  player: EpochRunnerPlayer
  obstacles: EpochRunnerObstacle[]
  collectibles: EpochRunnerCollectible[]
  speed: number
  obstacleCooldownMs: number
  collectibleCooldownMs: number
  nextSpawnId: number
  resultHeadline: string
  resultDetail: string
}

function rectsOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y
  )
}

function randomBetween(min: number, max: number): number {
  return min + (Math.random() * (max - min))
}

function buildObstacle(id: number): EpochRunnerObstacle {
  const roll = Math.random()

  if (roll < 0.34) {
    return {
      id,
      type: 'amp-stack',
      x: GAME_WIDTH + 12,
      y: GROUND_Y - 40,
      width: 34,
      height: 40
    }
  }

  if (roll < 0.68) {
    return {
      id,
      type: 'noise-burst',
      x: GAME_WIDTH + 12,
      y: GROUND_Y - 26,
      width: 30,
      height: 26
    }
  }

  return {
    id,
    type: 'cab-wall',
    x: GAME_WIDTH + 12,
    y: GROUND_Y - 54,
    width: 44,
    height: 54
  }
}

function buildCollectible(id: number): EpochRunnerCollectible {
  const lane = Math.random() < 0.6 ? 0 : 1
  return {
    id,
    x: GAME_WIDTH + 12,
    y: lane === 0 ? GROUND_Y - 74 : GROUND_Y - 118,
    width: 22,
    height: 22,
    bobPhase: Math.random() * Math.PI * 2
  }
}

export function createInitialEpochRunnerState(): EpochRunnerState {
  return {
    status: 'ready',
    outcome: 'none',
    player: {
      x: PLAYER_X,
      y: GROUND_Y - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      velocityY: 0,
      isGrounded: true
    },
    obstacles: [],
    collectibles: [],
    epochsCollected: 0,
    score: 0,
    distance: 0,
    timeMs: 0,
    speed: BASE_SPEED,
    obstacleCooldownMs: 950,
    collectibleCooldownMs: 280,
    nextSpawnId: 1,
    resultHeadline: '',
    resultDetail: ''
  }
}

export function startEpochRunner(_state: EpochRunnerState): EpochRunnerState {
  return {
    ...createInitialEpochRunnerState(),
    status: 'running'
  }
}

export function stepEpochRunner(
  previousState: EpochRunnerState,
  deltaMs: number,
  jumpRequested: boolean
): EpochRunnerState {
  if (previousState.status !== 'running') {
    return previousState
  }

  const deltaSeconds = deltaMs / 1000
  const distance = previousState.distance + (previousState.speed * deltaSeconds * 0.12)
  const speed = BASE_SPEED + Math.min(MAX_SPEED_BONUS, distance * 0.85)

  const player = { ...previousState.player }
  if (jumpRequested && player.isGrounded) {
    player.velocityY = JUMP_VELOCITY
    player.isGrounded = false
  }

  player.velocityY += GRAVITY * deltaSeconds
  player.y += player.velocityY * deltaSeconds

  const groundPlayerY = GROUND_Y - player.height
  if (player.y >= groundPlayerY) {
    player.y = groundPlayerY
    player.velocityY = 0
    player.isGrounded = true
  }

  let nextSpawnId = previousState.nextSpawnId
  const obstacles = previousState.obstacles
    .map((obstacle) => ({
      ...obstacle,
      x: obstacle.x - (speed * deltaSeconds)
    }))
    .filter((obstacle) => obstacle.x + obstacle.width > -20)

  const collectibles = previousState.collectibles
    .map((collectible) => ({
      ...collectible,
      x: collectible.x - (speed * deltaSeconds),
      bobPhase: collectible.bobPhase + (deltaSeconds * 4)
    }))
    .filter((collectible) => collectible.x + collectible.width > -20)

  let obstacleCooldownMs = previousState.obstacleCooldownMs - deltaMs
  if (obstacleCooldownMs <= 0) {
    obstacles.push(buildObstacle(nextSpawnId))
    nextSpawnId += 1
    obstacleCooldownMs = randomBetween(OBSTACLE_SPAWN_BASE_MS - Math.min(280, distance * 1.6), OBSTACLE_SPAWN_BASE_MS + 180)
  }

  let collectibleCooldownMs = previousState.collectibleCooldownMs - deltaMs
  if (collectibleCooldownMs <= 0) {
    collectibles.push(buildCollectible(nextSpawnId))
    nextSpawnId += 1
    collectibleCooldownMs = randomBetween(COLLECTIBLE_SPAWN_BASE_MS, COLLECTIBLE_SPAWN_BASE_MS + 260)
  }

  const playerHitBox = {
    x: player.x + 5,
    y: player.y + 4,
    width: player.width - 10,
    height: player.height - 6
  }

  const collidedObstacle = obstacles.find((obstacle) => rectsOverlap(playerHitBox, obstacle))
  if (collidedObstacle) {
    const failureLines = [
      ['MODEL DIVERGED', 'Gradient spike detected in the signal path.'],
      ['SIGNAL LOST', 'The capture rig vanished into the noise floor.'],
      ['TRAINING ABORTED', 'Waveform terrain exceeded safe limits.']
    ]
    const [headline, detail] = failureLines[Math.floor(Math.random() * failureLines.length)]

    return {
      ...previousState,
      status: 'crashed',
      outcome: 'crashed',
      player,
      obstacles,
      collectibles,
      speed,
      distance,
      timeMs: previousState.timeMs + deltaMs,
      score: Math.max(previousState.score, Math.round(distance * 8) + (previousState.epochsCollected * 125)),
      resultHeadline: headline,
      resultDetail: detail
    }
  }

  let epochsCollected = previousState.epochsCollected
  const remainingCollectibles: EpochRunnerCollectible[] = []
  let score = previousState.score

  for (const collectible of collectibles) {
    if (rectsOverlap(playerHitBox, collectible)) {
      epochsCollected += 1
      score += 120
      continue
    }

    remainingCollectibles.push(collectible)
  }

  score = Math.max(score, Math.round(distance * 8) + (epochsCollected * 125))

  if (epochsCollected >= EPOCH_RUNNER_TARGET_EPOCHS) {
    return {
      ...previousState,
      status: 'won',
      outcome: 'won',
      player,
      obstacles,
      collectibles: remainingCollectibles,
      epochsCollected,
      speed,
      distance,
      timeMs: previousState.timeMs + deltaMs,
      score: score + 1200,
      resultHeadline: 'TRAINING CONVERGED',
      resultDetail: 'CAPTURE COMPLETE. Reward preset manifest unlocked.'
    }
  }

  return {
    ...previousState,
    player,
    obstacles,
    collectibles: remainingCollectibles,
    epochsCollected,
    score,
    distance,
    timeMs: previousState.timeMs + deltaMs,
    speed,
    obstacleCooldownMs,
    collectibleCooldownMs,
    nextSpawnId
  }
}
