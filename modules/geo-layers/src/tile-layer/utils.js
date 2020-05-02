import {getOSMTileIndices} from './tile-2d-traversal';

const TILE_SIZE = 512;

export const urlType = {
  type: 'url',
  value: '',
  validate: value =>
    typeof value === 'string' ||
    (Array.isArray(value) && value.every(url => typeof url === 'string')),
  equals: (value1, value2) => {
    if (value1 === value2) {
      return true;
    }
    if (!Array.isArray(value1) || !Array.isArray(value2)) {
      return false;
    }
    const len = value1.length;
    if (len !== value2.length) {
      return false;
    }
    for (let i = 0; i < len; i++) {
      if (value1[i] !== value2[i]) {
        return false;
      }
    }
    return true;
  }
};

export function getURLFromTemplate(template, properties) {
  if (!template || !template.length) {
    return null;
  }
  if (Array.isArray(template)) {
    const index = Math.abs(properties.x + properties.y) % template.length;
    template = template[index];
  }
  return template.replace(/\{ *([\w_-]+) *\}/g, (_, property) => properties[property]);
}

function getTileIndex([x, y], scale) {
  return [(x * scale) / TILE_SIZE, (y * scale) / TILE_SIZE];
}

function getScale(z, tileSize = TILE_SIZE) {
  return (Math.pow(2, z) * TILE_SIZE) / tileSize;
}

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Lon..2Flat._to_tile_numbers_2
function osmTile2lngLat(x, y, z) {
  const scale = getScale(z);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lng, lat];
}

function tile2XY(x, y, z, tileSize) {
  const scale = getScale(z, tileSize);
  return [(x / scale) * TILE_SIZE, (y / scale) * TILE_SIZE];
}

export function tileToBoundingBox(viewport, x, y, z, tileSize = TILE_SIZE) {
  if (viewport.isGeospatial) {
    const [west, north] = osmTile2lngLat(x, y, z);
    const [east, south] = osmTile2lngLat(x + 1, y + 1, z);
    return {west, north, east, south};
  }
  const [left, top] = tile2XY(x, y, z, tileSize);
  const [right, bottom] = tile2XY(x + 1, y + 1, z, tileSize);
  return {left, top, right, bottom};
}

function getIdentityTileIndices(viewport, z, tileSize) {
  const bbox = viewport.getBounds();
  const scale = getScale(z, tileSize);

  const [minX, minY] = getTileIndex([bbox[0], bbox[1]], scale);
  const [maxX, maxY] = getTileIndex([bbox[2], bbox[3]], scale);
  const indices = [];

  /*
      |  TILE  |  TILE  |  TILE  |
        |(minX)            |(maxX)
   */
  for (let x = Math.floor(minX); x < maxX; x++) {
    for (let y = Math.floor(minY); y < maxY; y++) {
      indices.push({x, y, z});
    }
  }

  return indices;
}

/**
 * Returns all tile indices in the current viewport. If the current zoom level is smaller
 * than minZoom, return an empty array. If the current zoom level is greater than maxZoom,
 * return tiles that are on maxZoom.
 */
export function getTileIndices(viewport, maxZoom, minZoom, zRange, tileSize = TILE_SIZE) {
  let z = Math.ceil(viewport.zoom);
  if (Number.isFinite(minZoom) && z < minZoom) {
    return [];
  }
  if (Number.isFinite(maxZoom) && z > maxZoom) {
    z = maxZoom;
  }

  return viewport.isGeospatial
    ? getOSMTileIndices(viewport, z, zRange)
    : getIdentityTileIndices(viewport, z, tileSize);
}
