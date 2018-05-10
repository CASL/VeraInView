import React from 'react';
import PropTypes from 'prop-types';

import ViewerWidget from '../widgets/ViewerWidget';
import EditableList from '../widgets/EditableList';
import ThreeDToolbar from '../widgets/ThreeDToolbar';
import VisibilityToolbar from '../widgets/VisibilityToolbar';

import vtkCellVTKViewer from '../utils/CellVTKViewer';
import vtkCell2DViewer from '../utils/Cell2DViewer';

import { zip } from './utils';

import style from './CellEditor.mcss';

/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable react/no-array-index-key */

function toRGB(color) {
  return `rgb(${color.map((i) => Math.floor(i * 255))})`;
}

function Cell2DToolbar(props) {
  return (
    <div className={style.imageOverlayText}>
      Contact radius: {props.pitch * 0.5}
    </div>
  );
}

Cell2DToolbar.propTypes = {
  pitch: PropTypes.number,
};

Cell2DToolbar.defaultProps = {
  pitch: 0,
};

export default class CellEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      imageSize: 512,
    };

    this.cellViewer = vtkCellVTKViewer.newInstance();
    this.cell2dViewer = vtkCell2DViewer.newInstance();

    this.cell2dViewer.setToolTipCallback((mat) => {
      const viz = this.props.ui.domain;
      return mat ? (
        <span>
          {mat.radius} cm
          <br />
          {viz.names[mat.material]}
        </span>
      ) : null;
    });

    this.addRadius = this.addRadius.bind(this);
    this.onMaterialChange = this.onMaterialChange.bind(this);
    this.onRadiusChange = this.onRadiusChange.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.validateOrder = this.validateOrder.bind(this);
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

  addRadius(afterIdx) {
    const { data } = this.props;
    const viz = this.props.ui.domain;
    const materialIds = Object.keys(viz.colors || {});
    if (data.value && data.value.length && materialIds.length) {
      const cell = data.value[0];
      const idx = afterIdx + 1;
      const length = cell.mats.length;
      const pitch = this.props.viewData.cell.pitch.value[0];

      cell.mats.splice(idx, 0, cell.mats[idx - 1] || materialIds[0]);
      cell.radii.splice(idx, 0, cell.radii[idx - 1] || 0);

      if (length === idx) {
        cell.radii[idx] = Math.min(cell.radii[idx] + 1, pitch / 2);
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
    const { data } = this.props;
    const viz = this.props.ui.domain;
    const materialIds = viz.types.materials || [];

    const materialOptions = materialIds.map((id) => {
      const color = toRGB(viz.colors[id]);
      return (
        <option
          key={id}
          value={id}
          style={{
            background: color,
          }}
        >
          {viz.names[id]}
        </option>
      );
    });

    const columns = [
      {
        key: 'material',
        dataKey: 'material',
        label: 'Material',
        render: (matId, item) => {
          const color = toRGB(viz.colors[matId]);
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

    const dataToRender = Object.assign(
      { selected: this.props.viewData.id },
      viz
    );

    return (
      <div className={style.container}>
        <div className={style.visualizer}>
          <div className={style.visualizerPanel}>
            <div className={style.visualizerPanelHeadline}>2D</div>
            <ViewerWidget viewer={this.cell2dViewer} data={dataToRender}>
              <Cell2DToolbar pitch={dataToRender.cellPitch} />
            </ViewerWidget>
          </div>
          <div className={style.visualizerPanel}>
            <div className={style.visualizerPanelHeadline}>3D</div>
            <ViewerWidget viewer={this.cellViewer} data={dataToRender}>
              <ThreeDToolbar viewer={this.cellViewer} />
              <VisibilityToolbar viewer={this.cellViewer} type="material" />
            </ViewerWidget>
          </div>
        </div>
        <EditableList
          columns={columns}
          data={items}
          onAdd={this.addRadius}
          onDelete={this.deleteEntry}
        />
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
  viewData: PropTypes.object.isRequired,
};

CellEditor.defaultProps = {
  // name: '',
  // help: '',
};
