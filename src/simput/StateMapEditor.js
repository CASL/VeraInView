import React from 'react';
import PropTypes from 'prop-types';

import style from '../widgets/GridMapWidget.mcss';

const EMPTY_ENTRY = '-';

function convertToRGB(obj) {
  const rgbMap = {};
  const keys = Object.keys(obj);
  while (keys.length) {
    const key = keys.pop();
    rgbMap[key] = `rgb(${obj[key].map((i) => Math.floor(i * 255))})`;
  }
  return rgbMap;
}

export default class StateMapEditor extends React.Component {
  constructor(props) {
    super(props);

    // Bind methods for callback
    this.onLabelChange = this.onLabelChange.bind(this);
    this.assemblyToLabel = this.assemblyToLabel.bind(this);

    // Data
    const viz = props.ui.domain;
    const { assembly, core, coreGridSize, colors } = viz;
    const labels = { [EMPTY_ENTRY]: [] };

    // Extract control maps
    const controlMapIds = Object.keys(assembly).filter((id) => {
      labels[id] = assembly[id].labels;
      // add blank entry, so user sets all values explicitly.
      if (labels[id].length) labels[id].unshift('');
      return assembly[id].type === 'control';
    });

    const gridControlId = Object.keys(core.types).find(
      (t) => core.types[t].indexOf('control') !== -1
    );
    const controlGrid = core[gridControlId].map(
      (id) => (controlMapIds.indexOf(id) === -1 ? EMPTY_ENTRY : id)
    );
    const size = coreGridSize * coreGridSize;

    this.state = {
      size,
      controlGrid,
      labels,
      colors: convertToRGB(colors),
    };

    this.state.labelGrid = props.data.value;
    if (!this.state.labelGrid || this.state.labelGrid.length !== size) {
      this.state.labelGrid = controlGrid.map(this.assemblyToLabel);
      props.data.value = this.state.labelGrid;
      props.onChange(props.data);
    }

    //
    this.gridStyle = {
      gridTemplateColumns: `repeat(${coreGridSize}, ${100 / coreGridSize}%)`,
    };
  }

  onLabelChange(e) {
    const value = e.target.value;
    const idx = Number(e.target.dataset.idx);
    const { labelGrid } = this.state;

    labelGrid[idx] = value;

    this.setState({ labelGrid });

    this.props.data.value = labelGrid;
    this.props.onChange(this.props.data);
  }

  assemblyToLabel(id) {
    const labels = this.state.labels[id] || [];
    if (labels.length) {
      return labels[0];
    }
    return '';
  }

  /* eslint-disable react/no-array-index-key */
  /* eslint-disable no-nested-ternary */
  render() {
    return (
      <div className={style.grid} style={this.gridStyle}>
        {this.state.controlGrid.map((v, i) => (
          <div key={i} data-idx={i} className={style.gridItem}>
            <div className={style.inner}>
              {v !== EMPTY_ENTRY ? (
                <select
                  data-idx={i}
                  value={this.state.labelGrid[i]}
                  onChange={this.onLabelChange}
                  className={style.select}
                  style={{ background: this.state.colors[v] }}
                >
                  {this.state.labels[v].map((t) => (
                    <option value={t} key={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }
}

StateMapEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  ui: PropTypes.object.isRequired,
  // viewData: PropTypes.object.isRequired,
};

StateMapEditor.defaultProps = {
  // name: '',
  // help: '',
};
