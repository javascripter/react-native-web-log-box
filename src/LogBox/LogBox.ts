/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IgnorePattern, LogData } from './Data/LogBoxData'
import { parseInterpolation } from './Data/parseLogBoxLog'

const IS_TESTING = false

let LogBox: ILogBox
interface ILogBox {
  install: () => void
  uninstall: () => void
  isInstalled: () => boolean
  ignoreLogs: (value: readonly IgnorePattern[]) => void
  ignoreAllLogs: (value: boolean | null | undefined) => void

  clearAllLogs: () => void
  addLog: (log: LogData) => void
  addException: (error: Error) => void
}

/**
 * LogBox displays logs in the app.
 */
if (__DEV__) {
  const LogBoxData: typeof import('./Data/LogBoxData') = require('./Data/LogBoxData')

  let originalConsoleError: Console['error']
  let originalConsoleWarn: Console['warn']
  let consoleErrorImpl: Console['error']
  let consoleWarnImpl: Console['warn']
  let isLogBoxInstalled: boolean = false
  LogBox = {
    install(): void {
      if (isLogBoxInstalled) {
        return
      }

      isLogBoxInstalled = true

      // IMPORTANT: we only overwrite `console.error` and `console.warn` once.
      // When we uninstall we keep the same reference and only change its
      // internal implementation
      const isFirstInstall = originalConsoleError == null

      if (isFirstInstall) {
        originalConsoleError = console.error.bind(console)
        originalConsoleWarn = console.warn.bind(console)

        console.error = (...args: Parameters<Console['error']>) => {
          consoleErrorImpl(...args)
        }

        console.warn = (...args: Parameters<Console['warn']>) => {
          consoleWarnImpl(...args)
        }
      }

      consoleErrorImpl = registerError
      consoleWarnImpl = registerWarning

      if (IS_TESTING) {
        LogBoxData.setDisabled(true)
      }
    },

    uninstall(): void {
      if (!isLogBoxInstalled) {
        return
      }

      isLogBoxInstalled = false
      // IMPORTANT: we don't re-assign to `console` in case the method has been
      // decorated again after installing LogBox. E.g.:
      // Before uninstalling: original > LogBox > OtherErrorHandler
      // After uninstalling:  original > LogBox (noop) > OtherErrorHandler
      consoleErrorImpl = originalConsoleError
      consoleWarnImpl = originalConsoleWarn
      delete (console as any).disableLogBox
    },

    isInstalled(): boolean {
      return isLogBoxInstalled
    },

    ignoreLogs(patterns: readonly IgnorePattern[]): void {
      LogBoxData.addIgnorePatterns(patterns)
    },

    ignoreAllLogs(value?: boolean | null | undefined): void {
      LogBoxData.setDisabled(value == null ? true : value)
    },

    clearAllLogs(): void {
      LogBoxData.clear()
    },

    addLog(log: LogData): void {
      if (isLogBoxInstalled) {
        LogBoxData.addLog(log)
      }
    },

    addException(error: Error): void {
      if (isLogBoxInstalled) {
        LogBoxData.addException(error)
      }
    },
  }

  const registerWarning = (...args: Parameters<Console['warn']>): void => {
    const { category, message } = parseInterpolation(args)

    if (LogBoxData.isMessageIgnored(message.content)) return
    originalConsoleWarn(...args)

    LogBoxData.addLog({
      level: 'warn',
      category,
      message,
    })
  }

  const registerError = (...args: Parameters<Console['error']>): void => {
    originalConsoleError(...args)
    const { message } = parseInterpolation(args)
    if (LogBoxData.isMessageIgnored(message.content)) return

    const errorForStackTrace = new Error(message.content)
    LogBoxData.reportLogBoxError(errorForStackTrace)
  }
} else {
  LogBox = {
    install(): void {
      // Do nothing.
    },

    uninstall(): void {
      // Do nothing.
    },

    isInstalled(): boolean {
      return false
    },

    ignoreLogs(): void {
      // Do nothing.
    },

    ignoreAllLogs(): void {
      // Do nothing.
    },
    clearAllLogs(): void {
      // Do nothing.
    },

    addLog(_log: LogData): void {
      // Do nothing.
    },

    addException(_error: Error): void {
      // Do nothing.
    },
  }
}

export default LogBox
