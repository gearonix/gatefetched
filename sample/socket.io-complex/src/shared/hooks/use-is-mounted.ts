import { useCallback, useEffect, useState } from 'react'

export const useIsMounted = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)

    return () => {
      setIsLoaded(false)
    }
  }, [])

  return useCallback(() => isLoaded, [isLoaded])
}
