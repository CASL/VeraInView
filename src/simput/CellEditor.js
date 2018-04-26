import React from 'react';
import PropTypes from 'prop-types';

import ReactCursorPosition from 'react-cursor-position';

import VTKRenderer from '../widgets/VTKRenderer';
import ImageRenderer from '../widgets/ImageRenderer';
import ImageGenerator from '../utils/ImageGenerator';

import style from './CellEditor.mcss';

const { updateLookupTables, updateCellImage } = ImageGenerator;

/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable react/no-array-index-key */

function zip(...lists) {
  const result = [];
  const length = lists.reduce((min, l) => Math.min(min, l.length), Infinity);
  for (let i = 0; i < length; ++i) {
    result.push(lists.map((l) => l[i]));
  }
  return result;
}

export default class CellEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      imageSize: 512,
      pinPitch: 1.6,
    };

    this.updateCellRendering();

    this.addRadius = this.addRadius.bind(this);
    this.onMaterialChange = this.onMaterialChange.bind(this);
    this.onRadiusChange = this.onRadiusChange.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.validateOrder = this.validateOrder.bind(this);

    this.updateCellRendering = this.updateCellRendering.bind(this);
  }

  onMaterialChange(e) {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];
      const idx = Number(e.currentTarget.dataset.idx);
      cell.mats[idx] = e.target.value;

      this.updateCellRendering();
      this.props.onChange(data);
    }
  }

  onRadiusChange(e) {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];
      const idx = Number(e.currentTarget.dataset.idx);
      cell.radii[idx] = Number(e.target.value);

      this.updateCellRendering();
      this.props.onChange(data);
    }
  }

  updateCellRendering() {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];
      this.cell = {
        num_rings: cell.mats.length,
        radii: cell.radii,
        mats: cell.mats,
      };
      updateLookupTables();
      updateCellImage(this.cell, this.state.imageSize, this.state.pinPitch);
      this.cell.has3D.source.forceUpdate = true;
    }
  }

  addRadius(e) {
    const { data } = this.props;
    const materials = this.props.ui.domain;
    if (
      data.value &&
      data.value.length &&
      !('materials not found' in materials)
    ) {
      const cell = data.value[0];
      const idx = Number(e.currentTarget.dataset.idx) + 1;
      const length = cell.mats.length;

      cell.mats.splice(idx, 0, cell.mats[idx - 1] || Object.keys(materials)[0]);
      cell.radii.splice(idx, 0, cell.radii[idx - 1] || 0);

      if (length === idx) {
        cell.radii[idx] = Math.min(
          cell.radii[idx] + 1,
          this.state.pinPitch / 2
        );
      } else {
        // set radius to between before and after cell
        cell.radii[idx] += (cell.radii[idx] - cell.radii[idx - 1]) / 2;
      }

      this.updateCellRendering();
      this.props.onChange(data);
    }
  }

  deleteEntry(e) {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];
      const idx = Number(e.currentTarget.dataset.idx);

      cell.mats.splice(idx, 1);
      cell.radii.splice(idx, 1);

      this.updateCellRendering();
      this.props.onChange(data);
    }
  }

  validateOrder() {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];
      const zipped = zip(cell.mats, cell.radii);
      zipped.sort((a, b) => a[1] - b[1]);
      const [sortedMats, sortedRadii] = zip(...zipped);

      cell.mats = sortedMats;
      cell.radii = sortedRadii;
      this.props.onChange(data);
    }
  }

  render() {
    const { data } = this.props;
    const materials =
      'materials not found' in this.props.ui.domain ? {} : this.props.ui.domain;

    let items = [];
    if (data.value && data.value.length) {
      const cell = data.value[0];
      items = zip(cell.mats, cell.radii).map(([material, radius]) => ({
        material,
        radius,
      }));
    }
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
            {items.map(({ material, radius }, idx) => (
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
                    {Object.keys(materials).map((key) => (
                      <option key={key} value={materials[key].name}>
                        {materials[key].name}
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
            {items.length === 0 ? (
              <tr>
                <td className={style.right}>
                  <button
                    data-idx={-1}
                    className={style.addRadius}
                    onClick={this.addRadius}
                  >
                    +
                  </button>
                </td>
                <td>Add a material</td>
              </tr>
            ) : null}
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
            <VTKRenderer
              nested
              content={items.length > 0 ? this.cell.has3D : {}}
            />
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
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  ui: PropTypes.object.isRequired,
  // viewData: PropTypes.object.isRequired,
};

CellEditor.defaultProps = {
  // name: '',
  // help: '',
};
