import React from 'react';
import PropTypes from 'prop-types';

import style from './VTKWidget.mcss';

export default class ThreeDToolbar extends React.Component {
  constructor(props) {
    super(props);

    let zSlider = 1;
    if (props.zRange) {
      const [a, b] = props.zRange;
      zSlider = Math.abs(Math.round(100 * (props.zScaling - a) / (b - a)));
    }

    this.state = {
      zSlider,
      zScaling: props.zScaling,
    };

    // bindings
    this.sliderZScale = this.sliderZScale.bind(this);
  }

  componentDidUpdate() {
    this.props.viewer.setZScale(this.state.zScaling);
    this.props.resetCamera();
  }

  sliderZScale(e) {
    if (!this.props.viewer) {
      return;
    }

    const zSlider = Number(e.target.value);
    const [a, b] = this.props.zRange;
    const zScaling = a + (b - a) * zSlider / 100;
    this.setState({ zSlider, zScaling });
  }

  render() {
    return (
      <div>
        <div className={style.resetCamera} onClick={this.props.resetCamera} />
        {this.props.zRange ? (
          <input
            type="range"
            min="0"
            max="100"
            value={this.state.zSlider}
            step="1"
            className={style.slider}
            onChange={this.sliderZScale}
          />
        ) : null}
      </div>
    );
  }
}

ThreeDToolbar.propTypes = {
  viewer: PropTypes.object,
  resetCamera: PropTypes.func,
  zScaling: PropTypes.number,
  zRange: PropTypes.array,
};

ThreeDToolbar.defaultProps = {
  viewer: null,
  resetCamera: () => {},
  zScaling: 1,
  zRange: null,
};
