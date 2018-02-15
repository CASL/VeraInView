import macro from 'vtk.js/Sources/macro';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkConcentricCylinderSource from 'vtk.js/Sources/Filters/Sources/ConcentricCylinderSource';
import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkFPSMonitor from 'vtk.js/Sources/Interaction/UI/FPSMonitor';
import vtkGlyph3DMapper from 'vtk.js/Sources/Rendering/Core/Glyph3DMapper';
import vtkInteractorStyleManipulator from 'vtk.js/Sources/Interaction/Style/InteractorStyleManipulator';
import vtkInteractorStylePresets from 'vtk.js/Sources/Interaction/Style/InteractorStyleManipulator/Presets';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkURLExtract from 'vtk.js/Sources/Common/Core/URLExtract';

// ----------------------------------------------------------------------------
// GLOBAL
// ----------------------------------------------------------------------------

// Process arguments from URL
const userParams = vtkURLExtract.extractURLParameters();
const exportGlyphs = !!userParams.export;
const quarter = !!userParams.quarter;

const PROPERTY_SETTINGS = {
  diffuse: 0.7,
  ambient: 0.3,
};

function updateGlyphSource(glyph, resolution, maskMap) {
  if (!glyph.getReferenceByName('noDynamicResolution')) {
    glyph.setResolution(resolution);
  }
  const nbLayers = glyph.getNumberOfRadius();
  const mask = glyph.getCellFieldsByReference().map((i) => maskMap[i]);
  for (let layerIdx = 0; layerIdx < nbLayers; layerIdx++) {
    glyph.setMaskLayer(layerIdx, !!mask[layerIdx]);
  }
  if (glyph.getReferenceByName('forceMask')) {
    const forceMask = glyph.getReferenceByName('forceMask');
    let count = forceMask.length;
    while (count--) {
      glyph.setMaskLayer(forceMask[count], true);
    }
  }
  if (quarter) {
    glyph.setStartTheta(0);
    glyph.setEndTheta(90);
    if (!glyph.getReferenceByName('noDynamicResolution')) {
      glyph.setResolution(2);
    }
  } else {
    glyph.setStartTheta(0);
    glyph.setEndTheta(360);
  }
}

function updateActors(actors) {
  if (!actors) {
    return;
  }
  let count = actors.length;
  while (count--) {
    actors[count].getProperty().set(PROPERTY_SETTINGS);
  }
}

// ----------------------------------------------------------------------------
// vtkCASLPipelineManager methods
// ----------------------------------------------------------------------------

