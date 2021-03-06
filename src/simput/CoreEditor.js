import React from 'react';
import PropTypes from 'prop-types';

import ViewerWidget from '../widgets/ViewerWidget';
import ThreeDToolbar from '../widgets/ThreeDToolbar';
import VisibilityToolbar from '../widgets/VisibilityToolbar';
import MapEditor from './MapEditor';

import vtkCoreMapVTKViewer from '../utils/CoreMapVTKViewer';

import style from './AssemblyEditor.mcss';

// viz = {
//   selected: 'A',
//   names: {
//     1: 'Water',
//     5: 'Fuel assembly',
//     10: 'Core assembly',
//   },
//   cellPitch: 1.26,
//   colors: {
//     mod: [0, 0, 0.5],
//     he: [0, 0.5, 0.3],
//     zirc: [0.5, 0.5, 0.3],
//     ss: [0.4, 0.5, 0.4],
//   },
//   cells: {
//      A: [
//        { material: 'mod', radius: 0.2 },
//        { material: 'he', radius: 0.3 },
//        { material: 'zirc', radius: 0.4 },
//        { material: 'ss', radius: 0.5 },
//      ],
//      B: [],
//      C: [],
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
//   assembly: {
//     fuel: {
//       pitch: 1.27,
//       size: 17,
//       grid: [1,2,1,2,1,2,1,2,1],
//     },
//     insert: {
//       pitch: 1.27,
//       size: 17,
//       grid: [1,2,1,2,1,2,1,2,1],
//     }
//   },
//   core: {
//     pitch: 25,
//     size: 15,
//     gridAssembly: [10,20,10,20,10,20,10,20,10],
//     gridInsertControls: [10,20,10,20,10,20,10,20,10],
//     gridDetectors: [10,20,10,20,10,20,10,20,10],
//   },
// }

function convertToRGB(obj) {
  const rgbMap = {};
  const keys = Object.keys(obj);
  while (keys.length) {
    const key = keys.pop();
    rgbMap[key] = `rgb(${obj[key].map((i) => Math.floor(i * 255))})`;
  }
  return rgbMap;
}

export default class CoreEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      is2D: true,
    };

    this.coreViewer = vtkCoreMapVTKViewer.newInstance();
    this.onModeChange = this.onModeChange.bind(this);
  }

  onModeChange(e) {
    const is2D = !!Number(e.currentTarget.dataset.mode);
    this.setState({ is2D });
  }

  render() {
    const viz = this.props.ui.domain;
    const vizData = Object.assign({ selected: this.props.viewData.id }, viz);
    const types =
      (viz.core.types && viz.core.types[this.props.viewData.id]) || [];
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
            gridSize={viz.coreGridSize}
            items={['0'].concat(
              Object.keys(viz.assembly).filter(
                (id) => types.indexOf(viz.assembly[id].type) !== -1
              )
            )}
            names={viz.names}
            colors={convertToRGB(viz.colors)}
            onChange={this.props.onChange}
          />
        ) : (
          <div className={style.viewer}>
            <ViewerWidget viewer={this.coreViewer} data={vizData}>
              <div className={style.line}>
                <VisibilityToolbar
                  viewer={this.coreViewer}
                  type="material"
                  title="Materials"
                />
                <VisibilityToolbar
                  viewer={this.coreViewer}
                  type="cell"
                  title="Cells"
                />
              </div>
              <ThreeDToolbar
                viewer={this.coreViewer}
                zRange={[1, 0.01]}
                zScaling={this.coreViewer.getZScale()}
              />
            </ViewerWidget>
          </div>
        )}
      </div>
    );
  }
}

CoreEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  ui: PropTypes.object.isRequired,
  viewData: PropTypes.object.isRequired,
};

CoreEditor.defaultProps = {
  // name: '',
  // help: '',
};
