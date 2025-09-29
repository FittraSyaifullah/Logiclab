export function base64ToUint8Array(base64: string): Uint8Array {
  const normalized = base64.replace(/\s/g, "")
  if (typeof window === "undefined") {
    const buffer = Buffer.from(normalized, "base64")
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  }

  const binaryString = window.atob(normalized)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof window === "undefined") {
    return Buffer.from(buffer).toString("base64")
  }

  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return window.btoa(binary)
}
