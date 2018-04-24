import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';

import ColorManager from './ColorManager';
import ImageReady from './ImageReady';
import ModelHelper from './ModelHelper';

let idFor3D = 1;

let logger = (message) => console.log(message);

const EPSILON = 0.01;
const WORKING_CANVAS = document.createElement('canvas');
const CELL_MAP = {};
const LAYOUT_MAP = {};

const materialColorManager = ColorManager.createColorManager();
const cellColorManager = ColorManager.createColorManager();

const cellsImageManager = ImageReady.createImageDependencyManager('cell');
const layoutsImageManager = ImageReady.createImageDependencyManager('layout');

const materialLookupTable = vtkColorTransferFunction.newInstance();
const cellLookupTable = vtkColorTransferFunction.newInstance();

// Add progress message
cellsImageManager.onImageReady(() => logger('Cells images completed'));
layoutsImageManager.onImageReady(() => logger('Layouts images completed'));

// Add some standard materials, based on client request.
materialColorManager.setColor('air', [0, 0, 0, 0]);
materialColorManager.setColor('cs', [121 / 255, 121 / 255, 121 / 255, 1]);
materialColorManager.setColor('ss', [153 / 255, 153 / 255, 153 / 255, 1]);
// pulled from Brewer colors in ColorManager, he -> yellow, mod -> blue
materialColorManager.setColor('mod', [128 / 255, 177 / 255, 211 / 255, 1]);
materialColorManager.setColor('water', [128 / 255, 177 / 255, 211 / 255, 1]);
// from the palette
materialColorManager.setColor('zirc2', [217 / 255, 217 / 255, 217 / 255, 1]);
// zirc4 identical?
materialColorManager.setColor('zirc4', [217 / 255, 217 / 255, 217 / 255, 1]);
// yellow from the palette
materialColorManager.setColor('he', [255 / 255, 237 / 255, 111 / 255, 1]);

// Fuels get colors from the main list - should be easily distinguishable.
// materialColorManager.setColor('U21', [1, 0, 0, 1]);
// materialColorManager.setColor('U26', [0, 1, 0, 1]);
// materialColorManager.setColor('U31', [0, 0, 1, 1]);
// ----------------------------------------------------------------------------

const colorManagerByElevation = {};
const colorManagerByCategory = {};
const legendByElevation = {};

['ASSEMBLIES', 'CDI'].forEach((name) => {
  colorManagerByCategory[name] = ColorManager.createColorManager();
  colorManagerByCategory[name].setColor(':', [1, 1, 1, 0]);
});

// ----------------------------------------------------------------------------

function setLogger(fn) {
  logger = fn;
}

// ----------------------------------------------------------------------------

function compareTitles(a, b) {
  return a.title.localeCompare(b.title);
}

// ----------------------------------------------------------------------------

function updateMaterialLookupTableColors() {
  const RGBPoints = [];
  const orderedList = [];
  Object.keys(materialColorManager.getColorMapping()).forEach((name) => {
    orderedList[materialColorManager.getId(name)] = name;
  });
  orderedList.forEach((name) => {
    const color = materialColorManager.getColor(name);
    RGBPoints.push(materialColorManager.getId(name));
    RGBPoints.push(color[0]);
    RGBPoints.push(color[1]);
    RGBPoints.push(color[2]);
  });

  materialLookupTable.applyColorMap({ RGBPoints });
}

// ----------------------------------------------------------------------------

function updateCellLookupTableColors() {
  const RGBPoints = [];
  const orderedList = [];
  Object.keys(cellColorManager.getColorMapping()).forEach((name) => {
    orderedList[cellColorManager.getId(name)] = name;
  });
  orderedList.forEach((name) => {
    const color = cellColorManager.getColor(name);
    RGBPoints.push(cellColorManager.getId(name));
    RGBPoints.push(color[0]);
    RGBPoints.push(color[1]);
    RGBPoints.push(color[2]);
  });

  cellLookupTable.applyColorMap({ RGBPoints });
}

// ----------------------------------------------------------------------------

function updateLookupTables() {
  updateMaterialLookupTableColors();
  updateCellLookupTableColors();
}

// ----------------------------------------------------------------------------

function updateCellImage(cell, size = 32, gridSpacing = 1.26) {
  WORKING_CANVAS.setAttribute('width', size);
  WORKING_CANVAS.setAttribute('height', size);
  const ctx = WORKING_CANVAS.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const center = size / 2;

  let count = Number(cell.num_rings);
  while (count--) {
    const color = materialColorManager.getColorRGBA(cell.mats[count]);
    // material radii are interpreted in terms of the assembly ppitch.
    const radius = cell.radii[count] * size / gridSpacing;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // draw an indication of the available size
  // TODO shouldn't be visible in layouts
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(100, 100, 100, 1)';
  const step = 2 * Math.PI / 16;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(
      center,
      center,
      0.5 * size,
      2 * i * step,
      (2 * i + 1) * step,
      false
    );
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(
      center,
      center,
      0.5 * size,
      (2 * i + 1) * step,
      (2 * i + 2) * step,
      false
    );
    ctx.stroke();
  }

  cell.gridSpacing = gridSpacing;
  cell.imageSrc = WORKING_CANVAS.toDataURL();

  // Used for 2D drawing
  if (!cell.image) {
    cell.image = new Image();
  }
  cell.image.src = cell.imageSrc;
  cellsImageManager.addImage(cell.image);

  // Used for 3D rendering
  cell.has3D = {
    id: idFor3D++,
    type: 'cell',
    source: {
      radius: cell.radii,
      cellFields: cell.mats.map(materialColorManager.getId),
      resolution: 60,
    },
    lookupTable: materialLookupTable,
  };

  // Update cell map
  CELL_MAP[cell.id] = cell;
}

