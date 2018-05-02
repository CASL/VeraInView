import React from 'react';
import PropTypes from 'prop-types';

import ReactCursorPosition from 'react-cursor-position';

import VTKWidget from '../widgets/VTKWidget';
import ImageRenderer from '../widgets/ImageRenderer';
import ImageGenerator from '../utils/ImageGenerator';
import EditableList from '../widgets/EditableList';

import vtkCellVTKViewer from '../utils/CellVTKViewer';
import ColorManager from '../utils/ColorManager';

import { zip } from './utils';

import style from './CellEditor.mcss';

const { updateLookupTables, updateCellImage } = ImageGenerator;

/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable react/no-array-index-key */

export default class CellEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      imageSize: 512,
      pinPitch: 1.6,
    };

    this.cellViewer = vtkCellVTKViewer.newInstance();

    this.addRadius = this.addRadius.bind(this);
    this.onMaterialChange = this.onMaterialChange.bind(this);
    this.onRadiusChange = this.onRadiusChange.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.validateOrder = this.validateOrder.bind(this);

    this.updateCellRendering = this.updateCellRendering.bind(this);
  }

  onMaterialChange(item, value) {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];
      cell.mats[item.key] = value;

      this.props.onChange(data);
    }
  }

  onRadiusChange(item, value) {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];
      cell.radii[item.key] = Number(value);

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

  addRadius(afterIdx) {
    const { data } = this.props;
    const materials = this.props.ui.domain;
    if (
      data.value &&
      data.value.length &&
      !('materials not found' in materials)
    ) {
      const cell = data.value[0];
      const idx = afterIdx + 1;
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

      this.props.onChange(data);
    }
  }

  deleteEntry(idx) {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const cell = data.value[0];

      cell.mats.splice(idx, 1);
      cell.radii.splice(idx, 1);

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
    this.updateCellRendering();

    const { data } = this.props;
    const materials =
      'materials not found' in this.props.ui.domain ? {} : this.props.ui.domain;

    const materialOptions = Object.keys(materials).map((id) => (
      <option key={id} value={id}>
        {materials[id].name[0]}
      </option>
    ));

    const columns = [
      {
        key: 'material',
        dataKey: 'material',
        label: 'Material',
        render: (matId, item) => {
          // adds on opaque alpha channel
          const color = ColorManager.toRGBA(materials[matId].color.concat([1]));
          return (
            <select
              onChange={(e) => this.onMaterialChange(item, e.target.value)}
              value={matId}
              className={style.material}
              style={{
                backgroundColor: color,
              }}
            >
              {materialOptions}
            </select>
          );
        },
      },
      {
        key: 'radius',
        dataKey: 'radius',
        label: 'Radius',
        render: (radius, item) => (
          <input
            className={style.radius}
            type="number"
            step="0.01"
            min="0"
            value={radius}
            onChange={(e) => this.onRadiusChange(item, e.target.value)}
            onBlur={this.validateOrder}
          />
        ),
      },
    ];

    let items = [];
    if (data.value && data.value.length) {
      const cell = data.value[0];
      items = zip(cell.mats, cell.radii).map(([material, radius], idx) => ({
        key: idx,
        material,
        radius,
      }));
    }

    const colors = {};
    Object.keys(materials).forEach((key) => {
      colors[key] = materials[key].color;
    });
    const cellData = {
      pitch: this.state.pinPitch,
      colors,
      layers: items,
    };

    return (
      <div className={style.container}>
        <EditableList
          columns={columns}
          data={items}
          onAdd={this.addRadius}
          onDelete={this.deleteEntry}
        />
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
            <VTKWidget viewer={this.cellViewer} data={cellData} />
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
