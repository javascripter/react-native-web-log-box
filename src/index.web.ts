import * as React from 'react'

export { default as LogBox } from './LogBox/LogBox'

let LogBoxNotification: React.ComponentType<object>

if (__DEV__) {
  LogBoxNotification = require('./LogBox/LogBoxNotificationContainer').default
} else {
  LogBoxNotification = function LogBoxNotificationContainer() {
    return null
  }
}

export { LogBoxNotification }
