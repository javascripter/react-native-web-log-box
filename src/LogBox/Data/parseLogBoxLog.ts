/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import stringifySafe from '../../Utilities/stringifySafe'
import { LogBoxLogData } from './LogBoxLog'

export type Category = string

export type Message = Readonly<{
  content: string
  substitutions: readonly Readonly<{
    length: number
    offset: number
  }>[]
}>

const UTFSequence = {
  BOM: '\ufeff',
} as const

const SUBSTITUTION = UTFSequence.BOM + '%s'
export function parseInterpolation(args: readonly unknown[]): Readonly<{
  category: string
  message: Message
}> {
  const categoryParts: string[] = []
  const contentParts: string[] = []
  const substitutionOffsets: { length: number; offset: number }[] = []
  const remaining = [...args]

  if (typeof remaining[0] === 'string') {
    const formatString = String(remaining.shift())
    const formatStringParts = formatString.split('%s')
    const substitutionCount = formatStringParts.length - 1
    const substitutions = remaining.splice(0, substitutionCount)
    let categoryString = ''
    let contentString = ''
    let substitutionIndex = 0

    for (const formatStringPart of formatStringParts) {
      categoryString += formatStringPart
      contentString += formatStringPart

      if (substitutionIndex < substitutionCount) {
        if (substitutionIndex < substitutions.length) {
          // Don't stringify a string type.
          // It adds quotation mark wrappers around the string,
          // which causes the LogBox to look odd.
          const substitution =
            typeof substitutions[substitutionIndex] === 'string'
              ? (substitutions[substitutionIndex] as string)
              : stringifySafe(substitutions[substitutionIndex])
          substitutionOffsets.push({
            length: substitution.length,
            offset: contentString.length,
          })
          categoryString += SUBSTITUTION
          contentString += substitution
        } else {
          substitutionOffsets.push({
            length: 2,
            offset: contentString.length,
          })
          categoryString += '%s'
          contentString += '%s'
        }

        substitutionIndex++
      }
    }

    categoryParts.push(categoryString)
    contentParts.push(contentString)
  }

  const remainingArgs = remaining.map((arg) => {
    // Don't stringify a string type.
    // It adds quotation mark wrappers around the string,
    // which causes the LogBox to look odd.
    return typeof arg === 'string' ? arg : stringifySafe(arg)
  })
  categoryParts.push(...remainingArgs)
  contentParts.push(...remainingArgs)
  return {
    category: categoryParts.join(' '),
    message: {
      content: contentParts.join(' '),
      substitutions: substitutionOffsets,
    },
  }
}

export function parseLogBoxException(error: Error): LogBoxLogData {
  const message = error.message != null ? error.message : 'Unknown'

  return {
    level: 'error',
    ...parseInterpolation([message]),
  }
}
