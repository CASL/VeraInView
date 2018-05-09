import macro from 'vtk.js/Sources/macro';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkConcentricCylinderSource from 'vtk.js/Sources/Filters/Sources/ConcentricCylinderSource';
import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkGlyph3DMapper from 'vtk.js/Sources/Rendering/Core/Glyph3DMapper';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';

import vtkVTKViewer from './VTKViewer';

// ----------------------------------------------------------------------------

function processColors(colors, lookupTable) {
  const materialIds = Object.keys(colors);
  const RGBPoints = [];
  for (let i = 0; i < materialIds.length; i++) {
    RGBPoints.push(i);
    RGBPoints.push(colors[materialIds[i]][0]);
    RGBPoints.push(colors[materialIds[i]][1]);
    RGBPoints.push(colors[materialIds[i]][2]);
  }

  lookupTable.applyColorMap({ RGBPoints });

  return materialIds;
}

// ----------------------------------------------------------------------------

function processCells(cells, materialIds) {
  const cellMap = {};

  const names = Object.keys(cells);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const cell = cells[name];
    const radii = [];
    const cellFields = [];

    for (let j = 0; j < cell.length; j++) {
      const { material, radius } = cell[j];
      radii.push(radius);
      cellFields.push(materialIds.indexOf(material));
    }

    cellMap[name] = { radius: radii, cellFields, center: [], scale: [] };
  }
  return cellMap;
}

// ----------------------------------------------------------------------------

function processRods(rods) {
  const rodsMap = {};
  const ids = Object.keys(rods);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const rod = rods[id];
    const cellMap = {};
    rodsMap[id] = cellMap;
    let currentZ = rod.offset;
    for (let j = 0; j < rod.cells.length; j++) {
      const { cell, length } = rod.cells[j];
      if (!cellMap[cell]) {
        cellMap[cell] = [];
      }
      cellMap[cell].push([currentZ + length / 2, length]);
      currentZ += length;
    }
  }
  return rodsMap;
}

// ----------------------------------------------------------------------------
// vtkRodVTKViewer methods
// ----------------------------------------------------------------------------

