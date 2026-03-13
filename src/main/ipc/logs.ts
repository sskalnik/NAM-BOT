import { app, ipcMain } from 'electron'
import { existsSync, readFileSync } from 'fs'
import log from 'electron-log/main'
import { join } from 'path'
import { getQueueManager } from '../jobs/queueManager'

const userDataPath = app.getPath('userData')

export function setupLogsIpcHandlers(): void {
  log.info('Setting up logs IPC handlers')

  ipcMain.handle('logs:getTerminal', async (_event, jobId: string) => {
    const runtime = getQueueManager().getQueue().find((job) => job.jobId === jobId)
    const logPath = runtime?.terminalLogPath || join(userDataPath, 'workspaces', jobId, 'terminal.log')
    if (existsSync(logPath)) {
      return readFileSync(logPath, 'utf-8')
    }
    return ''
  })

  ipcMain.handle('logs:getDiagnostics', async () => {
    const diagPath = join(userDataPath, 'logs', 'nam-bot.log')
    if (existsSync(diagPath)) {
      return readFileSync(diagPath, 'utf-8')
    }
    return 'No diagnostics available'
  })

  log.info('Logs IPC handlers registered')
}
