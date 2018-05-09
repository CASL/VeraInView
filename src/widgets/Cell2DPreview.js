import React from 'react';
import PropTypes from 'prop-types';

import ReactCursorPosition from 'react-cursor-position';
import ReactTooltip from 'react-tooltip';

import style from '../assets/vera.mcss';

const WORKING_CANVAS = document.createElement('canvas');

function toRGB(color) {
  return `rgb(${color.map((i) => Math.floor(i * 255))})`;
}

class Cell2DPreview extends React.Component {
  constructor(props) {
    super(props);

    this.getToolTip = this.getToolTip.bind(this);
  }
  getToolTip() {
    const {
      gridSpacing,
      cellData,
      tooltipFormat,
      elementDimensions: { width = 0, height = 0 } = {},
      position: { x = 0, y = 0 } = {},
    } = this.props;
    const materials = cellData.cells[cellData.selected];

    // normalize to [0,1]
    const posx = x / width;
    const posy = y / height;
    if (posx >= 0 && posx <= 1.0 && posy >= 0 && posy <= 1.0) {
      const radius =
        gridSpacing *
        Math.sqrt((posx - 0.5) * (posx - 0.5) + (posy - 0.5) * (posy - 0.5));
      for (let i = 0; i < materials.length; i++) {
        if (radius < materials[i].radius) {
          return tooltipFormat(materials[i]);
        }
      }
    }
    return '';
  }

  render() {
    const { size, cellData, gridSpacing } = this.props;
    const pitch = cellData.cellPitch;

    WORKING_CANVAS.setAttribute('width', size);
    WORKING_CANVAS.setAttribute('height', size);
    const ctx = WORKING_CANVAS.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const center = size / 2;

    const layers = cellData.cells[cellData.selected];

    let count = layers.length;
    while (count--) {
      const rgba = toRGB(cellData.colors[layers[count].material]);
      // material radii are interpreted in terms of the assembly ppitch.
      const radius = layers[count].radius * size / gridSpacing;
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

    const imageSrc = WORKING_CANVAS.toDataURL();

    return (
      <div className={style.mainImageFrame}>
        <ReactTooltip
          id="mainImg"
          delayShow={50}
          scrollHide
          getContent={this.getToolTip}
          isCapture
        />
        <div style={{ position: 'relative' }}>
          <div className={style.imageOverlayText}>
            Contact radius: {pitch * 0.5}
          </div>
          <img
            data-for="mainImg"
            data-tip=""
            alt="Element rendering"
            src={imageSrc}
          />
        </div>
      </div>
    );
  }
}

Cell2DPreview.propTypes = {
  cellData: PropTypes.object,
  size: PropTypes.number,
  gridSpacing: PropTypes.number,
  elementDimensions: PropTypes.object,
  position: PropTypes.object,
  tooltipFormat: PropTypes.func,
};

Cell2DPreview.defaultProps = {
  cellData: {},
  size: 512,
  gridSpacing: 1.26,
  elementDimensions: {},
  position: {},
  tooltipFormat: () => {},
};

export default function Cell2DPreviewWrapper(props) {
  return (
    <ReactCursorPosition>
      <Cell2DPreview {...props} />
    </ReactCursorPosition>
  );
}