function vtkRodMapVTKViewer(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkRodMapVTKViewer');

  // Internal pipeline
  model.lookupTable = vtkColorTransferFunction.newInstance();
  model.stack = [];

  model.sourceCtx = vtkCubeSource.newInstance();
  model.mapperCtx = vtkMapper.newInstance({ scalarVisibility: false });
  model.actorCtx = vtkActor.newInstance();

  model.actorCtx
    .getProperty()
    .set(Object.assign({ representation: 1 }, vtkVTKViewer.PROPERTY_SETTINGS));
  model.actorCtx.setMapper(model.mapperCtx);
  model.mapperCtx.setInputConnection(model.sourceCtx.getOutputPort());

  // rod = {
  //   name: '',
  //   pitch: 1.26,
  //   colors: {
  //     mod: [0, 0, 0.5],
  //     he: [0, 0.5, 0.3],
  //     zirc: [0.5, 0.5, 0.3],
  //     ss: [0.4, 0.5, 0.4],
  //   },
  //   cells: {
  //      A: [
  //         { material: 'mod', radius: 0.2 },
  //         { material: 'he', radius: 0.3 },
  //         { material: 'zirc', radius: 0.4 },
  //         { material: 'ss', radius: 0.5 },
  //      ],
  //      B: [],
  //      C: [],
  //   },
  //   rods: {
  //      1: [
  //        { cell: 'A', length: 10 },
  //        { cell: 'B', length: 200 },
  //        { cell: 'A', length: 5 },
  //        { cell: 'C', length: 10 },
  //      ],
  //      2: [
  //        { cell: 'A', length: 10 },
  //        { cell: 'B', length: 200 },
  //        { cell: 'A', length: 5 },
  //        { cell: 'C', length: 10 },
  //      ],
  //   },
  //   rodsOffset: {
  //     1: 0,
  //     2: 4.5,
  //   },
  //   map: {
  //     size: 17,
  //     grid: [1,2,1,2,1,2,1,2,1],
  //   },
  // }
  // ==========================================================================
  // viz = {
  //   selected: 'A',
  //   names: {
  //     1: 'Water',
  //     5: 'Fuel assembly',
  //     10: 'Core assembly',
  //   },
  //   cellPitch: 1.26,
  //   colors: {
  //     mod: [0, 0, 0.5],
  //     he: [0, 0.5, 0.3],
  //     zirc: [0.5, 0.5, 0.3],
  //     ss: [0.4, 0.5, 0.4],
  //   },
  //   cells: {
  //      A: [
  //        { material: 'mod', radius: 0.2 },
  //        { material: 'he', radius: 0.3 },
  //        { material: 'zirc', radius: 0.4 },
  //        { material: 'ss', radius: 0.5 },
  //      ],
  //      B: [],
  //      C: [],
  //   },
  //   rods: {
  //     insert: {
  //       offset: 10,
  //       length: 400,
  //       cells: [
  //         { cell: 'A', length: 10 },
  //         { cell: 'B', length: 200 },
  //         { cell: 'A', length: 5 },
  //         { cell: 'C', length: 10 },
  //       ],
  //     },
  //     control: {
  //       ...
  //     }
  //   },
  //   assembly: {
  //     fuel: {
  //       pitch: 1.27,
  //       size: 17,
  //       grid: [1,2,1,2,1,2,1,2,1],
  //     },
  //     insert: {
  //       pitch: 1.27,
  //       size: 17,
  //       grid: [1,2,1,2,1,2,1,2,1],
  //     }
  //   },
  //   core: {
  //     pitch: 25,
  //     size: 15,
  //     gridAssembly: [10,20,10,20,10,20,10,20,10],
  //     gridInsertControls: [10,20,10,20,10,20,10,20,10],
  //     gridDetectors: [10,20,10,20,10,20,10,20,10],
  //   },
  // }
  publicAPI.setData = (viz) => {
    if (!viz) {
      return;
    }

    const { colors, cells, rods } = viz;
    const { size, grid, pitch } = viz.assembly[viz.selected];

    const matIdMapping = processColors(colors, model.lookupTable);
    const cellMap = processCells(cells, matIdMapping);
    const rodsCells = processRods(rods);

    publicAPI.removeAllActors();
    model.stack = [];

    // Fill cell centers
    for (let idx = 0; idx < grid.length; idx++) {
      const x = (idx % size) * pitch;
      const y = Math.floor(idx / size) * pitch;
      const rod = rodsCells[grid[idx]];
      if (rod) {
        const cellIds = Object.keys(rod);
        for (let cIdx = 0; cIdx < cellIds.length; cIdx++) {
          const cell = cellMap[cellIds[cIdx]];
          const zList = rod[cellIds[cIdx]];
          for (let zIdx = 0; zIdx < zList.length; zIdx++) {
            const [z, length] = zList[zIdx];
            cell.center.push(x);
            cell.center.push(y);
            cell.center.push(z);
            cell.scale.push(1);
            cell.scale.push(1);
            cell.scale.push(length);
          }
        }
      }
    }

    // create pipeline
    const cellNames = Object.keys(cellMap);
    for (let i = 0; i < cellNames.length; i++) {
      const { lookupTable } = model;
      const { radius, cellFields, center, scale } = cellMap[cellNames[i]];

      const source = vtkPolyData.newInstance();
      source.getPoints().setData(Float32Array.from(center), 3);
      source.getPointData().addArray(
        vtkDataArray.newInstance({
          name: 'scale',
          values: Float32Array.from(scale),
          numberOfComponents: 3,
        })
      );

      const glyph = vtkConcentricCylinderSource.newInstance({
        resolution: 60,
        radius,
        cellFields,
      });

      const mapper = vtkGlyph3DMapper.newInstance({
        lookupTable,
        useLookupTableScalarRange: true,
        orient: false,
        scaling: true,
        scaleArray: 'scale',
        scaleMode: vtkGlyph3DMapper.ScaleModes.SCALE_BY_COMPONENTS,
      });
      const actor = vtkActor.newInstance({ scale: [1, 1, model.zScaling] });

      actor.getProperty().set(vtkVTKViewer.PROPERTY_SETTINGS);
      actor.setMapper(mapper);
      mapper.setInputData(source, 0);
      mapper.setInputConnection(glyph.getOutputPort(), 1);

      model.stack.push({ source, glyph, mapper, actor });
      publicAPI.addActor(actor);
    }

    publicAPI.renderLater();
  };

  publicAPI.resetCamera = () => {
    const camera = model.renderer.getActiveCamera();
    model.renderer.resetCamera();

    model.interactorStyle3D.setCenterOfRotation(camera.getFocalPoint());
    model.interactorStyle2D.setCenterOfRotation(camera.getFocalPoint());

    publicAPI.renderLater();
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  vtkVTKViewer.extend(publicAPI, model);

  // Object specific methods
  vtkRodMapVTKViewer(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkRodMapVTKViewer');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
