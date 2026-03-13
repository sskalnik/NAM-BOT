import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import log from 'electron-log/main'
import { AppSettings, defaultSettings } from '../types'

const userDataPath = app.getPath('userData')
const settingsPath = join(userDataPath, 'settings.json')

function normalizeSettings(input: Partial<AppSettings> | null | undefined): AppSettings {
  const mergedSettings: AppSettings = { ...defaultSettings, ...input }

  return {
    ...mergedSettings,
    condaExecutablePath: mergedSettings.condaExecutablePath || defaultSettings.condaExecutablePath,
    environmentName:
      mergedSettings.backendMode === 'conda-name'
        ? mergedSettings.environmentName || defaultSettings.environmentName
        : mergedSettings.environmentName
  }
}

export function loadSettings(): AppSettings {
  try {
    if (existsSync(settingsPath)) {
      const data = readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(data) as Partial<AppSettings>
      log.info('Settings loaded from:', settingsPath)
      return normalizeSettings(parsed)
    }
  } catch (error) {
    log.error('Failed to load settings:', error)
  }
  log.info('Using default settings')
  return normalizeSettings(defaultSettings)
}

export function saveSettings(settings: AppSettings): void {
  try {
    const dir = userDataPath
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    log.info('Settings saved to:', settingsPath)
  } catch (error) {
    log.error('Failed to save settings:', error)
    throw error
  }
}
