/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react'

import LogBoxLog, { LogLevel } from './LogBoxLog'
import { Category, Message, parseLogBoxException } from './parseLogBoxLog'
export type LogBoxLogs = Set<LogBoxLog>
export type LogData = Readonly<{
  level: LogLevel
  message: Message
  category: Category
}>
export type Observer = (
  data: Readonly<{
    logs: LogBoxLogs
    isDisabled: boolean
    selectedLogIndex: number
  }>
) => void
export type IgnorePattern = string | RegExp
export type Subscription = Readonly<{
  unsubscribe: () => void
}>

const observers: Set<{
  observer: Observer
}> = new Set()
const ignorePatterns: Set<IgnorePattern> = new Set()
let logs: LogBoxLogs = new Set()

let _isDisabled = false
let updateTimeout: ReturnType<typeof setImmediate> | null = null

let _selectedIndex = -1

function getNextState() {
  return {
    logs,
    isDisabled: _isDisabled,
    selectedLogIndex: _selectedIndex,
  }
}

export function isMessageIgnored(message: string): boolean {
  for (const pattern of ignorePatterns) {
    if (
      (pattern instanceof RegExp && pattern.test(message)) ||
      (typeof pattern === 'string' && message.includes(pattern))
    ) {
      return true
    }
  }

  return false
}

function handleUpdate(): void {
  if (updateTimeout == null) {
    updateTimeout = setImmediate(() => {
      updateTimeout = null
      const nextState = getNextState()
      observers.forEach(({ observer }) => observer(nextState))
    })
  }
}

function appendNewLog(newLog: LogBoxLog) {
  // Don't want store these logs because they trigger a
  // state update when we add them to the store.
  if (isMessageIgnored(newLog.message.content)) {
    return
  }

  // If the next log has the same category as the previous one
  // then roll it up into the last log in the list by incrementing
  // the count (similar to how Chrome does it).
  const lastLog = Array.from(logs).pop()

  if (lastLog != null && lastLog.category === newLog.category) {
    lastLog.incrementCount()
    handleUpdate()
    return
  }

  if (newLog.level === 'syntax') {
    logs.add(newLog)
    setSelectedLog(logs.size - 1)
  } else {
    logs.add(newLog)
    handleUpdate()
  }
}

export function addLog(log: LogData): void {
  setImmediate(() => {
    try {
      appendNewLog(
        new LogBoxLog({
          level: log.level,
          message: log.message,
          category: log.category,
        })
      )
    } catch (error) {
      reportLogBoxError(error)
    }
  })
}

export function addException(error: Error): void {
  // Parsing logs are expensive so we schedule this
  // otherwise spammy logs would pause rendering.

  setImmediate(() => {
    try {
      appendNewLog(new LogBoxLog(parseLogBoxException(error)))
    } catch (loggingError) {
      reportLogBoxError(loggingError)
    }
  })
}

export function clear(): void {
  if (logs.size > 0) {
    logs = new Set()
    setSelectedLog(-1)
  }
}
export function setSelectedLog(proposedNewIndex: number): void {
  let newIndex = proposedNewIndex
  const logArray = Array.from(logs)
  let index = logArray.length - 1

  while (index >= 0) {
    // The latest syntax error is selected and displayed before all other logs.
    if (logArray[index].level === 'syntax') {
      newIndex = index
      break
    }

    index -= 1
  }

  _selectedIndex = newIndex
  handleUpdate()
}
export function clearWarnings(): void {
  const newLogs = Array.from(logs).filter((log) => log.level !== 'warn')

  if (newLogs.length !== logs.size) {
    logs = new Set(newLogs)
    setSelectedLog(-1)
    handleUpdate()
  }
}
export function clearErrors(): void {
  const newLogs = Array.from(logs).filter((log) => log.level !== 'error' && log.level !== 'fatal')

  if (newLogs.length !== logs.size) {
    logs = new Set(newLogs)
    setSelectedLog(-1)
  }
}
export function dismiss(log: LogBoxLog): void {
  if (logs.has(log)) {
    logs.delete(log)
    handleUpdate()
  }
}

export function addIgnorePatterns(patterns: readonly IgnorePattern[]): void {
  // The same pattern may be added multiple times, but adding a new pattern
  // can be expensive so let's find only the ones that are new.
  const newPatterns = patterns.filter((pattern: IgnorePattern) => {
    if (pattern instanceof RegExp) {
      for (const existingPattern of ignorePatterns.entries()) {
        if (
          existingPattern instanceof RegExp &&
          existingPattern.toString() === pattern.toString()
        ) {
          return false
        }
      }

      return true
    }

    return !ignorePatterns.has(pattern)
  })

  if (newPatterns.length === 0) {
    return
  }

  for (const pattern of newPatterns) {
    ignorePatterns.add(pattern)
  }
}

export function setDisabled(value: boolean): void {
  if (value === _isDisabled) {
    return
  }

  _isDisabled = value
}

export function isDisabled(): boolean {
  return _isDisabled
}
export function observe(observer: Observer): Subscription {
  const subscription = {
    observer,
  }
  observers.add(subscription)
  observer(getNextState())
  return {
    unsubscribe(): void {
      observers.delete(subscription)
    },
  }
}

export function reportLogBoxError(error: Error): void {
  if (error == null) return
  addException(error)
}

type Props = Readonly<object>
type State = Readonly<{
  logs: LogBoxLogs
  isDisabled: boolean
  hasError: boolean
  selectedLogIndex: number
}>
type SubscribedComponent = React.ComponentType<
  Readonly<{
    logs: readonly LogBoxLog[]
    isDisabled: boolean
    selectedLogIndex: number
  }>
>

export function withSubscription(
  WrappedComponent: SubscribedComponent
): React.ComponentType<Props> {
  class LogBoxStateSubscription extends React.Component<Props, State> {
    static getDerivedStateFromError() {
      return {
        hasError: true,
      }
    }

    _subscription: Subscription | null | undefined
    state: State = {
      logs: new Set(),
      isDisabled: false,
      hasError: false,
      selectedLogIndex: -1,
    }

    render() {
      return (
        <WrappedComponent
          logs={Array.from(this.state.logs)}
          isDisabled={this.state.isDisabled}
          selectedLogIndex={this.state.selectedLogIndex}
        />
      )
    }

    componentDidMount(): void {
      this._subscription = observe((data) => {
        this.setState(data)
      })
    }

    componentWillUnmount(): void {
      if (this._subscription != null) {
        this._subscription.unsubscribe()
      }
    }

    _handleDismiss = (): void => {
      // Here we handle the cases when the log is dismissed and it
      // was either the last log, or when the current index
      // is now outside the bounds of the log array.
      const { selectedLogIndex, logs: stateLogs } = this.state
      const logsArray = Array.from(stateLogs)

      if (selectedLogIndex != null) {
        if (logsArray.length - 1 <= 0) {
          setSelectedLog(-1)
        } else if (selectedLogIndex >= logsArray.length - 1) {
          setSelectedLog(selectedLogIndex - 1)
        }

        dismiss(logsArray[selectedLogIndex])
      }
    }
  }

  return LogBoxStateSubscription
}
