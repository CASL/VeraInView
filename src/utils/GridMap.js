import macro from 'vtk.js/Sources/macro';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const SymmetryModes = {
  NONE: 0,
  QUADRANT_MIRROR: 1,
  QUADRANT_ROTATION: 2,
  OCTANT: 3,
};

const ReplacementMode = {
  SINGLE: 0,
  ALL: 1,
};

// ----------------------------------------------------------------------------
// Helpers methods
// ----------------------------------------------------------------------------

function none(size, i, j) {
  return [[i, j]];
}

function octant(size, i, j) {
  const iComp = size - i - 1;
  const jComp = size - j - 1;
  return [
    [i, j],
    [iComp, j],
    [i, jComp],
    [iComp, jComp],
    [j, i],
    [jComp, i],
    [j, iComp],
    [jComp, iComp],
  ];
}

function quadrantMirror(size, i, j) {
  const iComp = size - i - 1;
  const jComp = size - j - 1;
  return [[i, j], [iComp, j], [i, jComp], [iComp, jComp]];
}

function quadrantRotation(size, i, j) {
  return [
    [i, j],
    [size - 1 - j, i],
    [size - 1 - i, size - 1 - j],
    [j, size - 1 - i],
  ];
}

const SymmetryFn = [none, quadrantMirror, quadrantRotation, octant];

function createGrid(size, fillItem) {
  const grid = [];
  const totalSize = size * size;
  while (grid.length < totalSize) {
    grid.push(fillItem);
  }
  return grid;
}

// ----------------------------------------------------------------------------
// vtkGridMap methods
// ----------------------------------------------------------------------------

function vtkGridMap(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkGridMap');

  publicAPI.getGridEntry = (i, j) => model.grid[j * model.gridSize + i];

  publicAPI.setGridEntry = (i, j, value) => {
    const previousValue = publicAPI.getGridEntry(i, j);
    if (model.replacementMode === ReplacementMode.ALL) {
      for (let y = 0; y < model.gridSize; y++) {
        for (let x = 0; x < model.gridSize; x++) {
          const idx = y * model.gridSize + x;
          if (model.grid[idx] === previousValue) {
            model.grid[idx] = value;
          }
        }
      }
    } else {
      const fn = SymmetryFn[model.symmetry] || none;
      const list = fn(model.gridSize, i, j);
      while (list.length) {
        const [x, y] = list.pop();
        model.grid[y * model.gridSize + x] = value;
      }
    }
    if (model.autoResetReplacementMode) {
      model.replacementMode = ReplacementMode.SINGLE;
    }
    publicAPI.modified();
  };

  const superGridSize = publicAPI.setGridSize;
  publicAPI.setGridSize = (newSize) => {
    if (superGridSize(newSize)) {
      // Need to adjust our data model
      model.grid = createGrid(model.gridSize, model.emptyItem);
      return true;
    }
    return false;
  };

  publicAPI.setGrid = (grid) => {
    model.grid = grid || [];
    const totalSize = model.gridSize * model.gridSize;
    while (model.grid.length < totalSize) {
      model.grid.push(model.emptyItem);
    }
    publicAPI.modified();
  };

  if (!model.grid) {
    publicAPI.setGridSize(model.gridSize);
  } else {
    const totalSize = model.gridSize * model.gridSize;
    while (model.grid.length < totalSize) {
      model.grid.push(model.emptyItem);
    }
  }
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  autoResetReplacementMode: true,
  emptyItem: '-',
  gridSize: 17,
  replacementMode: ReplacementMode.SINGLE,
  symmetry: SymmetryModes.NONE,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  macro.obj(publicAPI, model);

  macro.setGet(publicAPI, model, [
    'autoResetReplacementMode',
    'emptyItem',
    'grid',
    'gridSize',
    'replacementMode',
    'symmetry',
  ]);

  // Object specific methods
  vtkGridMap(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkGridMap');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
