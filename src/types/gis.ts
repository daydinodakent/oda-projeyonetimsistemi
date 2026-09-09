export interface GisMap {
  id: string;
  name: string;
}

export interface GisFolder {
  id: string;
  name: string;
  mapId: string;
  parentFolderId: string | null;
  expanded?: boolean;
  deletable?: boolean;
}

export interface GisLayer {
  id: string;
  name: string;
  visible?: boolean;
  color: string | null;
  fillColor?: string | null;
  opacity?: number;
  lineWidth: number | null;
  dash: 'solid' | 'dashed' | 'dotted';
  symbol?: string;
  scale?: number;
  geomType: 'Point' | 'LineString' | 'Polygon' | null;
  mapId: string;
  folderId: string | null;
}

export interface GisFeature {
  id: string;
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface RasterOverlay {
  id: string;
  url: string;
  coords: [[number, number], [number, number], [number, number], [number, number]];
  name: string;
  mapId: string;
  folderId: string | null;
  visible?: boolean;
}
