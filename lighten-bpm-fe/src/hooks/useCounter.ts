import { useState } from 'react'
import { useService } from './useService'
import { TYPES } from '../types/symbols'
import { ICounterService } from '../interfaces/services'

interface UseCounterReturn {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounter = (): UseCounterReturn => {
  const counterService = useService<ICounterService>(TYPES.CounterService)
  const [count, setCount] = useState(() => counterService.getValue())

  const increment = () => {
    const newValue = counterService.increment()
    setCount(newValue)
  }

  const decrement = () => {
    const newValue = counterService.decrement()
    setCount(newValue)
  }

  const reset = () => {
    const newValue = counterService.reset()
    setCount(newValue)
  }

  return {
    count,
    increment,
    decrement,
    reset,
  }
}
