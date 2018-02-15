import macro from 'vtk.js/Sources/macro';

import XMLVeraParser from './XMLVeraParser';
import ImageGenerator from './ImageGenerator';

const { capitalize } = macro;

function compareLabels(a, b) {
  return a.label.localeCompare(b.label);
}

function compareLabelToUse(a, b) {
  return a.labelToUse.localeCompare(b.labelToUse);
}

function compareNumbers(a, b) {
  return a - b;
}

// make an ID out of materials and radii, to recognize cell-reuse.
function cellToId(cell) {
  const layers = [];
  let count = cell.mats ? cell.mats.length : 0;
  while (count--) {
    layers.push(`${cell.mats[count]}_${cell.radii[count]}`);
  }
  layers.reverse();
  return layers.join('|');
}

// The vessel can use the same primitive as a cell.
function extractVesselAsCellFromCore(core) {
  const numRings = core.vessel_radii ? core.vessel_radii.length : 0;
  const cell = {
    labelToUse: 'vessel',
    label: 'vessel',
    mats: core.vessel_mats,
    num_rings: numRings,
    radii: core.vessel_radii,
    type: 'vessel',
  };
  cell.id = cellToId(cell);

  return cell;
}

function extractPadAsCellsFromCore(core) {
  if (!core.pad_azi_locs) return null;
  const cells = [];

  const width = core.pad_arc;
  let countPads = core.pad_azi_locs.length;
  while (countPads--) {
    // VERA wants angle counter-clockwise from positive-X.
    const center = (core.pad_azi_locs[countPads] + 180) % 360;
    const cell = {
      labelToUse: 'pad',
      label: 'pad',
      mats: [core.pad_mat],
      num_rings: 2,
      radii: [core.pad_inner_radius, core.pad_outer_radius],
      theta: [center - width * 0.5, center + width * 0.5],
      type: 'vessel',
    };
    cell.id = cellToId(cell);
    cells.push(cell);
  }

  return cells;
}

function extractPlateAsCellsFromCore(core) {
  if (!core.lower_thick || !core.upper_thick) return null;
  const cells = [];
  const radius = core.vessel_radii
    ? core.vessel_radii[core.vessel_radii.length - 1]
    : core.apitch / 2;

  // We are currently ignoring the 'vfrac' - not sure how to show 50% moderator.
  ['lower', 'upper'].forEach((plate) => {
    if (core[`${plate}_thick`]) {
      const cell = {
        labelToUse: `${plate} plate`,
        label: 'plate',
        mats: [core[`${plate}_mat`]],
        num_rings: 1,
        radii: [radius],
        height: core[`${plate}_thick`],
        type: 'plate',
      };
      cell.id = cellToId(cell);
      cells.push(cell);
    }
  });
  return cells;
}

function extractCells(model) {
  const singleType = {};
  const cellListing = [];
  const keys = ['ASSEMBLIES', 'CONTROLS', 'DETECTORS', 'INSERTS'];
  let countLevel1 = keys.length;
  while (countLevel1--) {
    const key = keys[countLevel1];
    // use a single letter to denote type, A,C,D,I
    const type = key[0];
    if (model.CASEID[key]) {
      const subKeys = Object.keys(model.CASEID[key]);
      let countLevel2 = subKeys.length;
      while (countLevel2--) {
        const subKey = subKeys[countLevel2];
        const containerName = model.CASEID[key][subKey].label;
        const cells = model.CASEID[key][subKey].Cells;
        const cellKeys = Object.keys(cells);
        let countCells = cellKeys.length;
        while (countCells--) {
          const cell = cells[cellKeys[countCells]];
          const id = cellToId(cell);
          cell.id = id;
          // Detect if we've seen this material/radii combo before.
          if (singleType[id] === undefined) {
            singleType[id] = cell;
            cell.usage = { [type]: { [containerName]: cell.label } };
            cellListing.push(cell);
          } else {
            if (!singleType[id].usage[type]) {
              singleType[id].usage[type] = {};
            }
            if (!singleType[id].usage[type][containerName]) {
              singleType[id].usage[type][containerName] = cell.label;
            }
          }
        }
      }
    }
  }

  // Generate labelToUse
  countLevel1 = cellListing.length;
  while (countLevel1--) {
    const cell = cellListing[countLevel1];
    const categories = Object.keys(cell.usage);
    if (categories.length === 1) {
      cell.labelToUse = `${categories[0][0]}:${cell.label}`;
    } else {
      const labelToUse = [];
      const names = [];
      let level1Count = categories.length;
      while (level1Count--) {
        const cat = cell.usage[categories[level1Count]];
        const level2List = Object.keys(cat);
        let level2Count = level2List.length;
        while (level2Count--) {
          const name = cat[level2List[level2Count]];
          if (names.indexOf(name) === -1) {
            names.push(name);
            labelToUse.push(`${categories[0][0]}:${cell.label}`);
          }
        }
      }
      cell.labelToUse = labelToUse.join(', ');
    }
  }

  // ensure proper listing
  cellListing.sort(compareLabelToUse);

  return cellListing;
}

