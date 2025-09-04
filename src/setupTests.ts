import '@testing-library/jest-dom'

// Polyfill for structuredClone if not available (Node.js < 17)
if (!global.structuredClone) {
  global.structuredClone = (obj: any) => {
    return JSON.parse(JSON.stringify(obj))
  }
}
