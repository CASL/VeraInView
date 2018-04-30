import macro from 'vtk.js/Sources/macro';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkConcentricCylinderSource from 'vtk.js/Sources/Filters/Sources/ConcentricCylinderSource';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';

import vtkVTKViewer from './VTKViewer';

function extractCellSettings(layers, colors) {
  const matIds = [];
  const radii = [];
  const cellFields = [];
  const RGBPoints = [];
  for (let i = 0; i < layers.length; i++) {
    const { radius, material } = layers[i];
    if (matIds.indexOf(material) === -1) {
      matIds.push(material);
    }
    const id = matIds.indexOf(material);
    radii.push(radius);
    cellFields.push(id);
    RGBPoints.push(id);
    RGBPoints.push(colors[material][0]);
    RGBPoints.push(colors[material][1]);
    RGBPoints.push(colors[material][2]);
  }

  return {
    radius: radii,
    cellFields,
    RGBPoints,
  };
}

// ----------------------------------------------------------------------------
// vtkCellVTKViewer methods
// ----------------------------------------------------------------------------

function vtkCellVTKViewer(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkCellVTKViewer');

  // Internal pipeline
  model.lookupTable = vtkColorTransferFunction.newInstance();
  model.source = vtkConcentricCylinderSource.newInstance({
    resolution: 60,
    startTheta: -1,
    endTheta: 179,
  });
  model.mapper = vtkMapper.newInstance({
    lookupTable: model.lookupTable,
    useLookupTableScalarRange: true,
  });
  model.actor = vtkActor.newInstance({
    scale: [1, 1, model.zScaling],
  });
  // context
  model.sourceCtx = vtkConcentricCylinderSource.newInstance({
    resolution: 60,
    startTheta: 178,
  });
  model.mapperCtx = vtkMapper.newInstance({ scalarVisibility: false });
  model.actorCtx = vtkActor.newInstance({
    scale: [1, 1, model.zScaling],
  });
  model.actorCtx.getProperty().setOpacity(0.3);

  model.actor.getProperty().set(vtkVTKViewer.PROPERTY_SETTINGS);
  model.actor.setMapper(model.mapper);
  model.mapper.setInputConnection(model.source.getOutputPort());

  model.actorCtx.getProperty().set(vtkVTKViewer.PROPERTY_SETTINGS);
  model.actorCtx.setMapper(model.mapperCtx);
  model.mapperCtx.setInputConnection(model.sourceCtx.getOutputPort());

  publicAPI.addActor(model.actor);
  publicAPI.addActor(model.actorCtx);

  // cell = {
  //   name: '',
  //   pitch: 1.26,
  //   colors: {
  //     mod: [0, 0, 0.5],
  //     he: [0, 0.5, 0.3],
  //     zirc: [0.5, 0.5, 0.3],
  //     ss: [0.4, 0.5, 0.4],
  //   },
  //   layers: [
  //     { material: 'mod', radius: 0.2 },
  //     { material: 'he', radius: 0.3 },
  //     { material: 'zirc', radius: 0.4 },
  //     { material: 'ss', radius: 0.5 },
  //   ],
  // }
  publicAPI.setData = (cell) => {
    const { radius, cellFields, RGBPoints } = extractCellSettings(
      cell.layers,
      cell.colors
    );
    model.lookupTable.applyColorMap({ RGBPoints });
    model.source.clearRadius();
    for (let i = 0; i < radius.length; i++) {
      model.source.addRadius(radius[i], cellFields[i]);
    }
    model.sourceCtx.setRadius(0, cell.pitch * 0.5);
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
  vtkCellVTKViewer(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkCellVTKViewer');

// ----------------------------------------------------------------------------

export default { newInstance, extend, extractCellSettings };