function extractMaterials(node) {
  const result = {};
  if (node && node.Materials) {
    const keys = Object.keys(node.Materials);
    let count = keys.length;
    while (count--) {
      const mat = node.Materials[keys[count]];
      // nothing to do - key_name and density already present.
      // materials are unique, though - using an object as map.
      result[mat.key_name] = mat;
    }
  }
  return result;
}

function extractCellsMaterials(cells, addOn = []) {
  const uniqueNames = {};
  let count = cells.length;
  while (count--) {
    const cell = cells[count];
    let matCount = cell.mats.length;
    while (matCount--) {
      const mat = cell.mats[matCount];
      uniqueNames[mat] = true;
    }
  }
  const allMaterials = Object.keys(uniqueNames);
  count = addOn.length;
  while (count--) {
    if (allMaterials.indexOf(addOn[count]) === -1) {
      allMaterials.push(addOn[count]);
    }
  }
  allMaterials.sort();
  return allMaterials;
}

function extractCellLayout(model, rootKey) {
  const result = [];
  if (model.CASEID[rootKey]) {
    const keys = Object.keys(model.CASEID[rootKey]);
    let count = keys.length;
    while (count--) {
      const item = model.CASEID[rootKey][keys[count]];
      item.layout = [];
      const layoutNames = Object.keys(item.CellMaps);
      let layoutCount = layoutNames.length;
      while (layoutCount--) {
        item.layout.push(item.CellMaps[layoutNames[layoutCount]]);
      }
      // over-ridden local materials
      // eslint-disable-next-line no-underscore-dangle
      item.__materials = extractMaterials(item);

      // Try to extract the grids
      if (item.SpacerGrids) {
        item.grids = {};
        const gridNames = Object.keys(item.SpacerGrids);
        let gridCount = gridNames.length;
        while (gridCount--) {
          const grid = item.SpacerGrids[gridNames[gridCount]];
          item.grids[grid.label] = {
            height: grid.height,
            mat: grid.material,
            mass: grid.mass,
            elevations: [],
          };
        }
        // Fill elevations
        let nbElevations = item.grid_elev.length;
        while (nbElevations--) {
          item.grids[item.grid_map[nbElevations]].elevations.push(
            item.grid_elev[nbElevations]
          );
        }
      }

      result.push(item);
    }
  }
  result.sort(compareLabels);
  return result;
}

function extractAssemblies(model) {
  return extractCellLayout(model, 'ASSEMBLIES');
}

function extractControls(model) {
  return extractCellLayout(model, 'CONTROLS');
}

function extractDetectors(model) {
  return extractCellLayout(model, 'DETECTORS');
}

function extractInserts(model) {
  return extractCellLayout(model, 'INSERTS');
}

function extractElevations(model) {
  let elevations = [];
  const rootKeys = ['ASSEMBLIES', 'CONTROLS', 'DETECTORS', 'INSERTS'];
  for (let i = 0; i < rootKeys.length; i++) {
    const container = model.CASEID[rootKeys[i]];
    if (container) {
      const keys = Object.keys(container);
      let count = keys.length;
      while (count--) {
        elevations = elevations.concat(container[keys[count]].axial_elevations);
      }
    }
  }

  elevations.sort(compareNumbers);

  return elevations.filter((v, i, a) => a[i - 1] !== v);
}