function getCellMaterial(item, posx, posy) {
  const radius =
    item.gridSpacing *
    Math.sqrt((posx - 0.5) * (posx - 0.5) + (posy - 0.5) * (posy - 0.5));
  for (let i = 0; i < item.radii.length; i++) {
    if (radius < item.radii[i]) {
      return { radius: item.radii[i], mat: item.mats[i] };
    }
  }
  return null;
}

// ----------------------------------------------------------------------------

function updateLayoutImage(
  item,
  cellNameToIdMap,
  size = 512,
  gridSpacing = 2.1,
  numPins = 0
) {
  const cellMap = item.cell_map;
  if (!cellMap || cellMap.length === 0) return;
  // default to match the input map, but interactive cell maps might be shorter
  const width = numPins || Math.sqrt(cellMap.length);
  const recSide = Math.floor(size / width);
  const pointSets = {};
  const isCoreMap = item.type === 'coremaps';

  WORKING_CANVAS.setAttribute('width', size);
  WORKING_CANVAS.setAttribute('height', size);
  const ctx = WORKING_CANVAS.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // show a grid with available spots for cells.
  if (numPins > 1) {
    ctx.beginPath();
    for (let j = 1; j < width; j++) {
      ctx.moveTo(0, j * recSide);
      ctx.lineTo(size, j * recSide);
    }
    for (let i = 1; i < width; i++) {
      ctx.moveTo(i * recSide, 0);
      ctx.lineTo(i * recSide, size);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(100, 100, 100, 1)';
    ctx.stroke();
    // show an indication of symmetry
    if (item.symmetry) {
      const center = size * 0.5;
      if (item.symmetry === 'oct') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(center, center);
        ctx.lineTo(center, 0);
        ctx.stroke();
      } else if (item.symmetry === 'quad') {
        ctx.beginPath();
        ctx.moveTo(center, 0);
        ctx.lineTo(center, center);
        ctx.lineTo(0, center);
        ctx.stroke();
      }
    }
  }

  let pidx = 0;
  for (let j = 0; j < width; j++) {
    for (let i = 0; i < width; i++) {
      if (pidx < cellMap.length) {
        const cellId = cellNameToIdMap[cellMap[pidx++]];
        const cell = CELL_MAP[cellId];
        if (!isCoreMap && cell && cell.image) {
          const img = cell.image;
          ctx.drawImage(img, i * recSide, j * recSide, recSide, recSide);

          // For 3d reconstruction
          if (!pointSets[cellId]) {
            pointSets[cellId] = { coordinates: [], cellId, cell };
          }
          pointSets[cellId].coordinates.push(i * gridSpacing);
          pointSets[cellId].coordinates.push(j * gridSpacing);
          pointSets[cellId].coordinates.push(0);
        } else if (isCoreMap && cellId) {
          ctx.beginPath();
          ctx.rect(i * recSide, j * recSide, recSide, recSide);
          ctx.stroke();

          const assemColor = colorManagerByCategory.ASSEMBLIES.getColorRGBA(
            cellId
          );
          if (assemColor) {
            ctx.fillStyle = assemColor;
            ctx.fill();
            // colorLegend[
            //   `Assembly(${stripCategory(assemKey)})`
            // ] = localColorManager.getColorRGBA(assemKey);
          }
        }
      }
    }
  }
  if (item.coreShape) {
    // display an indication of the core shape on editor coremaps.
    ctx.beginPath();
    const minmax = [];
    minmax[-1] = [width, -1];
    for (let j = 0; j < width; j++) {
      const halfJ = j < width / 2 ? j : width - j - 1;
      let minI = width;
      let maxI = -1;
      for (let i = 0; i < width; i++) {
        if (item.coreShape[j * width + i]) {
          minI = Math.min(minI, i);
          maxI = Math.max(maxI, i + 1);
        }
      }
      minmax[halfJ] = minmax[halfJ]
        ? [Math.min(minI, minmax[halfJ][0]), Math.max(maxI, minmax[halfJ][1])]
        : [minI, maxI];
    }
    for (let j = 1; j < width / 2; j++) {
      // the previous row, away from the middle, sets a bound.
      minmax[j][0] = Math.min(minmax[j - 1][0], minmax[j][0]);
      minmax[j][1] = Math.max(minmax[j - 1][1], minmax[j][1]);
    }
    // console.log(...minmax);
    for (let j = 0; j <= width; j++) {
      const halfJ = j < width / 2 ? j : width - j - 1;
      // symmetric, top and bottom half. Not sure about non-symmetric assembly maps?
      const [prevMin, prevMax] = minmax[j < width / 2 ? halfJ - 1 : halfJ + 1];
      let [minI, maxI] = minmax[halfJ];
      if (prevMax !== -1) {
        // cap the last full row.
        if (maxI === -1) {
          maxI = prevMax;
          minI = prevMax;
        }
        // lines at 0 get cut off
        ctx.moveTo(Math.max(1, prevMin * recSide), (j - 1) * recSide);
        ctx.lineTo(Math.max(1, prevMin * recSide), j * recSide);
        ctx.lineTo(minI * recSide, j * recSide);
        ctx.moveTo(prevMax * recSide, (j - 1) * recSide);
        ctx.lineTo(prevMax * recSide, j * recSide);
        ctx.lineTo(maxI * recSide, j * recSide);
      } else if (maxI !== -1) {
        // cap the starting row.
        ctx.moveTo(minI * recSide, Math.max(1, j * recSide));
        ctx.lineTo(maxI * recSide, Math.max(1, j * recSide));
      }
    }
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(20, 20, 20, 1)';
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  item.cellNameToIdMap = cellNameToIdMap;

  item.imageSrc = WORKING_CANVAS.toDataURL();

  // Used for 2D drawing
  if (!item.image) {
    item.image = new Image();
  }
  item.image.src = item.imageSrc;
  layoutsImageManager.addImage(item.image);

  // Used for 3D rendering
  const scalePattern = [1, 1, 25];
  item.has3D = {
    id: idFor3D++,
    type: 'layout',
    layouts: Object.keys(pointSets).map((cellId) => {
      const scaling = new Float32Array(pointSets[cellId].coordinates.length);
      let count = scaling.length;
      while (count--) {
        scaling[count] = scalePattern[count % 3];
      }
      return {
        cellId: cellColorManager.getId(cellId),
        pointsData: Float32Array.from(pointSets[cellId].coordinates),
        scaling,
        glyph: {
          radius: pointSets[cellId].cell.radii,
          cellFields: pointSets[cellId].cell.mats.map(
            materialColorManager.getId
          ),
          resolution: 60,
        },
      };
    }),
    lookupTable: materialLookupTable,
  };
}

function getLayoutCell(item, posx, posy) {
  const cellMap = item.cell_map;
  // default to match the input map, but interactive cell maps might be shorter
  const width = item.numPins || Math.sqrt(cellMap.length);
  const i = Math.floor(posx * width);
  const j = Math.floor(posy * width);
  const pidx = j * width + i;
  // console.log(width, i, j, pidx);
  return { cell: cellMap[pidx], index: pidx, i, j };
}

// Layouts can move between assemblies in the same category.
// Pick current assembly first, then matching layout in a different assembly.
function getLayout(category, assemblyLabel, layoutName) {
  if (LAYOUT_MAP[category][assemblyLabel][layoutName]) {
    return LAYOUT_MAP[category][assemblyLabel][layoutName];
  }
  return Object.keys(LAYOUT_MAP[category]).reduce(
    (prev, key) => LAYOUT_MAP[category][key][layoutName] || prev,
    null
  );
}

// ----------------------------------------------------------------------------
/* eslint-disable no-underscore-dangle */

function updateItemWithLayoutImages(
  category,
  item,
  materials,
  size = 512,
  gridSpacing = 1.26
) {
  if (!LAYOUT_MAP[category]) {
    LAYOUT_MAP[category] = {};
    LAYOUT_MAP[category].__category = category;
  }

  item.stack = {
    labelToUse: 'Full Stack',
    has3D: {
      id: idFor3D++,
      type: 'assembly',
      lookupTable: materialLookupTable,
      layouts: [],
    },
  };

  // Create local cellNameToIdMap
  const cellNameToIdMap = {};
  const cellKeys = Object.keys(item.Cells);
  let count = cellKeys.length;
  while (count--) {
    const cell = item.Cells[cellKeys[count]];
    cellNameToIdMap[cell.label] = cell.id;
  }
  item.cellNameToIdMap = cellNameToIdMap;

  // Create layout images
  count = item.layout.length;
  while (count--) {
    updateLayoutImage(item.layout[count], cellNameToIdMap, size, gridSpacing);

    // Update map
    if (!LAYOUT_MAP[category][item.label]) {
      LAYOUT_MAP[category][item.label] = {};
    }
    const map = LAYOUT_MAP[category][item.label];
    map.__axial_labels = item.axial_labels;
    map.__axial_elevations = item.axial_elevations;
    map.__3d_layouts = item.stack.has3D.layouts;
    map[item.layout[count].label] = item.layout[count];
  }

  // Create 3D stack assembly
  for (let i = 0; i < item.axial_labels.length; i++) {
    const layoutName = item.axial_labels[i];
    const z0 = item.axial_elevations[i];
    const z1 = item.axial_elevations[i + 1];
    const zScale = Math.abs(z1 - z0);
    const zLayer = (z0 + z1) * 0.5;
    const template3D = getLayout(category, item.label, layoutName).has3D
      .layouts;
    for (let j = 0; j < template3D.length; j++) {
      const clonedItem = Object.assign({}, template3D[j]);
      clonedItem.pointsData = Float32Array.from(clonedItem.pointsData);
      clonedItem.scaling = Float32Array.from(clonedItem.scaling);
      const nbValues = clonedItem.pointsData.length;
      for (let k = 2; k < nbValues; k += 3) {
        clonedItem.pointsData[k] = zLayer;
        clonedItem.scaling[k] = zScale;
      }
      item.stack.has3D.layouts.push(clonedItem);
    }
  }

  // Create 3D grid spacer if any
  if (item.grids) {
    const keys = Object.keys(item.grids);
    let kCount = keys.length;

    const assemWidth = gridSpacing * item.num_pins;
    const halfWidth = assemWidth / 2;
    const nbPoints = item.grid_elev.length * (item.num_pins + 1) * 2;

    const pointsData = new Float32Array(nbPoints * 3);
    const scalingData = new Float32Array(nbPoints * 3);
    const colorData = new Uint16Array(nbPoints);
    item.stack.has3D.grid = {
      pointsData,
      scalingData,
      colorData,
      lookupTable: materialLookupTable,
    };

    let offset = 0;
    let colorOffset = 0;

    // spacer_grid_thickness_notes.pdf, final formula.
    const getGridThickness = (pitch, mass, density, height, npins) =>
      (2 * pitch -
        Math.sqrt(
          4 * pitch * pitch - 4 * (mass / (density * height * npins * npins))
        )) /
      4;

    while (kCount--) {
      const grid = item.grids[keys[kCount]];
      const { mat, height, mass, elevations } = grid;
      const colorId = materialColorManager.getId(mat);
      // density - might be over-ridden by local mats,
      // otherwise comes from core materials list.
      const density =
        (item.__materials &&
          item.__materials[mat] &&
          item.__materials[mat].density) ||
        (materials[mat] && materials[mat].density) ||
        1;
      const gridThickness = getGridThickness(
        gridSpacing,
        mass,
        density,
        height,
        item.num_pins
      );
      // console.log('Found', mat, density, gridThickness);

      let elevCount = elevations.length;
      while (elevCount--) {
        const elevation = elevations[elevCount];
        // Horizontal
        for (let i = 0; i <= item.num_pins; i++) {
          pointsData[offset] = (i - 0.5) * gridSpacing;
          scalingData[offset] = gridThickness;
          offset++;
          pointsData[offset] = halfWidth - gridSpacing * 0.5;
          scalingData[offset] = assemWidth;
          offset++;
          pointsData[offset] = elevation;
          scalingData[offset] = height;
          offset++;
          colorData[colorOffset++] = colorId;
        }
        // Vertical
        for (let i = 0; i <= item.num_pins; i++) {
          pointsData[offset] = halfWidth - gridSpacing * 0.5;
          scalingData[offset] = assemWidth;
          offset++;
          pointsData[offset] = (i - 0.5) * gridSpacing;
          scalingData[offset] = gridThickness;
          offset++;
          pointsData[offset] = elevation;
          scalingData[offset] = height;
          offset++;
          colorData[colorOffset++] = colorId;
        }
      }

      LAYOUT_MAP[category][item.label].__grid = item.stack.has3D.grid;
    }
  }
}

// ----------------------------------------------------------------------------
// return will be "ASSEMBLIES;1:" if not present at this elevation,
// or "ASSEMBLIES;1:PLEN" if present.
function getElevationKey(map, itemMap, itemMapkey, elevation) {
  if (!itemMap) return ':';
  const key = itemMap[itemMapkey];
  const layoutItem = map[key];
  if (!layoutItem) {
    return `${map.__category};${key}:`.replace(/-/g, '');
  }
  const size = layoutItem.__axial_elevations.length;
  let label = '';
  for (let i = 0; i < size; i++) {
    if (layoutItem.__axial_elevations[i] <= elevation) {
      label = layoutItem.__axial_labels[i];
    }
  }
  return `${map.__category};${key}:${label || ''}`.replace(/-/g, '');
}

function uniqueMapTags(map) {
  if (!map) return [];
  const tags = {};
  map.forEach((tag) => {
    tags[tag] = true;
  });
  return Object.keys(tags);
}
// ----------------------------------------------------------------------------

let lastElevation = -1;
// assign colors to assemblies and other cell maps for 2D images.
function computeCoreColorsAt(elevation, core) {
  // Local variables for mapping
  const assemMap = uniqueMapTags(core.assm_map);
  const ctrlMap = uniqueMapTags(core.crd_map);
  const detMap = uniqueMapTags(core.det_map);
  const insMap = uniqueMapTags(core.insert_map);

  // Create local color manager
  if (!colorManagerByElevation[elevation]) {
    colorManagerByElevation[elevation] = ColorManager.createColorManager();
  }
  const localColorManager = colorManagerByElevation[elevation];
  // look at the previous colors we used, to see if we can re-use any, for CDI elements.
  const lastColorManager = colorManagerByElevation[lastElevation];
  lastElevation = elevation;

  assemMap.forEach((tag, i) => {
    const assemKey = assemMap
      ? getElevationKey(LAYOUT_MAP.ASSEMBLIES, assemMap, i, elevation)
      : ':';
    // assign a color only if there's a tag for a cellmap.
    if (assemKey.split(':')[1].length) {
      const assemColor = colorManagerByCategory.ASSEMBLIES.getColor(assemKey);

      if (assemColor && !localColorManager.usesColor(assemColor)) {
        localColorManager.setColor(assemKey, assemColor);
      } else {
        localColorManager.getColor(assemKey);
      }
    }
  });

  // get the next color from the previous layer, to force color cycling.
  // Good idea, but doesn't do the right thing with 1 color left.
  // if (lastColorManager) lastColorManager.getColor('reserveColorKey');

  const processingList = [
    [LAYOUT_MAP.CONTROLS, ctrlMap],
    [LAYOUT_MAP.DETECTORS, detMap],
    [LAYOUT_MAP.INSERTS, insMap],
  ];
  processingList.forEach((entry) => {
    const [container, keyMap] = entry;
    keyMap.forEach((tag, i) => {
      const key = keyMap
        ? getElevationKey(container, keyMap, i, elevation)
        : ':';
      if (key.split(':')[1].length) {
        let prevColor = null;
        if (lastColorManager) {
          // try to get a used or unused color from the last layer, to avoid
          // using the same color for a single element that changes.
          prevColor = lastColorManager.getColor(key);
          // the last elevation has a color for this name, see if we can re-use it.
          if (!localColorManager.usesColor(prevColor)) {
            localColorManager.setColor(key, prevColor);
          } else {
            localColorManager.getColor(key);
          }
        } else {
          localColorManager.getColor(key);
        }
      }
    });
  });
}
// ----------------------------------------------------------------------------
const stripCategory = (key) => key.split(';')[1];

function computeCore2ImageAt(elevation, core, size = 1500, edge = 250) {
  WORKING_CANVAS.setAttribute('width', size);
  WORKING_CANVAS.setAttribute('height', size);
  const ctx = WORKING_CANVAS.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  const coreSize = core.core_size;
  const recWidth = Math.floor((size - 2 * edge) / coreSize);
  const radius = recWidth / 6;
  const coreShape = core.shape; // might be null
  const offset = (size - recWidth * coreSize) / 2;
  const colorLegend = {};
  const localColorManager = colorManagerByElevation[elevation];

  // Local defaults
  const DEFAULT_LINEWIDTH = '1';
  const DEFAULT_STROKE = 'black';
  ctx.lineWidth = DEFAULT_LINEWIDTH;
  ctx.strokeStyle = DEFAULT_STROKE;

  // Local variables for mapping
  const assemMap = core.assm_map;
  const ctrlMap = core.crd_map;
  const detMap = core.det_map;
  const insMap = core.insert_map;

  // Draw vessel
  // "vessel_mats" type="Array(string)" value="{mod,ss,mod,ss,cs}"/>
  // "vessel_radii" type="Array(double)" value="{187.96,193.68,219.15,219.71,241.70}"/>
  // also used for neutron pads:
  const coreCenter = offset + recWidth * coreSize * 0.5;
  const scaling = recWidth / core.apitch;

  if (core.vessel_mats) {
    let coreRing = core.vessel_mats.length;
    const coreMats = core.vessel_mats;
    const coreRadius = core.vessel_radii;
    while (coreRing--) {
      ctx.beginPath();
      ctx.arc(
        coreCenter,
        coreCenter,
        scaling * coreRadius[coreRing],
        0,
        2 * Math.PI,
        false
      );
      ctx.fillStyle = materialColorManager.getColorRGBA(coreMats[coreRing]);
      ctx.fill();
    }
  }
  // Draw neutron pad
  // "pad_mat" type="string" value="ss"
  // "pad_inner_radius" type="double" value="194.64"
  // "pad_outer_radius" type="double" value="201.63"
  // "pad_arc" type="double" value="32"
  // "pad_azi_locs" type="Array(double)" value="{45,135,225,315}"
  if (core.pad_arc) {
    const padFill = materialColorManager.getColorRGBA(core.pad_mat);
    const padInner = core.pad_inner_radius;
    const padOuter = core.pad_outer_radius;
    const padRadius = (padOuter + padInner) / 2;
    const padWidth = padOuter - padInner;
    const padArc = core.pad_arc * Math.PI / 180;
    let numPad = core.pad_azi_locs.length;
    // make sure the ends are squared-off
    ctx.lineCap = 'butt';
    ctx.lineWidth = scaling * padWidth;
    while (numPad--) {
      // draw a single arc stroke with a large width.
      // VERA expects CCW and we're doing CW - reverse.
      const midpoint = (360 - core.pad_azi_locs[numPad]) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(
        coreCenter,
        coreCenter,
        scaling * padRadius,
        midpoint - padArc / 2,
        midpoint + padArc / 2,
        false
      );
      ctx.strokeStyle = padFill;
      ctx.stroke();
    }
    // reset to defaults above
    ctx.lineWidth = DEFAULT_LINEWIDTH;
    ctx.strokeStyle = DEFAULT_STROKE;
  }

  let pidx = 0;
  for (let j = 0; j < coreSize; j++) {
    for (let i = 0; i < coreSize; i++) {
      if (!coreShape || coreShape[i + j * coreSize]) {
        // if the coremap has an assembly at this location, tag comes before the ':'
        // if the assembly has a cellmap at this elevation, tag comes after ':'
        const assemKey = getElevationKey(
          LAYOUT_MAP.ASSEMBLIES,
          assemMap,
          pidx,
          elevation
        );
        // assign a color only if there's a tag for a cellmap.
        const assemColor = assemKey.split(':')[1].length
          ? localColorManager.getColorRGBA(assemKey)
          : null;

        const ctrKey = getElevationKey(
          LAYOUT_MAP.CONTROLS,
          ctrlMap,
          pidx,
          elevation
        );
        const ctrColor = ctrKey.split(':')[1].length
          ? localColorManager.getColorRGBA(ctrKey)
          : null;

        const detKey = getElevationKey(
          LAYOUT_MAP.DETECTORS,
          detMap,
          pidx,
          elevation
        );
        const detColor = detKey.split(':')[1].length
          ? localColorManager.getColorRGBA(detKey)
          : null;

        const insKey = getElevationKey(
          LAYOUT_MAP.INSERTS,
          insMap,
          pidx,
          elevation
        );
        const insColor = insKey.split(':')[1].length
          ? localColorManager.getColorRGBA(insKey)
          : null;

        ctx.beginPath();
        ctx.rect(
          offset + i * recWidth,
          offset + j * recWidth,
          recWidth,
          recWidth
        );
        ctx.stroke();

        if (assemColor) {
          ctx.fillStyle = assemColor;
          ctx.fill();
          colorLegend[
            `Assembly(${stripCategory(assemKey)})`
          ] = localColorManager.getColorRGBA(assemKey);
        }

        if (ctrColor) {
          ctx.beginPath();
          ctx.rect(
            offset + i * recWidth + radius,
            offset + j * recWidth + radius,
            4 * radius,
            radius
          );
          ctx.rect(
            offset + i * recWidth + radius,
            offset + j * recWidth + 4 * radius,
            4 * radius,
            radius
          );
          ctx.fillStyle = ctrColor;
          ctx.stroke();
          ctx.fill();
          colorLegend[
            `Control(${stripCategory(ctrKey)})`
          ] = localColorManager.getColorRGBA(ctrKey);

          ctx.fillStyle = 'black';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'C',
            offset + i * recWidth + 3 * radius,
            offset + j * recWidth + 1.5 * radius
          );
          ctx.fillText(
            'C',
            offset + i * recWidth + 3 * radius,
            offset + j * recWidth + 4.5 * radius
          );
        }

        if (detColor) {
          ctx.beginPath();
          ctx.arc(
            offset + i * recWidth + 3 * radius,
            offset + j * recWidth + 3 * radius,
            radius,
            0,
            2 * Math.PI,
            false
          );
          ctx.fillStyle = detColor;
          ctx.stroke();
          ctx.fill();
          colorLegend[
            `Detector(${stripCategory(detKey)})`
          ] = localColorManager.getColorRGBA(detKey);

          ctx.fillStyle = 'black';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'D',
            offset + i * recWidth + 3 * radius,
            offset + j * recWidth + 3 * radius
          );
        }

        if (insColor) {
          ctx.beginPath();
          ctx.rect(
            offset + i * recWidth + radius,
            offset + j * recWidth + radius,
            radius,
            4 * radius
          );
          ctx.rect(
            offset + i * recWidth + 4 * radius,
            offset + j * recWidth + radius,
            radius,
            4 * radius
          );
          ctx.fillStyle = insColor;
          ctx.stroke();
          ctx.fill();
          colorLegend[
            `Insert(${stripCategory(insKey)})`
          ] = localColorManager.getColorRGBA(insKey);

          ctx.fillStyle = 'black';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'I',
            offset + i * recWidth + 1.5 * radius,
            offset + j * recWidth + 3 * radius
          );
          ctx.fillText(
            'I',
            offset + i * recWidth + 4.5 * radius,
            offset + j * recWidth + 3 * radius
          );
        }

        // Move to the next element
        pidx++;
      }
    }
  }

  // Update legend
  legendByElevation[elevation] = [];
  Object.keys(colorLegend).forEach((title) => {
    const color = colorLegend[title];
    legendByElevation[elevation].push({ title, color });
  });
  legendByElevation[elevation].sort(compareTitles);

  return WORKING_CANVAS.toDataURL();
}

