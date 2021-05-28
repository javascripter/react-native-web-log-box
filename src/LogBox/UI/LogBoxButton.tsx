/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react'
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Insets,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from 'react-native'

import * as LogBoxStyle from './LogBoxStyle'
type Props = Readonly<{
  backgroundColor?: Readonly<{
    default: string
    pressed: string
  }>
  children?: React.ReactNode
  hitSlop?: Insets | undefined
  onPress?: ((event: GestureResponderEvent) => void) | null | undefined
  style?: StyleProp<ViewStyle>
}>

function LogBoxButton(props: Props) {
  const [pressed, setPressed] = React.useState(false)
  let backgroundColor = props.backgroundColor

  if (backgroundColor == null) {
    backgroundColor = {
      default: LogBoxStyle.getBackgroundColor(0.95),
      pressed: LogBoxStyle.getBackgroundColor(0.6),
    }
  }

  const content = (
    <View
      style={StyleSheet.compose(
        {
          backgroundColor: pressed ? backgroundColor.pressed : backgroundColor.default,
        },
        props.style
      )}>
      {props.children}
    </View>
  )
  return props.onPress == null ? (
    content
  ) : (
    <TouchableWithoutFeedback
      hitSlop={props.hitSlop}
      onPress={props.onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      {content}
    </TouchableWithoutFeedback>
  )
}

export default LogBoxButton