function extractStates(model) {
  const rootKey = 'STATES';
  const result = [];
  if (model.CASEID[rootKey]) {
    const keys = Object.keys(model.CASEID[rootKey]);
    let count = keys.length;
    while (count--) {
      const item = model.CASEID[rootKey][keys[count]];
      item.label = keys[count];
      // keys are State_N, want just N, and sorted.
      item.labelToUse = keys[count].startsWith('State_')
        ? +keys[count].slice('State_'.length)
        : keys[count];
      result.push(item);
    }
    result.sort((a, b) => a.labelToUse - b.labelToUse);
    // traverse in order, and set cumulative control-rod postitions.
    const controlRodPositions = {};
    for (let i = 0; i < result.length; ++i) {
      const item = result[i];
      if (item.bank_labels) {
        item.bank_labels.forEach((rod, j) => {
          controlRodPositions[rod] = {
            pos: item.bank_pos[j],
          };
        });
      }
      // clone, to avoid conflicts.
      item.controlRodPositions = JSON.parse(
        JSON.stringify(controlRodPositions)
      );
    }
  }
  return result;
}

function extractBaffleLayoutFrom(core, baffleOffset) {
  const gap = core.baffle_gap;
  const mat = core.baffle_mat;
  const thick = core.baffle_thick;
  const coreSize = core.core_size;
  const halfCoreSize = coreSize / 2;
  const { shape, apitch, height } = core;
  const lastIndex = coreSize - 1;
  const baffleElements = [];
  for (let j = 0; j < coreSize; j++) {
    for (let i = 0; i < coreSize; i++) {
      const idx = j * coreSize + i;
      if (shape[idx]) {
        const left = i === 0 || (i > 0 && !shape[idx - 1]);
        const top = j === 0 || (j > 0 && !shape[idx - coreSize]);
        const right = i === lastIndex || (i < lastIndex && !shape[idx + 1]);
        const bottom =
          j === lastIndex || (j < lastIndex && !shape[idx + coreSize]);
        if (left || top || right || bottom) {
          baffleElements.push({
            i,
            j,
            left,
            top,
            right,
            bottom,
          });
        }
      }
    }
  }

  // Create baffles
  const pieces = [];
  const baffle = { mat, pieces };
  const shift = gap + thick / 2;
  let sign = 1;
  let count = baffleElements.length;
  const middleAssemblyIndex = Math.floor(halfCoreSize);
  while (count--) {
    const item = baffleElements[count];
    if (item.top) {
      sign = item.i < halfCoreSize ? -1 : +1;
      pieces.push({
        xLength: apitch + thick + (middleAssemblyIndex === item.i ? shift : 0),
        yLength: thick,
        zLength: height,
        center: [
          baffleOffset + apitch * 0.5 + item.i * apitch + sign * shift,
          baffleOffset + item.j * apitch - shift,
          height * 0.5,
        ],
      });
    }
    if (item.bottom) {
      sign = item.i < halfCoreSize ? -1 : +1;
      pieces.push({
        xLength: apitch + thick + (middleAssemblyIndex === item.i ? shift : 0),
        yLength: thick,
        zLength: height,
        center: [
          baffleOffset + apitch * 0.5 + item.i * apitch + sign * shift,
          baffleOffset + (item.j + 1) * apitch + shift,
          height * 0.5,
        ],
      });
    }
    if (item.left) {
      sign = item.j < halfCoreSize ? -1 : +1;
      pieces.push({
        xLength: thick,
        yLength: apitch + thick + (middleAssemblyIndex === item.j ? shift : 0),
        zLength: height,
        center: [
          baffleOffset + item.i * apitch - shift,
          baffleOffset + apitch * 0.5 + item.j * apitch + sign * shift,
          height * 0.5,
        ],
      });
    }
    if (item.right) {
      sign = item.j < halfCoreSize ? -1 : +1;
      pieces.push({
        xLength: thick,
        yLength: apitch + thick + (middleAssemblyIndex === item.j ? shift : 0),
        zLength: height,
        center: [
          baffleOffset + (item.i + 1) * apitch + shift,
          baffleOffset + apitch * 0.5 + item.j * apitch + sign * shift,
          height * 0.5,
        ],
      });
    }
  }

  return baffle;
}

