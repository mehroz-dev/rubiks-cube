import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, ThreeElements, useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer } from '@react-three/postprocessing';
import BezierEasing from 'bezier-easing';
import Cube from 'cubejs';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './App.css';
import { MyRoundedBox } from './MyRoundedBox';

type Color = 'white' | 'yellow' | 'green' | 'blue' | 'orange' | 'red';
type Face = 'up' | 'down' | 'front' | 'back' | 'left' | 'right';
type FrontFace = 'green' | 'red' | 'blue' | 'orange';

const HEX_COLORS: Record<Color, string> = {
  green: '#388E3C',
  blue: '#1976D2',
  yellow: '#FDD835',
  white: '#FFFFFF',
  red: '#C62828',
  orange: '#F57C00',
} as const;

const CHAR_MAP: Record<string, Color> = {
  'U': 'white',
  'D': 'yellow',
  'F': 'green',
  'B': 'blue',
  'L': 'orange',
  'R': 'red',
};

const FACE_MAP: Record<string, Face> = {
  'U': 'up',
  'D': 'down',
  'F': 'front',
  'B': 'back',
  'L': 'left',
  'R': 'right',
};

interface Rotation {
  face: Face;
  clockwise: boolean;
  forceShow?: boolean;
}

const CUBELETS: ({ position: [number, number, number] } & Partial<Record<Face, number>>)[] = [
  { position: [-1, -1, -1], back: 6, down: 8, right: 8, },
  { position: [-1, -1, 0], back: 7, down: 7, },
  { position: [-1, -1, 1], back: 8, down: 6, left: 6, },
  { position: [-1, 0, -1], back: 3, right: 5, },
  { position: [-1, 0, 0], back: 4, },
  { position: [-1, 0, 1], back: 5, left: 3, },
  { position: [-1, 1, -1], back: 0, up: 2, right: 2, },
  { position: [-1, 1, 0], back: 1, up: 1, },
  { position: [-1, 1, 1], back: 2, up: 0, left: 0, },
  { position: [0, -1, -1], down: 5, right: 7, },
  { position: [0, -1, 0], down: 4, },
  { position: [0, -1, 1], down: 3, left: 7, },
  { position: [0, 0, -1], right: 4, },
  { position: [0, 0, 0], },
  { position: [0, 0, 1], left: 4, },
  { position: [0, 1, -1], up: 5, right: 1, },
  { position: [0, 1, 0], up: 4, },
  { position: [0, 1, 1], up: 3, left: 1, },
  { position: [1, -1, -1], front: 8, down: 2, right: 6, },
  { position: [1, -1, 0], front: 7, down: 1, },
  { position: [1, -1, 1], front: 6, down: 0, left: 8, },
  { position: [1, 0, -1], front: 5, right: 3, },
  { position: [1, 0, 0], front: 4, },
  { position: [1, 0, 1], front: 3, left: 5, },
  { position: [1, 1, -1], front: 2, up: 8, right: 0, },
  { position: [1, 1, 0], front: 1, up: 7, },
  { position: [1, 1, 1], front: 0, up: 6, left: 2, },
];

