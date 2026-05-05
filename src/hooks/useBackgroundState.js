import { useState, useEffect } from 'react'
import eventBus from '../components/ThreeBackground/utils/eventBus'

export default function useBackgroundState() {
  const [currentBackground, setCurrentBackground] = useState(null)
  const [currentVideoBackground, setCurrentVideoBackground] = useState(null)

  useEffect(() => {
    const handleBackgroundChange = (data) => {
      const { isCustomBackground, path, theme, isVideo } = data
      if (theme !== 'bg-theme' || !isCustomBackground) {
        setCurrentBackground(null)
        setCurrentVideoBackground(null)
      } else if (isVideo) {
        setCurrentVideoBackground(path)
        setCurrentBackground(null)
      } else {
        setCurrentBackground(path)
        setCurrentVideoBackground(null)
      }
    }

    const currentState = eventBus.getBackgroundState()
    if (currentState.isCustomBackground && currentState.theme === 'bg-theme') {
      if (currentState.isVideo) setCurrentVideoBackground(currentState.path)
      else setCurrentBackground(currentState.path)
    }

    eventBus.on('backgroundChange', handleBackgroundChange)
    return () => eventBus.off('backgroundChange', handleBackgroundChange)
  }, [])

  return { currentBackground, currentVideoBackground }
}
