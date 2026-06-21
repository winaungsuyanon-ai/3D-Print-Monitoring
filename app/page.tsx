'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab         = 'request' | 'print-list' | 'analytics' | 'detail' | 'tooling';
type PrintMat    = 'PLA' | 'ABS' | 'PETG';
type JobStatus   = 'Printing' | 'Waiting';
type AmsSlots    = [string | null, string | null, string | null, string | null];
type RequestType = 'mass' | 'test' | 'external';
type FormMode    = 'piece' | 'set';

interface BomPart {
  id: string; name: string; material: string; color: string;
  timePerPiece: number; weightPerPiece: number; defaultQty: number;
  stlDataUrl: string | null;
}
interface Component  { id: string; name: string; spec: string; qty: number; }
interface ProcessSet { id: string; name: string; description: string; imageUrl: string | null; file3mfUrl: string | null; parts: BomPart[]; components: Component[]; }
function projectType(s: ProcessSet): 'piece' | 'set' {
  return s.parts.length === 1 && s.parts[0].defaultQty === 1 ? 'piece' : 'set';
}
interface Process    { id: string; name: string; description: string; sets: ProcessSet[]; }
interface ActiveBomRow {
  partId: string; name: string; material: string;
  timePerPiece: number; weightPerPiece: number;
  baseQty: number; qty: string;
}

interface PrintJob {
  id: number;
  fileName: string;
  quantity: number;
  timePerPiece: number;
  weight: number;
  material: PrintMat;
  status: JobStatus;
  totalTime: number;
}

interface JobForm {
  fileName: string;
  quantity: string;
  timePerPiece: string;
  weight: string;
  material: PrintMat;
}

interface Filament {
  id: string;
  material: string;
  brand: string;
  colorName: string;
  hexCode: string;
  quantity: number; // integer rolls
  isOpened: boolean; // true = opened/partial spool (in AMS or returned from AMS)
  imageUrl?: string;
}

interface FilamentGroup {
  key: string;
  material: string;
  brand: string;
  colorName: string;
  hexCode: string;
  totalRolls: number;
  openedCount: number;
  ids: string[];
}

interface Machine {
  id: string;
  brand: string;
  model: string;
  specLink: string;
  imageUrl: string;
  hasAMS: boolean;
  amsModel: string;
  amsImageUrl: string;
  amsSlots: AmsSlots;
  externalSpool: string | null;
  buildVolume: { width: number; depth: number; height: number };
  nozzles: string[];
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_PROCESSES: Process[] = [
  {
    id: 'proc1', name: 'Storage Solutions', description: 'Stackable boxes, organizers and containers',
    sets: [
      {
        id: 'bom1', name: 'Toolbox Set v2', description: 'Stackable toolbox with lid, tray and latches', imageUrl: null, file3mfUrl: null,
        components: [
          { id: 'c1', name: 'Hinge', spec: '25mm', qty: 2 },
          { id: 'c2', name: 'Bolt',  spec: 'M3×10', qty: 8 },
        ],
        parts: [
          { id: 'p1', name: 'Main Body',  material: 'PETG', color: '#3b82f6', timePerPiece: 180, weightPerPiece: 95, defaultQty: 1, stlDataUrl: null },
          { id: 'p2', name: 'Lid',        material: 'PETG', color: '#3b82f6', timePerPiece: 120, weightPerPiece: 60, defaultQty: 1, stlDataUrl: null },
          { id: 'p3', name: 'Inner Tray', material: 'PLA+', color: '#a1a1aa', timePerPiece: 90,  weightPerPiece: 45, defaultQty: 1, stlDataUrl: null },
          { id: 'p4', name: 'Latch Hook', material: 'PLA+', color: '#a1a1aa', timePerPiece: 25,  weightPerPiece: 8,  defaultQty: 4, stlDataUrl: null },
        ],
      },
    ],
  },
  {
    id: 'proc2', name: 'Prosthetics & Robotics', description: 'Mechanical assemblies and prosthetic components',
    sets: [
      {
        id: 'bom2', name: 'Mechanical Hand Kit', description: 'Articulated prosthetic hand assembly', imageUrl: null, file3mfUrl: null,
        components: [
          { id: 'c3', name: 'Bolt',   spec: 'M2×8',  qty: 20 },
          { id: 'c4', name: 'Nut',    spec: 'M2',    qty: 20 },
          { id: 'c5', name: 'Spring', spec: '5mm OD', qty: 5 },
        ],
        parts: [
          { id: 'p5', name: 'Palm Body',      material: 'PLA MATTE', color: '#f5f5f4', timePerPiece: 240, weightPerPiece: 110, defaultQty: 1,  stlDataUrl: null },
          { id: 'p6', name: 'Finger Segment', material: 'TPU',       color: '#f5f5f4', timePerPiece: 30,  weightPerPiece: 5,   defaultQty: 14, stlDataUrl: null },
          { id: 'p7', name: 'Thumb Segment',  material: 'TPU',       color: '#f5f5f4', timePerPiece: 35,  weightPerPiece: 6,   defaultQty: 3,  stlDataUrl: null },
          { id: 'p8', name: 'Wrist Joint',    material: 'PLA+',      color: '#18181b', timePerPiece: 60,  weightPerPiece: 20,  defaultQty: 1,  stlDataUrl: null },
        ],
      },
    ],
  },
  {
    id: 'proc3', name: 'Electronics Enclosures', description: 'Modular housings for electronics and PCBs',
    sets: [
      {
        id: 'bom3', name: 'Enclosure Box v3', description: 'Modular electronics enclosure with panels', imageUrl: null, file3mfUrl: null,
        components: [
          { id: 'c6', name: 'Bolt',   spec: 'M3×6',   qty: 12 },
          { id: 'c7', name: 'Nut',    spec: 'M3',     qty: 12 },
          { id: 'c8', name: 'Washer', spec: 'M3',     qty: 12 },
        ],
        parts: [
          { id: 'p9',  name: 'Base Frame',     material: 'ABS',  color: '#18181b', timePerPiece: 210, weightPerPiece: 130, defaultQty: 1, stlDataUrl: null },
          { id: 'p10', name: 'Side Panel',     material: 'ABS',  color: '#18181b', timePerPiece: 150, weightPerPiece: 70,  defaultQty: 2, stlDataUrl: null },
          { id: 'p11', name: 'Corner Bracket', material: 'PLA+', color: '#71717a', timePerPiece: 20,  weightPerPiece: 8,   defaultQty: 4, stlDataUrl: null },
          { id: 'p12', name: 'Cable Gland',    material: 'TPU',  color: '#22c55e', timePerPiece: 15,  weightPerPiece: 4,   defaultQty: 6, stlDataUrl: null },
        ],
      },
    ],
  },
];

const DEFAULT_MAT_TYPES = ['PLA+', 'PLA MATTE', 'PETG', 'PETG-CF', 'ABS', 'TPU'];

const SEED_FILAMENTS: Filament[] = [
  { id: 'f1',  material: 'PLA+',      brand: 'eSUN',      colorName: 'White',        hexCode: '#F0EDE4', quantity: 1, isOpened: true  },
  { id: 'f2',  material: 'PLA+',      brand: 'eSUN',      colorName: 'Black',        hexCode: '#1C1C1C', quantity: 1, isOpened: true  },
  { id: 'f3',  material: 'PLA+',      brand: 'Bambu Lab', colorName: 'Bambu Green',  hexCode: '#34D399', quantity: 1, isOpened: true  },
  { id: 'f4',  material: 'PLA+',      brand: 'eSUN',      colorName: 'Yellow',       hexCode: '#FBBF24', quantity: 2, isOpened: false },
  { id: 'f5',  material: 'PLA MATTE', brand: 'Bambu Lab', colorName: 'Matte Black',  hexCode: '#2D2D2D', quantity: 1, isOpened: true  },
  { id: 'f6',  material: 'PLA MATTE', brand: 'Polymaker', colorName: 'Matte Blue',   hexCode: '#3B82F6', quantity: 1, isOpened: true  },
  { id: 'f7',  material: 'PLA MATTE', brand: 'eSUN',      colorName: 'Matte Gray',   hexCode: '#52525B', quantity: 1, isOpened: false },
  { id: 'f8',  material: 'PETG',      brand: 'eSUN',      colorName: 'Clear',        hexCode: '#C4C8D0', quantity: 1, isOpened: false },
  { id: 'f9',  material: 'PETG',      brand: 'Bambu Lab', colorName: 'Red',          hexCode: '#EF4444', quantity: 1, isOpened: false },
  { id: 'f10', material: 'PETG-CF',   brand: 'Bambu Lab', colorName: 'Carbon Black', hexCode: '#111111', quantity: 2, isOpened: false },
  { id: 'f11', material: 'ABS',       brand: 'eSUN',      colorName: 'Gray',         hexCode: '#71717A', quantity: 1, isOpened: false },
  { id: 'f12', material: 'TPU',       brand: 'Polymaker', colorName: 'Flex Black',   hexCode: '#1F2937', quantity: 1, isOpened: false },
];

const SEED_MACHINES: Machine[] = [
  {
    id: 'm1', brand: 'Bambu Lab', model: 'X1 Carbon',
    specLink: 'https://bambulab.com/en/x1', imageUrl: '',
    hasAMS: true, amsModel: 'AMS Lite', amsImageUrl: '',
    amsSlots: ['f1', 'f2', 'f3', null], externalSpool: null,
    buildVolume: { width: 256, depth: 256, height: 256 },
    nozzles: ['0.4', '0.6', '0.8'],
  },
  {
    id: 'm2', brand: 'Bambu Lab', model: 'P1S',
    specLink: 'https://bambulab.com/en/p1', imageUrl: '',
    hasAMS: true, amsModel: 'AMS', amsImageUrl: '',
    amsSlots: ['f5', 'f6', null, null], externalSpool: null,
    buildVolume: { width: 256, depth: 256, height: 256 },
    nozzles: ['0.4', '0.6'],
  },
  {
    id: 'm3', brand: 'Prusa', model: 'MK4',
    specLink: 'https://www.prusa3d.com/product/original-prusa-mk4-3d-printer-2', imageUrl: '',
    hasAMS: false, amsModel: '', amsImageUrl: '',
    amsSlots: [null, null, null, null], externalSpool: null,
    buildVolume: { width: 250, depth: 210, height: 220 },
    nozzles: ['0.4', '0.6'],
  },
];

const SEED_JOBS: PrintJob[] = [
  { id: 1, fileName: 'bracket_v3.stl',   quantity: 4, timePerPiece: 45,  weight: 12, material: 'PLA',  status: 'Printing', totalTime: 180 },
  { id: 2, fileName: 'gear_assembly.stl', quantity: 2, timePerPiece: 120, weight: 35, material: 'PETG', status: 'Waiting',  totalTime: 240 },
  { id: 3, fileName: 'enclosure_top.stl', quantity: 1, timePerPiece: 210, weight: 68, material: 'ABS',  status: 'Waiting',  totalTime: 210 },
  { id: 4, fileName: 'nozzle_holder.stl', quantity: 6, timePerPiece: 30,  weight: 8,  material: 'PLA',  status: 'Waiting',  totalTime: 180 },
];

const ANALYTICS = {
  efficiency: 94.2, weeklySuccessRate: 98.1, materialUsed: 3.47, operatingHours: 312,
  weeklyJobs: [12, 18, 15, 22, 19, 25, 21],
  breakdown: [
    { label: 'PLA',  pct: 58, cls: 'bg-emerald-400' },
    { label: 'PETG', pct: 28, cls: 'bg-blue-400'    },
    { label: 'ABS',  pct: 14, cls: 'bg-orange-400'  },
  ],
};

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TODAY_IDX = 4;

const PRINTER_CATALOG: Record<string, string[]> = {
  'Bambu Lab': ['X1C', 'X1E', 'P1S', 'P1P', 'A1', 'A1 Mini', 'H2D'],
  'Prusa':     ['MK4', 'MK4S', 'MK3.9', 'XL', 'MINI+', 'Core One'],
  'Creality':  ['Ender 3 V3', 'Ender 3 V3 KE', 'K1 Max', 'K2 Plus', 'CR-10 SE'],
  'Elegoo':    ['Neptune 4 Pro', 'Neptune 4 Max', 'Saturn 4 Ultra', 'Mars 5 Ultra'],
  'AnkerMake': ['M5C', 'M7', 'M5'],
  'Flashforge': ['Adventurer 5M Pro', 'Guider 3 Ultra', 'Creator 3 Pro'],
  'Voron':     ['0.2', '2.4', 'Trident', 'Switchwire'],
};

const NOZZLE_SIZES = ['0.2', '0.4', '0.6', '0.8'];

const FILAMENT_BRANDS = ['Bambu Lab', 'eSUN', 'Polymaker', 'Prusament', 'Sunlu', 'Hatchbox', 'Overture', 'Creality', 'Eryone', 'Inland'];

const COLOR_MAP: Record<string, string> = {
  'White':        '#F0EDE4',
  'Black':        '#1C1C1C',
  'Gray':         '#71717A',
  'Silver':       '#A1A1AA',
  'Red':          '#EF4444',
  'Orange':       '#F97316',
  'Yellow':       '#FBBF24',
  'Blue':         '#3B82F6',
  'Navy':         '#1E3A8A',
  'Cyan':         '#22D3EE',
  'Teal':         '#14B8A6',
  'Green':        '#22C55E',
  'Bambu Green':  '#34D399',
  'Lime':         '#A3E635',
  'Purple':       '#A855F7',
  'Pink':         '#EC4899',
  'Magenta':      '#D946EF',
  'Clear':        '#C4C8D0',
  'Natural':      '#E5DCC5',
  'Carbon Black': '#111111',
  'Matte Black':  '#2D2D2D',
  'Matte White':  '#F5F5F5',
  'Matte Gray':   '#52525B',
  'Matte Blue':   '#3B82F6',
  'Matte Red':    '#DC2626',
  'Flex Black':   '#1F2937',
  'Gold':         '#D4A017',
  'Bronze':       '#6E4C1E',
};

const MAT_BADGE: Record<PrintMat, string> = {
  PLA: 'text-emerald-400', PETG: 'text-blue-400', ABS: 'text-orange-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}


function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── STL Viewer ───────────────────────────────────────────────────────────────

function STLViewer({ dataUrl, color }: { dataUrl: string; color: string }) {
  const mountRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const w = el.clientWidth || 560;
    const h = el.clientHeight || 480;

    // Dynamic imports to keep three.js out of SSR
    Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/STLLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { STLLoader }, { OrbitControls }]) => {
      const scene    = new THREE.Scene();
      scene.background = new THREE.Color('#0a0a0a');

      const camera   = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(w, h);
      el.appendChild(renderer.domElement);

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(1, 2, 3);
      scene.add(dir);
      const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
      dir2.position.set(-2, -1, -2);
      scene.add(dir2);

      // Parse STL from data URL
      const base64 = dataUrl.split(',')[1];
      const binary  = atob(base64);
      const buf     = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
      const loader   = new STLLoader();
      const geometry = loader.parse(buf.buffer);
      geometry.computeBoundingBox();
      geometry.center();

      const size = new THREE.Box3().setFromObject(new THREE.Mesh(geometry)).getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(0, 0, maxDim * 2);

      const mat  = new THREE.MeshPhongMaterial({ color: color || '#34d399', specular: 0x333333, shininess: 60 });
      const mesh = new THREE.Mesh(geometry, mat);
      scene.add(mesh);

      // Grid helper
      const grid = new THREE.GridHelper(maxDim * 3, 20, 0x1a1a1a, 0x1a1a1a);
      (grid.material as import('three').Material & { transparent: boolean; opacity: number }).transparent = true;
      (grid.material as import('three').Material & { opacity: number }).opacity = 0.4;
      grid.position.y = -size.y / 2;
      scene.add(grid);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      let animId: number;
      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      // Cleanup stored on element for effect cleanup
      (el as HTMLElement & { _stlCleanup?: () => void })._stlCleanup = () => {
        cancelAnimationFrame(animId);
        controls.dispose();
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    });

