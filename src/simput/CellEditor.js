import React from 'react';
import PropTypes from 'prop-types';

import ReactCursorPosition from 'react-cursor-position';

import VTKRenderer from '../widgets/VTKRenderer';
import ImageRenderer from '../widgets/ImageRenderer';
import ImageGenerator from '../utils/ImageGenerator';

import style from './CellEditor.mcss';

const {
  materialColorManager,
  updateLookupTables,
  updateCellImage,
} = ImageGenerator;

/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable react/no-array-index-key */

function sortRadius(a, b) {
  return a.radius - b.radius;
}

export default class CellEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      imageSize: 512,
      items: [
        { material: 'he', radius: 0.1 },
        { material: 'mod', radius: 0.2 },
      ],
      materials: ['he', 'mod', 'zirc', 'ss', 'U31', 'U32', 'U34', 'boron'],
      pinPitch: 1.6,
    };

    // Ensure a color for each material
    this.state.materials.forEach(materialColorManager.getColor);
    this.updateCellRendering(this.state.items);

    this.onChange = this.onChange.bind(this);
    this.addRadius = this.addRadius.bind(this);
    this.onMaterialChange = this.onMaterialChange.bind(this);
    this.onRadiusChange = this.onRadiusChange.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.validateOrder = this.validateOrder.bind(this);

    this.updateCellRendering = this.updateCellRendering.bind(this);
  }

  onChange() {
    console.log('data', this.props.data);
    console.log(this.props);
  }

  onMaterialChange(e) {
    const { items } = this.state;
    const idx = Number(e.currentTarget.dataset.idx);
    items[idx].material = e.target.value;
    this.setState({ items });
    this.updateCellRendering(items);
  }

  onRadiusChange(e) {
    const { items } = this.state;
    const idx = Number(e.currentTarget.dataset.idx);
    items[idx].radius = Number(e.target.value);
    this.setState({ items });
    this.updateCellRendering(items);
  }

  updateCellRendering(items) {
    this.cell = {
      num_rings: items.length,
      radii: items.map((i) => i.radius),
      mats: items.map((i) => i.material),
    };
    updateLookupTables();
    updateCellImage(this.cell, this.state.imageSize, this.state.pinPitch);
    this.cell.has3D.source.forceUpdate = true;
  }

  addRadius(e) {
    const { items } = this.state;
    const idx = Number(e.currentTarget.dataset.idx) + 1;
    if (items.length === idx) {
      const { material, radius } = items[idx - 1];
      items.push({ material, radius: radius + 1 });
    } else {
      const radius = (items[idx - 1].radius + items[idx].radius) * 0.5;
      const { material } = items[idx - 1];
      items.splice(idx, 0, { radius, material });
    }
    this.setState({ items });
    this.updateCellRendering(items);
  }

  deleteEntry(e) {
    const { items } = this.state;
    const idx = Number(e.currentTarget.dataset.idx);
    items.splice(idx, 1);
    if (items.length === 0) {
      items.push({ material: this.state.materials[0], radius: 0.5 });
    }
    this.setState({ items });
    this.updateCellRendering(items);
  }

  validateOrder() {
    const { items } = this.state;
    items.sort(sortRadius);
    this.setState({ items });
    this.updateCellRendering(items);
  }

  render() {
    return (
      <div className={style.container}>
        <table className={style.table}>
          <thead>
            <tr>
              <th />
              <th>Material</th>
              <th>Radius</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {this.state.items.map(({ material, radius }, idx) => (
              <tr key={`ring-${idx}`}>
                <td className={style.right}>
                  <button
                    data-idx={idx}
                    className={style.addRadius}
                    onClick={this.addRadius}
                  >
                    +
                  </button>
                </td>
                <td>
                  <select
                    onChange={this.onMaterialChange}
                    data-idx={idx}
                    value={material}
                    className={style.material}
                  >
                    {this.state.materials.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className={style.radius}
                    data-idx={idx}
                    type="number"
                    step="0.01"
                    max={this.state.pinPitch * 0.5}
                    min="0"
                    value={radius}
                    onChange={this.onRadiusChange}
                    onBlur={this.validateOrder}
                  />
                </td>
                <td>
                  <button
                    data-idx={idx}
                    className={style.deleteEntry}
                    onClick={this.deleteEntry}
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={style.visualizer}>
          <div className={style.visualizerPanel}>
            <span className={style.visualizerPanelHeadline}>2D</span>
            <ReactCursorPosition>
              <ImageRenderer
                content={this.cell.imageSrc}
                getImageInfo={(posx, posy) => {
                  const mat = ImageGenerator.getCellMaterial(
                    this.cell,
                    posx,
                    posy
                  );
                  return mat ? (
                    <span>
                      {mat.radius} cm <br /> {mat.mat}
                    </span>
                  ) : null;
                }}
                overlayText={`Contact radius: ${this.state.pinPitch * 0.5}`}
                onClick={() => {}}
              />
            </ReactCursorPosition>
          </div>
          <div className={style.visualizerPanel}>
            <span className={style.visualizerPanelHeadline}>3D</span>
            <VTKRenderer nested content={this.cell.has3D} />
          </div>
        </div>
      </div>
    );
  }
}

CellEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  // onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  // ui: PropTypes.object.isRequired,
  // viewData: PropTypes.object.isRequired,
};

CellEditor.defaultProps = {
  // name: '',
  // help: '',
};
