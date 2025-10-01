"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type WorkerRequest = {
  id: string
  type: 'compile'
  scad: string
  params?: Record<string, number>
}

type WorkerResponse =
  | { id: string; ok: true; fileType: 'stl'; bytes: Uint8Array; triangleCount: number; warnings: string[] }
  | { id: string; ok: false; error: string }

export function useOpenScadWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/openscad.worker.ts', import.meta.url))
    workerRef.current = worker
    try {
      console.log('[OpenSCAD Hook] initializing worker with origin', window.location.origin)
      worker.postMessage({ type: 'init', origin: window.location.origin })
    } catch {}
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const compile = useCallback(async (
    scad: string,
    params?: Record<string, number>,
  ): Promise<{ blob: Blob; triangleCount: number; warnings: string[] }> => {
    if (!workerRef.current) throw new Error('OpenSCAD worker not initialized')
    return new Promise<{ blob: Blob; triangleCount: number; warnings: string[] }>((resolve, reject) => {
      const id = Math.random().toString(36).slice(2)
      const onMessage = (ev: MessageEvent<WorkerResponse>) => {
        console.log('[OpenSCAD Hook] message received', ev.data?.id)
        const msg = ev.data
        if (!msg || msg.id !== id) return
        workerRef.current?.removeEventListener('message', onMessage)
        if (msg.ok) {
          // Create a new ArrayBuffer to satisfy TS DOM typings
          const copied = new Uint8Array(msg.bytes.byteLength)
          copied.set(msg.bytes)
          const blob = new Blob([copied.buffer], { type: 'model/stl' })
          resolve({ blob, triangleCount: msg.triangleCount, warnings: msg.warnings })
        } else {
          setError(msg.error)
          reject(new Error(msg.error))
        }
      }

      setStatus('working')
      setError(null)
      const worker = workerRef.current
      if (!worker) {
        setStatus('idle')
        reject(new Error('OpenSCAD worker unavailable'))
        return
      }
      console.log('[OpenSCAD Hook] posting compile request', { id })
      worker.addEventListener('message', onMessage)
      const req: WorkerRequest = { id, type: 'compile', scad, params }
      worker.postMessage(req)
    }).finally(() => setStatus('idle'))
  }, [])

  return { compile, status, error, setError }
}


