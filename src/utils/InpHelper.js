function getNumPins(rodmap, params) {
  return rodmap.type === 'coremaps' ? params.numAssemblies : params.numPins;
}

// given the full array, generate a text map reduced by symmetry.
function getTextMap(rodmap, params) {
  const map = [];
  const { cell_map: cellMap } = rodmap;
  const symmetry = rodmap.symmetry || 'none';
  const numPins = getNumPins(rodmap, params);
  const halfPins = Math.floor(numPins * 0.5);
  // copy from the lower-right quad, and left octant.
  if (halfPins > 0 && symmetry === 'oct') {
    for (let j = halfPins; j < numPins; ++j) {
      // i range is halfPins -> j
      map.push(
        cellMap.slice(j * numPins + halfPins, j * numPins + j + 1).join(' ')
      );
    }
  } else if (halfPins > 0 && symmetry === 'quad') {
    for (let j = halfPins; j < numPins; ++j) {
      // i range is halfPins -> end of row
      map.push(
        cellMap.slice(j * numPins + halfPins, (j + 1) * numPins).join(' ')
      );
    }
  } else {
    for (let i = 0; i < numPins; ++i) {
      map.push(cellMap.slice(i * numPins, (i + 1) * numPins).join(' '));
    }
  }
  return map.join('\n');
}

// given the text map with symmetry, generate the full array. Expand as necessary.
function getFullMap(rodmap, params) {
  // Verify items in the cellMap. Unrecognized cells are empty.
  const symmetry = rodmap.symmetry || 'none';
  const numPins = getNumPins(rodmap, params);
  let cellMap = [];
  if (rodmap.cellMap) cellMap = rodmap.cellMap.split(/[\n]+/);

  cellMap.forEach((row, i) => {
    cellMap[i] = row.trim().split(/[,\s]+/);
    cellMap[i].forEach((c, j) => {
      if (c === '') cellMap[i][j] = '-';
    });
  });
  let mapSize = numPins;
  const halfPins = Math.ceil(numPins * 0.5);
  if (symmetry === 'oct' || symmetry === 'quad') {
    // mapSize = halfPins * (halfPins + 1) / 2;
    mapSize = halfPins;
  }
  for (let i = 0; i < mapSize; ++i) {
    const rowSize = symmetry === 'oct' ? i + 1 : mapSize;
    if (!cellMap[i]) cellMap[i] = [];
    while (cellMap[i].length < rowSize) {
      cellMap[i].push('-');
    }
    while (cellMap[i].length > rowSize) {
      cellMap[i].pop();
    }
  }

  if (symmetry === 'oct') {
    // rebuild quad map
    for (let j = 0; j < halfPins; ++j) {
      for (let i = j + 1; i < halfPins; ++i) {
        cellMap[j].push(cellMap[i][j]);
      }
    }
  }
  if (symmetry === 'oct' || symmetry === 'quad') {
    // we have the bottom-right - add the bottom-left, as a mirror
    for (let j = 0; j < halfPins; ++j) {
      cellMap[j] = cellMap[j]
        .slice(1)
        .reverse()
        .concat(cellMap[j]);
    }
    // add the top half, mirrored.
    cellMap = cellMap
      .slice(1) // this is a copy, with the duplicate center row dropped.
      .reverse()
      .concat(cellMap);
  }
  // now flatten.
  return cellMap.reduce((p, row) => p.concat(row));
}

function padCellMap(rodmap, params) {
  // if a coremap hasn't been initialized, it will
  // have short rows where core_shape is zero. Pad with '-'
  const numPins = getNumPins(rodmap, params);
  if (params.coreShapeMap && rodmap.cell_map.length !== numPins * numPins) {
    let pidx = 0;
    const newMap = params.coreShapeMap.map((occupied, i) => {
      if (!occupied) return '-';
      return rodmap.cell_map[pidx++];
    });
    rodmap.cell_map = newMap;
  }
}

// rodmaps from xml don't have their symmetry set -
// test and set symmetry and text map.
function setSymmetry(rodmap, params) {
  if (rodmap.symmetry === undefined) {
    if (rodmap.type === 'coremaps') {
      padCellMap(rodmap, params);
    }
    const saveTextMap = rodmap.cellMap;
    rodmap.symmetry = 'oct';
    rodmap.cellMap = getTextMap(rodmap, params);
    let testMap = getFullMap(rodmap, params);
    if (
      !rodmap.cell_map.reduce(
        (prev, cell, i) => cell === testMap[i] && prev,
        true
      )
    ) {
      rodmap.symmetry = 'quad';
      rodmap.cellMap = getTextMap(rodmap, params);
      testMap = getFullMap(rodmap, params);
      if (
        !rodmap.cell_map.reduce(
          (prev, cell, i) => cell === testMap[i] && prev,
          true
        )
      ) {
        rodmap.symmetry = 'none';
        rodmap.cellMap = saveTextMap || getTextMap(rodmap, params);
      }
    }
  }
}

const labelCompare = (a, b) => a.label.localeCompare(b.label);

// anywhere the core map has zero, strip '-' from the text map.
function stripCoreZeros(textMap, coreMap) {
  const coreRows = coreMap
    .split('\n')
    .map((line) => line.trim().split(/[,\s]+/));
  const lines = textMap.split('\n').map((line, i) => {
    const row = line.trim().split(/[,\s]+/);
    return row
      .map((cell, j) => (coreRows[i][j] === '0' ? ' ' : cell))
      .join(' ');
    // .trim();
  });
  return lines.join('\n');
}

