import { createTrainingPreset, type TrainingPresetFile } from '../../state/types'

export const EPOCH_RUNNER_COMMAND = 'epochrunner.exe'
export const EPOCH_RUNNER_COMMAND_ALIAS = 'epochrunner'
export const EPOCH_RUNNER_REWARD_TAG = 'Epoch Runner Reward'
export const EPOCH_RUNNER_REWARD_PRESET_ID = 'epoch-runner-reward'

export function createEpochRunnerRewardPreset(): TrainingPresetFile {
  return createTrainingPreset({
    id: EPOCH_RUNNER_REWARD_PRESET_ID,
    name: 'Converged Night Run',
    description: 'Recovered from the hidden BBS runner and tuned for late-night captures. Based on the X-Std architecture originally created by Андрей Полевой.',
    category: 'custom',
    builtIn: false,
    readOnly: false,
    visible: true,
    values: {
      modelFamily: 'WaveNet',
      architectureSize: 'custom',
      epochs: 666,
      batchSize: 16,
      learningRate: 0.004,
      learningRateDecay: 0.007,
      ny: 8192,
      fitMrstft: true
    },
    expert: {
      model: {
        net: {
          name: 'WaveNet',
          config: {
            layers_configs: [
              {
                input_size: 1,
                condition_size: 1,
                channels: 8,
                head_size: 8,
                kernel_size: 6,
                dilations: [1, 3, 9, 27, 81, 243, 729],
                activation: 'Tanh',
                gated: false,
                head_bias: false
              },
              {
                condition_size: 1,
                input_size: 8,
                channels: 8,
                head_size: 8,
                kernel_size: 6,
                dilations: [1, 3, 9, 27, 81, 243, 729],
                activation: 'Tanh',
                gated: false,
                head_bias: false
              },
              {
                condition_size: 1,
                input_size: 8,
                channels: 8,
                head_size: 8,
                kernel_size: 6,
                dilations: [1, 3, 9, 27, 81, 243, 729],
                activation: 'Tanh',
                gated: false,
                head_bias: false
              },
              {
                condition_size: 1,
                input_size: 8,
                channels: 8,
                head_size: 1,
                kernel_size: 6,
                dilations: [1, 3, 9, 27, 81, 243, 729],
                activation: 'Tanh',
                gated: false,
                head_bias: true
              }
            ],
            head_scale: 0.99
          }
        }
      }
    },
    author: {
      name: 'Андрей Полевой'
    },
    origin: {
      app: 'NAM-BOT',
      version: '0.2.1'
    }
  })
}

export function isEpochRunnerRewardPreset(preset: TrainingPresetFile): boolean {
  return preset.id === EPOCH_RUNNER_REWARD_PRESET_ID
}

export function formatPresetNameWithRewardTag(preset: TrainingPresetFile): string {
  if (!isEpochRunnerRewardPreset(preset)) {
    return preset.name
  }

  return `${preset.name} [${EPOCH_RUNNER_REWARD_TAG}]`
}
