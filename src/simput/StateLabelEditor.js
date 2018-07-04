import React from 'react';
import PropTypes from 'prop-types';

/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable react/no-array-index-key */

export default class StateLabelEditor extends React.Component {
  constructor(props) {
    super(props);

    const viz = props.ui.domain;
    const { assembly } = viz;
    let controlLabels = [];

    // Extract control map labels
    Object.keys(assembly).forEach((id) => {
      if (assembly[id].type === 'control' && assembly[id].labels.length) {
        controlLabels = assembly[id].labels.slice();
      }
    });
    this.state = {
      controlLabels,
    };

    this.onStepChange = this.onStepChange.bind(this);
  }

  onStepChange(item, value) {
    const { data } = this.props;
    if (data.value && data.value.length) {
      const rodbank = data.value[0];
      rodbank[item] = Number(value);

      this.props.onChange(data);
    }
  }

  render() {
    const { data } = this.props;

    let rodbank = {};
    if (data.value && data.value.length) {
      rodbank = data.value[0];
    }

    return (
      <div style={{ padding: '8px 10px' }}>
        {this.state.controlLabels.map((controlLabel) => (
          <label key={controlLabel} style={{ display: 'block' }}>
            {controlLabel}
            <input
              style={{ margin: '5px' }}
              type="number"
              step="1"
              min="0"
              value={
                rodbank[controlLabel] !== undefined ? rodbank[controlLabel] : ''
              }
              onChange={(e) => this.onStepChange(controlLabel, e.target.value)}
            />
          </label>
        ))}
      </div>
    );
  }
}

StateLabelEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  ui: PropTypes.object.isRequired,
  // viewData: PropTypes.object.isRequired,
};

StateLabelEditor.defaultProps = {
  // name: '',
  // help: '',
};
