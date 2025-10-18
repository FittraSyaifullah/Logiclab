import { useState, useRef, useEffect } from 'react';
import { Settings, Download, Zap, RefreshCw, Copy, FileDown, Eye, Wrench, Clock, DollarSign, CheckCircle2, Code2, Send, MessageSquare, ChevronLeft, LogOut, Menu } from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Slider } from './components/ui/slider';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import drumImage from 'figma:asset/814f3b355c012b85870491848e099a59580e88d0.png';

export default function App() {
  const [view, setView] = useState<'chat' | 'preview' | 'settings'>('chat');
  const [selectedCategory, setSelectedCategory] = useState('3d-components');
  const [selectedPart, setSelectedPart] = useState('drum-assembly');
  const [drumDiameter, setDrumDiameter] = useState([135]);
  const [drumHeight, setDrumHeight] = useState([116]);
  const [message, setMessage] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsSidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (settingsSidebarRef.current && !settingsSidebarRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Don't close if clicking the menu button
        if (!target.closest('[data-sidebar-toggle]')) {
          setShowSettingsSidebar(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const categories = [
    { id: '3d-components', label: '3D Components', icon: '📦' },
    { id: 'assembly-parts', label: 'Assembly & Parts', icon: '🔧' },
    { id: 'firmware-code', label: 'Firmware & Code', icon: '💻' },
    { id: 'quote', label: 'Get a Quote', icon: '💰' },
  ];

  const parts = [
    { id: 'drum-assembly', label: 'Drum Assembly', icon: '🔩' },
    { id: 'drum-housing', label: 'Drum Housing', icon: '⚙️' },
    { id: 'front-door', label: 'Front Door with Hinges', icon: '🚪' },
    { id: 'motor-mount', label: 'Motor Mount Bracket', icon: '🔨' },
    { id: 'control-panel', label: 'Control Panel Mockup', icon: '📱' },
  ];

  const partDetails = {
    'drum-assembly': {
      name: 'Drum Assembly',
      description: 'Cylindrical drum with perforations for water drainage, central axle for mounting, and end caps. Designed to rotate within the housing.',
      printTime: '6-8 hours',
      material: 'PETG',
      support: 'Minimal for end caps only',
      status: 'Ready to preview',
      statusTime: 'Updated 12:57:28 PM',
    },
  };

  const currentPart = partDetails[selectedPart as keyof typeof partDetails] || partDetails['drum-assembly'];

  const chatMessages = [
    {
      id: 1,
      type: 'user' as const,
      text: 'Create a washing machine prototype with 3D printable parts',
    },
    {
      id: 2,
      type: 'assistant' as const,
      text: 'I\'ll help you create a washing machine prototype! Here\'s what I\'ll generate:',
      bullets: [
        'Drum assembly with perforations',
        'Drum housing structure',
        'Front door with hinges',
        'Motor mount bracket',
        'Control panel mockup',
      ]
    },
    {
      id: 3,
      type: 'assistant' as const,
      text: 'Let me build this:',
      status: 'Building 3D Components...'
    }
  ];

  if (view === 'settings') {
    return (
      <div className="h-screen flex flex-col bg-white max-w-[412px] mx-auto relative">
        {/* Settings Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setView('chat')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl">Settings</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 ml-auto"
            onClick={() => setShowSettingsSidebar(!showSettingsSidebar)}
            data-sidebar-toggle
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Collapsible Sidebar */}
          {showSettingsSidebar && (
            <div 
              ref={settingsSidebarRef}
              className="absolute left-0 top-0 bottom-0 w-48 border-r bg-gray-50 z-10 shadow-lg"
            >
              <div className="p-2">
                <p className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wide">Workspace</p>
                <button className="w-full text-left px-3 py-2 text-sm bg-blue-100 text-blue-900 rounded-lg">
                  Billing
                </button>
              </div>
            </div>
          )}

          {/* Billing Content */}
          <div className="flex-1 overflow-y-auto w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl mb-1">Credit Balance</h2>
                  <p className="text-sm text-gray-600">
                    Your daily credits reset at <span className="text-blue-600">12:00 UTC</span>. If you run out of credits, you can pay-as-you-go.
                  </p>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Buy Credits
                </Button>
              </div>

              <div className="border rounded-lg p-6 mb-6">
                <div className="flex gap-6">
                  <div className="bg-gray-900 text-white rounded-xl p-6 flex-shrink-0 w-64 h-40 flex flex-col justify-end">
                    <p className="text-3xl mb-1">$23.00</p>
                    <p className="text-sm text-gray-400">hello-8075</p>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gifted Credits</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Monthly Credits</span>
                      <span>$0.00 / $20.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Purchased Credits</span>
                      <span>$23.00</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span>Total Available Credits</span>
                      <span>$23.00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Auto-recharge is <span className="text-green-600">enabled</span>. Add $40.00 when purchased credits falls below $10.00
                </p>
                <Button variant="outline" size="sm">
                  Modify
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'chat') {
    return (
      <div className="h-screen flex flex-col bg-white max-w-[412px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div className="w-6 h-6 bg-blue-500 rounded" />
            </Button>
            <h1 className="text-lg">Washing Machine Prototype</h1>
          </div>
          <div className="relative" ref={settingsMenuRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            {/* Settings Dropdown Menu */}
            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-lg shadow-lg py-2 z-50">
                <button 
                  onClick={() => {
                    setView('settings');
                    setShowSettingsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button 
                  onClick={() => {
                    setShowSettingsMenu(false);
                    // Handle logout
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                {msg.bullets && (
                  <ul className="mt-2 space-y-1">
                    {msg.bullets.map((bullet, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-gray-500">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {msg.status && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    <span>{msg.status}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chat/Preview Toggle */}
        <div className="px-4 pt-3 pb-2 border-t bg-white">
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => setView('chat')}
              className={`px-6 py-2 rounded-full text-sm transition-colors ${
                view === 'chat'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setView('preview')}
              className={`px-6 py-2 rounded-full text-sm transition-colors ${
                view === 'preview'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Input Area */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about your project..."
                className="pr-4 py-6 rounded-xl border-gray-300"
              />
            </div>
            <Button 
              size="icon" 
              className="h-12 w-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Category Selector */}
          <div className="mb-2">
            <select className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white">
              <option>📦 3D Components</option>
              <option>🔧 Assembly & Parts</option>
              <option>💻 Firmware & Code</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white max-w-[412px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <div className="w-6 h-6 bg-blue-500 rounded" />
          </Button>
          <Badge variant="secondary" className="gap-1 bg-orange-500 text-white border-0">
            <Zap className="w-3 h-3" />
            {selectedCategory === '3d-components' && '3D View'}
            {selectedCategory === 'assembly-parts' && 'Assembly'}
            {selectedCategory === 'firmware-code' && 'Code'}
            {selectedCategory === 'quote' && 'Quote'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1">
            <Download className="w-4 h-4" />
            Share
          </Button>
          <div className="relative" ref={settingsMenuRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            {/* Settings Dropdown Menu */}
            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-lg shadow-lg py-2 z-50">
                <button 
                  onClick={() => {
                    setView('settings');
                    setShowSettingsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button 
                  onClick={() => {
                    setShowSettingsMenu(false);
                    // Handle logout
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Tab Row - Categories */}
      <div className="border-b bg-white">
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors
                ${selectedCategory === category.id 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
            >
              <span>{category.icon}</span>
              <span className="text-sm">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {selectedCategory === '3d-components' && (
          <>
            {/* Title Section */}
            <div className="p-4 border-b">
              <h1 className="mb-1">3D Printable Components</h1>
              <p className="text-gray-600 text-sm">
                AI-generated components broken down into printable parts
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <div>
                  <span className="text-gray-600">5 Parts</span>
                </div>
                <div>
                  <span className="text-gray-600">$ Estimated material varies</span>
                </div>
              </div>
            </div>

            {/* Bottom Tab Row - Parts */}
            <div className="border-b bg-white">
              <div className="px-4 py-3">
                <p className="text-sm mb-3">▸ Detailed component breakdown</p>
                <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-1">
                  {parts.map((part) => (
                    <button
                      key={part.id}
                      onClick={() => setSelectedPart(part.id)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors
                        ${selectedPart === part.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}
                      `}
                    >
                      <span>{part.icon}</span>
                      <span className="text-sm">{part.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 3D Components View */}
        {selectedCategory === '3d-components' && (
        <div className="p-4">
          {/* 3D Preview Area */}
          <div className="aspect-[16/10] bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
            <img 
              src={drumImage} 
              alt="Drum Assembly 3D View" 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-gray-700/80 backdrop-blur-sm px-3 py-1.5 rounded text-white text-sm">
              Drum Assembly
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white h-8 px-3">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            {/* 3D Axis indicator */}
            <div className="absolute bottom-12 right-3 flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-white bg-blue-500 px-1.5 py-0.5 rounded">Y</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-white bg-green-500 px-1.5 py-0.5 rounded">Z</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-white bg-red-500 px-1.5 py-0.5 rounded">X</span>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="bg-gray-900 text-white rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-xl">{currentPart.name}</h2>
              <Badge variant="secondary" className="bg-green-600 text-white gap-1 border-0">
                <div className="w-2 h-2 bg-green-300 rounded-full" />
                Ready to preview
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-3">{currentPart.statusTime}</p>
            
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              {currentPart.description}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-black/40 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">PRINT TIME</p>
                <p className="text-sm">{currentPart.printTime}</p>
              </div>
              <div className="bg-black/40 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">MATERIAL</p>
                <p className="text-sm">{currentPart.material}</p>
              </div>
              <div className="bg-black/40 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">SUPPORTS</p>
                <p className="text-sm text-xs leading-tight">{currentPart.support}</p>
              </div>
            </div>

            {/* Parameters Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm">Parameters</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
              
              {/* Drum Diameter Slider */}
              <div className="mb-6">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-sm mb-1">drum_diameter</p>
                    <p className="text-xs text-gray-500">ADJUST MM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{drumDiameter[0]}.00</span>
                    <span className="text-xs text-blue-400 bg-blue-950 px-2 py-1 rounded">MM</span>
                  </div>
                </div>
                <Slider 
                  value={drumDiameter}
                  onValueChange={setDrumDiameter}
                  min={0}
                  max={200}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0.00</span>
                  <span>200.00</span>
                </div>
              </div>

              {/* Drum Height Slider */}
              <div>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-sm mb-1">drum_height</p>
                    <p className="text-xs text-gray-500">ADJUST MM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{drumHeight[0]}.00</span>
                    <span className="text-xs text-blue-400 bg-blue-950 px-2 py-1 rounded">MM</span>
                  </div>
                </div>
                <Slider 
                  value={drumHeight}
                  onValueChange={setDrumHeight}
                  min={0}
                  max={200}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0.00</span>
                  <span>200.00</span>
                </div>
              </div>
            </div>

            {/* 3D Generation Prompt Section */}
            <div className="border-t border-gray-800 pt-6">
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-blue-200">3D GENERATION PROMPT</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Cylindrical drum for <span className="text-white">washing machine prototype</span>, overall dimensions <span className="text-white">100×100×80 mm</span>; features include: evenly spaced <span className="text-white">5mm perforations</span> across the side walls, two <span className="text-white">10mm diameter axle holes</span> at each end, ribbed reinforcement along the length, and a removable end cap with snap-fit tabs; critical elements must include: axle mounts, perforations, snap-fit end cap; style: functional, geometric; material appearance: matte, lightly textured; printability: print on end face, minimal supports, <span className="text-white">2mm wall thickness</span>, <span className="text-white">0.2mm clearance</span> for axle.
                </p>
              </div>

              {/* Manufacturing Notes */}
              <div className="bg-black/40 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400 leading-relaxed">
                  Print in PETG for water resistance, 2mm wall thickness, 0.2mm layer height, print on end face for strength, minimal supports required. Insert metal or plastic axle through drum, secure end caps with snap-fit or M3 screws. Ensure smooth rotation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Wrench className="w-4 h-4 mr-2" />
                  Generate 3D Model
                </Button>
                <Button variant="outline" className="bg-white text-gray-900 border-0 hover:bg-gray-100">
                  <FileDown className="w-4 h-4 mr-2" />
                  Download STL
                </Button>
                <Button variant="outline" className="bg-gray-700 text-white border-0 hover:bg-gray-600">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Model
                </Button>
                <Button variant="outline" className="bg-white text-gray-900 border-0 hover:bg-gray-100">
                  <FileDown className="w-4 h-4 mr-2" />
                  Download SCAD
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Assembly & Parts View */}
        {selectedCategory === 'assembly-parts' && (
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="mb-1">AI-Generated Assembly Instructions</h1>
                <p className="text-blue-600 text-sm">Step-by-step build guide with complete bill of materials</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">~2-3 hours build</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">~$35 total cost</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm"><span className="text-green-800">AI safety analysis:</span> This project uses low voltage components and is beginner-safe.</p>
            </div>
            <Badge variant="secondary" className="bg-green-600 text-white border-0 text-xs">AI Verified Safe</Badge>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              The washing machine prototype consists of a rotating drum mounted inside a box-shaped housing, driven by a small DC motor via a motor mount bracket. The front door provides access to the drum, and a simple control panel mockup allows for basic user interaction. All electronic and mechanical components are off-the-shelf for ease of assembly.
            </p>

            <div className="space-y-2 text-sm">
              <p className="text-gray-900"><span className="mr-2">1.</span>Print all 3D components as specified.</p>
              <p className="text-gray-900"><span className="mr-2">2.</span>Insert bearings into drum housing rear panel.</p>
              <p className="text-gray-900"><span className="mr-2">3.</span>Assemble drum with axle and end caps, insert into housing, ensuring smooth rotation.</p>
              <p className="text-gray-900"><span className="mr-2">4.</span>Attach motor to motor mount bracket, align with drum axle, secure with screws.</p>
              <p className="text-gray-900"><span className="mr-2">5.</span>Attach front door to housing using hinges and latch.</p>
              <p className="text-gray-900"><span className="mr-2">6.</span>Mount control panel to housing, insert buttons and LEDs.</p>
              <p className="text-gray-900"><span className="mr-2">7.</span>Wire motor, buttons, and LEDs to Arduino Nano according to schematic.</p>
              <p className="text-gray-900"><span className="mr-2">8.</span>Connect power supply and upload firmware.</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              • Ensure all wiring is insulated and secure. • Do not operate with wet hands or near water. • Verify motor voltage matches power supply. • Check all moving parts for smooth operation and no pinch points. • Print parts with ≥2mm wall thickness for durability. • Test electronics with low voltage before full operation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white w-full">
              <FileDown className="w-4 h-4 mr-2" />
              Download Complete Assembly Guide (PDF)
            </Button>
            <Button variant="outline" className="w-full border-gray-300">
              <Eye className="w-4 h-4 mr-2" />
              View Interactive Assembly Guide
            </Button>
          </div>
        </div>
        )}

        {/* Firmware & Code View */}
        {selectedCategory === 'firmware-code' && (
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h1 className="mb-1">AI-Generated Firmware & Code</h1>
                <p className="text-blue-600 text-sm">Ready-to-flash code with pin mappings and test routines</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-0">Arduino Nano</Badge>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-0">C++ (Arduino IDE)</Badge>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2 mb-3">
              <Code2 className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm mb-1"><span className="text-gray-900">Programming Language:</span> C++ (Arduino IDE) | <span className="text-gray-900">Platform:</span> Arduino Nano</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              This code provides basic control for the washing machine prototype using three buttons (Start, Stop, Spin) and two LEDs (Power, Running). The motor is controlled via a digital output. Pressing Start or Spin turns on the drum (motor), and Stop halts it. The Spin button simulates a timed spin cycle.
            </p>
          </div>

          <div className="bg-gray-900 text-gray-300 rounded-lg p-4 mb-4 overflow-x-auto">
            <pre className="text-xs leading-relaxed">
              <code>{`// Simple washing machine prototype control
// Buttons: Start, Stop, Spin
// LEDs: Power, Running

#define BUTTON_START 2
#define BUTTON_STOP 3
#define BUTTON_SPIN 4
#define LED_POWER 5
#define LED_RUNNING 6
#define MOTOR_PIN 9

void setup() {
  pinMode(BUTTON_START, INPUT_PULLUP);
  pinMode(BUTTON_STOP, INPUT_PULLUP);
  pinMode(BUTTON_SPIN, INPUT_PULLUP);
  pinMode(LED_POWER, OUTPUT);
  pinMode(LED_RUNNING, OUTPUT);
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(LED_POWER, HIGH); // Power LED always on
  digitalWrite(LED_RUNNING, LOW);
  digitalWrite(MOTOR_PIN, LOW);
}

void loop() {
  if (digitalRead(BUTTON_START) == LOW) {
    digitalWrite(LED_RUNNING, HIGH);
    digitalWrite(MOTOR_PIN, HIGH);
    delay(200);
  }
  
  if (digitalRead(BUTTON_STOP) == LOW) {
    digitalWrite(LED_RUNNING, LOW);
    digitalWrite(MOTOR_PIN, LOW);
    delay(200);
  }
  
  if (digitalRead(BUTTON_SPIN) == LOW) {
    digitalWrite(LED_RUNNING, HIGH);
    digitalWrite(MOTOR_PIN, HIGH);
    delay(5000); // 5 second spin
    digitalWrite(LED_RUNNING, LOW);
    digitalWrite(MOTOR_PIN, LOW);
  }
}`}</code>
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
            <Button className="bg-gray-900 hover:bg-gray-800 text-white">
              <FileDown className="w-4 h-4 mr-2" />
              Download .ino
            </Button>
          </div>
        </div>
        )}

        {/* Get a Quote View */}
        {selectedCategory === 'quote' && (
        <div className="p-4">
          <div className="mb-6">
            <h1 className="mb-1">Get a Manufacturing Quote</h1>
            <p className="text-gray-600 text-sm">
              Request pricing for 3D printing and assembly services
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm mb-2 block">Project Name</label>
              <Input placeholder="Washing Machine Prototype" className="w-full" />
            </div>

            <div>
              <label className="text-sm mb-2 block">Quantity</label>
              <Input type="number" placeholder="1" className="w-full" />
            </div>

            <div>
              <label className="text-sm mb-2 block">Material Preference</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option>PETG (Recommended)</option>
                <option>PLA</option>
                <option>ABS</option>
                <option>Nylon</option>
              </select>
            </div>

            <div>
              <label className="text-sm mb-2 block">Services Required</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">3D Printing</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Assembly</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Electronics Integration</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Testing & QA</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm mb-2 block">Shipping Address</label>
              <Textarea placeholder="Enter your shipping address" className="w-full" rows={3} />
            </div>

            <div>
              <label className="text-sm mb-2 block">Additional Notes</label>
              <Textarea placeholder="Any special requirements or questions?" className="w-full" rows={3} />
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <h3 className="mb-3">Estimated Cost Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">3D Printing (5 parts)</span>
                <span>$25.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assembly Labor</span>
                <span>$15.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping (Standard)</span>
                <span>$8.00</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                <span>Total Estimate</span>
                <span>$48.00</span>
              </div>
            </div>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Send className="w-4 h-4 mr-2" />
            Request Quote
          </Button>
        </div>
        )}
      </div>

      {/* Chat/Preview Toggle - Fixed at Bottom */}
      <div className="px-4 pt-3 pb-2 border-t bg-white">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setView('chat')}
            className={`px-6 py-2 rounded-full text-sm transition-colors ${
              view === 'chat'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setView('preview')}
            className={`px-6 py-2 rounded-full text-sm transition-colors ${
              view === 'preview'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