function App() {
  let [lightPosition, setLightPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(1, 1, 1).setLength(15)
  );
  let [visibleFrontFace, setVisibleFrontFace] = useState<FrontFace>('green');
  let cameraRef = useRef<THREE.PerspectiveCamera>(null);

  return (
    <div className="root">
      <ul className="legend">
        <li><kbd>W</kbd> Rotate top</li>
        <li><kbd>S</kbd> Rotate bottom</li>
        <li><kbd>A</kbd> Rotate left</li>
        <li><kbd>D</kbd> Rotate right</li>
        <li><kbd>E</kbd> Rotate front</li>
        <li><kbd>Q</kbd> Rotate back</li>
        <li><small>Hold Shift for counterclockwise</small></li>
        <li><kbd>Del</kbd> Reset</li>
        <li><kbd>Enter</kbd> Solve</li>
        <li><kbd>R</kbd> Randomize</li>
      </ul>
      <Canvas shadows>
        <EffectComposer>
          {/* depth of field - bad performance, and can't quite get it working anyway */}
          {/* https://codesandbox.io/p/sandbox/r3f-stencil-buffer-forked-tgs382 */}
          {/* <DepthOfField
            target={[1.5, 1.5, 1.5]}
            bokehScale={20}
            height={1000} /> */}
          <Bloom
            luminanceThreshold={-1}
            luminanceSmoothing={0}
            height={300}
            opacity={0.2}
          />
          <ChromaticAberration
            blendFunction={THREE.NormalBlending} // blend mode
            offset={new THREE.Vector2(7 / window.innerHeight, 0)} // color offset
            radialModulation={true}
            modulationOffset={0}
          />
        </EffectComposer>
        <ambientLight intensity={Math.PI / 4} />
        <directionalLight position={lightPosition} shadow-mapSize={[2024, 2024]} />
        <spotLight position={lightPosition} angle={0.13} penumbra={1} decay={0} intensity={Math.PI} />
        {/* <color attach="background" args={['#111']} /> */}
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          // near={0.1}
          // far={100}
          fov={50}
          position={[5, 5, 5]}
        />
        <OrbitControls
          makeDefault
          maxDistance={25}
          minDistance={5}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.25}
          onChange={() => {
            let pos = new THREE.Vector3().copy(cameraRef.current!.position).setLength(15);
            setLightPosition(pos);
            let rotation = Math.atan2(pos.x, pos.z) * 180 / Math.PI;
            rotation = (rotation + 360) % 360;
            let visibleFrontFace: FrontFace = 'green';
            if (rotation < 90) {
              visibleFrontFace = 'green';
            } else if (rotation < 180) {
              visibleFrontFace = 'red';
            } else if (rotation < 270) {
              visibleFrontFace = 'blue';
            } else {
              visibleFrontFace = 'orange';
            }
            setVisibleFrontFace(visibleFrontFace);
          }} />
        <RubiksCube
          visibleFrontFace={visibleFrontFace}
        />
      </Canvas>
    </div>
  )
}

const animEase = BezierEasing(0.7, 1.33, .7, 1);

