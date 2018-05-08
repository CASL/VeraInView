import React from 'react';
import PropTypes from 'prop-types';

import VTKWidget from '../widgets/VTKWidget';
import MapEditor from './MapEditor';

import vtkRodMapVTKViewer from '../utils/RodMapVTKViewer';

import style from './AssemblyEditor.mcss';

// rod = {
//   name: '',
//   pitch: 1.26,
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
//   rods: {
//      1: [
//        { cell: 'A', length: 10 },
//        { cell: 'B', length: 200 },
//        { cell: 'A', length: 5 },
//        { cell: 'C', length: 10 },
//      ],
//      2: [
//        { cell: 'A', length: 10 },
//        { cell: 'B', length: 200 },
//        { cell: 'A', length: 5 },
//        { cell: 'C', length: 10 },
//      ],
//   },
//   map: {
//     size: 17,
//     grid: [1,2,1,2,1,2,1,2,1],
//   },
// }

function generateData(ui, viewData) {
  const { assemblyPitch, assemblySize, cells, materials, rods } = ui.domain;
  const { grid } = viewData.rodMap.map.value[0] || {};

  if (!grid) {
    return null;
  }
  // Fill data model
  const result = {
    pitch: assemblyPitch,
    colors: {},
    cells: {},
    rods: {},
    map: {
      size: assemblySize,
      grid,
    },
  };

  // Handle colors
  const matIds = Object.keys(materials);
  while (matIds.length) {
    const matId = matIds.pop();
    result.colors[matId] = materials[matId].color;
  }

  // Handle cells
  const cellIds = Object.keys(cells);
  while (cellIds.length) {
    const cellId = cellIds.pop();
    const cellSpec = cells[cellId].cell[0];
    result.cells[cellId] = [];
    for (let i = 0; i < cellSpec.mats.length; i++) {
      result.cells[cellId].push({
        material: cellSpec.mats[i],
        radius: cellSpec.radii[i],
      });
    }
  }

  // Handle rods
  const rodIds = Object.keys(rods);
  while (rodIds.length) {
    const rodId = rodIds.pop();
    result.rods[rodId] = rods[rodId].rodStack.rod.value[0].stack;
  }

  return result;
}

export default class AssemblyEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      is2D: true,
    };

    this.assemblyViewer = vtkRodMapVTKViewer.newInstance();
    this.onModeChange = this.onModeChange.bind(this);
  }

  onModeChange(e) {
    const is2D = !!Number(e.currentTarget.dataset.mode);
    this.setState({ is2D });
  }

  render() {
    return (
      <div className={style.container}>
        <div className={style.switch}>
          <div
            onClick={this.onModeChange}
            data-mode="1"
            className={this.state.is2D ? style.activeFirst : style.first}
          >
            2D
          </div>
          <div
            onClick={this.onModeChange}
            data-mode="0"
            className={this.state.is2D ? style.last : style.activeLast}
          >
            3D
          </div>
        </div>
        {this.state.is2D ? (
          <MapEditor
            data={this.props.data}
            ui={this.props.ui}
            onChange={this.props.onChange}
          />
        ) : (
          <div className={style.viewer}>
            <VTKWidget
              viewer={this.assemblyViewer}
              data={generateData(this.props.ui, this.props.viewData)}
              zRange={[1, 0.01]}
            />
          </div>
        )}
      </div>
    );
  }
}

AssemblyEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  ui: PropTypes.object.isRequired,
  viewData: PropTypes.object.isRequired,
};

AssemblyEditor.defaultProps = {
  // name: '',
  // help: '',
};
