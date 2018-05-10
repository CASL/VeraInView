import React from 'react';
import PropTypes from 'prop-types';

import Rod2DPreview from '../widgets/Rod2DPreview';
import EditableList from '../widgets/EditableList';
import ViewerWidget from '../widgets/ViewerWidget';
import ThreeDToolbar from '../widgets/ThreeDToolbar';

import vtkRodVTKViewer from '../utils/RodVTKViewer';
import ColorManager from '../utils/ColorManager';

import style from './RodEditor.mcss';

function toRGB(color) {
  return `rgb(${color.map((i) => Math.floor(i * 255))})`;
}

export default class RodEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.onCellChange = this.onCellChange.bind(this);
    this.onLengthChange = this.onLengthChange.bind(this);
    this.addLayer = this.addLayer.bind(this);
    this.delLayer = this.delLayer.bind(this);

    this.rodViewer = vtkRodVTKViewer.newInstance();
  }

  onCellChange(layer, value) {
    const data = this.props.data;
    const cells = this.props.ui.domain.cells;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      if (value in cells) {
        stack[layer.key].cell = value;
        this.props.onChange(data);
      }
    }
  }

  onLengthChange(layer, value) {
    const data = this.props.data;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      stack[layer.key].length = Number(value);

      this.props.onChange(data);
    }
  }

  addLayer(idx) {
    const data = this.props.data;
    const cells = this.props.ui.domain.cells;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      const afterIdx = idx + 1;
      stack.splice(afterIdx, 0, {
        // init layer with first cell
        cell: Object.keys(cells)[0],
        length: 0,
      });

      this.props.onChange(data);
    }
  }

  delLayer(idx) {
    const data = this.props.data;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      stack.splice(idx, 1);

      this.props.onChange(data);
    }
  }

  render() {
    const viz = this.props.ui.domain;
    if (!viz.rods) {
      return null;
    }

    const columns = [
      {
        key: 'cell',
        dataKey: 'cell',
        label: 'Cell',
        classes: style.centeredCell,
        render: (cellId, layer) => {
          const background = toRGB(viz.colors[cellId]);
          return (
            <select
              className={style.fullWidth}
              style={{ background }}
              value={cellId}
              onChange={(e) => this.onCellChange(layer, e.target.value)}
            >
              {Object.keys(viz.cells).map((id) => {
                const bg = toRGB(viz.colors[id]);
                return (
                  <option key={id} value={id} style={{ background: bg }}>
                    {viz.names[id]}
                  </option>
                );
              })}
            </select>
          );
        },
      },
      {
        key: 'length',
        dataKey: 'length',
        label: 'Axial Length',
        classes: style.centeredCell,
        render: (value, layer) => (
          <input
            className={style.fullWidth}
            type="number"
            min="0"
            step="any"
            value={layer.length}
            onChange={(e) => this.onLengthChange(layer, e.target.value)}
          />
        ),
      },
    ];

    let items = [];
    if (this.props.data.value && this.props.data.value.length) {
      items = this.props.data.value[0].stack.map((layer, idx) => {
        const color = viz.colors[layer.cell];
        // adds alpha channel
        const background = ColorManager.toRGBA(color);
        return Object.assign(
          {
            key: idx,
            color: background,
            label: viz.names[layer.cell],
          },
          layer
        );
      });
    }

    // viz = {
    //   selected: 'insert',
    //   cellPitch: 1.26,
    //   colors: {
    //     mod: [0, 0, 0.5],
    //     he: [0, 0.5, 0.3],
    //     zirc: [0.5, 0.5, 0.3],
    //     ss: [0.4, 0.5, 0.4],
    //   },
    //   cells: {
    //     A : [
    //       { material: 'mod', radius: 0.2 },
    //       { material: 'he', radius: 0.3 },
    //       { material: 'zirc', radius: 0.4 },
    //       { material: 'ss', radius: 0.5 },
    //     ],
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
    //   [...]
    // }

    const rodData = Object.assign({ selected: this.props.viewData.id }, viz);
    const rod = rodData.rods[rodData.selected] || { offset: 0, length: 0 };

    return (
      <div>
        <Rod2DPreview
          stack={items}
          offset={rod.offset}
          totalLength={rod.length}
        />
        <div className={style.preview3d}>
          <ViewerWidget viewer={this.rodViewer} data={rodData}>
            <ThreeDToolbar
              viewer={this.rodViewer}
              zScaling={0.1}
              zRange={[1, 0.01]}
              orientation={[0, 1000, 0]}
              viewUp={[1, 0, 0]}
              zoom={5}
            />
          </ViewerWidget>
        </div>
        <EditableList
          columns={columns}
          data={items}
          onAdd={this.addLayer}
          onDelete={this.delLayer}
        />
      </div>
    );
  }
}

RodEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  ui: PropTypes.object.isRequired,
  viewData: PropTypes.object.isRequired,
};

RodEditor.defaultProps = {
  // name: '',
  // help: '',
};