    return () => {
      (el as HTMLElement & { _stlCleanup?: () => void })._stlCleanup?.();
    };
  }, [dataUrl, color]);

  return <div ref={mountRef} className="w-full h-full" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('request');

  // ── Print queue ───────────────────────────────────────────────────────────
  const [jobs,      setJobs]      = useState<PrintJob[]>(SEED_JOBS);
  const [jobForm,   setJobForm]   = useState<JobForm>({ fileName: '', quantity: '', timePerPiece: '', weight: '', material: 'PLA' });
  const [submitted, setSubmitted] = useState(false);

  // ── New Request form ───────────────────────────────────────────────────────
  const [reqType,    setReqType]    = useState<RequestType>('mass');
  const [formMode,   setFormMode]   = useState<FormMode>('piece');
  const [pieceForm,  setPieceForm]  = useState({ name: '', material: DEFAULT_MAT_TYPES[0], quantity: '1', timePerPiece: '', weight: '' });
  const [setTplId,      setSetTplId]      = useState('');
  const [setQty,        setSetQty]        = useState('1');
  const [reqProcId,     setReqProcId]     = useState('');
  const [pieceProcId,   setPieceProcId]   = useState('');
  const [pieceProjId,   setPieceProjId]   = useState('');
  const [bomRows,    setBomRows]     = useState<ActiveBomRow[]>([]);
  const [reqDone,    setReqDone]    = useState(false);

  // ── Tooling List ───────────────────────────────────────────────────────────
  const [processes,     setProcesses]     = useState<Process[]>(SEED_PROCESSES);
  const [selProcId,     setSelProcId]     = useState(SEED_PROCESSES[0]?.id ?? '');
  const [expandedSets,  setExpandedSets]  = useState<Set<string>>(new Set([SEED_PROCESSES[0]?.sets[0]?.id ?? '']));
  const [procForm,      setProcForm]      = useState({ name: '', description: '' });
  const [editProcId,    setEditProcId]    = useState<string | null>(null);
  const [showProcForm,  setShowProcForm]  = useState(false);
  const [setForm,       setSetForm]       = useState({ name: '', description: '' });
  const [editSetKey,    setEditSetKey]    = useState<{ procId: string; setId: string } | null>(null);
  const [addingSetTo,   setAddingSetTo]   = useState<string | null>(null);
  const [partForm,      setPartForm]      = useState({ name: '', material: DEFAULT_MAT_TYPES[0], color: '#a1a1aa', timePerPiece: '', weightPerPiece: '', defaultQty: '1', stlDataUrl: null as string | null });
  const [editPartKey,   setEditPartKey]   = useState<{ procId: string; setId: string; partId: string } | null>(null);
  const [addingPartTo,   setAddingPartTo]   = useState<{ procId: string; setId: string } | null>(null);
  const [compForm,       setCompForm]       = useState({ name: '', spec: '', qty: '1' });
  const [editCompKey,    setEditCompKey]    = useState<{ procId: string; setId: string; compId: string } | null>(null);
  const [addingCompTo,   setAddingCompTo]   = useState<{ procId: string; setId: string } | null>(null);
  const [confirmDelProc, setConfirmDelProc] = useState<string | null>(null);
  const [stlViewPart,   setStlViewPart]   = useState<BomPart | null>(null);
  const [setImgPreview,   setSetImgPreview]   = useState<string | null>(null);
  const [editing3mfId,    setEditing3mfId]    = useState<string | null>(null);
  const [tmfInput,        setTmfInput]        = useState('');
  const [startJobSet,     setStartJobSet]     = useState<ProcessSet | null>(null);

  // ── Filament stock ────────────────────────────────────────────────────────
  const [filaments,    setFilaments]    = useState<Filament[]>(SEED_FILAMENTS);
  const [matTypes,     setMatTypes]     = useState<string[]>(DEFAULT_MAT_TYPES);
  const [activeMat,    setActiveMat]    = useState(DEFAULT_MAT_TYPES[0]);
  const [showFil,         setShowFil]         = useState(false);
  const [editFil,         setEditFil]         = useState<Filament | null>(null);
  const [editFilGroupIds, setEditFilGroupIds] = useState<string[]>([]);
  const [filBrands, setFilBrands] = useState<string[]>(FILAMENT_BRANDS);
  const [editFilForm,  setEditFilForm]  = useState({ material: '', brand: '', colorName: '', hexCode: '#34D399', quantity: '', isNewBrand: false, newBrand: '', isCustomColor: false });
  const [filForm, setFilForm] = useState({
    material: DEFAULT_MAT_TYPES[0], brand: '', colorName: '',
    hexCode: '#34D399', quantity: '', newType: '', isNewType: false,
    isNewBrand: false, newBrand: '', isCustomColor: false,
  });

  // ── Machines ──────────────────────────────────────────────────────────────
  const [machines,    setMachines]    = useState<Machine[]>(SEED_MACHINES);
  const [showMachine, setShowMachine] = useState(false);
  const [mcPage,      setMcPage]      = useState(0);
  const [mcBrands,    setMcBrands]    = useState<string[]>(Object.keys(PRINTER_CATALOG));
  const [mcCatalog,   setMcCatalog]   = useState<Record<string, string[]>>({ ...PRINTER_CATALOG });
  const [mcForm, setMcForm] = useState({
    brand: '', isNewBrand: false, newBrand: '',
    model: '', isNewModel: false, newModel: '',
    specLink: '', imageUrl: '',
    hasAMS: false, amsModel: '', amsImageUrl: '',
    buildVolume: { width: '', depth: '', height: '' },
    nozzles: [] as string[],
  });

  // ── AMS slot picker ───────────────────────────────────────────────────────
  const [pickerSlot,  setPickerSlot]  = useState<{ machineId: string; idx: number } | null>(null);
  const [slotSearch,  setSlotSearch]  = useState('');
  const [pickerMat,   setPickerMat]   = useState('');
  const [removeSlot,  setRemoveSlot]  = useState<{ machineId: string; idx: number; filamentId: string } | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalJobs      = jobs.length;
  const waitingJobs    = jobs.filter(j => j.status === 'Waiting').length;
  const cumulativeTime = jobs.reduce((s, j) => s + j.totalTime, 0);
  const printingJob    = jobs.find(j => j.status === 'Printing');
  const mcStatus       = printingJob ? 'Printing' : 'Idle';
  const previewMin     = parseInt(jobForm.quantity || '0') * parseInt(jobForm.timePerPiece || '0');
  const previewKg      = ((parseFloat(jobForm.weight || '0') * parseInt(jobForm.quantity || '0')) / 1000).toFixed(3);
  const amsAssignedIds = new Set(
    machines.flatMap(m => [
      ...m.amsSlots.filter((id): id is string => id !== null),
      ...(m.externalSpool ? [m.externalSpool] : []),
    ])
  );

  const allGroups: FilamentGroup[] = (() => {
    const map = new Map<string, FilamentGroup>();
    for (const f of filaments) {
      if (amsAssignedIds.has(f.id)) continue; // exclude spools currently loaded in a machine
      const key = `${f.material}||${f.brand}||${f.colorName}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalRolls += f.quantity;
        if (f.isOpened) existing.openedCount += f.quantity;
        existing.ids.push(f.id);
      } else {
        map.set(key, { key, material: f.material, brand: f.brand, colorName: f.colorName, hexCode: f.hexCode, totalRolls: f.quantity, openedCount: f.isOpened ? f.quantity : 0, ids: [f.id] });
      }
    }
    return Array.from(map.values());
  })();

  const filteredGroups = allGroups.filter(g => g.material === activeMat);
  const totalRolls     = filaments.filter(f => !amsAssignedIds.has(f.id)).reduce((s, f) => s + f.quantity, 0);

  const searchedGroups: FilamentGroup[] = slotSearch
    ? allGroups.filter(g => [g.colorName, g.brand, g.material].some(s => s.toLowerCase().includes(slotSearch.toLowerCase())))
    : allGroups;

  const groupedModalFils = searchedGroups.reduce<Record<string, FilamentGroup[]>>((acc, g) => {
    (acc[g.material] ??= []).push(g);
    return acc;
  }, {});

  const getFil = (id: string | null) => filaments.find(f => f.id === id);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function submitJob(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const qty = parseInt(jobForm.quantity) || 1;
    const t   = parseInt(jobForm.timePerPiece) || 0;
    setJobs(p => [...p, {
      id: p.length + 1,
      fileName: jobForm.fileName.endsWith('.stl') ? jobForm.fileName : `${jobForm.fileName}.stl`,
      quantity: qty, timePerPiece: t,
      weight: parseFloat(jobForm.weight) || 0,
      material: jobForm.material, status: 'Waiting', totalTime: qty * t,
    }]);
    setJobForm({ fileName: '', quantity: '', timePerPiece: '', weight: '', material: 'PLA' });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  function loadBom(tplId: string, qty: number) {
    const tpl = processes.flatMap(p => p.sets).find(s => s.id === tplId);
    if (!tpl) { setBomRows([]); return; }
    setBomRows(tpl.parts.map(p => ({
      partId: p.id, name: p.name, material: p.material,
      timePerPiece: p.timePerPiece, weightPerPiece: p.weightPerPiece,
      baseQty: p.defaultQty * qty,
      qty: String(p.defaultQty * qty),
    })));
  }

  function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (formMode === 'piece') {
      const linkedPart = pieceProjId ? processes.flatMap(p => p.sets).find(s => s.id === pieceProjId)?.parts[0] ?? null : null;
      const name   = linkedPart ? linkedPart.name     : pieceForm.name;
      const mat    = linkedPart ? linkedPart.material  : pieceForm.material;
      const t      = linkedPart ? linkedPart.timePerPiece : (parseInt(pieceForm.timePerPiece) || 0);
      const wt     = linkedPart ? linkedPart.weightPerPiece : (parseFloat(pieceForm.weight) || 0);
      const qty    = parseInt(pieceForm.quantity) || 1;
      setJobs(p => [...p, {
        id: p.length + 1,
        fileName: name.endsWith('.stl') ? name : `${name}.stl`,
        quantity: qty, timePerPiece: t,
        weight: wt,
        material: mat as PrintMat, status: 'Waiting', totalTime: qty * t,
      }]);
      setPieceForm({ name: '', material: DEFAULT_MAT_TYPES[0], quantity: '1', timePerPiece: '', weight: '' });
      setPieceProcId(''); setPieceProjId('');
    } else {
      const newJobs = bomRows
        .map(r => ({ qty: parseInt(r.qty) || 0, r }))
        .filter(({ qty }) => qty > 0)
        .map(({ qty, r }, i) => ({
          id: 0,
          fileName: `${r.name.replace(/\s+/g, '_')}.stl`,
          quantity: qty, timePerPiece: r.timePerPiece,
          weight: r.weightPerPiece,
          material: r.material as PrintMat, status: 'Waiting' as JobStatus,
          totalTime: qty * r.timePerPiece,
        }));
      setJobs(p => [...p, ...newJobs.map((j, i) => ({ ...j, id: p.length + i + 1 }))]);
      setBomRows([]);
      setSetTplId('');
      setSetQty('1');
      setReqProcId('');
    }
    setReqDone(true);
    setTimeout(() => setReqDone(false), 3000);
  }

  function submitFilament(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const mat = filForm.isNewType && filForm.newType.trim() ? filForm.newType.trim() : filForm.material;
    if (filForm.isNewType && filForm.newType.trim() && !matTypes.includes(mat)) {
      setMatTypes(p => [...p, mat]);
    }
    const effectiveBrand = filForm.isNewBrand ? filForm.newBrand.trim() : filForm.brand;
    if (filForm.isNewBrand && effectiveBrand && !filBrands.includes(effectiveBrand)) {
      setFilBrands(p => [...p, effectiveBrand]);
    }
    setFilaments(p => [...p, {
      id: uid(), material: mat, brand: effectiveBrand,
      colorName: filForm.colorName, hexCode: filForm.hexCode,
      quantity: parseInt(filForm.quantity) || 1,
      isOpened: false,
    }]);
    setActiveMat(mat);
    setShowFil(false);
    setFilForm({ material: DEFAULT_MAT_TYPES[0], brand: '', colorName: '', hexCode: '#34D399', quantity: '', newType: '', isNewType: false, isNewBrand: false, newBrand: '', isCustomColor: false });
  }

  function handleMachineImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMcForm(p => ({ ...p, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function handleAmsImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMcForm(p => ({ ...p, amsImageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function submitMachine(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const effectiveBrand = mcForm.isNewBrand ? mcForm.newBrand.trim() : mcForm.brand;
    const effectiveModel = (mcForm.isNewBrand || mcForm.isNewModel) ? mcForm.newModel.trim() : mcForm.model;

    if (mcForm.isNewBrand && effectiveBrand && !mcBrands.includes(effectiveBrand)) {
      setMcBrands(p => [...p, effectiveBrand]);
      setMcCatalog(p => ({ ...p, [effectiveBrand]: effectiveModel ? [effectiveModel] : [] }));
    } else if (!mcForm.isNewBrand && mcForm.isNewModel && effectiveModel) {
      setMcCatalog(p => ({
        ...p,
        [effectiveBrand]: [...(p[effectiveBrand] ?? []), effectiveModel],
      }));
    }

    setMachines(p => [...p, {
      id: uid(), brand: effectiveBrand, model: effectiveModel,
      specLink: mcForm.specLink, imageUrl: mcForm.imageUrl,
      hasAMS: mcForm.hasAMS, amsModel: mcForm.amsModel, amsImageUrl: mcForm.amsImageUrl,
      amsSlots: [null, null, null, null], externalSpool: null,
      buildVolume: {
        width:  parseFloat(mcForm.buildVolume.width)  || 0,
        depth:  parseFloat(mcForm.buildVolume.depth)  || 0,
        height: parseFloat(mcForm.buildVolume.height) || 0,
      },
      nozzles: [...mcForm.nozzles],
    }]);
    setShowMachine(false);
    setMcForm({
      brand: '', isNewBrand: false, newBrand: '',
      model: '', isNewModel: false, newModel: '',
      specLink: '', imageUrl: '', hasAMS: false, amsModel: '', amsImageUrl: '',
      buildVolume: { width: '', depth: '', height: '' },
      nozzles: [],
    });
  }

  function assignSlotByShape(sourceId: string) {
    if (!pickerSlot) return;
    const { machineId, idx } = pickerSlot;
    const sourceFil = filaments.find(f => f.id === sourceId);
    if (!sourceFil) return;

    let slotId: string;
    if (sourceFil.quantity === 1) {
      // Assign this record directly (mark opened if it was sealed)
      slotId = sourceFil.id;
      setFilaments(p => p.map(f => f.id !== sourceId ? f : { ...f, isOpened: true }));
    } else {
      // Split: decrement the source record by 1, create a new single-roll record for the slot
      const newId = uid();
      slotId = newId;
      setFilaments(p => [
        ...p.map(f => f.id !== sourceId ? f : { ...f, quantity: f.quantity - 1 }),
        { ...sourceFil, id: newId, quantity: 1, isOpened: true },
      ]);
    }

    setMachines(p => p.map(m => {
      if (m.id !== machineId) return m;
      if (idx === -1) return { ...m, externalSpool: slotId };
      const s = [...m.amsSlots] as AmsSlots;
      s[idx] = slotId;
      return { ...m, amsSlots: s };
    }));
    setPickerSlot(null);
    setSlotSearch('');
  }

  function clearSlot(machineId: string, idx: number) {
    setMachines(p => p.map(m => {
      if (m.id !== machineId) return m;
      if (idx === -1) return { ...m, externalSpool: null };
      const s = [...m.amsSlots] as AmsSlots;
      s[idx] = null;
      return { ...m, amsSlots: s };
    }));
  }

  function confirmSlotEmpty() {
    if (!removeSlot) return;
    clearSlot(removeSlot.machineId, removeSlot.idx);
    setFilaments(p => p.filter(f => f.id !== removeSlot.filamentId));
    setRemoveSlot(null);
  }

  function confirmReturnToStock() {
    if (!removeSlot) return;
    clearSlot(removeSlot.machineId, removeSlot.idx);
    setRemoveSlot(null);
  }

  function deleteMachine(id: string) {
    setMachines(p => {
      const next = p.filter(m => m.id !== id);
      setMcPage(pg => Math.min(pg, Math.max(0, next.length - 1)));
      return next;
    });
  }


  function openEditFilGroup(group: FilamentGroup) {
    const isKnownBrand = filBrands.includes(group.brand);
    const isKnownColor = group.colorName in COLOR_MAP;
    setEditFilGroupIds(group.ids);
    setEditFil({ id: group.ids[0], material: group.material, brand: group.brand, colorName: group.colorName, hexCode: group.hexCode, quantity: group.totalRolls, isOpened: group.openedCount > 0 });
    setEditFilForm({
      material: group.material,
      brand: isKnownBrand ? group.brand : '',
      colorName: group.colorName,
      hexCode: group.hexCode,
      quantity: String(group.totalRolls),
      isNewBrand: !isKnownBrand,
      newBrand: !isKnownBrand ? group.brand : '',
      isCustomColor: !isKnownColor,
    });
  }

  function submitEditFil(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editFil) return;
    const effectiveBrand = editFilForm.isNewBrand ? editFilForm.newBrand.trim() : editFilForm.brand;
    if (editFilForm.isNewBrand && effectiveBrand && !filBrands.includes(effectiveBrand)) {
      setFilBrands(p => [...p, effectiveBrand]);
    }
    const totalQty = parseInt(editFilForm.quantity) || 1;
    if (editFilGroupIds.length > 1) {
      const [firstId, ...restIds] = editFilGroupIds;
      setFilaments(p => p
        .filter(f => !restIds.includes(f.id))
        .map(f => f.id !== firstId ? f : { ...f, material: editFilForm.material, brand: effectiveBrand, colorName: editFilForm.colorName, hexCode: editFilForm.hexCode, quantity: totalQty })
      );
    } else {
      setFilaments(p => p.map(f => f.id !== editFil.id ? f : { ...f, material: editFilForm.material, brand: effectiveBrand, colorName: editFilForm.colorName, hexCode: editFilForm.hexCode, quantity: totalQty }));
    }
    setEditFil(null);
    setEditFilGroupIds([]);
  }

  function deleteFilamentGroup(ids: string[]) {
    setFilaments(p => p.filter(f => !ids.includes(f.id)));
  }

  // ── Shared style atoms ────────────────────────────────────────────────────
  const card  = { backgroundColor: '#09090b', borderColor: '#18181b' };
  const panel = { backgroundColor: '#0d0d0f', borderColor: '#18181b' };
  const inp   = 'w-full border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-400/50 transition-colors';
  const lbl   = 'block text-xs font-medium text-zinc-500 mb-1.5';

  const NAV: { id: Tab; label: string }[] = [
    { id: 'detail',     label: 'Detail'       },
    { id: 'request',    label: 'Request'      },
    { id: 'print-list', label: 'Print List'   },
    { id: 'analytics',  label: 'Analytics'    },
    { id: 'tooling',    label: 'Tooling List' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: '#000000' }} className="flex h-screen text-white font-sans overflow-hidden">

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside style={card} className="w-56 border-r flex flex-col justify-between shrink-0">
        <div>
          <div style={{ borderColor: '#18181b' }} className="px-5 py-5 border-b">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-emerald-400/10 flex items-center justify-center shrink-0">
                <span className="text-emerald-400 text-xs leading-none">◈</span>
              </div>
              <span className="text-sm font-semibold text-white tracking-wide">3D Print Hub</span>
            </div>
            <p className="text-xs text-zinc-600 mt-1.5 ml-8">Queue Management</p>
          </div>
          <nav className="p-3 mt-1 space-y-0.5">
            {NAV.map(({ id, label }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    active ? 'bg-emerald-400/10 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{label}</span>
                  {active && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </nav>
        </div>
        <div style={{ borderColor: '#18181b' }} className="p-4 border-t space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">Machine</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${mcStatus === 'Printing' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'}`} />
              <span className={`text-xs font-medium ${mcStatus === 'Printing' ? 'text-emerald-400' : 'text-zinc-600'}`}>{mcStatus}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">Queue</span>
            <span className="text-xs text-zinc-400">{totalJobs} jobs</span>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ═════════════════════════════════════════════════════════════ */}
      <main style={{ backgroundColor: '#000000' }} className="flex-1 overflow-y-auto">

        {/* ── REQUEST ──────────────────────────────────────────────────────── */}
        {tab === 'request' && (() => {
          // ── Live estimation ─────────────────────────────────────────────
          let estParts = 0, estMins = 0, estGrams = 0;
          if (formMode === 'piece') {
            const _lp = pieceProjId ? processes.flatMap(p => p.sets).find(s => s.id === pieceProjId)?.parts[0] ?? null : null;
            const q = parseInt(pieceForm.quantity) || 0;
            estParts  = q;
            estMins   = q * (_lp ? _lp.timePerPiece : (parseInt(pieceForm.timePerPiece) || 0));
            estGrams  = q * (_lp ? _lp.weightPerPiece : (parseFloat(pieceForm.weight) || 0));
          } else {
            for (const r of bomRows) {
              const q = parseInt(r.qty) || 0;
              estParts += q;
              estMins  += q * r.timePerPiece;
              estGrams += q * r.weightPerPiece;
            }
          }
          const estKg    = (estGrams / 1000).toFixed(2);
          const estRolls = Math.ceil(estGrams / 1000);

          const REQ_TYPES: { id: RequestType; label: string; icon: string; desc: string }[] = [
            { id: 'mass',     label: 'Mass Production', icon: '📦', desc: 'Batch or replacement parts' },
            { id: 'test',     label: 'Test Design',     icon: '🧪', desc: 'Prototype & quick iteration' },
            { id: 'external', label: 'External Request', icon: '🌐', desc: 'Third-party client print' },
          ];

          return (
            <div className="p-8 h-full">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">New Print Request</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Submit a job to the print queue</p>
              </div>

              {/* Success toast */}
              {reqDone && (
                <div style={card} className="border rounded-lg px-4 py-3 mb-6 flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs text-emerald-400">Request submitted — added to queue.</span>
                </div>
              )}

              <form onSubmit={submitRequest}>
                <div className="flex gap-6 items-start">

                  {/* ── LEFT COLUMN — form ── */}
                  <div className="flex-1 min-w-0 space-y-5">

                {/* ── 1. Request Type ── */}
                <div>
                  <p className={lbl}>Request Type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {REQ_TYPES.map(rt => (
                      <button key={rt.id} type="button" onClick={() => setReqType(rt.id)}
                        className="flex flex-col items-start p-3 rounded-xl border transition-all text-left"
                        style={{
                          borderColor: reqType === rt.id ? '#34d39960' : '#18181b',
                          backgroundColor: reqType === rt.id ? '#34d39908' : '#09090b',
                        }}>
                        <span className="text-base mb-1.5">{rt.icon}</span>
                        <p className={`text-xs font-semibold leading-tight ${reqType === rt.id ? 'text-emerald-400' : 'text-zinc-300'}`}>{rt.label}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{rt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── 2. Mode Toggle ── */}
                <div>
                  <p className={lbl}>Input Mode</p>
                  <div className="flex gap-2">
                    {(['piece', 'set'] as FormMode[]).map(m => (
                      <button key={m} type="button" onClick={() => setFormMode(m)}
                        className="flex-1 py-2 text-xs font-semibold rounded-lg border transition-all"
                        style={{
                          borderColor: formMode === m ? '#34d399' : '#27272a',
                          backgroundColor: formMode === m ? '#34d399' : '#09090b',
                          color: formMode === m ? '#000' : '#71717a',
                        }}>
                        {m === 'piece' ? 'Piece' : 'Set / Assembly'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── 3A. PIECE MODE ── */}
                {formMode === 'piece' && (() => {
                  const linkedProj = pieceProjId ? processes.flatMap(p => p.sets).find(s => s.id === pieceProjId) : null;
                  const linkedPart = linkedProj?.parts[0] ?? null;
                  const linked = !!linkedPart;
                  const lockedInp = `${inp} ${linked ? 'opacity-60 cursor-not-allowed' : ''}`;
                  const linkedBorder = linked ? '#34d39933' : '#18181b';
                  return (
                    <div className="space-y-4">
                      {/* Process / Project selector */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Process</label>
                          <select value={pieceProcId}
                            onChange={e => { setPieceProcId(e.target.value); setPieceProjId(''); }}
                            style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`}>
                            <option value="">— Select process —</option>
                            {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Project</label>
                          <select value={pieceProjId}
                            onChange={e => setPieceProjId(e.target.value)}
                            disabled={!pieceProcId}
                            style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer disabled:opacity-40`}>
                            <option value="">— Select project —</option>
                            {(processes.find(p => p.id === pieceProcId)?.sets ?? []).filter(s => projectType(s) === 'piece').map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Linked indicator */}
                      {linked && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#34d39910', border: '1px solid #34d39930' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          <span className="text-[10px] text-emerald-400 font-medium">Linked to Tooling List · {linkedProj?.name}</span>
                          {linkedPart?.stlDataUrl && (
                            <button type="button" onClick={() => setStlViewPart(linkedPart)}
                              className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                              3D Preview
                            </button>
                          )}
                        </div>
                      )}

                      <div>
                        <label className={lbl}>Part Name</label>
                        <div className="relative">
                          <input type="text" placeholder="Gear_V2" required
                            value={linked ? linkedPart!.name : pieceForm.name}
                            onChange={e => !linked && setPieceForm(p => ({ ...p, name: e.target.value }))}
                            readOnly={linked}
                            style={{ backgroundColor: '#09090b', borderColor: linkedBorder }} className={lockedInp} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-700 font-mono pointer-events-none">.stl</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Material</label>
                          <select value={linked ? linkedPart!.material : pieceForm.material}
                            onChange={e => !linked && setPieceForm(p => ({ ...p, material: e.target.value }))}
                            disabled={linked}
                            style={{ backgroundColor: '#09090b', borderColor: linkedBorder }} className={`${lockedInp} cursor-pointer`}>
                            {matTypes.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Quantity</label>
                          <input type="number" min="1" required placeholder="1"
                            value={pieceForm.quantity} onChange={e => setPieceForm(p => ({ ...p, quantity: e.target.value }))}
                            style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={inp} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Est. Time / Piece <span className="text-zinc-700">(min)</span></label>
                          <input type="number" min="0" placeholder="45"
                            value={linked ? linkedPart!.timePerPiece : pieceForm.timePerPiece}
                            onChange={e => !linked && setPieceForm(p => ({ ...p, timePerPiece: e.target.value }))}
                            readOnly={linked}
                            style={{ backgroundColor: '#09090b', borderColor: linkedBorder }} className={lockedInp} />
                        </div>
                        <div>
                          <label className={lbl}>Est. Weight / Piece <span className="text-zinc-700">(g)</span></label>
                          <input type="number" min="0" step="0.1" placeholder="12.5"
                            value={linked ? linkedPart!.weightPerPiece : pieceForm.weight}
                            onChange={e => !linked && setPieceForm(p => ({ ...p, weight: e.target.value }))}
                            readOnly={linked}
                            style={{ backgroundColor: '#09090b', borderColor: linkedBorder }} className={lockedInp} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── 3B. SET MODE ── */}
                {formMode === 'set' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className={lbl}>Master Project Template</label>
                        {/* Step 1 — Process */}
                        <select value={reqProcId}
                          onChange={e => { setReqProcId(e.target.value); setSetTplId(''); setBomRows([]); }}
                          style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`}>
                          <option value="" disabled>1 · Select process…</option>
                          {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {/* Step 2 — Project filtered by formMode type */}
                        {reqProcId && (() => {
                          const sets = (processes.find(p => p.id === reqProcId)?.sets ?? []).filter(s => projectType(s) === formMode);
                          return (
                            <select value={setTplId}
                              onChange={e => { setSetTplId(e.target.value); loadBom(e.target.value, parseInt(setQty) || 1); }}
                              style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`}>
                              <option value="" disabled>2 · Select project…</option>
                              {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          );
                        })()}
                        {setTplId && (() => {
                          const proj = processes.flatMap(p => p.sets).find(s => s.id === setTplId);
                          return (
                            <div className="space-y-1">
                              {proj?.description && <p className="text-[10px] text-zinc-600">{proj.description}</p>}
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#34d39910', border: '1px solid #34d39930' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                </svg>
                                <span className="text-[10px] text-emerald-400 font-medium">Linked to Tooling List · {proj?.name}</span>
                                {proj?.imageUrl && (
                                  <button type="button" onClick={() => setSetImgPreview(proj.imageUrl)}
                                    className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    Preview
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <label className={lbl}>How many full sets?</label>
                        <input type="number" min="1" placeholder="1"
                          value={setQty} onChange={e => { setSetQty(e.target.value); if (setTplId) loadBom(setTplId, parseInt(e.target.value) || 1); }}
                          style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={inp} />
                      </div>
                    </div>

                    {/* BOM rows */}
                    {bomRows.length > 0 && (
                      <div style={card} className="border rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#18181b' }}>
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bill of Materials</p>
                          <p className="text-[10px] text-zinc-600">{bomRows.length} parts · {parseInt(setQty) || 1} set{parseInt(setQty) > 1 ? 's' : ''}</p>
                        </div>
                        {bomRows.map((row, i) => {
                          const dirty = String(row.baseQty) !== row.qty;
                          const fullPart = setTplId
                            ? (processes.flatMap(p => p.sets).find(s => s.id === setTplId)?.parts.find(p => p.id === row.partId) ?? null)
                            : null;
                          return (
                            <div key={row.partId} className="grid items-center px-4 py-3 border-b last:border-0 gap-3"
                              style={{ borderColor: '#18181b', gridTemplateColumns: '1fr 80px 28px 28px 28px' }}>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-zinc-200 truncate">{row.name}</p>
                                <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{row.material} · {row.timePerPiece}min · {row.weightPerPiece}g</p>
                              </div>
                              <div className="flex items-center gap-1.5 justify-end">
                                {dirty && (
                                  <button type="button" title={`Reset to base (${row.baseQty})`}
                                    onClick={() => setBomRows(p => p.map((r, j) => j !== i ? r : { ...r, qty: String(r.baseQty) }))}
                                    className="flex items-center gap-0.5 text-[10px] text-amber-500/80 hover:text-amber-400 transition-colors shrink-0">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                                    </svg>
                                    {row.baseQty}
                                  </button>
                                )}
                                <input type="number" min="0" value={row.qty}
                                  onChange={e => setBomRows(p => p.map((r, j) => j !== i ? r : { ...r, qty: e.target.value }))}
                                  style={{ backgroundColor: '#0d0d0f', borderColor: dirty ? '#f59e0b55' : '#27272a' }}
                                  className="border rounded-md px-2 py-1 text-xs text-zinc-200 text-center focus:outline-none focus:border-emerald-400/50 w-16" />
                              </div>
                              <button type="button" onClick={() => setBomRows(p => p.filter((_, j) => j !== i))}
                                className="text-zinc-700 hover:text-red-500 transition-colors flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                              </button>
                              <button type="button"
                                disabled={!fullPart?.stlDataUrl}
                                onClick={() => fullPart?.stlDataUrl && setStlViewPart(fullPart)}
                                className="flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-zinc-600 hover:text-emerald-400">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!setTplId && (
                      <div className="py-8 text-center text-zinc-700 text-xs border border-dashed rounded-xl" style={{ borderColor: '#18181b' }}>
                        Select a template to auto-fill the Bill of Materials
                      </div>
                    )}
                  </div>
                )}

                  </div>{/* end left column */}

                  {/* ── RIGHT COLUMN — summary + submit ── */}
                  <div className="w-64 shrink-0 sticky top-8 space-y-4">
                    <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: '#27272a', backgroundColor: '#09090b' }}>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Summary</p>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Total Parts</p>
                        <p className="text-2xl font-bold text-white tabular-nums">{estParts > 0 ? estParts : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Est. Duration</p>
                        <p className="text-lg font-bold text-emerald-400 tabular-nums leading-tight">{estParts > 0 ? fmtTime(estMins) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Material</p>
                        <p className="text-lg font-bold text-white tabular-nums leading-tight">{estParts > 0 ? `${estKg} kg` : '—'}</p>
                        {estParts > 0 && <p className="text-[10px] text-zinc-600 mt-0.5">~{estRolls} roll{estRolls !== 1 ? 's' : ''}</p>}
                      </div>
                    </div>
                    <button type="submit"
                      disabled={formMode === 'set' && bomRows.length === 0}
                      className="w-full py-3 rounded-xl text-sm font-bold bg-emerald-400 text-black hover:bg-emerald-300 active:bg-emerald-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      Submit to Queue
                    </button>
                  </div>

                </div>{/* end flex row */}
              </form>
            </div>
          );
        })()}

        {/* ── TOOLING LIST ─────────────────────────────────────────────────── */}
        {tab === 'tooling' && (() => {
          const selProc = processes.find(p => p.id === selProcId) ?? null;

          function saveProc() {
            if (!procForm.name.trim()) return;
            if (editProcId) {
              setProcesses(p => p.map(pr => pr.id !== editProcId ? pr : { ...pr, name: procForm.name.trim(), description: procForm.description.trim() }));
              setEditProcId(null);
            } else {
              const newProc: Process = { id: uid(), name: procForm.name.trim(), description: procForm.description.trim(), sets: [] };
              setProcesses(p => [...p, newProc]);
              setSelProcId(newProc.id);
            }
            setProcForm({ name: '', description: '' });
            setShowProcForm(false);
          }

          function deleteProc(id: string) {
            setProcesses(p => p.filter(pr => pr.id !== id));
            setSelProcId(ps => ps === id ? (processes.find(pr => pr.id !== id)?.id ?? '') : ps);
          }

          function saveSet() {
            if (!setForm.name.trim()) return;
            if (editSetKey) {
              setProcesses(p => p.map(pr => pr.id !== editSetKey.procId ? pr : {
                ...pr, sets: pr.sets.map(s => s.id !== editSetKey.setId ? s : { ...s, name: setForm.name.trim(), description: setForm.description.trim() }),
              }));
              setEditSetKey(null);
            } else if (addingSetTo) {
              const newSet: ProcessSet = { id: uid(), name: setForm.name.trim(), description: setForm.description.trim(), imageUrl: null, file3mfUrl: null, parts: [], components: [] };
              setProcesses(p => p.map(pr => pr.id !== addingSetTo ? pr : { ...pr, sets: [...pr.sets, newSet] }));
              setExpandedSets(s => new Set([...s, newSet.id]));
              setAddingSetTo(null);
            }
            setSetForm({ name: '', description: '' });
          }

          function deleteSet(procId: string, setId: string) {
            setProcesses(p => p.map(pr => pr.id !== procId ? pr : { ...pr, sets: pr.sets.filter(s => s.id !== setId) }));
          }

          function savePart() {
            if (!partForm.name.trim()) return;
            const existingPart = editPartKey
              ? processes.flatMap(p => p.sets).flatMap(s => s.parts).find(p => p.id === editPartKey.partId)
              : null;
            const part: BomPart = {
              id: editPartKey?.partId ?? uid(),
              name: partForm.name.trim(),
              material: partForm.material,
              color: partForm.color,
              timePerPiece: parseInt(partForm.timePerPiece) || 0,
              weightPerPiece: parseFloat(partForm.weightPerPiece) || 0,
              defaultQty: parseInt(partForm.defaultQty) || 1,
              stlDataUrl: partForm.stlDataUrl ?? existingPart?.stlDataUrl ?? null,
            };
            if (editPartKey) {
              setProcesses(p => p.map(pr => pr.id !== editPartKey.procId ? pr : {
                ...pr, sets: pr.sets.map(s => s.id !== editPartKey.setId ? s : {
                  ...s, parts: s.parts.map(pt => pt.id !== editPartKey.partId ? pt : part),
                }),
              }));
              setEditPartKey(null);
            } else if (addingPartTo) {
              setProcesses(p => p.map(pr => pr.id !== addingPartTo.procId ? pr : {
                ...pr, sets: pr.sets.map(s => s.id !== addingPartTo.setId ? s : { ...s, parts: [...s.parts, part] }),
              }));
              setAddingPartTo(null);
            }
            setPartForm({ name: '', material: DEFAULT_MAT_TYPES[0], color: '#a1a1aa', timePerPiece: '', weightPerPiece: '', defaultQty: '1', stlDataUrl: null });
          }

          function deletePart(procId: string, setId: string, partId: string) {
            setProcesses(p => p.map(pr => pr.id !== procId ? pr : {
              ...pr, sets: pr.sets.map(s => s.id !== setId ? s : { ...s, parts: s.parts.filter(pt => pt.id !== partId) }),
            }));
          }

          function saveComp() {
            if (!compForm.name.trim()) return;
            const comp: Component = { id: editCompKey?.compId ?? uid(), name: compForm.name.trim(), spec: compForm.spec.trim(), qty: parseInt(compForm.qty) || 1 };
            if (editCompKey) {
              setProcesses(p => p.map(pr => pr.id !== editCompKey.procId ? pr : {
                ...pr, sets: pr.sets.map(s => s.id !== editCompKey.setId ? s : {
                  ...s, components: s.components.map(c => c.id !== editCompKey.compId ? c : comp),
                }),
              }));
              setEditCompKey(null);
            } else if (addingCompTo) {
              setProcesses(p => p.map(pr => pr.id !== addingCompTo.procId ? pr : {
                ...pr, sets: pr.sets.map(s => s.id !== addingCompTo.setId ? s : { ...s, components: [...s.components, comp] }),
              }));
              setAddingCompTo(null);
            }
            setCompForm({ name: '', spec: '', qty: '1' });
          }

          function deleteComp(procId: string, setId: string, compId: string) {
            setProcesses(p => p.map(pr => pr.id !== procId ? pr : {
              ...pr, sets: pr.sets.map(s => s.id !== setId ? s : { ...s, components: s.components.filter(c => c.id !== compId) }),
            }));
          }

          const inlineInp = 'border rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-400/50 transition-colors';

          return (
            <div className="flex h-full">

              {/* LEFT — Process list */}
              <div className="w-56 shrink-0 border-r flex flex-col" style={{ borderColor: '#18181b', backgroundColor: '#080808' }}>
                <div className="px-4 py-4 border-b" style={{ borderColor: '#18181b' }}>
                  <p className="text-xs font-semibold text-white">Processes</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{processes.length} defined</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {processes.map(proc => {
                    const active = selProcId === proc.id;
                    return (
                      <div key={proc.id}
                        className={`rounded-md transition-all group ${active ? 'bg-emerald-400/10' : 'hover:bg-white/[0.03]'}`}>
                        <button onClick={() => setSelProcId(proc.id)} className="w-full text-left px-3 pt-2.5 pb-1">
                          <p className={`text-xs font-medium truncate ${active ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-300'}`}>{proc.name}</p>
                          <p className="text-[10px] text-zinc-700 truncate mt-0.5">{proc.sets.length} project{proc.sets.length !== 1 ? 's' : ''}</p>
                        </button>
                        <div className="flex gap-1 px-3 pb-2">
                          <button onClick={e => { e.stopPropagation(); setEditProcId(proc.id); setProcForm({ name: proc.name, description: proc.description }); setShowProcForm(false); setSelProcId(proc.id); }}
                            title="Edit" className="p-1 rounded text-zinc-600 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelProc(proc.id); }}
                            title="Remove" className="p-1 rounded text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 border-t" style={{ borderColor: '#18181b' }}>
                  {showProcForm ? (
                    <div className="space-y-2">
                      <input autoFocus placeholder="Process name" value={procForm.name}
                        onChange={e => setProcForm(p => ({ ...p, name: e.target.value }))}
                        style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} w-full`} />
                      <input placeholder="Description (optional)" value={procForm.description}
                        onChange={e => setProcForm(p => ({ ...p, description: e.target.value }))}
                        style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} w-full`} />
                      <div className="flex gap-1.5">
                        <button onClick={saveProc} className="flex-1 py-1.5 rounded-md text-[10px] font-bold bg-emerald-400 text-black hover:bg-emerald-300 transition-colors">Save</button>
                        <button onClick={() => { setShowProcForm(false); setEditProcId(null); setProcForm({ name: '', description: '' }); }}
                          className="flex-1 py-1.5 rounded-md text-[10px] text-zinc-500 border hover:text-zinc-300 transition-colors" style={{ borderColor: '#27272a' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowProcForm(true)}
                      className="w-full py-2 rounded-md text-[10px] font-medium text-zinc-600 border border-dashed hover:text-emerald-400 hover:border-emerald-400/40 transition-colors" style={{ borderColor: '#27272a' }}>
                      + Add Process
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT — Sets & BOM */}
              <div className="flex-1 overflow-y-auto">
                {!selProc ? (
                  <div className="flex items-center justify-center h-full text-zinc-700 text-xs">Select a process</div>
                ) : (
                  <div className="p-6 space-y-5">

                    {/* Process header */}
                    <div className="flex items-start justify-between">
                      <div>
                        {editProcId === selProc.id ? (
                          <div className="space-y-2">
                            <input autoFocus value={procForm.name} onChange={e => setProcForm(p => ({ ...p, name: e.target.value }))}
                              style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} text-sm font-semibold`} />
                            <input value={procForm.description} onChange={e => setProcForm(p => ({ ...p, description: e.target.value }))}
                              style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} w-full`} />
                            <div className="flex gap-2">
                              <button onClick={saveProc} className="px-3 py-1 rounded text-[10px] font-bold bg-emerald-400 text-black">Save</button>
                              <button onClick={() => { setEditProcId(null); setProcForm({ name: '', description: '' }); }} className="px-3 py-1 rounded text-[10px] text-zinc-500">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="text-base font-semibold text-white">{selProc.name}</h2>
                            <p className="text-xs text-zinc-600 mt-0.5">{selProc.description || 'No description'}</p>
                          </>
                        )}
                      </div>
                      {editProcId !== selProc.id && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => { setEditProcId(selProc.id); setProcForm({ name: selProc.name, description: selProc.description }); setShowProcForm(false); }}
                            className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors">Edit</button>
                          <button onClick={() => deleteProc(selProc.id)} className="text-xs text-zinc-700 hover:text-red-500 transition-colors">Delete</button>
                        </div>
                      )}
                    </div>

                    {/* Sets */}
                    <div className="space-y-3">
                      {selProc.sets.map(s => {
                        const expanded = expandedSets.has(s.id);
                        const totalMins = s.parts.reduce((acc, p) => acc + p.timePerPiece * p.defaultQty, 0);
                        const totalG    = s.parts.reduce((acc, p) => acc + p.weightPerPiece * p.defaultQty, 0);
                        return (
                          <div key={s.id} className="border rounded-xl overflow-hidden" style={{ borderColor: '#18181b', backgroundColor: '#09090b' }}>

                            {/* Set header */}
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                              onClick={() => setExpandedSets(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}>
                              <span className="text-zinc-600 text-xs">{expanded ? '▼' : '▶'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-zinc-100">{s.name}</p>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${projectType(s) === 'piece' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                                    {projectType(s)}
                                  </span>
                                  {/* Project image upload / preview — set only */}
                                  {projectType(s) === 'set' && <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 shrink-0">
                                    {s.imageUrl ? (
                                      <>
                                        <div className="w-6 h-6 rounded overflow-hidden border border-white/10 shrink-0">
                                          <img src={s.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <button onClick={() => setSetImgPreview(s.imageUrl)} title="Preview image"
                                          className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors">
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                          </svg>
                                        </button>
                                        <label title="Replace image" className="p-1 rounded text-zinc-700 hover:text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer">
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                          </svg>
                                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            const f = e.target.files?.[0]; if (!f) return;
                                            const reader = new FileReader();
                                            reader.onload = ev => setProcesses(p => p.map(pr => pr.id !== selProc.id ? pr : {
                                              ...pr, sets: pr.sets.map(ss => ss.id !== s.id ? ss : { ...ss, imageUrl: ev.target?.result as string }),
                                            }));
                                            reader.readAsDataURL(f);
                                          }} />
                                        </label>
                                        <button title="Remove image" onClick={() => setProcesses(p => p.map(pr => pr.id !== selProc.id ? pr : {
                                          ...pr, sets: pr.sets.map(ss => ss.id !== s.id ? ss : { ...ss, imageUrl: null }),
                                        }))} className="p-1 rounded text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                          </svg>
                                        </button>
                                      </>
                                    ) : (
                                      <label title="Add reference image" className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed cursor-pointer text-[10px] text-zinc-700 hover:text-zinc-500 hover:border-zinc-600 transition-colors" style={{ borderColor: '#2a2a2a' }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                        </svg>
                                        Photo
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                          const f = e.target.files?.[0]; if (!f) return;
                                          const reader = new FileReader();
                                          reader.onload = ev => setProcesses(p => p.map(pr => pr.id !== selProc.id ? pr : {
                                            ...pr, sets: pr.sets.map(ss => ss.id !== s.id ? ss : { ...ss, imageUrl: ev.target?.result as string }),
                                          }));
                                          reader.readAsDataURL(f);
                                        }} />
                                      </label>
                                    )}
                                  </div>}
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-0.5">{s.parts.length} parts · {fmtTime(totalMins)} · {(totalG / 1000).toFixed(2)} kg per project</p>
                              </div>
                              {/* Right fixed section */}
                              <div className="shrink-0 flex items-center gap-3 w-64 justify-end" onClick={e => e.stopPropagation()}>
                                {/* .3mf link */}
                                {editing3mfId === s.id ? (
                                  <div className="flex items-center gap-1">
                                    <input autoFocus value={tmfInput} onChange={e => setTmfInput(e.target.value)}
                                      placeholder="Paste Google Drive link…"
                                      style={{ backgroundColor: '#0d0d0f', borderColor: '#27272a' }}
                                      className="border rounded px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-emerald-400/40 w-36" />
                                    <button onClick={() => {
                                      setProcesses(p => p.map(pr => pr.id !== selProc.id ? pr : {
                                        ...pr, sets: pr.sets.map(ss => ss.id !== s.id ? ss : { ...ss, file3mfUrl: tmfInput.trim() || null }),
                                      }));
                                      setEditing3mfId(null);
                                    }} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors">Save</button>
                                    <button onClick={() => setEditing3mfId(null)} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">✕</button>
                                  </div>
                                ) : s.file3mfUrl ? (
                                  <div className="flex items-center gap-1">
                                    <a href={s.file3mfUrl} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-zinc-300 hover:text-white transition-colors"
                                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                      .3MF
                                    </a>
                                    <button onClick={() => { setEditing3mfId(s.id); setTmfInput(s.file3mfUrl ?? ''); }}
                                      className="p-1 rounded text-zinc-700 hover:text-zinc-400 transition-colors">
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                      </svg>
                                    </button>
                                    <button onClick={() => setStartJobSet(s)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                      Start Job
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => { setEditing3mfId(s.id); setTmfInput(''); }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed text-[10px] text-zinc-700 hover:text-zinc-500 hover:border-zinc-600 transition-colors" style={{ borderColor: '#2a2a2a' }}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    Link .3mf
                                  </button>
                                )}
                                <div className="flex gap-2 border-l pl-3" style={{ borderColor: '#27272a' }}>
                                  <button onClick={() => { setEditSetKey({ procId: selProc.id, setId: s.id }); setSetForm({ name: s.name, description: s.description }); setAddingSetTo(null); }}
                                    className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors">Edit</button>
                                  <button onClick={() => deleteSet(selProc.id, s.id)} className="text-xs text-zinc-700 hover:text-red-500 transition-colors">Delete</button>
                                </div>
                              </div>
                            </div>

                            {/* Edit set inline */}
                            {editSetKey?.setId === s.id && (
                              <div className="px-4 pb-3 flex gap-2 items-end border-t" style={{ borderColor: '#18181b' }}>
                                <div className="flex-1 pt-3 space-y-1.5">
                                  <input autoFocus value={setForm.name} onChange={e => setSetForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Project name" style={{ backgroundColor: '#0d0d0f', borderColor: '#27272a' }} className={`${inlineInp} w-full`} />
                                  <input value={setForm.description} onChange={e => setSetForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Description" style={{ backgroundColor: '#0d0d0f', borderColor: '#27272a' }} className={`${inlineInp} w-full`} />
                                </div>
                                <button onClick={saveSet} className="px-3 py-1.5 rounded-md text-[10px] font-bold bg-emerald-400 text-black shrink-0">Save</button>
                                <button onClick={() => { setEditSetKey(null); setSetForm({ name: '', description: '' }); }}
                                  className="px-3 py-1.5 rounded-md text-[10px] text-zinc-500 border shrink-0" style={{ borderColor: '#27272a' }}>Cancel</button>
                              </div>
                            )}

                            {/* BOM table */}
                            {expanded && (
                              <div className="border-t" style={{ borderColor: '#18181b' }}>
                                {s.parts.length === 0 ? (
                                  <p className="text-[10px] text-zinc-700 text-center py-4">No parts yet</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid #18181b' }}>
                                        {['Part Name', 'Material', 'Color', 'Time/pc', 'Weight/pc', 'Qty', 'STL', ''].map(h => (
                                          <th key={h} className="text-left px-4 py-2 text-[10px] font-medium text-zinc-600">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {s.parts.map(pt => (
                                        <React.Fragment key={pt.id}>
                                          <tr className="border-b hover:bg-white/[0.02] transition-colors group" style={{ borderColor: '#18181b' }}>
                                            <td className="px-4 py-2.5 text-zinc-200 font-medium">{pt.name}</td>
                                            <td className="px-4 py-2.5 text-zinc-500 font-mono">{pt.material}</td>
                                            <td className="px-4 py-2.5">
                                              <span className="w-4 h-4 rounded-full border border-white/10 inline-block" style={{ backgroundColor: pt.color || '#52525b' }} />
                                            </td>
                                            <td className="px-4 py-2.5 text-zinc-500">{fmtTime(pt.timePerPiece)}</td>
                                            <td className="px-4 py-2.5 text-zinc-500">{pt.weightPerPiece}g</td>
                                            <td className="px-4 py-2.5 text-zinc-400 font-bold">{pt.defaultQty}</td>
                                            <td className="px-4 py-2.5">
                                              <div className="flex items-center gap-1.5">
                                                {pt.stlDataUrl ? (
                                                  <>
                                                    <span className="text-[10px] text-emerald-500 font-mono">STL</span>
                                                    <button onClick={() => setStlViewPart(pt)} title="Preview 3D"
                                                      className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors">
                                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                                      </svg>
                                                    </button>
                                                    <label title="Replace STL" className="p-1 rounded text-zinc-700 hover:text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer">
                                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                                      </svg>
                                                      <input type="file" accept=".stl" className="hidden" onChange={e => {
                                                        const f = e.target.files?.[0]; if (!f) return;
                                                        const reader = new FileReader();
                                                        reader.onload = ev => {
                                                          const url = ev.target?.result as string;
                                                          setProcesses(p => p.map(pr => pr.id !== selProc.id ? pr : {
                                                            ...pr, sets: pr.sets.map(ss => ss.id !== s.id ? ss : {
                                                              ...ss, parts: ss.parts.map(pp => pp.id !== pt.id ? pp : { ...pp, stlDataUrl: url }),
                                                            }),
                                                          }));
                                                        };
                                                        reader.readAsDataURL(f);
                                                      }} />
                                                    </label>
                                                    <button title="Remove STL" onClick={() => setProcesses(p => p.map(pr => pr.id !== selProc.id ? pr : {
                                                      ...pr, sets: pr.sets.map(ss => ss.id !== s.id ? ss : {
                                                        ...ss, parts: ss.parts.map(pp => pp.id !== pt.id ? pp : { ...pp, stlDataUrl: null }),
                                                      }),
                                                    }))} className="p-1 rounded text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                                      </svg>
                                                    </button>
                                                  </>
                                                ) : (
                                                  <label className="flex items-center gap-1 px-2 py-1 rounded border border-dashed cursor-pointer text-[10px] text-zinc-700 hover:text-emerald-400 hover:border-emerald-400/30 transition-colors" style={{ borderColor: '#27272a' }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                                    </svg>
                                                    Upload
                                                    <input type="file" accept=".stl" className="hidden" onChange={e => {
                                                      const f = e.target.files?.[0]; if (!f) return;
                                                      const reader = new FileReader();
                                                      reader.onload = ev => {
                                                        const url = ev.target?.result as string;
                                                        setProcesses(p => p.map(pr => pr.id !== selProc.id ? pr : {
                                                          ...pr, sets: pr.sets.map(ss => ss.id !== s.id ? ss : {
                                                            ...ss, parts: ss.parts.map(pp => pp.id !== pt.id ? pp : { ...pp, stlDataUrl: url }),
                                                          }),
                                                        }));
                                                      };
                                                      reader.readAsDataURL(f);
                                                    }} />
                                                  </label>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                <button onClick={() => { setEditPartKey({ procId: selProc.id, setId: s.id, partId: pt.id }); setPartForm({ name: pt.name, material: pt.material, color: pt.color || '#a1a1aa', timePerPiece: String(pt.timePerPiece), weightPerPiece: String(pt.weightPerPiece), defaultQty: String(pt.defaultQty), stlDataUrl: pt.stlDataUrl }); setAddingPartTo(null); }}
                                                  className="text-zinc-600 hover:text-emerald-400 transition-colors">Edit</button>
                                                <button onClick={() => deletePart(selProc.id, s.id, pt.id)} className="text-zinc-700 hover:text-red-500 transition-colors">Delete</button>
                                              </div>
                                            </td>
                                          </tr>
                                          {/* Edit part inline row */}
                                          {editPartKey?.partId === pt.id && editPartKey.setId === s.id && (
                                            <tr style={{ backgroundColor: '#0d0d0f' }}>
                                              <td colSpan={8} className="px-4 py-3">
                                                <div className="grid grid-cols-7 gap-2 items-end">
                                                  <input value={partForm.name} onChange={e => setPartForm(p => ({ ...p, name: e.target.value }))} placeholder="Name"
                                                    style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} col-span-2`} autoFocus />
                                                  <select value={partForm.material} onChange={e => setPartForm(p => ({ ...p, material: e.target.value }))}
                                                    style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} cursor-pointer`}>
                                                    {matTypes.map(m => <option key={m}>{m}</option>)}
                                                  </select>
                                                  <div className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1" style={{ borderColor: '#27272a', backgroundColor: '#09090b' }}>
                                                    <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: partForm.color }} />
                                                    <input type="color" value={partForm.color} onChange={e => setPartForm(p => ({ ...p, color: e.target.value }))}
                                                      className="w-0 h-0 opacity-0 absolute" id="ep-color-pick" />
                                                    <label htmlFor="ep-color-pick" className="text-[10px] text-zinc-500 font-mono cursor-pointer hover:text-zinc-300 transition-colors">{partForm.color}</label>
                                                  </div>
                                                  <input value={partForm.timePerPiece} onChange={e => setPartForm(p => ({ ...p, timePerPiece: e.target.value }))} placeholder="min"
                                                    type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                                  <input value={partForm.weightPerPiece} onChange={e => setPartForm(p => ({ ...p, weightPerPiece: e.target.value }))} placeholder="g"
                                                    type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                                  <input value={partForm.defaultQty} onChange={e => setPartForm(p => ({ ...p, defaultQty: e.target.value }))} placeholder="qty"
                                                    type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                  <button onClick={savePart} className="px-3 py-1 rounded text-[10px] font-bold bg-emerald-400 text-black">Save</button>
                                                  <button onClick={() => { setEditPartKey(null); setPartForm({ name: '', material: DEFAULT_MAT_TYPES[0], color: '#a1a1aa', timePerPiece: '', weightPerPiece: '', defaultQty: '1', stlDataUrl: null }); }}
                                                    className="px-3 py-1 rounded text-[10px] text-zinc-500">Cancel</button>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      ))}
                                    </tbody>
                                  </table>
                                )}

                                {/* Add part form */}
                                {addingPartTo?.setId === s.id ? (
                                  <div className="px-4 py-3 border-t" style={{ borderColor: '#18181b' }}>
                                    <div className="grid grid-cols-7 gap-2 items-end">
                                      <input value={partForm.name} onChange={e => setPartForm(p => ({ ...p, name: e.target.value }))} placeholder="Part name"
                                        style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} col-span-2`} autoFocus />
                                      <select value={partForm.material} onChange={e => setPartForm(p => ({ ...p, material: e.target.value }))}
                                        style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} cursor-pointer`}>
                                        {matTypes.map(m => <option key={m}>{m}</option>)}
                                      </select>
                                      <div className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1" style={{ borderColor: '#27272a', backgroundColor: '#09090b' }}>
                                        <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: partForm.color }} />
                                        <input type="color" value={partForm.color} onChange={e => setPartForm(p => ({ ...p, color: e.target.value }))}
                                          className="w-0 h-0 opacity-0 absolute" id="ap-color-pick" />
                                        <label htmlFor="ap-color-pick" className="text-[10px] text-zinc-500 font-mono cursor-pointer hover:text-zinc-300 transition-colors">{partForm.color}</label>
                                      </div>
                                      <input value={partForm.timePerPiece} onChange={e => setPartForm(p => ({ ...p, timePerPiece: e.target.value }))} placeholder="min"
                                        type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                      <input value={partForm.weightPerPiece} onChange={e => setPartForm(p => ({ ...p, weightPerPiece: e.target.value }))} placeholder="g"
                                        type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                      <input value={partForm.defaultQty} onChange={e => setPartForm(p => ({ ...p, defaultQty: e.target.value }))} placeholder="qty"
                                        type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <button onClick={savePart} className="px-3 py-1 rounded text-[10px] font-bold bg-emerald-400 text-black">Add Part</button>
                                      <button onClick={() => { setAddingPartTo(null); setPartForm({ name: '', material: DEFAULT_MAT_TYPES[0], color: '#a1a1aa', timePerPiece: '', weightPerPiece: '', defaultQty: '1', stlDataUrl: null }); }}
                                        className="px-3 py-1 rounded text-[10px] text-zinc-500">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => { setAddingPartTo({ procId: selProc.id, setId: s.id }); setEditPartKey(null); }}
                                    className="w-full py-2.5 text-[10px] text-zinc-700 hover:text-emerald-400 transition-colors border-t" style={{ borderColor: '#18181b' }}>
                                    + Add Part
                                  </button>
                                )}

                                {/* ── Components ── */}
                                <div className="border-t" style={{ borderColor: '#27272a' }}>
                                  <div className="px-4 py-2 flex items-center justify-between">
                                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Components</p>
                                    <span className="text-[10px] text-zinc-700">{s.components.length} item{s.components.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  {s.components.length > 0 && (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid #18181b' }}>
                                          {['Name', 'Spec', 'Qty', ''].map(h => (
                                            <th key={h} className="text-left px-4 py-2 text-[10px] font-medium text-zinc-600">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {s.components.map(c => (
                                          <React.Fragment key={c.id}>
                                            <tr className="border-b hover:bg-white/[0.02] transition-colors group" style={{ borderColor: '#18181b' }}>
                                              <td className="px-4 py-2.5 text-zinc-200 font-medium">{c.name}</td>
                                              <td className="px-4 py-2.5 text-zinc-500 font-mono">{c.spec || '—'}</td>
                                              <td className="px-4 py-2.5 text-zinc-400 font-bold">{c.qty}</td>
                                              <td className="px-4 py-2.5">
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                  <button onClick={() => { setEditCompKey({ procId: selProc.id, setId: s.id, compId: c.id }); setCompForm({ name: c.name, spec: c.spec, qty: String(c.qty) }); setAddingCompTo(null); }}
                                                    className="text-zinc-600 hover:text-emerald-400 transition-colors">Edit</button>
                                                  <button onClick={() => deleteComp(selProc.id, s.id, c.id)} className="text-zinc-700 hover:text-red-500 transition-colors">Delete</button>
                                                </div>
                                              </td>
                                            </tr>
                                            {editCompKey?.compId === c.id && editCompKey.setId === s.id && (
                                              <tr style={{ backgroundColor: '#0d0d0f' }}>
                                                <td colSpan={4} className="px-4 py-3">
                                                  <div className="grid grid-cols-4 gap-2 items-end">
                                                    <input value={compForm.name} onChange={e => setCompForm(p => ({ ...p, name: e.target.value }))} placeholder="Name"
                                                      style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} col-span-2`} autoFocus />
                                                    <input value={compForm.spec} onChange={e => setCompForm(p => ({ ...p, spec: e.target.value }))} placeholder="Spec (e.g. M3×10)"
                                                      style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                                    <input value={compForm.qty} onChange={e => setCompForm(p => ({ ...p, qty: e.target.value }))} placeholder="qty"
                                                      type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                                  </div>
                                                  <div className="flex gap-2 mt-2">
                                                    <button onClick={saveComp} className="px-3 py-1 rounded text-[10px] font-bold bg-emerald-400 text-black">Save</button>
                                                    <button onClick={() => { setEditCompKey(null); setCompForm({ name: '', spec: '', qty: '1' }); }} className="px-3 py-1 rounded text-[10px] text-zinc-500">Cancel</button>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                  {addingCompTo?.setId === s.id ? (
                                    <div className="px-4 py-3 border-t" style={{ borderColor: '#18181b' }}>
                                      <div className="grid grid-cols-4 gap-2 items-end">
                                        <input value={compForm.name} onChange={e => setCompForm(p => ({ ...p, name: e.target.value }))} placeholder="Name (e.g. Bolt)"
                                          style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={`${inlineInp} col-span-2`} autoFocus />
                                        <input value={compForm.spec} onChange={e => setCompForm(p => ({ ...p, spec: e.target.value }))} placeholder="Spec (e.g. M3×10)"
                                          style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                        <input value={compForm.qty} onChange={e => setCompForm(p => ({ ...p, qty: e.target.value }))} placeholder="qty"
                                          type="number" style={{ backgroundColor: '#09090b', borderColor: '#27272a' }} className={inlineInp} />
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <button onClick={saveComp} className="px-3 py-1 rounded text-[10px] font-bold bg-emerald-400 text-black">Add Component</button>
                                        <button onClick={() => { setAddingCompTo(null); setCompForm({ name: '', spec: '', qty: '1' }); }} className="px-3 py-1 rounded text-[10px] text-zinc-500">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setAddingCompTo({ procId: selProc.id, setId: s.id }); setEditCompKey(null); }}
                                      className="w-full py-2.5 text-[10px] text-zinc-700 hover:text-emerald-400 transition-colors border-t" style={{ borderColor: '#18181b' }}>
                                      + Add Component
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Project */}
                      {addingSetTo === selProc.id ? (
                        <div className="border rounded-xl p-4 space-y-2" style={{ borderColor: '#27272a', backgroundColor: '#09090b' }}>
                          <input autoFocus value={setForm.name} onChange={e => setSetForm(p => ({ ...p, name: e.target.value }))} placeholder="Project name"
                            style={{ backgroundColor: '#0d0d0f', borderColor: '#27272a' }} className={`${inlineInp} w-full`} />
                          <input value={setForm.description} onChange={e => setSetForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)"
                            style={{ backgroundColor: '#0d0d0f', borderColor: '#27272a' }} className={`${inlineInp} w-full`} />
                          <div className="flex gap-2">
                            <button onClick={saveSet} className="px-4 py-1.5 rounded-md text-[10px] font-bold bg-emerald-400 text-black">Add Project</button>
                            <button onClick={() => { setAddingSetTo(null); setSetForm({ name: '', description: '' }); }}
                              className="px-4 py-1.5 rounded-md text-[10px] text-zinc-500 border" style={{ borderColor: '#27272a' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setAddingSetTo(selProc.id); setEditSetKey(null); }}
                          className="w-full py-3 rounded-xl text-xs font-medium text-zinc-600 border border-dashed hover:text-emerald-400 hover:border-emerald-400/40 transition-colors" style={{ borderColor: '#27272a' }}>
                          + Add Project
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Start Job modal */}
              {startJobSet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                  onClick={() => setStartJobSet(null)}>
                  <div className="rounded-2xl overflow-hidden w-full max-w-sm" style={{ backgroundColor: '#09090b', border: '1px solid #27272a' }}
                    onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-5 py-4 border-b" style={{ borderColor: '#18181b' }}>
                      <p className="text-xs text-zinc-600 mb-0.5">Start Job</p>
                      <p className="text-sm font-semibold text-white">{startJobSet.name}</p>
                    </div>
                    {/* Steps */}
                    <div className="p-5 space-y-4">
                      {/* Step 1 */}
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black bg-emerald-400">1</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-zinc-200 mb-1.5">Download .3mf to flashdrive</p>
                          {startJobSet.file3mfUrl ? (
                            <a href={startJobSet.file3mfUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#1a73e8' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Open in Google Drive
                            </a>
                          ) : <p className="text-[10px] text-zinc-700">No .3mf link set</p>}
                        </div>
                      </div>
                      {/* Step 2 */}
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black bg-emerald-400">2</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-zinc-200 mb-2">Prepare filament</p>
                          <div className="space-y-1.5">
                            {startJobSet.parts.map(pt => (
                              <div key={pt.id} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: pt.color || '#52525b' }} />
                                <span className="text-[10px] text-zinc-400 font-medium">{pt.name}</span>
                                <span className="text-[10px] text-zinc-600 font-mono ml-auto">{pt.material}</span>
                                <span className="text-[10px] text-zinc-700">×{pt.defaultQty}</span>
                              </div>
                            ))}
                            {startJobSet.parts.length === 0 && <p className="text-[10px] text-zinc-700">No parts defined</p>}
                          </div>
                        </div>
                      </div>
                      {/* Step 3 */}
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black bg-emerald-400">3</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-zinc-200 mb-1">Send to machine</p>
                          <p className="text-[10px] text-zinc-600">Insert flashdrive and start print from machine panel</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pb-5">
                      <button onClick={() => setStartJobSet(null)}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-500 border hover:text-zinc-300 transition-colors" style={{ borderColor: '#27272a' }}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* Confirm delete popup */}
              {confirmDelProc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
                  onClick={() => setConfirmDelProc(null)}>
                  <div style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className="border rounded-xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                    <p className="text-sm font-semibold text-white mb-1">Remove Process?</p>
                    <p className="text-xs text-zinc-500 mb-5">
                      <span className="text-zinc-300">"{processes.find(p => p.id === confirmDelProc)?.name}"</span> and all its sets will be permanently deleted.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setConfirmDelProc(null)}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-500 border hover:text-zinc-300 transition-colors" style={{ borderColor: '#27272a' }}>
                        Cancel
                      </button>
                      <button onClick={() => { deleteProc(confirmDelProc); setConfirmDelProc(null); }}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── PRINT LIST ───────────────────────────────────────────────────── */}
        {tab === 'print-list' && (
          <div className="p-8">
            <div className="mb-7">
              <h2 className="text-lg font-semibold text-white">Active Print Queue</h2>
              <p className="text-xs text-zinc-600 mt-0.5">Live status of all queued jobs</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div style={card} className="border rounded-xl p-5">
                <p className="text-xs text-zinc-600 mb-3">Total Jobs</p>
                <p className="text-3xl font-semibold text-white tabular-nums">{totalJobs}</p>
                <p className="text-xs text-zinc-600 mt-1.5">{waitingJobs} waiting</p>
              </div>
              <div style={card} className="border rounded-xl p-5">
                <p className="text-xs text-zinc-600 mb-3">Cumulative Wait</p>
                <p className="text-3xl font-semibold text-white tabular-nums">{fmtTime(cumulativeTime)}</p>
                <p className="text-xs text-zinc-600 mt-1.5">total queue time</p>
              </div>
              <div style={card} className="border rounded-xl p-5">
                <p className="text-xs text-zinc-600 mb-3">Machine Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${mcStatus === 'Printing' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'}`} />
                  <p className={`text-lg font-semibold ${mcStatus === 'Printing' ? 'text-emerald-400' : 'text-zinc-600'}`}>{mcStatus}</p>
                </div>
                {printingJob && <p className="text-xs text-zinc-600 mt-2 truncate font-mono">{printingJob.fileName}</p>}
              </div>
            </div>
            <div style={card} className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderColor: '#18181b' }} className="border-b">
                    {['#', 'File Name', 'Qty', 'Material', 'Duration', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => (
                    <tr key={job.id} style={{ borderColor: '#18181b' }}
                      className={`border-b last:border-0 transition-colors hover:bg-white/[0.02] ${job.status === 'Printing' ? 'bg-emerald-400/[0.03]' : ''}`}>
                      <td className="px-5 py-4 text-zinc-600 font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
                      <td className="px-5 py-4 font-mono text-xs text-zinc-300">{job.fileName}</td>
                      <td className="px-5 py-4 text-xs text-zinc-500">{job.quantity}×</td>
                      <td className="px-5 py-4"><span className={`text-xs font-medium ${MAT_BADGE[job.material]}`}>{job.material}</span></td>
                      <td className="px-5 py-4 text-xs text-zinc-500 font-mono">{fmtTime(job.totalTime)}</td>
                      <td className="px-5 py-4">
                        {job.status === 'Printing'
                          ? <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs font-medium text-emerald-400">Printing</span></span>
                          : <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500/40" /><span className="text-xs font-medium text-orange-500/60">Waiting</span></span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ────────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="p-8">
            <div className="mb-7">
              <h2 className="text-lg font-semibold text-white">Production Analytics</h2>
              <p className="text-xs text-zinc-600 mt-0.5">Performance and usage metrics</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Printer Efficiency',  value: `${ANALYTICS.efficiency}%`,        sub: 'uptime utilization', bar: ANALYTICS.efficiency        },
                { label: 'Weekly Success Rate', value: `${ANALYTICS.weeklySuccessRate}%`, sub: 'jobs completed',     bar: ANALYTICS.weeklySuccessRate  },
                { label: 'Material Used',       value: `${ANALYTICS.materialUsed} kg`,    sub: 'this month',         bar: null                         },
                { label: 'Operating Hours',     value: `${ANALYTICS.operatingHours}h`,    sub: 'total runtime',      bar: null                         },
              ].map(s => (
                <div key={s.label} style={card} className="border rounded-xl p-6">
                  <p className="text-xs text-zinc-600 mb-4">{s.label}</p>
                  <p className={`text-3xl font-semibold tabular-nums mb-1 ${s.bar !== null ? 'text-emerald-400' : 'text-white'}`}>{s.value}</p>
                  <p className="text-xs text-zinc-600">{s.sub}</p>
                  {s.bar !== null && (
                    <div className="mt-4 h-px rounded-full overflow-hidden" style={{ backgroundColor: '#18181b' }}>
                      <div className="h-full bg-emerald-400" style={{ width: `${s.bar}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div style={card} className="border rounded-xl p-6">
                <p className="text-xs text-zinc-600 mb-5">Jobs This Week</p>
                <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                  {ANALYTICS.weeklyJobs.map((count, i) => {
                    const pct   = (count / Math.max(...ANALYTICS.weeklyJobs)) * 100;
                    const today = i === TODAY_IDX;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full flex items-end" style={{ height: 64 }}>
                          <div className="w-full rounded-sm" style={{ height: `${pct}%`, backgroundColor: today ? '#34d399' : '#18181b' }} />
                        </div>
                        <span className={`text-xs ${today ? 'text-emerald-400' : 'text-zinc-700'}`}>{WEEK_DAYS[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={card} className="border rounded-xl p-6">
                <p className="text-xs text-zinc-600 mb-5">Material Breakdown</p>
                <div className="space-y-4">
                  {ANALYTICS.breakdown.map(m => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-zinc-400">{m.label}</span>
                        <span className="text-xs text-zinc-600 tabular-nums">{m.pct}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#18181b' }}>
                        <div className={`h-full ${m.cls} rounded-full`} style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ DETAIL ═══════════════════════════════════════════════════════════ */}
        {tab === 'detail' && (() => {

          /* Filament stock block — rendered inside right column or standalone */
          const filamentBlock = (
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Filament Stock</p>
                  {(() => {
                    const activeMaterialCount = matTypes.filter(mat => allGroups.some(g => g.material === mat)).length;
                    return (
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {totalRolls} {totalRolls === 1 ? 'roll' : 'rolls'} · {activeMaterialCount} {activeMaterialCount === 1 ? 'material' : 'materials'}
                      </p>
                    );
                  })()}
                </div>
                <button onClick={() => setShowFil(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-400 text-black hover:bg-emerald-300 transition-colors shrink-0">
                  + ADD FILAMENT
                </button>
              </div>

              {/* Material filter pills — only shown when rolls > 0 */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                {matTypes
                  .map(mat => ({ mat, rolls: allGroups.filter(g => g.material === mat).reduce((s, g) => s + g.totalRolls, 0) }))
                  .filter(({ rolls }) => rolls > 0)
                  .map(({ mat }) => {
                    const active = activeMat === mat;
                    return (
                      <button key={mat} onClick={() => setActiveMat(mat)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          active ? 'bg-emerald-400 text-black' : 'border text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                        }`}
                        style={!active ? { borderColor: '#18181b' } : {}}>
                        {mat}
                      </button>
                    );
                  })
                }
              </div>

              {/* Filament rows */}
              <div style={card} className="border rounded-xl overflow-hidden">
                {filteredGroups.length === 0 ? (
                  <div className="py-10 text-center text-zinc-600 text-xs">
                    No {activeMat} filaments. Click <span className="text-emerald-400">+ ADD FILAMENT</span> to add one.
                  </div>
                ) : filteredGroups.map(g => {
                  const sealedCount = g.totalRolls - g.openedCount;
                  const displayCount = Math.min(g.totalRolls, 8);
                  const extra = g.totalRolls - displayCount;
                  return (
                  <div key={g.key}
                    className="group grid border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: '#18181b', gridTemplateColumns: '112px 192px 1fr' }}>

                    {/* Col 1 — quantity, fixed 112 px, full-height right border */}
                    <div className="flex items-center pl-5 pr-4 py-3.5 border-r" style={{ borderColor: '#27272a' }}>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-white tabular-nums leading-none">{g.totalRolls}</span>
                        <span className="text-[11px] text-zinc-600 leading-none">{g.totalRolls === 1 ? 'Roll' : 'Rolls'}</span>
                      </div>
                    </div>

                    {/* Col 2 — color name + brand, fixed 192 px */}
                    <div className="flex flex-col justify-center px-5 py-3.5">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{g.colorName}</p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{g.brand}</p>
                    </div>

                    {/* Col 3 — shapes left-anchored, hex+actions right-anchored (1fr) */}
                    <div className="flex items-center py-3.5 pr-5">
                      <div className="flex gap-2 items-center">
                        {Array.from({ length: displayCount }, (_, i) => {
                          const opened = i >= sealedCount;
                          return (
                            <div key={i} className="w-7 h-7 shrink-0"
                              style={opened
                                ? { backgroundColor: g.hexCode, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }
                                : { backgroundColor: g.hexCode, borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }
                              }
                            />
                          );
                        })}
                        {extra > 0 && <span className="text-xs text-zinc-600 tabular-nums">+{extra}</span>}
                      </div>
                      <div className="flex-1" />
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-700 font-mono hidden sm:block">{g.hexCode.toUpperCase()}</span>
                        <span className={`text-xs font-medium text-orange-400/80 w-6 text-center ${g.totalRolls === 1 && g.openedCount === 1 ? 'visible' : 'invisible'}`}>
                          Low
                        </span>
                        <button onClick={() => openEditFilGroup(g)}
                          className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100">
                          Edit
                        </button>
                        <button onClick={() => deleteFilamentGroup(g.ids)}
                          className="text-xs text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          Delete
                        </button>
                      </div>
                    </div>

                  </div>
                  );
                })}
              </div>
            </div>
          );

          return (
            <div className="p-8">

              {/* ── Machine header ── */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Machines</h2>
                  <p className="text-xs text-zinc-600 mt-0.5">{machines.length} printers registered</p>
                </div>
                <button onClick={() => setShowMachine(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-400 text-black hover:bg-emerald-300 transition-colors shrink-0">
                  + ADD MACHINE
                </button>
              </div>

              {machines.length === 0 ? (
                <>
                  {/* Empty state */}
                  <div style={card} className="border rounded-xl py-16 flex flex-col items-center gap-3 mb-8">
                    <span className="text-4xl opacity-10">🖨</span>
                    <p className="text-xs text-zinc-600">No machines registered yet.</p>
                    <button onClick={() => setShowMachine(true)} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      + Add your first machine
                    </button>
                  </div>
                  {/* Filament stock shown standalone when no machines */}
                  <div style={card} className="border rounded-xl overflow-hidden">
                    {filamentBlock}
                  </div>
                </>
              ) : (() => {
                const mc = machines[mcPage];
                const extFil = getFil(mc.externalSpool);
                return (
                  <>
                    {/* ── Carousel nav ── */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMcPage(p => Math.max(0, p - 1))}
                          disabled={mcPage === 0}
                          className="w-7 h-7 flex items-center justify-center rounded-md border text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-sm"
                          style={{ borderColor: '#27272a' }}
                        >←</button>
                        <span className="text-xs text-zinc-600 tabular-nums font-mono px-1">
                          {mcPage + 1} / {machines.length}
                        </span>
                        <button
                          onClick={() => setMcPage(p => Math.min(machines.length - 1, p + 1))}
                          disabled={mcPage === machines.length - 1}
                          className="w-7 h-7 flex items-center justify-center rounded-md border text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-sm"
                          style={{ borderColor: '#27272a' }}
                        >→</button>
                      </div>
                      <span />
                    </div>

                    {/* ── Unified card: LEFT specs | RIGHT column (AMS ÷ Filament Stock) ── */}
                    <div style={card} className="border rounded-xl overflow-hidden flex">

                      {/* LEFT — Specs (carousel-controlled) */}
                      <div className="w-56 shrink-0 border-r flex flex-col" style={{ borderColor: '#18181b', backgroundColor: '#080808' }}>

                        <div className="h-36 flex items-center justify-center relative shrink-0 group/img" style={{ borderBottom: '1px solid #18181b' }}>
                          {mc.imageUrl
                            ? <img src={mc.imageUrl} alt={`${mc.brand} ${mc.model}`} className="h-full w-full object-contain" /> // eslint-disable-line @next/next/no-img-element
                            : <div className="flex flex-col items-center gap-1.5 select-none">
                                <span className="text-5xl opacity-10">🖨</span>
                                <span className="text-xs text-zinc-700 font-medium">{mc.brand}</span>
                              </div>
                          }
                          <span className="absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 font-mono tabular-nums">{mcPage + 1}</span>
                          {mc.hasAMS && (
                            <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">AMS</span>
                          )}
                          {mc.imageUrl && (
                            <button
                              onClick={() => setMachines(p => p.map(m => m.id !== mc.id ? m : { ...m, imageUrl: '' }))}
                              className="absolute top-2 left-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-zinc-800/90 hover:bg-red-900/80 text-zinc-400 hover:text-red-400 text-xs z-10"
                            >×</button>
                          )}
                          <label className="absolute inset-0 flex items-end justify-center pb-2 cursor-pointer opacity-0 group-hover/img:opacity-100 transition-opacity"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
                            <span className="text-[10px] text-zinc-300 font-medium">
                              {mc.imageUrl ? 'Change photo' : '+ Add photo'}
                            </span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => setMachines(p => p.map(m => m.id !== mc.id ? m : { ...m, imageUrl: reader.result as string }));
                                reader.readAsDataURL(file);
                              }} />
                          </label>
                        </div>

                        <div className="p-4 flex-1 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{mc.brand}</p>
                              <h3 className="text-base font-semibold text-white mt-0.5 leading-tight">{mc.model}</h3>
                              {mc.hasAMS && mc.amsModel && <p className="text-xs text-emerald-400/60 mt-1">{mc.amsModel}</p>}
                              {!mc.hasAMS && <p className="text-xs text-zinc-700 mt-1">Single filament</p>}
                              <div className="flex items-center gap-3 mt-2">
                                {mc.specLink && (
                                  <a href={mc.specLink} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition-colors">
                                    Specs ↗
                                  </a>
                                )}
                                <button onClick={() => deleteMachine(mc.id)}
                                  className="text-xs text-zinc-600 hover:text-red-500 transition-colors">
                                  Delete
                                </button>
                              </div>
                            </div>
                            {/* EXT card */}
                            <div className="shrink-0 relative group w-14">
                              <div
                                role="button" tabIndex={0}
                                onClick={() => { setPickerSlot({ machineId: mc.id, idx: -1 }); setSlotSearch(''); }}
                                onKeyDown={e => e.key === 'Enter' && (setPickerSlot({ machineId: mc.id, idx: -1 }), setSlotSearch(''))}
                                className="rounded-lg p-2 cursor-pointer transition-all select-none"
                                style={{
                                  border: extFil ? `1px solid ${extFil.hexCode}40` : '1px dashed #27272a',
                                  backgroundColor: extFil ? `${extFil.hexCode}10` : 'transparent',
                                  minHeight: 80,
                                }}
                              >
                                <span className="block text-[10px] text-zinc-700 font-mono mb-1.5">EXT</span>
                                {extFil ? (
                                  <>
                                    <div className="w-full h-3 rounded mb-1.5 border border-white/10" style={{ backgroundColor: extFil.hexCode }} />
                                    <p className="text-[10px] text-zinc-200 truncate leading-tight font-medium">{extFil.colorName}</p>
                                    <p className="text-[10px] text-zinc-600 truncate mt-0.5">{extFil.brand}</p>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center h-10 text-zinc-700 text-lg">+</div>
                                )}
                              </div>
                              {extFil && (
                                <button
                                  onClick={() => setRemoveSlot({ machineId: mc.id, idx: -1, filamentId: mc.externalSpool! })}
                                  className="absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] z-10"
                                >×</button>
                              )}
                            </div>
                          </div>

                          {(mc.buildVolume.width || mc.buildVolume.depth || mc.buildVolume.height) ? (
                            <div className="pt-2 border-t" style={{ borderColor: '#18181b' }}>
                              <p className="text-xs text-zinc-600 mb-0.5">Build Volume (W×D×H)</p>
                              <p className="text-xs text-zinc-400 font-mono tabular-nums">
                                {mc.buildVolume.width}mm × {mc.buildVolume.depth}mm × {mc.buildVolume.height}mm
                              </p>
                            </div>
                          ) : null}

                          <div className="pt-2 border-t" style={{ borderColor: '#18181b' }}>
                            <p className="text-xs text-zinc-600 mb-2">Owned Nozzles</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {NOZZLE_SIZES.map(size => {
                                const owned = mc.nozzles.includes(size);
                                return (
                                  <label key={size}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors"
                                    style={{ borderColor: owned ? '#34d39935' : '#18181b', backgroundColor: owned ? '#34d39908' : 'transparent' }}>
                                    <span className={`text-xs font-mono tabular-nums transition-colors ${owned ? 'text-emerald-400' : 'text-zinc-700'}`}>{size}</span>
                                    <input type="checkbox" checked={owned}
                                      onChange={e => setMachines(p => p.map(m => m.id !== mc.id ? m : {
                                        ...m,
                                        nozzles: e.target.checked ? [...m.nozzles, size] : m.nozzles.filter(n => n !== size),
                                      }))}
                                      className="w-3.5 h-3.5 cursor-pointer accent-emerald-400" />
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                        </div>


                      </div>

                      {/* RIGHT — flex column: AMS slots (top) + Filament Stock (bottom, static) */}
                      <div className="flex-1 flex flex-col min-w-0">

                        {/* AMS slots — carousel-controlled */}
                        <div className="p-5">
                          {mc.hasAMS ? (
                            <>
                              <p className="text-xs text-zinc-600 mb-4 font-medium uppercase tracking-wider">
                                {mc.amsModel || 'Add-on'} — Filament Slots
                              </p>
                              <div className="grid grid-cols-5 gap-3">
                                {/* AMS unit image — slot 0 position */}
                                <div className="relative group/ams">
                                  <div className="rounded-xl overflow-hidden transition-all select-none"
                                    style={{ border: '1px solid #27272a', height: 130, backgroundColor: '#0a0a0a' }}>
                                    {mc.amsImageUrl
                                      ? <img src={mc.amsImageUrl} alt={mc.amsModel} className="w-full h-full object-contain" /> // eslint-disable-line @next/next/no-img-element
                                      : <div className="flex flex-col items-center justify-center gap-1.5 h-full">
                                          <span className="text-3xl opacity-10">◈</span>
                                          <span className="text-[10px] text-zinc-700 font-medium text-center leading-tight">{mc.amsModel}</span>
                                        </div>
                                    }
                                    <label className="absolute inset-0 flex items-end justify-center pb-2 cursor-pointer opacity-0 group-hover/ams:opacity-100 transition-opacity"
                                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }}>
                                      <span className="text-[10px] text-zinc-300 font-medium">
                                        {mc.amsImageUrl ? 'Change' : '+ Photo'}
                                      </span>
                                      <input type="file" accept="image/*" className="hidden"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = () => setMachines(p => p.map(m => m.id !== mc.id ? m : { ...m, amsImageUrl: reader.result as string }));
                                          reader.readAsDataURL(file);
                                        }} />
                                    </label>
                                  </div>
                                  {mc.amsImageUrl && (
                                    <button
                                      onClick={() => setMachines(p => p.map(m => m.id !== mc.id ? m : { ...m, amsImageUrl: '' }))}
                                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/ams:opacity-100 transition-opacity bg-zinc-800/90 hover:bg-red-900/80 text-zinc-400 hover:text-red-400 text-xs z-10"
                                    >×</button>
                                  )}
                                </div>
                                {mc.amsSlots.map((fId, idx) => {
                                  const fil = getFil(fId);
                                  return (
                                    <div key={idx} className="relative group">
                                      <div
                                        role="button" tabIndex={0}
                                        onClick={() => { setPickerSlot({ machineId: mc.id, idx }); setSlotSearch(''); }}
                                        onKeyDown={e => e.key === 'Enter' && setPickerSlot({ machineId: mc.id, idx })}
                                        className="rounded-xl p-3 cursor-pointer transition-all select-none"
                                        style={{
                                          border: fil ? `1px solid ${fil.hexCode}40` : '1px dashed #27272a',
                                          backgroundColor: fil ? `${fil.hexCode}10` : 'transparent',
                                          height: 130,
                                        }}
                                      >
                                        <span className="block text-xs text-zinc-700 font-mono mb-2">{idx + 1}</span>
                                        {fil ? (
                                          <>
                                            <div className="w-full h-4 rounded mb-2 border border-white/10" style={{ backgroundColor: fil.hexCode }} />
                                            <p className="text-xs text-zinc-200 truncate leading-tight font-medium">{fil.colorName}</p>
                                            <p className="text-xs text-zinc-600 truncate mt-0.5">{fil.brand}</p>
                                            <p className="text-[10px] text-zinc-700 truncate mt-1 font-mono">{fil.material}</p>
                                          </>
                                        ) : (
                                          <div className="flex items-center justify-center h-14 text-zinc-700 text-xl">+</div>
                                        )}
                                      </div>
                                      {fil && (
                                        <button
                                          onClick={e => { e.stopPropagation(); setRemoveSlot({ machineId: mc.id, idx, filamentId: fId! }); }}
                                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs z-10"
                                        >×</button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                              <span className="text-zinc-800 text-3xl">◈</span>
                              <p className="text-xs text-zinc-600">No AMS / add-on configured</p>
                              <p className="text-xs text-zinc-700">Single filament machine</p>
                            </div>
                          )}


                        </div>

                        {/* Filament Stock — static, never re-renders on page change */}
                        <div className="border-t" style={{ borderColor: '#18181b' }}>
                          {filamentBlock}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          );
        })()}

      </main>

      {/* ══ MODAL — IMAGE PREVIEW ════════════════════════════════════════════ */}
      {setImgPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
          onClick={() => setSetImgPreview(null)}>
          <div className="relative rounded-2xl overflow-hidden max-w-2xl max-h-[80vh]" style={{ border: '1px solid #27272a' }}
            onClick={e => e.stopPropagation()}>
            <img src={setImgPreview} className="max-w-full max-h-[80vh] object-contain block" />
            <button onClick={() => setSetImgPreview(null)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition-colors text-base" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>×</button>
          </div>
        </div>
      )}

      {/* ══ MODAL — STL 3D VIEWER ════════════════════════════════════════════ */}
      {stlViewPart && stlViewPart.stlDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setStlViewPart(null)}>
          <div className="relative flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: '#09090b', border: '1px solid #27272a', width: 600, height: 540 }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: '#18181b' }}>
              <div>
                <p className="text-sm font-semibold text-white">{stlViewPart.name}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{stlViewPart.material} · drag to rotate · scroll to zoom</p>
              </div>
              <button onClick={() => setStlViewPart(null)} className="text-zinc-600 hover:text-white transition-colors text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <STLViewer dataUrl={stlViewPart.stlDataUrl} color={stlViewPart.color || '#34d399'} />
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL — ADD FILAMENT ═════════════════════════════════════════════ */}
      {showFil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowFil(false)}>
          <div style={card} className="border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">Add Filament</h3>
              <button onClick={() => setShowFil(false)} className="text-zinc-600 hover:text-zinc-300 text-xl leading-none transition-colors">×</button>
            </div>
            <form onSubmit={submitFilament} className="space-y-4">
              {/* Material type */}
              <div>
                <label className={lbl}>Material Type</label>
                <select
                  value={filForm.isNewType ? '__new__' : filForm.material}
                  onChange={e => {
                    if (e.target.value === '__new__') setFilForm(p => ({ ...p, isNewType: true }));
                    else setFilForm(p => ({ ...p, material: e.target.value, isNewType: false }));
                  }}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={inp}>
                  {matTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__new__">＋ Add New Type…</option>
                </select>
                {filForm.isNewType && (
                  <input type="text" placeholder="New type name (e.g. ASA)" value={filForm.newType}
                    onChange={e => setFilForm(p => ({ ...p, newType: e.target.value }))}
                    style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} mt-2`} required autoFocus />
                )}
              </div>

              {/* Brand */}
              <div>
                <label className={lbl}>Brand</label>
                <select value={filForm.isNewBrand ? '__new__' : filForm.brand}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setFilForm(p => ({ ...p, isNewBrand: true, brand: '' }));
                    } else {
                      setFilForm(p => ({ ...p, isNewBrand: false, brand: e.target.value, newBrand: '' }));
                    }
                  }}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`} required={!filForm.isNewBrand}>
                  <option value="" disabled>Select brand…</option>
                  {filBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__new__">+ Add Custom Brand</option>
                </select>
                {filForm.isNewBrand && (
                  <input type="text" placeholder="Brand name" value={filForm.newBrand}
                    onChange={e => setFilForm(p => ({ ...p, newBrand: e.target.value }))}
                    style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} mt-2`} required />
                )}
              </div>

              {/* Color name + hex */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Color Name</label>
                  <select value={filForm.isCustomColor ? '__custom__' : filForm.colorName}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        setFilForm(p => ({ ...p, isCustomColor: true, colorName: '' }));
                      } else {
                        setFilForm(p => ({ ...p, isCustomColor: false, colorName: e.target.value, hexCode: COLOR_MAP[e.target.value] ?? p.hexCode }));
                      }
                    }}
                    style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`} required={!filForm.isCustomColor}>
                    <option value="" disabled>Select color…</option>
                    {Object.keys(COLOR_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__custom__">+ Custom Color</option>
                  </select>
                  {filForm.isCustomColor && (
                    <input type="text" placeholder="Color name" value={filForm.colorName}
                      onChange={e => setFilForm(p => ({ ...p, colorName: e.target.value }))}
                      style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} mt-2`} required />
                  )}
                </div>
                <div>
                  <label className={lbl}>Hex Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={filForm.hexCode}
                      onChange={e => setFilForm(p => ({ ...p, hexCode: e.target.value }))}
                      className="w-10 h-9 rounded cursor-pointer p-0.5 border-0 shrink-0"
                      style={{ backgroundColor: '#09090b' }} />
                    <input type="text" value={filForm.hexCode}
                      onChange={e => setFilForm(p => ({ ...p, hexCode: e.target.value }))}
                      style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                      className={`${inp} font-mono`} placeholder="#34D399" />
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className={lbl}>Quantity <span className="text-zinc-700">(Rolls)</span></label>
                <input type="number" min="1" step="1" placeholder="1" value={filForm.quantity}
                  onChange={e => setFilForm(p => ({ ...p, quantity: e.target.value }))}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={inp} required />
              </div>

              {/* Preview swatch */}
              {filForm.colorName && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={panel}>
                  <div className="w-8 h-8 rounded-md border border-white/10 shrink-0" style={{ backgroundColor: filForm.hexCode }} />
                  <div>
                    <p className="text-xs text-zinc-200">{filForm.colorName}</p>
                    <p className="text-xs text-zinc-600">{filForm.brand || '—'} · {filForm.isNewType ? filForm.newType || '…' : filForm.material}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowFil(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-500 border hover:text-zinc-300 transition-colors" style={{ borderColor: '#18181b' }}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-400 text-black hover:bg-emerald-300 transition-colors">
                  Add Filament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL — EDIT FILAMENT ═══════════════════════════════════════════ */}
      {editFil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setEditFil(null)}>
          <div style={card} className="border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Edit Filament</h3>
                <p className="text-xs text-zinc-600 mt-0.5">{editFil.colorName} · {editFil.material}</p>
              </div>
              <button onClick={() => setEditFil(null)} className="text-zinc-600 hover:text-zinc-300 text-xl leading-none transition-colors">×</button>
            </div>
            <form onSubmit={submitEditFil} className="space-y-4">

              {/* Material type */}
              <div>
                <label className={lbl}>Material Type</label>
                <select value={editFilForm.material}
                  onChange={e => setEditFilForm(p => ({ ...p, material: e.target.value }))}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`}>
                  {matTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className={lbl}>Brand</label>
                <select value={editFilForm.isNewBrand ? '__new__' : editFilForm.brand}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setEditFilForm(p => ({ ...p, isNewBrand: true, brand: '' }));
                    } else {
                      setEditFilForm(p => ({ ...p, isNewBrand: false, brand: e.target.value, newBrand: '' }));
                    }
                  }}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`} required={!editFilForm.isNewBrand}>
                  <option value="" disabled>Select brand…</option>
                  {filBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__new__">+ Add Custom Brand</option>
                </select>
                {editFilForm.isNewBrand && (
                  <input type="text" placeholder="Brand name" value={editFilForm.newBrand}
                    onChange={e => setEditFilForm(p => ({ ...p, newBrand: e.target.value }))}
                    style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} mt-2`} required />
                )}
              </div>

              {/* Color name + hex */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Color Name</label>
                  <select value={editFilForm.isCustomColor ? '__custom__' : editFilForm.colorName}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        setEditFilForm(p => ({ ...p, isCustomColor: true, colorName: '' }));
                      } else {
                        setEditFilForm(p => ({ ...p, isCustomColor: false, colorName: e.target.value, hexCode: COLOR_MAP[e.target.value] ?? p.hexCode }));
                      }
                    }}
                    style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`} required={!editFilForm.isCustomColor}>
                    <option value="" disabled>Select color…</option>
                    {Object.keys(COLOR_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__custom__">+ Custom Color</option>
                  </select>
                  {editFilForm.isCustomColor && (
                    <input type="text" placeholder="Color name" value={editFilForm.colorName}
                      onChange={e => setEditFilForm(p => ({ ...p, colorName: e.target.value }))}
                      style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} mt-2`} required />
                  )}
                </div>
                <div>
                  <label className={lbl}>Hex Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={editFilForm.hexCode}
                      onChange={e => setEditFilForm(p => ({ ...p, hexCode: e.target.value }))}
                      className="w-10 h-9 rounded cursor-pointer p-0.5 border-0 shrink-0"
                      style={{ backgroundColor: '#09090b' }} />
                    <input type="text" value={editFilForm.hexCode}
                      onChange={e => setEditFilForm(p => ({ ...p, hexCode: e.target.value }))}
                      style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                      className={`${inp} font-mono`} placeholder="#34D399" />
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className={lbl}>Quantity <span className="text-zinc-700">(Rolls)</span></label>
                <input type="number" min="1" step="1" value={editFilForm.quantity}
                  onChange={e => setEditFilForm(p => ({ ...p, quantity: e.target.value }))}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={inp} required />
              </div>

              {/* Preview swatch */}
              {editFilForm.colorName && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={panel}>
                  <div className="w-8 h-8 rounded-md border border-white/10 shrink-0" style={{ backgroundColor: editFilForm.hexCode }} />
                  <div>
                    <p className="text-xs text-zinc-200">{editFilForm.colorName}</p>
                    <p className="text-xs text-zinc-600">{editFilForm.brand || '—'} · {editFilForm.material}</p>
                  </div>
                  <span className="ml-auto text-xs text-zinc-600 font-mono tabular-nums">
                    {parseInt(editFilForm.quantity) || 1} {parseInt(editFilForm.quantity) === 1 ? 'Roll' : 'Rolls'}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditFil(null)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-500 border hover:text-zinc-300 transition-colors" style={{ borderColor: '#18181b' }}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-400 text-black hover:bg-emerald-300 transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL — ADD MACHINE ══════════════════════════════════════════════ */}
      {showMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowMachine(false)}>
          <div style={card} className="border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">Add Machine</h3>
              <button onClick={() => setShowMachine(false)} className="text-zinc-600 hover:text-zinc-300 text-xl leading-none transition-colors">×</button>
            </div>
            <form onSubmit={submitMachine} className="space-y-4">

              {/* ── Brand dropdown ── */}
              <div>
                <label className={lbl}>Machine Brand</label>
                <select
                  value={mcForm.isNewBrand ? '__new__' : mcForm.brand}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setMcForm(p => ({ ...p, isNewBrand: true, brand: '', model: '', isNewModel: false, newModel: '' }));
                    } else {
                      setMcForm(p => ({ ...p, brand: e.target.value, isNewBrand: false, newBrand: '', model: '', isNewModel: false, newModel: '' }));
                    }
                  }}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                  className={`${inp} cursor-pointer`}
                  required={!mcForm.isNewBrand}
                >
                  <option value="">Select brand…</option>
                  {mcBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__new__">＋ Add Custom Brand…</option>
                </select>
                {mcForm.isNewBrand && (
                  <input
                    type="text" placeholder="e.g. Voron Design" value={mcForm.newBrand}
                    onChange={e => setMcForm(p => ({ ...p, newBrand: e.target.value }))}
                    style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                    className={`${inp} mt-2`} required autoFocus
                  />
                )}
              </div>

              {/* ── Model dropdown ── */}
              <div>
                <label className={lbl}>Machine Model</label>
                {mcForm.isNewBrand ? (
                  <input
                    type="text" placeholder="e.g. Trident 300" value={mcForm.newModel}
                    onChange={e => setMcForm(p => ({ ...p, newModel: e.target.value }))}
                    style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                    className={inp} required
                  />
                ) : (
                  <>
                    <select
                      value={mcForm.isNewModel ? '__new__' : mcForm.model}
                      onChange={e => {
                        if (e.target.value === '__new__') {
                          setMcForm(p => ({ ...p, isNewModel: true, model: '' }));
                        } else {
                          setMcForm(p => ({ ...p, model: e.target.value, isNewModel: false, newModel: '' }));
                        }
                      }}
                      disabled={!mcForm.brand}
                      required={!!mcForm.brand && !mcForm.isNewModel}
                      style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                      className={`${inp} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <option value="">{mcForm.brand ? 'Select model…' : 'Select a brand first'}</option>
                      {(mcCatalog[mcForm.brand] ?? []).map(m => <option key={m} value={m}>{m}</option>)}
                      {mcForm.brand && <option value="__new__">＋ Add Custom Model…</option>}
                    </select>
                    {mcForm.isNewModel && (
                      <input
                        type="text" placeholder="e.g. MK4S Upgrade" value={mcForm.newModel}
                        onChange={e => setMcForm(p => ({ ...p, newModel: e.target.value }))}
                        style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                        className={`${inp} mt-2`} required autoFocus
                      />
                    )}
                  </>
                )}
              </div>

              {/* ── Build volume ── */}
              <div>
                <label className={lbl}>Build Volume <span className="text-zinc-700">(mm)</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(['width', 'depth', 'height'] as const).map(axis => (
                    <div key={axis}>
                      <p className="text-xs text-zinc-700 mb-1 capitalize">{axis}</p>
                      <input
                        type="number" min="0" step="1"
                        placeholder={axis === 'width' ? '256' : axis === 'depth' ? '256' : '256'}
                        value={mcForm.buildVolume[axis]}
                        onChange={e => setMcForm(p => ({ ...p, buildVolume: { ...p.buildVolume, [axis]: e.target.value } }))}
                        style={{ backgroundColor: '#09090b', borderColor: '#18181b' }}
                        className={inp}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Spec link ── */}
              <div>
                <label className={lbl}>Specification Link <span className="text-zinc-700">(URL)</span></label>
                <input type="url" placeholder="https://..." value={mcForm.specLink}
                  onChange={e => setMcForm(p => ({ ...p, specLink: e.target.value }))}
                  style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={inp} />
              </div>

              {/* ── AMS toggle ── */}
              <div
                className="flex items-center justify-between p-3.5 rounded-lg cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
                style={{ border: `1px solid ${mcForm.hasAMS ? '#34d39930' : '#18181b'}`, backgroundColor: '#0d0d0f' }}
                onClick={() => setMcForm(p => ({ ...p, hasAMS: !p.hasAMS }))}
              >
                <div>
                  <p className="text-xs font-medium text-zinc-300">Includes AMS / Add-on?</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Automatic Material System or filament switcher</p>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ml-4 ${mcForm.hasAMS ? 'bg-emerald-400' : 'bg-zinc-800'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mcForm.hasAMS ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>

              {/* ── AMS sub-fields ── */}
              {mcForm.hasAMS && (
                <div className="space-y-3 pl-3 border-l-2 border-emerald-400/20">
                  <div>
                    <label className={lbl}>AMS Model</label>
                    <select
                      value={mcForm.amsModel}
                      onChange={e => setMcForm(p => ({ ...p, amsModel: e.target.value }))}
                      style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className={`${inp} cursor-pointer`}
                    >
                      <option value="" disabled>Select AMS model…</option>
                      <option value="AMS Lite">AMS Lite</option>
                      <option value="AMS">AMS</option>
                      <option value="AMS 2 PRO">AMS 2 PRO</option>
                      <option value="AMS HT">AMS HT</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowMachine(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-500 border hover:text-zinc-300 transition-colors" style={{ borderColor: '#18181b' }}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-400 text-black hover:bg-emerald-300 transition-colors">
                  Add Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL — REMOVE SPOOL CHOICE ════════════════════════════════════ */}
      {removeSlot && (() => {
        const fil = filaments.find(f => f.id === removeSlot.filamentId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
            onClick={() => setRemoveSlot(null)}>
            <div style={{ backgroundColor: '#09090b', borderColor: '#18181b' }} className="border rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-white mb-1">Remove from AMS Slot</h3>
              {fil && (
                <div className="flex items-center gap-2.5 mb-5 mt-3 p-3 rounded-lg" style={{ backgroundColor: '#0d0d0f', border: '1px solid #18181b' }}>
                  <div className="w-6 h-6 rounded shrink-0 border border-white/10" style={{ backgroundColor: fil.hexCode }} />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-200 truncate font-medium">
                      {fil.colorName}
                      {fil.isOpened && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <p className="text-xs text-zinc-600 truncate">{fil.brand} · {fil.material}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-zinc-500 mb-5">What should happen to this spool?</p>
              <div className="space-y-2.5">
                <button onClick={confirmReturnToStock}
                  className="w-full flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/[0.04]"
                  style={{ borderColor: '#27272a' }}>
                  <span className="text-emerald-400 text-base leading-none mt-0.5 shrink-0">↩</span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Return to Stock</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Move back to inventory. Marked with <span className="text-red-500">*</span> as an opened spool.</p>
                  </div>
                </button>
                <button onClick={confirmSlotEmpty}
                  className="w-full flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors hover:border-red-500/30 hover:bg-red-500/[0.04]"
                  style={{ borderColor: '#27272a' }}>
                  <span className="text-red-500/70 text-base leading-none mt-0.5 shrink-0">✕</span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400">Spool Fully Used / Empty</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Permanently delete this filament entry from inventory.</p>
                  </div>
                </button>
              </div>
              <button onClick={() => setRemoveSlot(null)}
                className="w-full mt-4 py-2 text-xs text-zinc-700 hover:text-zinc-400 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* ══ MODAL — AMS SLOT PICKER ══════════════════════════════════════════ */}
      {pickerSlot && (() => {
        const pickerMats = Object.keys(groupedModalFils);
        const activeMat = pickerMats.includes(pickerMat) ? pickerMat : (pickerMats[0] ?? '');
        const activeGroups = groupedModalFils[activeMat] ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            onClick={() => { setPickerSlot(null); setSlotSearch(''); }}>
            <div style={{ ...card, maxHeight: '80vh' }} className="border rounded-xl w-full max-w-sm flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-4 border-b shrink-0" style={{ borderColor: '#18181b' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Assign Filament</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">{pickerSlot.idx === -1 ? 'External' : `Slot ${pickerSlot.idx + 1}`}</p>
                  </div>
                  <button onClick={() => { setPickerSlot(null); setSlotSearch(''); }}
                    className="text-zinc-600 hover:text-zinc-300 text-xl leading-none transition-colors">×</button>
                </div>
                <input type="text" placeholder="Search color, brand…" value={slotSearch}
                  onChange={e => setSlotSearch(e.target.value)}
                  style={{ backgroundColor: '#0d0d0f', borderColor: '#18181b' }} className={inp} autoFocus />
              </div>

              {/* Material tabs */}
              <div className="flex gap-2 px-4 py-3 border-b overflow-x-auto scrollbar-hide shrink-0" style={{ borderColor: '#18181b' }}>
                {pickerMats.length === 0
                  ? <span className="text-xs text-zinc-600">No filaments available</span>
                  : pickerMats.map(mat => (
                    <button key={mat} onClick={() => setPickerMat(mat)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeMat === mat ? 'bg-emerald-400 text-black' : 'border text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                      }`}
                      style={activeMat !== mat ? { borderColor: '#27272a' } : {}}>
                      {mat}
                    </button>
                  ))
                }
              </div>

              {/* Filament list — only active material */}
              <div className="overflow-y-auto flex-1">
                {activeGroups.length === 0
                  ? <p className="text-xs text-zinc-600 text-center py-10">No filaments found.</p>
                  : activeGroups.map(g => {
                    const sealedCount = g.totalRolls - g.openedCount;
                    const displayCount = Math.min(g.totalRolls, 6);
                    const extra = g.totalRolls - displayCount;

                    const groupFils = g.ids
                      .map(id => filaments.find(f => f.id === id))
                      .filter((f): f is Filament => !!f);
                    const shapeMap: string[] = [];
                    for (const fil of groupFils.filter(f => !f.isOpened))
                      for (let q = 0; q < fil.quantity; q++) shapeMap.push(fil.id);
                    for (const fil of groupFils.filter(f => f.isOpened))
                      for (let q = 0; q < fil.quantity; q++) shapeMap.push(fil.id);

                    return (
                      <div key={g.key}
                        className="grid border-b last:border-0"
                        style={{ borderColor: '#18181b', gridTemplateColumns: '76px 1fr auto' }}>

                        {/* Col 1 — roll count */}
                        <div className="flex items-center pl-4 pr-3 py-3 border-r" style={{ borderColor: '#27272a' }}>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold text-white tabular-nums leading-none">{g.totalRolls}</span>
                            <span className="text-[10px] text-zinc-600 leading-none">{g.totalRolls === 1 ? 'Roll' : 'Rolls'}</span>
                          </div>
                        </div>

                        {/* Col 2 — color name + brand */}
                        <div className="flex flex-col justify-center px-3 py-3 min-w-0">
                          <p className="text-xs font-semibold text-zinc-100 truncate">{g.colorName}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{g.brand}</p>
                        </div>

                        {/* Col 3 — spool shapes */}
                        <div className="flex items-center py-3 pr-4">
                          <div className="flex gap-1.5 items-center">
                            {Array.from({ length: displayCount }, (_, i) => {
                              const opened = i >= sealedCount;
                              const filId = shapeMap[i];
                              return (
                                <button
                                  key={i}
                                  title={opened ? 'Assign opened spool' : 'Assign sealed spool'}
                                  onClick={() => filId && assignSlotByShape(filId)}
                                  className="p-0.5 shrink-0 rounded cursor-pointer outline-none focus:outline-none hover:ring-1 hover:ring-emerald-400/60 hover:scale-110 transition-all"
                                >
                                  <div className="w-5 h-5"
                                    style={opened
                                      ? { backgroundColor: g.hexCode, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }
                                      : { backgroundColor: g.hexCode, borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }
                                    }
                                  />
                                </button>
                              );
                            })}
                            {extra > 0 && <span className="text-[10px] text-zinc-600 tabular-nums ml-0.5">+{extra}</span>}
                          </div>
                        </div>

                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