function getCoreShape(coremaps, inShapeMap = null) {
  let coreShapeMap = inShapeMap;
  // set title, build a core_shape array.
  // Set locations occupied in any map to 1, empty to 0
  coremaps.forEach((cm, j) => {
    if (!coreShapeMap) {
      coreShapeMap = cm.cell_map.map((cell) => (cell !== '-' ? 1 : 0));
    } else {
      cm.cell_map.forEach((cell, i) => {
        if (cell !== '-') coreShapeMap[i] = 1;
        else if (j === 0) coreShapeMap[i] = 0;
      });
    }
  });
  return coreShapeMap;
}

// inverse of 'parseFile' - take a state, and write as much as
// we can to .inp format, as a string.
function writeToInp(state, GROUP_TYPES) {
  const result = [];
  result.push('[CASEID]');
  result.push('  title "VeraInView editor output"');

  result.push('\n[CORE]');
  result.push(
    `  size   ${state.params.numAssemblies} ! assemblies across core`
  );
  result.push(`  apitch ${state.params.assemblyPitch}`);

  const groupTitles = {};
  const coreShapeMap = getCoreShape(state.coremaps);
  // set title, build a core_shape array.
  // Set locations occupied in any map to 1, empty to 0
  state.coremaps.forEach((cm) => {
    groupTitles[cm.group] = cm.label;
  });
  if (coreShapeMap) {
    const coreShape = {
      type: 'coremaps',
      symmetry: 'none',
      cell_map: coreShapeMap,
    };
    const coreText = getTextMap(coreShape, state.params);
    result.push('\n  core_shape');
    coreText.split('\n').forEach((line) => {
      result.push(`    ${line}`);
    });

    // get symmetry text maps for comparison with assemblies.
    const coreMaps = {
      none: coreText,
      oct: (coreShape.symmetry = 'oct') && getTextMap(coreShape, state.params),
      quad:
        (coreShape.symmetry = 'quad') && getTextMap(coreShape, state.params),
    };
    GROUP_TYPES.forEach((info) => {
      const mapList = state.coremaps.filter((a) => a.group === info.group);
      if (!mapList.length) return;
      const assemMap = mapList[0];
      result.push(`\n  ${info.coremap}`);
      setSymmetry(assemMap, state.params);
      let textMap = getTextMap(assemMap, state.params);
      // strips locations that are '0' in coreShape map.
      textMap = stripCoreZeros(textMap, coreMaps[assemMap.symmetry]);
      textMap.split('\n').forEach((line) => {
        result.push(`    ${line}`);
      });
    });
  }

  GROUP_TYPES.forEach((info) => {
    const isAssembly = info.label === 'Assembly';
    const assemList = state.assemblies
      .filter((a) => a.group === info.group)
      .sort(labelCompare);
    if (assemList.length) {
      result.push(`\n[${info.label.toUpperCase()}]`);
      if (groupTitles[info.group]) {
        result.push(`  title "${groupTitles[info.group]}"`);
      }
      result.push(`  npin   ${state.params.numPins}`);
      if (isAssembly) result.push(`  ppitch ${state.params.pinPitch}`);

      // need a list of all used lattices/rodmaps
      const usedMap = {};
      // formatting - max string lengths.
      let maxAssemblyLen = 0;
      let maxElevLen = 0;
      assemList.forEach((assembly) => {
        maxAssemblyLen = Math.max(maxAssemblyLen, assembly.label.length);
        assembly.axial_labels.forEach((label) => {
          maxElevLen = Math.max(maxElevLen, label.length);
          usedMap[label] = true;
        });
        assembly.axial_elevations.forEach((el, i) => {
          maxElevLen = Math.max(maxElevLen, `${el}`.length);
        });
      });

      const rodmapList = state.rodmaps
        .filter(
          (rodmap) => rodmap.group === info.group && usedMap[rodmap.label]
        )
        .sort(labelCompare);

      const usedCells = {};
      rodmapList.forEach((rodmap) => {
        rodmap.cell_map.forEach((cell) => {
          usedCells[cell] = true;
        });
      });

      const cellList = state.cells
        .filter((cell) => cell.group === info.group && usedCells[cell.label])
        .sort(labelCompare);

      result.push('');
      cellList.forEach((cell) => {
        result.push(
          `  cell ${cell.label} ${cell.radii.join(' ')} / ${cell.mats.join(
            ' '
          )}`
        );
      });

      rodmapList.forEach((rodmap) => {
        result.push(`\n  ${isAssembly ? 'lattice' : 'rodmap'} ${rodmap.label}`);
        setSymmetry(rodmap, state.params);
        const cellMap = getTextMap(rodmap, state.params);
        cellMap.split('\n').forEach((line) => {
          result.push(`    ${line}`);
        });
      });

      result.push('');
      assemList.forEach((assembly) => {
        const axList = [];
        assembly.axial_elevations.forEach((el, i) => {
          axList.push(`${el}`.padEnd(maxElevLen));
          if (assembly.axial_labels[i]) {
            axList.push(assembly.axial_labels[i].padEnd(maxElevLen));
          }
        });
        const axStr = axList.join(' ');
        result.push(
          `  axial ${assembly.label.padStart(maxAssemblyLen)}  ${axStr}`
        );
      });
    }
  });
  return result.join('\n');
}

export default {
  getCoreShape,
  getNumPins,
  getTextMap,
  getFullMap,
  setSymmetry,
  writeToInp,
};
