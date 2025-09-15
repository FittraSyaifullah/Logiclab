"use client"

import { Suspense, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, useGLTF, Html } from "@react-three/drei"
import * as THREE from "three"
import type { Creation } from "@/lib/types"
import { Loader2 } from "lucide-react"

function Model3D({ url }: { url: string }) {
  const meshRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group }
  const scene = gltf?.scene

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group ref={meshRef}>
      {scene && <primitive object={scene} scale={[2, 2, 2]} />}
    </group>
  )
}

function LoadingSpinner() {
  return (
    <Html center>
      <div className="flex items-center gap-2 text-blue-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading 3D model...</span>
      </div>
    </Html>
  )
}

export function ClientViewer({ creation }: { creation: Creation }) {
  const [isRotating] = useState(true)

  const hasModel = !!creation.modelUrl
  const hasImage = !!creation.imageUrl

  return (
    <>
      {hasModel ? (
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }} className="w-full h-full">
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Suspense fallback={<LoadingSpinner />}>
            <Model3D url={creation.modelUrl!} />
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls enablePan enableZoom enableRotate autoRotate={isRotating} autoRotateSpeed={2} />
        </Canvas>
      ) : hasImage ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="max-w-md max-h-full">
            <img src={creation.imageUrl || "/placeholder.svg"} alt={creation.title} className="w-full h-full object-contain rounded-lg shadow-lg" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No 3D Model Yet</p>
            <p className="text-sm">Generate an image first, then create a 3D model</p>
          </div>
        </div>
      )}
    </>
  )
}


