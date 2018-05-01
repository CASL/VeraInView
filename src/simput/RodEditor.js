import React from 'react';
import PropTypes from 'prop-types';

import Rod2DPreview from '../widgets/Rod2DPreview';
import EditableList from '../widgets/EditableList';
import VTKWidget from '../widgets/VTKWidget';
import Color from '../widgets/Color';

import vtkRodVTKViewer from '../utils/RodVTKViewer';
import ColorManager from '../utils/ColorManager';

import style from './RodEditor.mcss';

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
        stack[layer.key].label = value;
        this.props.onChange(data);
      }
    }
  }

  onLengthChange(layer, value) {
    const data = this.props.data;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      const newValue = Number(value);
      const totalLength = Number(this.props.viewData.rodInfo.height.value[0]);
      const currentLength = stack.reduce((t, l) => t + l.length, 0);
      const newLength = currentLength - stack[layer.key].length + newValue;

      if (newLength <= totalLength) {
        stack[layer.key].length = newValue;
        this.props.onChange(data);
      }
    }
  }

  addLayer(idx) {
    const data = this.props.data;
    const cells = Object.keys(this.props.ui.domain.cells);
    if (data.value && data.value.length && cells.length) {
      const stack = data.value[0].stack;
      const afterIdx = idx + 1;
      stack.splice(afterIdx, 0, {
        label: cells[0],
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
    const cells = Object.keys(this.props.ui.domain.cells);

    const columns = [
      {
        key: 'color',
        dataKey: '',
        label: 'Color',
        classes: style.centeredCell,
        render: (_, layer) => {
          const color = this.props.ui.domain.cells[layer.label].color;
          // adds alpha channel
          const out = ColorManager.toRGBA(color.concat([1]));
          return <Color color={out} title="" border />;
        },
      },
      {
        key: 'cell',
        dataKey: 'label',
        label: 'Cell/Layer Type',
        classes: style.centeredCell,
        render: (cellName, layer) => (
          <select
            className={style.cellSelect}
            value={cellName}
            onChange={(e) => this.onCellChange(layer, e.target.value)}
          >
            {cells.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: 'length',
        dataKey: 'length',
        label: 'Length',
        classes: style.centeredCell,
        render: (value, layer) => (
          <input
            type="number"
            min="0"
            step="1"
            value={layer.length}
            onChange={(e) => this.onLengthChange(layer, e.target.value)}
          />
        ),
      },
    ];

    let items = [];
    if (this.props.data.value && this.props.data.value.length) {
      items = this.props.data.value[0].stack.map((layer, idx) =>
        Object.assign({ key: idx }, layer)
      );
    }

    const totalLength = Number(this.props.viewData.rodInfo.height.value[0]);

    // rod = {
    //   name: '',
    //   pitch: 1.26,
    //   totalLength: 400,
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
    //   layers: [
    //     { cell: 'A', length: 10 },
    //     { cell: 'B', length: 200 },
    //     { cell: 'A', length: 5 },
    //     { cell: 'C', length: 10 },
    //   ],
    // }
    const colors = {};
    Object.keys(this.props.ui.domain.materials).forEach((mat) => {
      colors[mat] = this.props.ui.domain.materials[mat].color;
    });
    const layers = this.props.data.value[0].stack.map((l) => ({
      cell: l.label,
      length: l.length,
    }));
    const cellData = {};
    Object.keys(this.props.ui.domain.cells).forEach((cellName) => {
      cellData[cellName] = this.props.ui.domain.cells[
        cellName
      ].cell[0].mats.map((material, i) => ({
        material,
        radius: this.props.ui.domain.cells[cellName].cell[0].radii[i],
      }));
    });
    const rodData = {
      pitch: 1.26, // FIXME...
      totalLength,
      colors,
      cells: cellData,
      layers,
    };

    return (
      <div>
        <Rod2DPreview stack={items} totalLength={totalLength} />
        <div className={style.preview3d}>
          <VTKWidget
            viewer={this.rodViewer}
            data={rodData}
            orientation={[0, 1000, 0]}
            viewUp={[1, 0, 0]}
            zoom={10}
            zScaling={0.1}
            zRange={[1, 0.01]}
          />
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
