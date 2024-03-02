import { createEvent, createStore, sample } from 'effector'

export const createArrayStore = <T>() => {
  const add = createEvent<T>()
  const reset = createEvent()

  const $items = createStore<T[]>([]).on(add, (s, item) => [...s, item])

  sample({ clock: reset, target: $items.reinit })

  return {
    value: $items,
    add,
    reset
  }
}
