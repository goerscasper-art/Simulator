import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, RotateCcw, Shuffle, User, Shirt, Glasses, Sliders } from 'lucide-react';
import { CustomCharacterConfig, ResolutionScale } from '../types/housesim';
import { DEFAULT_CUSTOM_CHARACTER } from '../data/catalog';
import { buildHumanCharacter3D } from '../utils/world3DBuilder';
import { calculateCappedPixelRatio } from './VirtualHouseCanvas';

interface CharacterCustomizerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  config: CustomCharacterConfig;
  onChange: (newConfig: CustomCharacterConfig) => void;
  onBack?: () => void;
  onCloseAll?: () => void;
  performanceMode?: boolean;
  resolutionScale?: ResolutionScale;
}

export const calculateCustomizerPixelRatio = (
  _containerHeight: number,
  isPerf: boolean = true,
  scale?: ResolutionScale
): number => {
  // Match the character in the character customizer to the exact same pixelation as in the game from equivalent distance
  return calculateCappedPixelRatio(isPerf, scale);
};

const SKIN_SWATCHES = [
  '#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#a56b46',
  '#8d5524', '#6b3e26', '#4a2912', '#fde6d8', '#d2996c',
];

const HAIR_SWATCHES = [
  '#090d16', '#1e1b18', '#451a03', '#78350f', '#b45309',
  '#facc15', '#dc2626', '#9333ea', '#2563eb', '#e2e8f0',
];

const EYE_SWATCHES = [
  '#2563eb', '#16a34a', '#78350f', '#090d16', '#d97706',
  '#9333ea', '#dc2626', '#06b6d4',
];

const CLOTHING_SWATCHES = [
  '#2563eb', '#dc2626', '#16a34a', '#0f172a', '#f8fafc',
  '#eab308', '#9333ea', '#ea580c', '#0d9488', '#475569',
];

