"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, GizmoHelper, GizmoViewport } from "@react-three/drei"
import { Box3, Mesh, MeshStandardMaterial, Vector3, BufferGeometry, MathUtils } from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { Loader2 } from "lucide-react"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"

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
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [color] = useState<string>("#FF7F50")
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([110, 110, 110])
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0])
  const [controlsReady, setControlsReady] = useState(false)

  const updateCamera = useCallback(
    (geom: BufferGeometry) => {
      const boundingBox = new Box3().setFromBufferAttribute(geom.attributes.position)

      const center = new Vector3()
      boundingBox.getCenter(center)

      const size = new Vector3()
      boundingBox.getSize(size)
      const sphereRadius = size.length() * 0.5 || 1

      const container = containerRef.current
      const aspect = container && container.clientHeight > 0 ? container.clientWidth / container.clientHeight : 1
      const fov = MathUtils.degToRad(45)
      const distance = sphereRadius / Math.sin(fov / 2)

      const offset = new Vector3(distance, distance, distance)
      if (aspect > 1) {
        offset.x *= aspect
      } else {
        offset.y /= aspect
      }

      const newPosition: [number, number, number] = [
        center.x + offset.x,
        center.y + offset.y,
        center.z + offset.z,
      ]

      setCameraTarget([center.x, center.y, center.z])
      setCameraPosition(newPosition)
    },
    [],
  )

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
      updateCamera(geom)
    } catch (err) {
      if (cancelled) return
      console.error("[STLViewer] Failed to parse STL", err)
      setError(err instanceof Error ? err.message : "Failed to load STL")
    }

    return () => {
      cancelled = true
    }
  }, [stlBase64, updateCamera])

  const mesh = useMemo(() => {
    if (!geometry) return null
    const material = new MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.45 })
    return new Mesh(geometry, material)
  }, [geometry, color])

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(...cameraTarget)
      controlsRef.current.update()
    }
  }, [cameraTarget])

  return (
    <div ref={containerRef} className="relative h-full w-full">
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
        <Canvas className="h-full w-full" style={{ background: "#d1d3d4" }}>
          <PerspectiveCamera makeDefault position={cameraPosition} fov={45} near={0.1} far={1000} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[60, 60, 60]} intensity={1.2} />
          <directionalLight position={[-40, 40, 60]} intensity={0.4} />
          <primitive object={mesh} />
          <OrbitControls
            ref={(value) => {
              controlsRef.current = value
              setControlsReady(!!value)
            }}
            makeDefault
            enableDamping
            dampingFactor={0.1}
            target={cameraTarget}
          />
          {controlsReady && (
            <GizmoHelper alignment="bottom-right" margin={[80, 80]} onTarget={() => controlsRef.current?.target}>
            <GizmoViewport axisColors={["#ff7f50", "#73c2fb", "#caffbf"]} />
            </GizmoHelper>
          )}
        </Canvas>
      )}
    </div>
  )
}
