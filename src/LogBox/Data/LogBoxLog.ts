/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Category, Message } from './parseLogBoxLog'
export type LogLevel = 'warn' | 'error' | 'fatal' | 'syntax'
export type LogBoxLogData = Readonly<{
  level: LogLevel
  type?: string | null | undefined
  message: Message
  category: string
}>

class LogBoxLog {
  message: Message
  type: string | null | undefined
  category: Category
  count: number
  level: LogLevel

  constructor(data: LogBoxLogData) {
    this.level = data.level
    this.type = data.type
    this.message = data.message
    this.category = data.category
    this.count = 1
  }

  incrementCount(): void {
    this.count += 1
  }
}

export default LogBoxLog
