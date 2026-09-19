import { getWallBox, ROOM_WALL_HEIGHT } from '../utils/iso';
import type { WallSet } from '../types';

interface RoomWallsProps {
  wallSet: WallSet;
}

export default function RoomWalls({ wallSet }: RoomWallsProps) {
  const rightWallBox = getWallBox('direita', ROOM_WALL_HEIGHT);
  const leftWallBox = getWallBox('esquerda', ROOM_WALL_HEIGHT);

  return (
    <>
      <div
        className="absolute overflow-hidden"
        style={{
          left: rightWallBox.left,
          top: rightWallBox.top,
          width: rightWallBox.width,
          height: rightWallBox.height,
          clipPath: rightWallBox.polygon,
          zIndex: 0,
        }}
      >
        <img src={wallSet.images.direita} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>
      <div
        className="absolute overflow-hidden"
        style={{
          left: leftWallBox.left,
          top: leftWallBox.top,
          width: leftWallBox.width,
          height: leftWallBox.height,
          clipPath: leftWallBox.polygon,
          zIndex: 0,
        }}
      >
        <img src={wallSet.images.esquerda} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>
    </>
  );
}