function vtkCASLPipelineManager(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkCASLPipelineManager');

  // Local variables
  model.pipeline = {};
  model.renderWindow = vtkRenderWindow.newInstance();
  model.renderer = vtkRenderer.newInstance({ background: [0, 0, 0, 1] });
  model.renderWindow.addRenderer(model.renderer);
  model.camera = model.renderer.getActiveCamera();

  model.openglRenderWindow = vtkOpenGLRenderWindow.newInstance();
  model.renderWindow.addView(model.openglRenderWindow);

  model.interactor = vtkRenderWindowInteractor.newInstance();
  model.interactor.setView(model.openglRenderWindow);

  model.interactorStyle3D = vtkInteractorStyleManipulator.newInstance();
  model.interactorStyle2D = vtkInteractorStyleManipulator.newInstance();
  model.interactor.setInteractorStyle(model.interactorStyle3D);

  // Apply default interaction styles
  vtkInteractorStylePresets.applyPreset('3D', model.interactorStyle3D);
  vtkInteractorStylePresets.applyPreset('2D', model.interactorStyle2D);

  // FPS performances
  model.fpsMonitor = vtkFPSMonitor.newInstance();
  model.fpsMonitor.setRenderWindow(model.renderWindow);

  const fpsElm = model.fpsMonitor.getFpsMonitorContainer();
  fpsElm.style.position = 'absolute';
  fpsElm.style.bottom = '10px';
  fpsElm.style.right = '10px';
  fpsElm.style.background = 'rgba(255,255,255,0.5)';
  fpsElm.style.borderRadius = '5px';

  // --------------------------------------------------------------------------

  publicAPI.setContainer = (container) => {
    if (model.container) {
      model.interactor.unbindEvents(model.container);
      model.openglRenderWindow.setContainer(null);
      model.fpsMonitor.setContainer(null);
    }

    model.container = container;

    if (container) {
      model.openglRenderWindow.setContainer(container);
      model.openglRenderWindow.getCanvas().style.width = '100%';
      model.interactor.initialize();
      model.interactor.bindEvents(container);

      if (userParams.fps) {
        model.fpsMonitor.setContainer(container);
      }
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.resize = () => {
    if (model.container) {
      const dims = model.container.getBoundingClientRect();
      model.openglRenderWindow.setSize(
        Math.floor(dims.width),
        Math.floor(dims.height)
      );
      publicAPI.renderLater();
      model.fpsMonitor.update();
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.getSize = () => {
    if (model.container) {
      const { width, height } = model.container.getBoundingClientRect();
      return [Math.floor(width), Math.floor(height)];
    }
    return [400, 400];
  };

  // --------------------------------------------------------------------------

  publicAPI.update = (
    state,
    useLOD = false,
    actorVisibilityByName = {},
    maskMap = {},
    controlRods = {}
  ) => {
    const exportGlyphArray = { mapping: [], glyph: [], rgbPoints: [] };
    const result = {};
    const isSame = model.pipeline.id === state.id;
    const newTypeToRender = model.pipeline.type !== state.type;
    let resolution = useLOD ? model.resolutionLOD : model.resolutionFULL;
    const controlRodScale = state.stroke ? state.stroke / state.maxstep : 1;
    const hasControlRods = !!Object.keys(controlRods).length;

    if (!state) {
      return result;
    }
    result.controlRods = controlRods;

    if (newTypeToRender && model.pipeline.type) {
      result.isFullSize = state.type !== 'core';
      result.capture = null;
      resolution =
        state.type !== 'core' ? model.resolutionFULL : model.resolutionLOD;
    } else if (model.pipeline.type) {
      result.capture = null;
    }

    if (!isSame) {
      publicAPI.resetPipeline();
      console.time('cell');
      if (state.type === 'cell') {
        model.pipeline.source = vtkConcentricCylinderSource.newInstance(
          state.source
        );
        model.pipeline.source.setResolution(resolution);
        model.pipeline.lookupTable = state.lookupTable;
        model.pipeline.mapper = vtkMapper.newInstance({
          lookupTable: model.pipeline.lookupTable,
          useLookupTableScalarRange: true,
        });
        model.pipeline.actor = vtkActor.newInstance({
          scale: [1, 1, model.zScaling],
        });

        model.pipeline.mapper.setInputConnection(
          model.pipeline.source.getOutputPort()
        );
        model.pipeline.actor.setMapper(model.pipeline.mapper);
        model.renderer.addActor(model.pipeline.actor);
      }
      console.timeEnd('cell');

      if (
        state.type === 'layout' ||
        state.type === 'assembly' ||
        state.type === 'core'
      ) {
        model.pipeline.lookupTable = state.lookupTable;
        model.pipeline.actors = [];
        model.pipeline.items = [];
        model.pipeline.movingControl = {};

        console.time('slice');
        if (state.slice) {
          const slice = vtkCubeSource.newInstance(state.slice);
          const mapper = vtkMapper.newInstance();
          const actor = vtkActor.newInstance({ scale: [1, 1, model.zScaling] });

          mapper.setInputConnection(slice.getOutputPort());
          actor.setMapper(mapper);
          actor.getProperty().setRepresentation(1); // Wireframe

          model.renderer.addActor(actor);

          model.pipeline.actors.push(actor);
          model.pipeline.items.push({
            slice,
            mapper,
            actor,
          });
        }
        console.timeEnd('slice');

        console.time('baffle');
        if (state.baffle) {
          const color = state.baffle.diffuseColor;
          const baffleActors = [];
          const visibility =
            actorVisibilityByName.Baffle === undefined
              ? true
              : actorVisibilityByName.Baffle;
          model.toggleActors.Baffle = baffleActors;

          let count = state.baffle.pieces.length;
          while (count--) {
            const baffle = vtkCubeSource.newInstance(
              state.baffle.pieces[count]
            );
            const mapper = vtkMapper.newInstance();
            const actor = vtkActor.newInstance({
              scale: [1, 1, model.zScaling],
              visibility,
            });
            actor.getProperty().setDiffuseColor(color);

            mapper.setInputConnection(baffle.getOutputPort());
            actor.setMapper(mapper);

            model.renderer.addActor(actor);

            model.pipeline.actors.push(actor);
            baffleActors.push(actor);
            model.pipeline.items.push({
              baffle,
              mapper,
              actor,
            });
          }
        }
        console.timeEnd('baffle');

        console.time('grid');
        if (state.grid) {
          const {
            pointsData,
            scalingData,
            colorData,
            lookupTable,
          } = state.grid;
          const visibility =
            actorVisibilityByName.Grid === undefined
              ? true
              : actorVisibilityByName.Grid;
          const source = vtkPolyData.newInstance();
          source.getPoints().setData(pointsData, 3);
          source.getPointData().addArray(
            vtkDataArray.newInstance({
              name: 'scaling',
              values: scalingData,
              numberOfComponents: 3,
            })
          );
          source
            .getPointData()
            .setScalars(
              vtkDataArray.newInstance({ name: 'color', values: colorData })
            );
          const cube = vtkCubeSource.newInstance();
          const mapper = vtkGlyph3DMapper.newInstance({
            useLookupTableScalarRange: true,
            lookupTable,
            orient: false,
            scaling: true,
            scaleArray: 'scaling',
            scaleMode: vtkGlyph3DMapper.ScaleModes.SCALE_BY_COMPONENTS,
          });
          const actor = vtkActor.newInstance({
            scale: [1, 1, model.zScaling],
            visibility,
          });

          mapper.setInputData(source, 0);
          mapper.setInputConnection(cube.getOutputPort(), 1);
          actor.setMapper(mapper);

          model.toggleActors.Grid = actor;
          model.renderer.addActor(actor);
          model.pipeline.actors.push(actor);
          model.pipeline.items.push({
            source,
            cube,
            mapper,
            actor,
          });

          // Export grid
          if (exportGlyphs) {
            exportGlyphArray.glyph.push(
              Object.assign({ id: 'grid' }, cube.getState())
            );
            exportGlyphArray.mapping.push({
              coordinates: Array.from(source.getPoints().getData()),
              scale: Array.from(
                source
                  .getPointData()
                  .getArrayByName('scaling')
                  .getData()
              ),
              glyphId: 'grid',
            });
            lookupTable
              .getReferenceByName('nodes')
              .forEach(({ x, r, g, b }) => {
                exportGlyphArray.rgbPoints.push(x, r, g, b);
              });
          }
        }
        console.timeEnd('grid');

        console.time('layout');
        state.layouts.forEach((layout) => {
          const source = vtkPolyData.newInstance();
          source.getPoints().setData(layout.pointsData, 3);
          source.getPointData().addArray(
            vtkDataArray.newInstance({
              name: 'scaling',
              values: layout.scaling,
              numberOfComponents: 3,
            })
          );
          const glyph = vtkConcentricCylinderSource.newInstance(layout.glyph);
          const mapper = vtkGlyph3DMapper.newInstance({
            lookupTable: model.pipeline.lookupTable,
            useLookupTableScalarRange: true,
            orient: false,
            scaling: true,
            scaleArray: 'scaling',
            scaleMode: vtkGlyph3DMapper.ScaleModes.SCALE_BY_COMPONENTS,
          });
          const actor = vtkActor.newInstance({ scale: [1, 1, model.zScaling] });
          // Keep track of control rods that can move.
          if (layout.movingControl !== undefined) {
            const tag = layout.movingControl;
            if (!model.pipeline.movingControl[tag]) {
              model.pipeline.movingControl[tag] = [];
            }
            model.pipeline.movingControl[tag].push(actor);
            const pos = controlRods[tag] ? controlRods[tag].pos : 0;
            actor.setPosition(0, 0, controlRodScale * pos * model.zScaling);
            const viz = controlRods[tag] ? controlRods[tag].viz : true;
            actor.setVisibility(viz);
            // console.log(tag, pos);
            if (hasControlRods) {
              // make colors come from the diffuse color, instead of the material.
              mapper.setScalarVisibility(false);
            } else {
              mapper.setScalarVisibility(true);
            }
          }
          mapper.setInputData(source, 0);
          mapper.setInputConnection(glyph.getOutputPort(), 1);
          actor.setMapper(mapper);

          model.renderer.addActor(actor);

          if (layout.toggleActor) {
            if (!model.toggleActors[layout.toggleActor]) {
              model.toggleActors[layout.toggleActor] = [actor];
            } else {
              model.toggleActors[layout.toggleActor].push(actor);
            }
            if (actorVisibilityByName[layout.toggleActor] !== undefined) {
              actor.setVisibility(actorVisibilityByName[layout.toggleActor]);
            }
          }

          model.pipeline.actors.push(actor);
          model.pipeline.items.push({
            source,
            glyph,
            mapper,
            actor,
          });

          // Export grid
          if (exportGlyphs) {
            exportGlyphArray.glyph.push(
              Object.assign({ id: layout.cellId }, glyph.getState())
            );
            exportGlyphArray.mapping.push({
              coordinates: Array.from(source.getPoints().getData()),
              scale: Array.from(
                source
                  .getPointData()
                  .getArrayByName('scaling')
                  .getData()
              ),
              glyphId: layout.cellId,
            });
          }
        });
        console.timeEnd('layout');
      }
    }

    // Update mask + resolution
    console.time('updateGlyphSource');
    if (model.pipeline.source) {
      updateGlyphSource(model.pipeline.source, resolution, maskMap);
      if (state.source.forceUpdate) {
        const { radius, cellFields } = state.source;
        const resetNeeded =
          radius[radius.length - 1] !==
          model.pipeline.source.getRadius(
            model.pipeline.source.getNumberOfRadius() - 1
          );
        model.pipeline.source.clearRadius();
        for (let i = 0; i < radius.length; i++) {
          model.pipeline.source.addRadius(radius[i], cellFields[i]);
        }
        model.pipeline.source.setResolution(state.source.resolution);
        if (resetNeeded || !isSame) {
          publicAPI.resetCamera();
        }
      }
    }
    if (model.pipeline.items) {
      let count = model.pipeline.items.length;
      while (count--) {
        if (model.pipeline.items[count].glyph) {
          updateGlyphSource(
            model.pipeline.items[count].glyph,
            resolution,
            maskMap
          );
        }
      }
    }
    console.timeEnd('updateGlyphSource');

    console.time('updateActors');
    updateActors(model.pipeline.actors);
    if (isSame) {
      // need to set control rods if they weren't updated above.
      publicAPI.setControlRodPos(controlRods, controlRodScale);
    }
    console.timeEnd('updateActors');

    if (newTypeToRender && !isSame) {
      model.renderer.resetCamera();
      model.renderer.resetCameraClippingRange();
      model.interactorStyle2D.setCenterOfRotation(model.camera.getFocalPoint());
      model.interactorStyle3D.setCenterOfRotation(model.camera.getFocalPoint());
    }

    // Save internal render state
    model.pipeline.type = state.type;
    model.pipeline.id = state.id;

    // Off load render which can be long after an update
    publicAPI.renderLater();

    // Update state based on internal decisions
    result.toggleActors = model.toggleActors;

    model.fpsMonitor.update();

    if (exportGlyphs) {
      console.log('export');
      console.log(JSON.stringify(exportGlyphArray, null, 2));
    }

    return result;
  };

  // --------------------------------------------------------------------------

  publicAPI.render = (useLOD = false) => {
    const resolution = useLOD ? model.resolutionLOD : model.resolutionFULL;
    let changeDetected = 0;
    if (
      model.pipeline.source &&
      !model.pipeline.source.getReferenceByName('noDynamicResolution')
    ) {
      changeDetected += model.pipeline.source.setResolution(resolution);
    }
    if (model.pipeline.items) {
      let count = model.pipeline.items.length;
      while (count--) {
        if (
          model.pipeline.items[count].glyph &&
          !model.pipeline.items[count].glyph.getReferenceByName(
            'noDynamicResolution'
          )
        ) {
          changeDetected += model.pipeline.items[count].glyph.setResolution(
            resolution
          );
        }
      }
    }
    publicAPI.renderLater();
    if (changeDetected) {
      setTimeout(model.fpsMonitor.update, 0);
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.resetPipeline = () => {
    if (model.pipeline.actor) {
      model.renderer.removeActor(model.pipeline.actor);
    }
    if (model.pipeline.actors) {
      model.pipeline.actors.forEach(model.renderer.removeActor);
    }
    Object.keys(model.pipeline).forEach((key) => {
      delete model.pipeline[key];
    });
    model.toggleActors = {};
  };

  // --------------------------------------------------------------------------

  publicAPI.setZScale = (zScaling) => {
    model.zScaling = zScaling;
    if (model.pipeline.actor) {
      model.pipeline.actor.setScale(1, 1, zScaling);
    }
    if (model.pipeline.actors) {
      let count = model.pipeline.actors.length;
      while (count--) {
        model.pipeline.actors[count].setScale(1, 1, zScaling);
      }
    }
    model.renderer.resetCameraClippingRange();
    publicAPI.setControlRodPos(model.controlRods, model.controlRodScale);
    // publicAPI.renderLater();
  };

  // --------------------------------------------------------------------------

  publicAPI.setControlRodPos = (controlRods, posScale) => {
    model.controlRodScale = posScale;
    const rodKeys = controlRods ? Object.keys(controlRods) : [];
    if (rodKeys.length) {
      // keep the last rods that were set.
      model.controlRods = controlRods;
    }
    if (model.pipeline.movingControl) {
      if (rodKeys.length) {
        // new control rod properties, from state block.
        rodKeys.forEach((tag) => {
          let count = model.pipeline.movingControl[tag]
            ? model.pipeline.movingControl[tag].length
            : 0;
          while (count--) {
            const actor = model.pipeline.movingControl[tag][count];
            // actual tranlation is stroke * numsteps
            actor.setPosition(
              0,
              0,
              controlRods[tag].pos * posScale * model.zScaling
            );
            actor.setVisibility(controlRods[tag].viz);
            const mapper = actor.getMapper();
            // make colors come from the diffuse color, instead of the material.
            mapper.setScalarVisibility(false);
            actor
              .getProperty()
              .setDiffuseColor(controlRods[tag].color.slice(0, 3));
          }
        });
      } else if (model.controlRods) {
        Object.keys(model.controlRods).forEach((tag) => {
          let count = model.pipeline.movingControl[tag]
            ? model.pipeline.movingControl[tag].length
            : 0;
          while (count--) {
            const actor = model.pipeline.movingControl[tag][count];
            // actual tranlation is stroke * numsteps
            actor.setPosition(
              0,
              0,
              model.controlRods[tag].pos * posScale * model.zScaling
            );
            actor.setVisibility(model.controlRods[tag].viz);
            const mapper = actor.getMapper();
            // use the material again.
            mapper.setScalarVisibility(true);
          }
        });
      }
    }
    publicAPI.renderLater();
  };

  // --------------------------------------------------------------------------

  publicAPI.increasePhysicalScale = () => {
    model.camera.setPhysicalScale(
      model.camera.getPhysicalScale() * model.physicalScaling
    );
  };

  // --------------------------------------------------------------------------

  publicAPI.decreasePhysicalScale = () => {
    model.camera.setPhysicalScale(
      model.camera.getPhysicalScale() / model.physicalScaling
    );
  };

  // --------------------------------------------------------------------------

  publicAPI.captureImage = () => {
    model.renderer.setBackground(model.captureBackground);
    const capture = model.renderWindow.captureImages()[0];
    // Switch back to opaque background
    model.renderer.setBackground(model.interactiveBackground);
    publicAPI.renderLater();
    return capture;
  };

  // --------------------------------------------------------------------------

  publicAPI.setParallelRendering = (useParallelRendering) => {
    model.interactor.setInteractorStyle(
      useParallelRendering ? model.interactorStyle2D : model.interactorStyle3D
    );
    model.renderer
      .getActiveCamera()
      .setParallelProjection(useParallelRendering);
    publicAPI.renderLater();
  };

  // --------------------------------------------------------------------------

  publicAPI.updateVRSettings = (
    vrResolution = [2160, 1200],
    hideInVR = true
  ) => {
    model.openglRenderWindow.set({ vrResolution, hideInVR });
  };

  publicAPI.enableVR = () => {
    model.openglRenderWindow.startVR();
  };

  publicAPI.disableVR = () => {
    model.openglRenderWindow.stopVR();
    model.interactorStyle3D.resetCurrentManipulator();
    publicAPI.resetCamera();
  };

  publicAPI.isVRSupported = () => !!navigator.getVRDisplays;

  publicAPI.resetCamera = () => {
    const focalPoint = model.camera.getFocalPoint();
    const position = [].concat(focalPoint);
    const viewUp = [0, -1, 0];
    position[2] += 10;
    model.camera.set({ viewUp, position });
    model.renderer.resetCamera();
    model.interactorStyle2D.setCenterOfRotation(model.camera.getFocalPoint());
    model.interactorStyle3D.setCenterOfRotation(model.camera.getFocalPoint());
    model.renderer.resetCameraClippingRange();
    publicAPI.renderLater();
  };

  publicAPI.renderLater = () => {
    setTimeout(model.renderWindow.render, 0);
  };

  publicAPI.setMonitorVisibility = (isVisible) => {
    model.fpsMonitor.getFpsMonitorContainer().style.display = isVisible
      ? 'block'
      : 'none';
  };

  publicAPI.updateMonitor = model.fpsMonitor.update;
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  zScaling: 1,
  physicalScaling: 2,
  captureBackground: [0, 0, 0, 0],
  interactiveBackground: [0, 0, 0, 1],
  resolutionLOD: 6,
  resolutionFULL: 60,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  macro.obj(publicAPI, model);
  macro.get(publicAPI, model, ['toggleActors']);

  // Object specific methods
  vtkCASLPipelineManager(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkCASLPipelineManager');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