// ----------------------------------------------------------------------------

function compute3DCore(
  content,
  core,
  resolution = 6,
  baffleOffset = 0,
  params = null,
  mapList = null
) {
  // maps coming from the editor are completely filled out with '-',
  // so no coreShape array to provide bounds.
  const coreSize = core.core_size;
  const coreShape = core.shape;
  const gridSpacing = core.apitch;

  // Local variables for mapping
  const assemMap = core.assm_map;
  const ctrlMap = core.crd_map;
  const detMap = core.det_map;
  const insMap = core.insert_map;

  // labels specific control rods (crd)
  const bankMap = core.crd_bank;

  const coreHeight = core.height;

  const layouts = [];
  const grids = [];
  let gridArraySize = 0;
  content.labelToUse = 'Full core';
  content.has3D = {
    id: idFor3D++,
    type: 'core',
    lookupTable: materialLookupTable,
    layouts: [],
    center: [
      coreSize * gridSpacing * 0.5,
      coreSize * gridSpacing * 0.5,
      coreHeight * 0.5,
    ],
    height: coreHeight,
  };

  const processingList = [
    [LAYOUT_MAP.ASSEMBLIES, assemMap],
    [LAYOUT_MAP.CONTROLS, ctrlMap],
    [LAYOUT_MAP.DETECTORS, detMap],
    [LAYOUT_MAP.INSERTS, insMap],
  ];

  let pidx = 0;
  for (let j = 0; j < coreSize; j++) {
    for (let i = 0; i < coreSize; i++) {
      if (!coreShape || coreShape[i + j * coreSize]) {
        const offsetX = i * gridSpacing;
        const offsetY = j * gridSpacing;
        for (let k = 0; k < processingList.length; k++) {
          const [container, keyMap] = processingList[k];
          if (container && keyMap && container[keyMap[pidx]]) {
            const list = container[keyMap[pidx]].__3d_layouts;
            let count = list.length;
            while (count--) {
              const assembly = Object.assign({}, list[count]);
              assembly.pointsData = Float32Array.from(assembly.pointsData);

              // Apply translation from the core
              const nbValues = assembly.pointsData.length;
              for (let idx = 0; idx < nbValues; idx += 3) {
                assembly.pointsData[idx + 0] += offsetX;
                assembly.pointsData[idx + 1] += offsetY;
              }
              // add a tag from bankMap, if it exists.
              if (container === LAYOUT_MAP.CONTROLS) {
                if (bankMap && bankMap[pidx]) {
                  assembly.movingControl = bankMap[pidx];
                } else {
                  assembly.movingControl = keyMap[pidx];
                }
              }

              layouts.push(assembly);
            }

            // Check if grid
            if (container[keyMap[pidx]].__grid) {
              const grid = Object.assign({}, container[keyMap[pidx]].__grid);
              grid.pointsData = Float32Array.from(grid.pointsData);
              gridArraySize += grid.pointsData.length;

              // Apply translation from the core
              const nbValues = grid.pointsData.length;
              for (let idx = 0; idx < nbValues; idx += 3) {
                grid.pointsData[idx + 0] += offsetX;
                grid.pointsData[idx + 1] += offsetY;
              }

              grids.push(grid);
            }
          }
        }
        pidx++;
      }
    }
  }

  // Merge similar cells
  const cellTypeMap = {};
  let count = layouts.length;
  while (count--) {
    const layout = layouts[count];
    let { cellId, glyph } = layout; // eslint-disable-line
    // If tagged as moveable, put in different cellIDs
    if (layout.movingControl !== undefined) {
      cellId = `${cellId}_${layout.movingControl}`;
    }
    if (!cellTypeMap[cellId]) {
      cellTypeMap[cellId] = {
        cellId,
        glyph: Object.assign({}, glyph, { resolution }),
        pointsData: [],
        scaling: [],
        totalSize: 0,
      };
    }
    cellTypeMap[cellId].pointsData.push(layout.pointsData);
    cellTypeMap[cellId].scaling.push(layout.scaling);
    cellTypeMap[cellId].totalSize += layout.pointsData.length;
    if (layout.movingControl !== undefined) {
      cellTypeMap[cellId].movingControl = layout.movingControl;
    }
  }
  const cellIds = Object.keys(cellTypeMap);
  count = cellIds.length;
  const controlRodTags = {};
  while (count--) {
    const layout = cellTypeMap[cellIds[count]];
    const pointsData = new Float32Array(layout.totalSize);
    const scaling = new Float32Array(layout.totalSize);
    const nbArrays = layout.pointsData.length;
    let globalIdx = 0;
    for (let aIdx = 0; aIdx < nbArrays; aIdx++) {
      const arraySize = layout.pointsData[aIdx].length;
      for (let idx = 0; idx < arraySize; idx++) {
        pointsData[globalIdx] = layout.pointsData[aIdx][idx];
        scaling[globalIdx] = layout.scaling[aIdx][idx];
        globalIdx++;
      }
    }

    // Replace by a flat array
    layout.pointsData = pointsData;
    layout.scaling = scaling;

    // Glyph distribution size
    // console.log(cellIds[count], pointsData.length / 3);

    content.has3D.layouts.push(layout);

    if (layout.movingControl !== undefined) {
      controlRodTags[layout.movingControl] = true;
    }
  }
  if (controlRodTags) {
    content.has3D.controlRodTags = Object.keys(controlRodTags);
  }

  // Merge grids to grid
  const gridPointData = new Float32Array(gridArraySize);
  const gridScaleData = new Float32Array(gridArraySize);
  const gridColorData = new Float32Array(gridArraySize / 3);
  let colorOffset = 0;
  let vec3Offset = 0;

  let gCount = grids.length;
  while (gCount--) {
    const { pointsData, scalingData, colorData } = grids[gCount];
    const vec3Size = pointsData.length;
    const colorSize = colorData.length;
    for (let idx = 0; idx < vec3Size; idx++) {
      gridPointData[vec3Offset] = pointsData[idx];
      gridScaleData[vec3Offset] = scalingData[idx];
      vec3Offset++;
    }
    for (let idx = 0; idx < colorSize; idx++) {
      gridColorData[colorOffset++] = colorData[idx];
    }
  }
  content.has3D.grid = {
    pointsData: gridPointData,
    scalingData: gridScaleData,
    colorData: gridColorData,
    lookupTable: materialLookupTable,
  };

  if (!core.shape) return content;

  // Add vessel
  const vesselGlyph = ModelHelper.extractVesselAsCellFromCore(core);
  if (vesselGlyph.radii) {
    const vessel = {
      toggleActor: 'Vessel',
      glyph: {
        noDynamicResolution: true,
        forceMask: [0],
        radius: vesselGlyph.radii,
        cellFields: vesselGlyph.mats
          ? vesselGlyph.mats.map(materialColorManager.getId)
          : [],
        resolution: 120,
      },
      pointsData: new Float32Array(content.has3D.center),
      scaling: new Float32Array([1, 1, core.height]),
    };
    content.has3D.outerRadius = vessel.glyph.radius[1]; // eslint-disable-line
    content.has3D.layouts.push(vessel);
  }
  // Add plates
  const plateGlyphs = ModelHelper.extractPlateAsCellsFromCore(core);
  if (plateGlyphs) {
    count = plateGlyphs.length;
    while (count--) {
      const plateGlyph = plateGlyphs[count];
      const center = [].concat(content.has3D.center);
      // plates are above and below the main vessel
      center[2] =
        plateGlyph.labelToUse === 'lower plate'
          ? -(plateGlyph.height * 0.5)
          : core.height + plateGlyph.height * 0.5;
      const plate = {
        toggleActor: 'Plate',
        glyph: {
          noDynamicResolution: true,
          radius: plateGlyph.radii,
          cellFields: plateGlyph.mats
            ? plateGlyph.mats.map(materialColorManager.getId)
            : [],
          resolution: 120,
        },
        pointsData: new Float32Array(center),
        scaling: new Float32Array([1, 1, plateGlyph.height]),
      };
      content.has3D.layouts.push(plate);
    }
  }
  // Add pads
  const padGlyphs = ModelHelper.extractPadAsCellsFromCore(core);
  if (padGlyphs) {
    count = padGlyphs.length;
    const padResolution = Math.ceil(120 / padGlyphs.length);
    while (count--) {
      const padGlyph = padGlyphs[count];
      const pad = {
        toggleActor: 'Vessel',
        glyph: {
          noDynamicResolution: true,
          forceMask: [0],
          radius: padGlyph.radii,
          startTheta: padGlyph.theta[0],
          endTheta: padGlyph.theta[1],
          cellFields: padGlyph.mats
            ? padGlyph.mats.map(materialColorManager.getId)
            : [],
          resolution: padResolution,
        },
        pointsData: new Float32Array(content.has3D.center),
        scaling: new Float32Array([1, 1, core.height - EPSILON]),
      };
      content.has3D.layouts.push(pad);
    }
  }
  // Add baffle
  content.has3D.baffle = ModelHelper.extractBaffleLayoutFrom(
    core,
    -baffleOffset
  );
  content.has3D.baffle.diffuseColor = materialColorManager
    .getColor(content.has3D.baffle.mat)
    .filter((v, i) => i < 3);

  return content;
}

