import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Entrypoint } from './src/entrypoint'

const rootElement = document.querySelector('#app')

if (!rootElement) {
  throw new Error('root element was not found in the document')
}

const root = createRoot(rootElement)

root.render((<Entrypoint />) as ReactNode)