function parseFile(file, imageSize, updateFn) {
  updateFn({ title: file.name, file });
  XMLVeraParser.parseFile(file).then(
    (dataModel) => {
      const core = {};
      const elevations = extractElevations(dataModel);
      const cells = extractCells(dataModel);
      const mask = {};
      core.materials = extractMaterials(dataModel.CASEID.CORE);
      const materials = extractCellsMaterials(
        cells,
        dataModel.CASEID.CORE.vessel_mats
      ).map((name) => {
        mask[ImageGenerator.materialColorManager.getId(name)] = false;
        return {
          title: capitalize(name),
          color: ImageGenerator.materialColorManager.getColor(name),
          id: ImageGenerator.materialColorManager.getId(name),
          density: core.materials[name] ? core.materials[name].density : 1,
        };
      });
      const states = extractStates(dataModel);
      const assemblies = extractAssemblies(dataModel);
      const controls = extractControls(dataModel);
      const detectors = extractDetectors(dataModel);
      const inserts = extractInserts(dataModel);
      const layoutsItems = [
        ['ASSEMBLIES', assemblies],
        ['CONTROLS', controls],
        ['DETECTORS', detectors],
        ['INSERTS', inserts],
      ];

      let lastPPitch = 0;
      for (let layoutIdx = 0; layoutIdx < layoutsItems.length; layoutIdx++) {
        const layouts = layoutsItems[layoutIdx][1];
        // check for consistent ppitch
        let count = layouts.length;
        while (count--) {
          if (layouts[count].ppitch) {
            if (lastPPitch && lastPPitch !== layouts[count].ppitch) {
              console.error(
                'Warning - inconsistent pin-pitch detected, using last value',
                layouts[count].ppitch
              );
            }
            lastPPitch = layouts[count].ppitch;
          }
        }
      }
      // Generate cells images
      let count = cells.length;
      while (count--) {
        ImageGenerator.updateCellImage(cells[count], imageSize, lastPPitch);
      }

      ImageGenerator.onCellsImageReady(() => {
        for (let layoutIdx = 0; layoutIdx < layoutsItems.length; layoutIdx++) {
          const [rootKey, layouts] = layoutsItems[layoutIdx];
          // Generate assemblies images
          count = layouts.length;
          while (count--) {
            ImageGenerator.updateItemWithLayoutImages(
              rootKey,
              layouts[count],
              core.materials,
              imageSize,
              layouts[count].ppitch || lastPPitch
            );
          }
        }
        ImageGenerator.updateLookupTables();

        // Fill core
        core.stack = ImageGenerator.compute3DCore(
          dataModel.CASEID.CORE,
          6,
          lastPPitch / 2
        );
        // extract info about control-rod motion
        if (controls && controls[0] && controls[0].stroke && core.stack.has3D) {
          // stroke card is specified once for [CONTROL] block - extract the first.
          core.stack.has3D.stroke = controls[0].stroke;
          core.stack.has3D.maxstep = controls[0].maxstep;
        }

        count = elevations.length - 1;
        while (count--) {
          const elevation = elevations[count];
          // pre-assign non-conflicting colors.
          ImageGenerator.computeCoreColorsAt(elevation, dataModel.CASEID.CORE);
        }
        count = elevations.length - 1;
        while (count--) {
          const elevation = elevations[count];
          core[elevation] = {
            imageSrc: ImageGenerator.computeCore2ImageAt(
              elevation,
              dataModel.CASEID.CORE
            ),
            legend: ImageGenerator.getColorLegendAt(elevation),
            has3D: ImageGenerator.compute3DSlice(
              core.stack.has3D,
              elevation,
              elevations[count + 1]
            ),
            labelToUse: `${elevation} to ${elevations[count + 1]}`,
          };
        }

        updateFn({
          assemblies,
          controls,
          detectors,
          inserts,
          core,
          states,
        });
      });

      updateFn({
        title: dataModel.CASEID.case_id,
        materials,
        cells,
        elevations,
      });
    },
    () => {
      console.error('Error while parsing');
    }
  );
}

export default {
  extractVesselAsCellFromCore,
  extractPadAsCellsFromCore,
  extractPlateAsCellsFromCore,
  extractCells,
  extractCellsMaterials,
  extractAssemblies,
  extractControls,
  extractDetectors,
  extractInserts,
  extractElevations,
  extractBaffleLayoutFrom,
  parseFile,
};
