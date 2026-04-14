import { TextDecoder, TextEncoder } from 'node:util'
import '@testing-library/jest-dom'

globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