export const CharacterCustomizerModal: React.FC<CharacterCustomizerModalProps> = ({
  isOpen = true,
  onClose,
  config,
  onChange,
  onBack,
  onCloseAll,
  performanceMode = true,
  resolutionScale = 'low',
}) => {
  const closeFn = onClose || onCloseAll || onBack || (() => {});
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const characterHolderRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotationYRef = useRef<number>(0.35);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);

  const [activeSection, setActiveSection] = useState<'head' | 'outfit' | 'accessories' | 'body'>('head');

  const updateField = <K extends keyof CustomCharacterConfig>(
    key: K,
    value: CustomCharacterConfig[K]
  ) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  const handleRandomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    onChange({
      skinColor: pick(SKIN_SWATCHES),
      hairStyle: pick(['short', 'long', 'mohawk', 'afro', 'ponytail', 'bald']),
      hairColor: pick(HAIR_SWATCHES),
      eyeColor: pick(EYE_SWATCHES),
      facialHair: pick(['none', 'none', 'stubble', 'beard', 'mustache', 'goatee']),
      topStyle: pick(['tshirt', 'jacket', 'tanktop']),
      topColor: pick(CLOTHING_SWATCHES),
      secondaryTopColor: pick(CLOTHING_SWATCHES),
      pantsStyle: pick(['pants', 'dress', 'shorts']),
      pantsColor: pick(CLOTHING_SWATCHES),
      shoeColor: pick(CLOTHING_SWATCHES),
      hatStyle: pick(['none', 'none', 'cap', 'beanie', 'tophat', 'cowboy', 'crown']),
      hatColor: pick(CLOTHING_SWATCHES),
      glassesStyle: pick(['none', 'none', 'sunglasses', 'reading', 'visor']),
      glassesColor: pick(CLOTHING_SWATCHES),
      accessory: pick(['none', 'none', 'backpack', 'cape', 'purse']),
      accessoryColor: pick(CLOTHING_SWATCHES),
      heightScale: Number((0.92 + Math.random() * 0.2).toFixed(2)),
      widthScale: Number((0.92 + Math.random() * 0.22).toFixed(2)),
    });
  };

  // Initialize 3D Live Character Preview Stage
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ab8f5);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.15, 3.25);
    camera.lookAt(0, 0.98, 0);
    cameraRef.current = camera;

    const isPerf = Boolean(performanceMode);
    const customizerPR = calculateCustomizerPixelRatio(height, isPerf, resolutionScale);

    const isSmooth = resolutionScale === 'high' || resolutionScale === 'balanced';
    const renderer = new THREE.WebGLRenderer({
      antialias: isSmooth,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(customizerPR);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;

    const canvas = renderer.domElement;
    if (isSmooth) {
      canvas.style.imageRendering = 'auto';
      canvas.style.setProperty('image-rendering', 'auto');
      canvas.classList.remove('pixelated-canvas');
    } else {
      canvas.style.imageRendering = 'pixelated';
      canvas.style.setProperty('image-rendering', 'pixelated');
      canvas.style.setProperty('image-rendering', '-moz-crisp-edges');
      canvas.style.setProperty('image-rendering', 'crisp-edges');
      canvas.classList.add('pixelated-canvas');
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    container.innerHTML = '';
    container.appendChild(canvas);

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // Character floats freely in nothingness with sky background (no round pedestal / ring)
    const holder = new THREE.Group();
    scene.add(holder);
    characterHolderRef.current = holder;

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (holder) {
        if (!isDraggingRef.current) {
          rotationYRef.current += 0.0045;
        }
        holder.rotation.y = rotationYRef.current;
        holder.position.y = Math.sin(t * 2.2) * 0.012;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const updatedPR = calculateCustomizerPixelRatio(h, Boolean(performanceMode), resolutionScale);
      renderer.setPixelRatio(updatedPR);
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [performanceMode, resolutionScale]);

  // Rebuild 3D Character whenever any config field changes
  useEffect(() => {
    const holder = characterHolderRef.current;
    if (!holder) return;
    while (holder.children.length > 0) {
      holder.remove(holder.children[0]);
    }
    const built = buildHumanCharacter3D(config);
    holder.add(built.group);

    const camera = cameraRef.current;
    if (camera) {
      const hScale = Math.max(0.5, Math.min(2.0, config.heightScale || 1.0));
      const wScale = Math.max(0.2, Math.min(2.0, config.widthScale || 1.0));
      const targetDist = 2.9 + Math.max(0, hScale - 1.0) * 1.5 + Math.max(0, wScale - 1.0) * 0.9;
      const targetY = 0.92 * hScale;
      camera.position.set(0, targetY, Math.max(3.2, targetDist));
      camera.lookAt(0, targetY * 0.9, 0);
    }
  }, [config]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 select-none cursor-default transition-all animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Consistent Submenu Title Bar */}
        <div className="h-9 bg-white/5 border-b border-white/10 flex items-center justify-between pl-3.5 pr-0 select-none shrink-0">
          <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
            <User className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>Character Customizer</span>
          </div>
          <div className="flex items-center h-full">
            <button
              onClick={onBack || closeFn}
              title="Back to Menu"
              className="h-full px-3 text-[#cccccc] hover:bg-white/10 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={onCloseAll || closeFn}
              title="Close (Esc)"
              className="w-11 h-full text-[#cccccc] hover:bg-[#e81123] hover:text-white flex items-center justify-center transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Two-Column Content: Left 3D Live Preview | Right Individual Controls */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-transparent">
          {/* Left Column: Interactive 3D Character Turntable */}
          <div className="md:col-span-5 bg-black/10 backdrop-blur-md border-r border-white/5 flex flex-col justify-between p-4 relative">
            <div className="flex items-center justify-between z-10">
              <span className="text-[11px] uppercase tracking-wider text-[#a0a0a0] font-semibold">
                3D Character Preview
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRandomize}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-[4px] text-[11px] text-[#f3f3f3] font-semibold flex items-center gap-1 transition-all"
                  title="Randomize Individual Parts"
                >
                  <Shuffle className="w-3 h-3 text-[#60cdff]" />
                  Randomize
                </button>
                <button
                  onClick={() => onChange(DEFAULT_CUSTOM_CHARACTER)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-[4px] text-[11px] text-[#f3f3f3] font-semibold flex items-center gap-1 transition-all"
                  title="Reset Character"
                >
                  <RotateCcw className="w-3 h-3 text-[#60cdff]" />
                  Reset
                </button>
              </div>
            </div>

            <div
              ref={previewContainerRef}
              onMouseDown={(e) => {
                isDraggingRef.current = true;
                lastMouseXRef.current = e.clientX;
              }}
              onMouseMove={(e) => {
                if (!isDraggingRef.current) return;
                const dx = e.clientX - lastMouseXRef.current;
                lastMouseXRef.current = e.clientX;
                rotationYRef.current += dx * 0.012;
              }}
              onMouseUp={() => {
                isDraggingRef.current = false;
              }}
              onMouseLeave={() => {
                isDraggingRef.current = false;
              }}
              className="w-full flex-1 cursor-grab active:cursor-grabbing mt-3 rounded-[4px] border border-[#2e2e2e] bg-[#7ab8f5] overflow-hidden pixelated-canvas [image-rendering:pixelated]"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Right Column: Individual Attribute Editors */}
          <div className="md:col-span-7 flex flex-col overflow-hidden bg-transparent">
            {/* Category Tabs */}
            <div className="grid grid-cols-4 border-b border-white/10 bg-white/5 shrink-0">
              <button
                onClick={() => setActiveSection('head')}
                className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeSection === 'head'
                    ? 'border-[#0078d4] bg-white/10 text-[#f3f3f3]'
                    : 'border-transparent text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-white/5'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#60cdff]" />
                Head & Hair
              </button>
              <button
                onClick={() => setActiveSection('outfit')}
                className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeSection === 'outfit'
                    ? 'border-[#0078d4] bg-white/10 text-[#f3f3f3]'
                    : 'border-transparent text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-white/5'
                }`}
              >
                <Shirt className="w-3.5 h-3.5 text-[#60cdff]" />
                Top, Pants & Shoes
              </button>
              <button
                onClick={() => setActiveSection('accessories')}
                className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeSection === 'accessories'
                    ? 'border-[#0078d4] bg-white/10 text-[#f3f3f3]'
                    : 'border-transparent text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-white/5'
                }`}
              >
                <Glasses className="w-3.5 h-3.5 text-[#60cdff]" />
                Hats, Glasses & Gear
              </button>
              <button
                onClick={() => setActiveSection('body')}
                className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeSection === 'body'
                    ? 'border-[#0078d4] bg-white/10 text-[#f3f3f3]'
                    : 'border-transparent text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-white/5'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-[#60cdff]" />
                Body Build
              </button>
            </div>

            {/* Scrollable Controls Area */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-transparent">
              {activeSection === 'head' && (
                <>
                  {/* Skin Tone */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                        1. Skin Tone
                      </span>
                      <input
                        type="color"
                        value={config.skinColor}
                        onChange={(e) => updateField('skinColor', e.target.value)}
                        className="w-7 h-6 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                        title="Pick Custom Skin Color"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SKIN_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => updateField('skinColor', hex)}
                          className={`w-7 h-7 rounded-[4px] border-2 transition-transform ${
                            config.skinColor.toLowerCase() === hex.toLowerCase()
                              ? 'border-[#0078d4] scale-110'
                              : 'border-[#3d3d3d] hover:scale-105'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hair Style */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] block mb-2.5">
                      2. Hair Style
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'short', label: 'Short Cut' },
                          { id: 'long', label: 'Long Flowing' },
                          { id: 'mohawk', label: 'Spiked Mohawk' },
                          { id: 'afro', label: 'Rounded Afro' },
                          { id: 'ponytail', label: 'Ponytail' },
                          { id: 'bald', label: 'Clean Shaven / Bald' },
                        ] as const
                      ).map((h) => (
                        <button
                          key={h.id}
                          onClick={() => updateField('hairStyle', h.id)}
                          className={`py-2 px-2.5 text-xs font-semibold border rounded-[4px] text-left transition-colors ${
                            config.hairStyle === h.id
                              ? 'bg-[#0078d4] border-[#0078d4] text-white'
                              : 'bg-white/5 border border-white/10 text-[#f3f3f3] hover:bg-white/10 transition-all'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Color */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                        3. Hair & Beard Color
                      </span>
                      <input
                        type="color"
                        value={config.hairColor}
                        onChange={(e) => updateField('hairColor', e.target.value)}
                        className="w-7 h-6 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {HAIR_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => updateField('hairColor', hex)}
                          className={`w-7 h-7 rounded-[4px] border-2 transition-transform ${
                            config.hairColor.toLowerCase() === hex.toLowerCase()
                              ? 'border-[#0078d4] scale-110'
                              : 'border-[#3d3d3d] hover:scale-105'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Facial Hair */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] block mb-2.5">
                      4. Facial Hair
                    </span>
                    <div className="grid grid-cols-5 gap-2">
                      {(
                        [
                          { id: 'none', label: 'Clean' },
                          { id: 'stubble', label: 'Stubble' },
                          { id: 'beard', label: 'Full Beard' },
                          { id: 'mustache', label: 'Mustache' },
                          { id: 'goatee', label: 'Goatee' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => updateField('facialHair', f.id)}
                          className={`py-2 px-2 text-xs font-semibold border rounded-[4px] text-center transition-colors ${
                            config.facialHair === f.id
                              ? 'bg-[#0078d4] border-[#0078d4] text-white'
                              : 'bg-white/5 border border-white/10 text-[#f3f3f3] hover:bg-white/10 transition-all'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eye Color */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                        5. Eye Iris Color
                      </span>
                      <input
                        type="color"
                        value={config.eyeColor}
                        onChange={(e) => updateField('eyeColor', e.target.value)}
                        className="w-7 h-6 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {EYE_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => updateField('eyeColor', hex)}
                          className={`w-7 h-7 rounded-[4px] border-2 transition-transform ${
                            config.eyeColor.toLowerCase() === hex.toLowerCase()
                              ? 'border-[#0078d4] scale-110'
                              : 'border-[#3d3d3d] hover:scale-105'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'outfit' && (
                <>
                  {/* Top Style */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] block mb-2.5">
                      1. Top / Shirt Style
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'jacket', label: 'Jacket' },
                          { id: 'tshirt', label: 'T-Shirt' },
                          { id: 'tanktop', label: 'Tank Top' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => updateField('topStyle', t.id)}
                          className={`py-2 px-2 text-xs font-semibold border rounded-[4px] text-center transition-colors ${
                            config.topStyle === t.id
                              ? 'bg-[#0078d4] border-[#0078d4] text-white'
                              : 'bg-white/5 border border-white/10 text-[#f3f3f3] hover:bg-white/10 transition-all'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Top Color */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                        2. Primary Top Color
                      </span>
                      <input
                        type="color"
                        value={config.topColor}
                        onChange={(e) => updateField('topColor', e.target.value)}
                        className="w-7 h-6 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CLOTHING_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => updateField('topColor', hex)}
                          className={`w-7 h-7 rounded-[4px] border-2 transition-transform ${
                            config.topColor.toLowerCase() === hex.toLowerCase()
                              ? 'border-[#0078d4] scale-110'
                              : 'border-[#3d3d3d] hover:scale-105'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Pants / Dress Style */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] block mb-2.5">
                      3. Bottom Style
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'pants', label: 'Pants' },
                          { id: 'dress', label: 'Dress' },
                          { id: 'shorts', label: 'Shorts' },
                        ] as const
                      ).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => updateField('pantsStyle', p.id)}
                          className={`py-2 px-2 text-xs font-semibold border rounded-[4px] text-center transition-colors ${
                            config.pantsStyle === p.id ||
                            (p.id === 'pants' && (config.pantsStyle === 'jeans' || config.pantsStyle === 'cargo')) ||
                            (p.id === 'dress' && config.pantsStyle === 'slacks')
                              ? 'bg-[#0078d4] border-[#0078d4] text-white'
                              : 'bg-white/5 border border-white/10 text-[#f3f3f3] hover:bg-white/10 transition-all'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pants & Shoe Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                          4. Pants / Dress Color
                        </span>
                        <input
                          type="color"
                          value={config.pantsColor}
                          onChange={(e) => updateField('pantsColor', e.target.value)}
                          className="w-7 h-6 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CLOTHING_SWATCHES.map((hex) => (
                          <button
                            key={hex}
                            onClick={() => updateField('pantsColor', hex)}
                            className={`w-6 h-6 rounded-[4px] border-2 ${
                              config.pantsColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-[#0078d4] scale-110'
                                : 'border-[#3d3d3d]'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                          5. Sneaker / Shoe Color
                        </span>
                        <input
                          type="color"
                          value={config.shoeColor}
                          onChange={(e) => updateField('shoeColor', e.target.value)}
                          className="w-7 h-6 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CLOTHING_SWATCHES.map((hex) => (
                          <button
                            key={hex}
                            onClick={() => updateField('shoeColor', hex)}
                            className={`w-6 h-6 rounded-[4px] border-2 ${
                              config.shoeColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-[#0078d4] scale-110'
                                : 'border-[#3d3d3d]'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'accessories' && (
                <>
                  {/* Hat Style */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] block mb-2.5">
                      1. Headwear / Hat Style
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'none', label: 'No Hat' },
                          { id: 'cap', label: 'Baseball Cap' },
                          { id: 'beanie', label: 'Knit Beanie' },
                          { id: 'tophat', label: 'Silk Top Hat' },
                          { id: 'cowboy', label: 'Cowboy Hat' },
                          { id: 'crown', label: 'Royal Crown' },
                        ] as const
                      ).map((hat) => (
                        <button
                          key={hat.id}
                          onClick={() => updateField('hatStyle', hat.id)}
                          className={`py-2 px-2.5 text-xs font-semibold border rounded-[4px] text-left transition-colors ${
                            config.hatStyle === hat.id
                              ? 'bg-[#0078d4] border-[#0078d4] text-white'
                              : 'bg-white/5 border border-white/10 text-[#f3f3f3] hover:bg-white/10 transition-all'
                          }`}
                        >
                          {hat.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2e2e2e]">
                      <span className="text-[11px] text-[#a0a0a0]">Hat Primary Color</span>
                      <div className="flex items-center gap-1.5">
                        {CLOTHING_SWATCHES.slice(0, 6).map((hex) => (
                          <button
                            key={hex}
                            onClick={() => updateField('hatColor', hex)}
                            className={`w-5 h-5 rounded-[3px] border ${
                              config.hatColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-[#0078d4] scale-110'
                                : 'border-[#3d3d3d]'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={config.hatColor}
                          onChange={(e) => updateField('hatColor', e.target.value)}
                          className="w-6 h-5 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Eyewear Style */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] block mb-2.5">
                      2. Eyewear / Glasses
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'none', label: 'None' },
                          { id: 'sunglasses', label: 'Aviator Shades' },
                          { id: 'reading', label: 'Round Glasses' },
                          { id: 'visor', label: 'Cyber Visor' },
                        ] as const
                      ).map((g) => (
                        <button
                          key={g.id}
                          onClick={() => updateField('glassesStyle', g.id)}
                          className={`py-2 px-2 text-xs font-semibold border rounded-[4px] text-center transition-colors ${
                            config.glassesStyle === g.id
                              ? 'bg-[#0078d4] border-[#0078d4] text-white'
                              : 'bg-white/5 border border-white/10 text-[#f3f3f3] hover:bg-white/10 transition-all'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2e2e2e]">
                      <span className="text-[11px] text-[#a0a0a0]">Lens / Frame / Visor Color</span>
                      <div className="flex items-center gap-1.5">
                        {['#090d16', '#38bdf8', '#ef4444', '#facc15', '#22c55e', '#a855f7'].map((hex) => (
                          <button
                            key={hex}
                            onClick={() => updateField('glassesColor', hex)}
                            className={`w-5 h-5 rounded-[3px] border ${
                              config.glassesColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-[#0078d4] scale-110'
                                : 'border-[#3d3d3d]'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={config.glassesColor}
                          onChange={(e) => updateField('glassesColor', e.target.value)}
                          className="w-6 h-5 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Back / Neck / Side Gear */}
                  <div className="bg-white/5 p-3.5 border border-white/10 rounded-[4px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] block mb-2.5">
                      3. Gear & Accessories
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'none', label: 'None' },
                          { id: 'backpack', label: 'Backpack' },
                          { id: 'cape', label: 'Hero Cape' },
                          { id: 'purse', label: 'Purse' },
                        ] as const
                      ).map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => updateField('accessory', acc.id)}
                          className={`py-2 px-2 text-xs font-semibold border rounded-[4px] text-center transition-colors ${
                            config.accessory === acc.id || (acc.id === 'purse' && config.accessory === 'chains')
                              ? 'bg-[#0078d4] border-[#0078d4] text-white'
                              : 'bg-white/5 border border-white/10 text-[#f3f3f3] hover:bg-white/10 transition-all'
                          }`}
                        >
                          {acc.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2e2e2e]">
                      <span className="text-[11px] text-[#a0a0a0]">Gear / Purse Accent Color</span>
                      <div className="flex items-center gap-1.5">
                        {CLOTHING_SWATCHES.slice(0, 6).map((hex) => (
                          <button
                            key={hex}
                            onClick={() => updateField('accessoryColor', hex)}
                            className={`w-5 h-5 rounded-[3px] border ${
                              config.accessoryColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-[#0078d4] scale-110'
                                : 'border-[#3d3d3d]'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={config.accessoryColor}
                          onChange={(e) => updateField('accessoryColor', e.target.value)}
                          className="w-6 h-5 bg-transparent cursor-pointer border border-[#3d3d3d] rounded-[2px]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'body' && (
                <>
                  <div className="bg-[#1b1b1b] p-4 border border-[#2e2e2e] rounded-[4px] space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                          1. Height
                        </span>
                        <span className="text-xs font-mono text-[#60cdff]">
                          {Math.round(config.heightScale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={2.0}
                        step={0.01}
                        value={config.heightScale}
                        onChange={(e) => updateField('heightScale', parseFloat(e.target.value))}
                        className="w-full accent-[#0078d4] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                          2. Width
                        </span>
                        <span className="text-xs font-mono text-[#60cdff]">
                          {Math.round(config.widthScale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={2.0}
                        step={0.01}
                        value={config.widthScale}
                        onChange={(e) => updateField('widthScale', parseFloat(e.target.value))}
                        className="w-full accent-[#0078d4] cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