function RubiksCube({ visibleFrontFace }: {
  visibleFrontFace: FrontFace
}) {
  let [cube, setCube] = useState(new Cube());
  let [rotationQueue, setRotationQueue] = useState<Rotation[]>([]);
  let [animationTime, setAnimationTime] = useState(0);

  const currentRotation = rotationQueue.length ? rotationQueue[0] : undefined;

  const effectiveRotation = currentRotation
    ? animEase(animationTime)
    * Math.PI / 2
    * (currentRotation.clockwise ? 1 : -1)
    * ((currentRotation.face === 'up' || currentRotation.face === 'left' || currentRotation.face === 'front') ? -1 : 1)
    : 0;

  useFrame((_, delta) => {
    if (!currentRotation) return;
    let { face, clockwise, forceShow } = currentRotation;
    let speedMultiplier = 4.5 * (forceShow ? 1 : rotationQueue.length);
    if (animationTime >= 1) {
      // done with animation
      // perform action on cube
      let newCube = Cube.fromString(cube.asString());
      let move = face.substring(0, 1).toUpperCase() + (clockwise ? '' : "'");
      newCube.move(move);
      setCube(newCube);
      // reset animation
      setRotationQueue(q => q.slice(1));
      setAnimationTime(0);
    } else {
      setAnimationTime(Math.min(animationTime + delta * speedMultiplier, 1));
    }
  });

  useEffect(() => {
    let listener = (ev: KeyboardEvent) => {
      let keys: Record<string, Face> = {
        'w': 'up',
        's': 'down',
        'e': 'front',
        'q': 'back',
        'a': 'left',
        'd': 'right',
      };
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        setCube(new Cube());
        setRotationQueue([]);
      } else if (ev.key == 'Enter') {
        if (cube.isSolved()) {
          console.log('already solved');
          return;
        }
        Cube.initSolver();
        let rotations = moveToRotations(cube.solve(), true);
        setRotationQueue(rotations);
      } else if (ev.key.toLowerCase() == 'r') {
        let cube = new Cube();
        cube.randomize();
        setCube(cube);
        setRotationQueue([]);
      } else if (ev.key.toLowerCase() in keys) {
        const face = mapVisibleFaceToFace(keys[ev.key.toLowerCase()], visibleFrontFace);
        setRotationQueue(q => [...q, { face, clockwise: !ev.shiftKey }]);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [rotationQueue, visibleFrontFace]);

  let s: string = cube.asString();
  const C = {
    up: Array.from(s.substring(0, 9)).map(c => CHAR_MAP[c]),
    right: Array.from(s.substring(9, 18)).map(c => CHAR_MAP[c]),
    front: Array.from(s.substring(18, 27)).map(c => CHAR_MAP[c]),
    down: Array.from(s.substring(27, 36)).map(c => CHAR_MAP[c]),
    left: Array.from(s.substring(36, 45)).map(c => CHAR_MAP[c]),
    back: Array.from(s.substring(45, 54)).map(c => CHAR_MAP[c]),
  } as const;

  return <>
    <group rotation={[
      currentRotation?.face === 'front' || currentRotation?.face === 'back' ? effectiveRotation : 0,
      currentRotation?.face === 'up' || currentRotation?.face === 'down' ? effectiveRotation : 0,
      currentRotation?.face === 'left' || currentRotation?.face === 'right' ? effectiveRotation : 0,
    ]}>
      {currentRotation && CUBELETS
        .filter(b => b[currentRotation.face] !== undefined)
        .map(({ position, up, down, front, back, left, right }) => (
          <Cubelet key={position.join(',')} position={position}
            up={up !== undefined ? C.up[up] : undefined}
            down={down !== undefined ? C.down[down] : undefined}
            front={front !== undefined ? C.front[front] : undefined}
            back={back !== undefined ? C.back[back] : undefined}
            left={left !== undefined ? C.left[left] : undefined}
            right={right !== undefined ? C.right[right] : undefined}
          />
        ))}
    </group>
    {CUBELETS
      .filter(b => !currentRotation || b[currentRotation.face] === undefined)
      .map(({ position, up, down, front, back, left, right }) => (
        <Cubelet key={position.join(',')} position={position}
          up={up !== undefined ? C.up[up] : undefined}
          down={down !== undefined ? C.down[down] : undefined}
          front={front !== undefined ? C.front[front] : undefined}
          back={back !== undefined ? C.back[back] : undefined}
          left={left !== undefined ? C.left[left] : undefined}
          right={right !== undefined ? C.right[right] : undefined}
        />
      ))}
  </>;
}

function Cubelet({ up, down, front, back, left, right, ...props }: Omit<ThreeElements['mesh'], 'up'> & Partial<Record<Face, Color>>) {
  // const FaceMaterial = ({ attach, color }: any) => <meshStandardMaterial attach={attach} color={color} />;
  const FaceMaterial = ({ attach, color }: any) => <meshPhysicalMaterial attach={attach} color={color} roughness={0.6} />;

  return <>
    <MyRoundedBox args={[1.08, 1.08, 1.08] as any} segments={4} radius={0.2} {...props}>
      <FaceMaterial attach="material-0" color={front !== undefined ? HEX_COLORS[front] : '#111'} />
      <FaceMaterial attach="material-1" color={back !== undefined ? HEX_COLORS[back] : '#111'} />
      <FaceMaterial attach="material-2" color={up !== undefined ? HEX_COLORS[up] : '#111'} />
      <FaceMaterial attach="material-3" color={down !== undefined ? HEX_COLORS[down] : '#111'} />
      <FaceMaterial attach="material-4" color={left !== undefined ? HEX_COLORS[left] : '#111'} />
      <FaceMaterial attach="material-5" color={right !== undefined ? HEX_COLORS[right] : '#111'} />
    </MyRoundedBox>
  </>
}

function moveToRotations(move: string, forceShow?: boolean): Rotation[] {
  let rotations = [];
  for (let part of move.split(/\s+/)) {
    let numTimes = 1;
    let clockwise = true;
    if (part.endsWith('2')) {
      numTimes = 2;
      part = part.substring(0, part.length - 1);
    }
    if (part.endsWith("'")) {
      clockwise = false;
      part = part.substring(0, part.length - 1);
    }
    for (let i = 0; i < numTimes; i++) {
      rotations.push({ face: FACE_MAP[part], clockwise, forceShow });
    }
  }
  return rotations;
}

/**
 * Maps a user-visible face (e.g. what's currently the "front" face) to
 * a face in the internal cube representation.
 */
function mapVisibleFaceToFace(face: Face, visibleFrontFace: FrontFace): Face {
  if (face === 'up' || face === 'down') return face;
  const faceClockwiseOrder: Face[] = ['front', 'left', 'back', 'right'];
  const visClockwiseOrder: FrontFace[] = ['green', 'orange', 'blue', 'red'];
  face = faceClockwiseOrder[(
    visClockwiseOrder.indexOf(visibleFrontFace) +
    faceClockwiseOrder.indexOf(face)
  ) % faceClockwiseOrder.length];
  return face;
}

export default App;
