"use client"

import { Badge } from "@/components/ui/badge"

export function ModelGenerationSection() {
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
        See Overhaul in action
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left side - Image */}
        <div className="flex items-center justify-center">
          <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden shadow-lg">
            <img
              src="/images/3d-model-generation-ui.png"
              alt="3D Model Generation UI"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right side - Content */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            <Badge className="bg-orange-100 text-orange-800 text-sm px-3 py-1">
              Live Demo
            </Badge>
            <h3 className="text-3xl font-bold text-gray-900">
              From idea to 3D model in minutes
            </h3>
            <p className="text-lg text-gray-700">
              Watch how Overhaul transforms your natural language descriptions into 
              ready-to-print 3D models with embedded firmware code.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-700">Describe your hardware idea in plain English</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-700">AI generates 3D model and component list</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-700">Get firmware code for microcontrollers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-700">Download ready-to-print files</span>
            </div>
          </div>

          <div className="pt-4">
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg">
              Try the Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
