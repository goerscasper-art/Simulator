import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X } from 'lucide-react';
import {
  buildCar3DModel,
  buildMotorcycle3DModel,
  buildHelicopter3DModel,
  buildAirplane3DModel,
} from '../utils/world3DBuilder';
import { VehicleShopType } from './ShopModal';

interface VehiclePreviewModalProps {
  isOpen: boolean;
  vehicleId: string;
  vehicleName: string;
  vehicleData: any; // Using any for simplicity as it varies
  shopType: VehicleShopType;
  onClose: () => void;
}

export const VehiclePreviewModal: React.FC<VehiclePreviewModalProps> = ({
  isOpen,
  vehicleId,
  vehicleName,
  vehicleData,
  shopType,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    const isAircraft = shopType === 'helicopters' || shopType === 'planes';
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, isAircraft ? 3 : 2, isAircraft ? 13 : 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const pixelRatio = Math.min(2.0, Math.max(1.0, dpr));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x202020); // Grey background matching menu

    const canvas = renderer.domElement;
    canvas.style.imageRendering = 'auto';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 8, 5);
    scene.add(directionalLight);

    // Build Model
    let modelGroup: THREE.Group;
    if (shopType === 'cars') {
      const built = buildCar3DModel(vehicleData);
      modelGroup = built.group;
    } else if (shopType === 'motorcycles') {
      const built = buildMotorcycle3DModel(vehicleData);
      modelGroup = built.group;
    } else if (shopType === 'helicopters') {
      const built = buildHelicopter3DModel(vehicleData.style, vehicleData.color, vehicleData.accentColor);
      modelGroup = built.group;
    } else {
      const built = buildAirplane3DModel(vehicleData.style, vehicleData.color, vehicleData.accentColor);
      modelGroup = built.group;
    }
    
    // Center the model so it rotates around its true center
    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    modelGroup.position.sub(center);
    
    // Create a pivot group for rotation
    const pivot = new THREE.Group();
    pivot.add(modelGroup);
    scene.add(pivot);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      pivot.rotation.y += 0.012;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      container.removeChild(canvas);
    };
  }, [isOpen, vehicleData, shopType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-4xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Title Bar */}
        <div className="h-9 bg-white/5 border-b border-white/10 flex items-center justify-between pl-3.5 pr-0 select-none shrink-0">
          <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
            <div className="w-3.5 h-3.5 flex items-center justify-center text-[#0078d4] font-bold">V</div>
            <span className="font-semibold">{vehicleName} — 3D Preview</span>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-full text-[#cccccc] hover:bg-[#e81123] hover:text-white flex items-center justify-center transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 relative min-h-[400px] md:min-h-[500px] bg-[#202020] overflow-hidden">
          <div ref={mountRef} className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    </div>
  );
};