// ----------------------------------------------------------------------------

function compute3DSlice(full3DCore, min, max) {
  const layouts = [];
  const slice = {
    center: [].concat(full3DCore.center),
    xLength: 2 * full3DCore.outerRadius,
    yLength: 2 * full3DCore.outerRadius,
    zLength: max - min,
  };
  slice.center[2] = (min + max) * 0.5;
  const result = Object.assign({}, full3DCore, {
    slice,
    layouts,
    id: idFor3D++,
  });
  let count = full3DCore.layouts.length;
  while (count--) {
    const item = Object.assign({}, full3DCore.layouts[count]);
    const pointsToKeep = [];
    let nbPoints = item.pointsData.length / 3;
    for (let i = 0; i < nbPoints; i++) {
      const zCenter = item.pointsData[i * 3 + 2];
      const zScaleHalf = item.scaling[i * 3 + 2] * 0.5;
      const zMin = zCenter - zScaleHalf;
      const zMax = zCenter + zScaleHalf;
      if (!(min + EPSILON > zMax || max < zMin + EPSILON)) {
        // Keep that point
        pointsToKeep.push(i);
      }
    }
    nbPoints = pointsToKeep.length;
    const pointsData = new Float32Array(3 * nbPoints);
    const scaling = new Float32Array(3 * nbPoints);
    for (let i = 0; i < nbPoints; i++) {
      const srcOffset = pointsToKeep[i] * 3;
      const dstOffset = i * 3;
      pointsData[dstOffset + 0] = item.pointsData[srcOffset + 0];
      pointsData[dstOffset + 1] = item.pointsData[srcOffset + 1];
      pointsData[dstOffset + 2] = item.pointsData[srcOffset + 2];
      scaling[dstOffset + 0] = item.scaling[srcOffset + 0];
      scaling[dstOffset + 1] = item.scaling[srcOffset + 1];
      scaling[dstOffset + 2] = item.scaling[srcOffset + 2];
    }
    item.pointsData = pointsData;
    item.scaling = scaling;

    layouts.push(item);
  }
  return result;
}

// ----------------------------------------------------------------------------

function getColorLegendAt(elevation) {
  return legendByElevation[elevation];
}

// ----------------------------------------------------------------------------

const onCellsImageReady = cellsImageManager.onImageReady;
const onAssembliesImageReady = layoutsImageManager.onImageReady;

// ----------------------------------------------------------------------------

export default {
  updateCellImage,
  updateLayoutImage,
  updateItemWithLayoutImages,
  // computeCoreImageAt,
  computeCoreColorsAt,
  computeCore2ImageAt,
  onCellsImageReady,
  onAssembliesImageReady,
  setLogger,
  materialColorManager,
  getColorLegendAt,
  getCellMaterial,
  getLayoutCell,
  updateLookupTables,
  compute3DCore,
  compute3DSlice,
  materialLookupTable,
};
