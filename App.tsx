import * as React from 'react'
import { StyleSheet, Text, View, Pressable } from 'react-native'

import { LogBox, LogBoxNotification } from './build'

LogBox.ignoreLogs([/Ignored: /])
LogBox.install()

const messages: Readonly<{ level: 'warn' | 'error'; message: string }[]> = [
  {
    level: 'warn',
    message: 'Tip: console.warn() and console.error() are now shown as LogBox Notifications.',
  },
  {
    level: 'error',
    message: 'Tip: You can tap on LogBoxNotification to skip to next error.',
  },
  {
    level: 'warn',
    message: 'Keep trying... You will notice duplicate errors are grouped together!',
  },
]

export default function App() {
  const [count, setCount] = React.useState(0)

  const onShowError = () => {
    const { level, message } = messages[count]
    console[level](message)

    setCount((prevCount) => (prevCount + 1) % messages.length)
  }

  React.useEffect(() => {
    console.error('Look! A LogBox Notification for Web!')
  }, [])

  return (
    <View style={styles.container}>
      <Text>React Native LogBox for Web</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={onShowError}>
        <Text style={styles.buttonText}>Show More LogBox!</Text>
      </Pressable>
      <LogBoxNotification />
    </View>
  )
}

const Colors = {
  white: '#fff',
  primary: '#5B99D6',
  black: '#000',
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: Colors.white,
  },
  descriptionText: {
    marginTop: 32,
    color: Colors.black,
    lineHeight: 24,
  },
})
