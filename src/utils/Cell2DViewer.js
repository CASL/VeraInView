import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import ReactCursorPosition from 'react-cursor-position';
import ReactTooltip from 'react-tooltip';
import macro from 'vtk.js/Sources/macro';

import style from '../assets/vera.mcss';

// --------------------------------------------------------------------------

function toRGB(color) {
  return `rgb(${color.map((i) => Math.floor(i * 255))})`;
}

// --------------------------------------------------------------------------

function Cell2DPreviewWrapper(props) {
  return (
    <ReactCursorPosition>
      <Cell2DPreview {...props} />
    </ReactCursorPosition>
  );
}

// --------------------------------------------------------------------------

function Cell2DPreview(props) {
  const onToolTip = () => {
    const {
      elementDimensions: { width = 0, height = 0 } = {},
      position: { x = 0, y = 0 } = {},
    } = props;
    return props.onToolTip({ width, height, x, y });
  };

  return (
    <div className={style.mainImageFrame}>
      <ReactTooltip
        id="mainImg"
        delayShow={50}
        scrollHide
        getContent={onToolTip}
        isCapture
      />
      <div style={{ position: 'relative' }}>
        <img
          data-for="mainImg"
          data-tip=""
          alt="Element rendering"
          src={props.imageSrc}
        />
      </div>
    </div>
  );
}

Cell2DPreview.propTypes = {
  imageSrc: PropTypes.string,
  elementDimensions: PropTypes.object,
  position: PropTypes.object,
  onToolTip: PropTypes.func,
};

Cell2DPreview.defaultProps = {
  imageSrc: '',
  elementDimensions: {},
  position: {},
  onToolTip: () => {},
};

// --------------------------------------------------------------------------

function vtkCell2DViewer(publicAPI, model) {
  model.classHierarchy.push('vtkCell2DViewer');

  const WORKING_CANVAS = document.createElement('canvas');

  // --------------------------------------------------------------------------

  function onToolTip({ x, y, width, height }) {
    const materials = model.cell.cells[model.cell.selected];
    const pitch = model.cell.cellPitch;

    // normalize to [0,1]
    const posx = x / width;
    const posy = y / height;
    if (posx >= 0 && posx <= 1.0 && posy >= 0 && posy <= 1.0) {
      const radius =
        pitch *
        Math.sqrt((posx - 0.5) * (posx - 0.5) + (posy - 0.5) * (posy - 0.5));
      for (let i = 0; i < materials.length; i++) {
        if (radius < materials[i].radius) {
          return model.toolTipCallback(materials[i]);
        }
      }
    }
    return '';
  }

  // --------------------------------------------------------------------------

  publicAPI.setContainer = (container) => {
    if (model.container) {
      ReactDOM.unmountComponentAtNode(model.container);
    }

    model.container = container;

    if (container) {
      publicAPI.reactRender();
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.reactRender = (props = {}) => {
    if (model.container) {
      ReactDOM.render(<Cell2DPreviewWrapper {...props} />, model.container);
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.getSize = () => {
    if (model.container) {
      const { width, height } = model.container.getBoundingClientRect();
      return [Math.floor(width), Math.floor(height)];
    }
    return [0, 0];
  };

  // --------------------------------------------------------------------------

  publicAPI.captureImage = () => {};

  // --------------------------------------------------------------------------

  publicAPI.setData = (cell) => {
    model.cell = cell;
    publicAPI.render();
  };

  // --------------------------------------------------------------------------

  publicAPI.render = () => {
    if (
      !model.cell ||
      !model.cell.cells ||
      !model.cell.cells[model.cell.selected]
    ) {
      return;
    }

    const pitch = model.cell.cellPitch;

    WORKING_CANVAS.setAttribute('width', model.size);
    WORKING_CANVAS.setAttribute('height', model.size);
    const ctx = WORKING_CANVAS.getContext('2d');
    ctx.clearRect(0, 0, model.size, model.size);
    const center = model.size / 2;

    const layers = model.cell.cells[model.cell.selected];

    let count = layers.length;
    while (count--) {
      const rgba = toRGB(model.cell.colors[layers[count].material]);
      // material radii are interpreted in terms of the assembly ppitch.
      const radius = layers[count].radius * model.size / pitch;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = rgba;
      ctx.fill();
    }

    // draw an indication of the available size
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(100, 100, 100, 1)';
    const step = 2 * Math.PI / 16;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(
        center,
        center,
        0.5 * model.size,
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
        0.5 * model.size,
        (2 * i + 1) * step,
        (2 * i + 2) * step,
        false
      );
      ctx.stroke();
    }

    const imageSrc = WORKING_CANVAS.toDataURL();

    publicAPI.reactRender({
      imageSrc,
      onToolTip,
    });
  };

  // --------------------------------------------------------------------------

  publicAPI.renderLater = publicAPI.render;

  // --------------------------------------------------------------------------

  publicAPI.resize = () => {};
  publicAPI.setZScale = () => {};
  publicAPI.setParallelRendering = () => {};
  publicAPI.resetCamera = () => {};
  publicAPI.addActor = () => {};
  publicAPI.removeAllActors = () => {};
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  size: 512,
  toolTipCallback: () => {},
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Object methods
  macro.obj(publicAPI, model);
  macro.setGet(publicAPI, model, ['toolTipCallback']);

  // Object specific methods
  vtkCell2DViewer(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkCell2DViewer');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
