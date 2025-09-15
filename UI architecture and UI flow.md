## **Core Dashboard Architecture**

### **Main Container Components**

1. **`components/dashboard.tsx`** - The main orchestrator component that manages the entire dashboard state and layout
2. **`app/dashboard_page.tsx`** - The Next.js page wrapper that renders the Dashboard component


### **Navigation & Sidebar Components**

1. **`components/app-sidebar.tsx`** - Project management sidebar with creation list, new project button, and user controls
2. **`components/chat-sidebar.tsx`** - AI chat interface sidebar that adapts to hardware/software modes
3. **`components/logo-hover-sidebar.tsx`** - Quick access hover sidebar for additional actions


### **Content Viewer Components (Main Panel)**

#### **Hardware Flow Components:**

1. **`components/viewer-panel.tsx`** - 3D model viewer container (server-safe wrapper)
2. **`components/viewer-panel.client.tsx`** - Client-side 3D rendering with Three.js/React Three Fiber
3. **`components/code-viewer.tsx`** - Arduino/hardware code display with syntax highlighting
4. **`components/params-panel.tsx`** - 3D model parameter controls and sliders
5. **`components/components-panel.tsx`** - Hardware component analysis and code version management


#### **Software Flow Components:**

1. **`components/software-viewer.tsx`** - v0-generated application preview with iframe embedding
2. **`components/chat-panel.tsx`** - Embedded chat interface for software iterations


### **Shared/Both Flow Components:**

1. **`components/initial-prompt-form.tsx`** - Starting point for new creations (both hardware/software)
2. **`components/credit-balance-widget.tsx`** - Credit system display and management


### **Modal/Overlay Components:**

1. **`components/integration-panel.tsx`** - Third-party service integrations
2. **`components/growth-marketing-panel.tsx`** - Marketing and business analysis features
3. **`components/debug-panel.tsx`** - Development debugging tools


## **Flow-Specific Component Usage**

### **Hardware Flow Dashboard:**

- **Header**: Mode switcher (3D View ↔ Code View)
- **Left Sidebar**: ChatSidebar (hardware AI endpoint)
- **Right Sidebar**: AppSidebar (project management)
- **Main Panel**: ViewerPanel (3D models) OR CodeViewer (Arduino code)
- **Right Panel**: ParamsPanel (3D controls) OR ComponentsPanel (hardware analysis)


### **Software Flow Dashboard:**

- **Header**: Mode indicator (Preview mode)
- **Left Sidebar**: ChatSidebar (v0 AI endpoint)
- **Right Sidebar**: AppSidebar (project management)
- **Main Panel**: SoftwareViewer (iframe preview with code/preview toggle)
- **Chat Integration**: Embedded ChatPanel for v0 iterations


### **Shared Dashboard Elements:**

- **Authentication**: Session management and user controls
- **Credit System**: Balance tracking and payment integration
- **Project Management**: Creation CRUD operations
- **State Management**: Zustand store for global state
- **Error Handling**: Toast notifications and error boundaries


The dashboard uses a sophisticated component architecture that dynamically switches between hardware and software modes while maintaining consistent navigation and user experience patterns. All components are designed to work together seamlessly, with the main Dashboard component orchestrating the entire experience based on the active creation type and user interactions.