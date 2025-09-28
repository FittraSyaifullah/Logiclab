"use client"

import { useEffect, useMemo, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, GizmoHelper, GizmoViewport, Stage } from "@react-three/drei"
import { Mesh, MeshStandardMaterial, BufferGeometry } from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { Loader2 } from "lucide-react"

interface STLViewerProps {
  stlBase64: string
  componentName: string
}

const loader = new STLLoader()

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export default function STLViewer({ stlBase64, componentName }: STLViewerProps) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [color] = useState<string>("#FF7F50")

  useEffect(() => {
    let cancelled = false

    try {
      const buffer = base64ToArrayBuffer(stlBase64)
      const geom = loader.parse(buffer)
      if (cancelled) return
      geom.center()
      geom.computeVertexNormals()
      setGeometry(geom)
      setError(null)
    } catch (err) {
      if (cancelled) return
      console.error("[STLViewer] Failed to parse STL", err)
      setError(err instanceof Error ? err.message : "Failed to load STL")
    }

    return () => {
      cancelled = true
    }
  }, [stlBase64])

  const mesh = useMemo(() => {
    if (!geometry) return null
    const material = new MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.45 })
    return new Mesh(geometry, material)
  }, [geometry, color])

  return (
    <div className="relative h-full w-full">
      {!geometry && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-200">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Preparing {componentName} geometry…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400">
          <p className="text-sm font-medium">Could not load STL</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
      )}

      {geometry && (
        <Canvas className="h-full w-full bg-neutral-950">
          <PerspectiveCamera makeDefault position={[110, 110, 110]} fov={45} near={0.1} far={1000} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[60, 60, 60]} intensity={1.2} />
          <directionalLight position={[-40, 40, 60]} intensity={0.4} />
          <Stage adjustCamera={false} intensity={0.3}>
            {mesh && <primitive object={mesh as unknown as object} />}
          </Stage>
          <OrbitControls enableDamping dampingFactor={0.1} />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["#ff7f50", "#73c2fb", "#caffbf"]} />
          </GizmoHelper>
        </Canvas>
      )}
    </div>
  )
}
