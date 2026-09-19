import { getFootprintBox } from '../utils/iso';

interface IsoTileProps {
  col: number;
  row: number;
  highlighted?: boolean;
  invalid?: boolean;
  floorColor?: string;
}

export default function IsoTile({ col, row, highlighted, invalid, floorColor = 'rgba(255,255,255,0.5)' }: IsoTileProps) {
  const box = getFootprintBox(col, row, 1, 1);

  return (
    <div
      className="absolute border transition-colors"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        clipPath: box.polygon,
        zIndex: 1,
        background: invalid ? 'rgba(255,107,91,0.35)' : highlighted ? 'rgba(108,92,231,0.35)' : floorColor,
        borderColor: 'rgba(108,92,231,0.15)',
      }}
    />
  );
}
