import { NamBotApi } from '../preload/index'

declare global {
  interface Window {
    namBot: NamBotApi
  }
}

export {}
