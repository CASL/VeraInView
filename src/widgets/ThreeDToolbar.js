import React from 'react';
import PropTypes from 'prop-types';

import style from './ViewerWidget.mcss';

export default class ThreeDToolbar extends React.Component {
  constructor(props) {
    super(props);

    let zSlider = 1;
    if (props.zRange) {
      const [a, b] = props.zRange;
      zSlider = Math.abs(Math.round(100 * (props.zScaling - a) / (b - a)));
    }

    this.state = {
      parallelRendering: false,
      zSlider,
      zScaling: props.zScaling,
    };

    // bindings
    this.sliderZScale = this.sliderZScale.bind(this);
    this.resetCamera = this.resetCamera.bind(this);
    this.toggleParallelRendering = this.toggleParallelRendering.bind(this);
  }

  componentDidMount() {
    setTimeout(this.resetCamera, 0);
  }

  componentDidUpdate() {
    this.props.viewer.setZScale(this.state.zScaling);
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

  toggleParallelRendering(parallelRendering) {
    this.setState({ parallelRendering });
    this.props.viewer.setParallelRendering(parallelRendering);
  }

  resetCamera() {
    this.props.viewer.resetCamera(
      this.props.orientation,
      this.props.viewUp,
      this.props.zoom
    );
  }

  render() {
    return (
      <div className={style.line}>
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
        <div className={style.resetCamera} onClick={this.resetCamera} />
      </div>
    );
  }
}

ThreeDToolbar.propTypes = {
  viewer: PropTypes.object,
  zScaling: PropTypes.number,
  zRange: PropTypes.array,
  orientation: PropTypes.array,
  viewUp: PropTypes.array,
  zoom: PropTypes.number,
};

ThreeDToolbar.defaultProps = {
  viewer: null,
  zScaling: 1,
  zRange: null,
  orientation: [0, 0, 1000],
  viewUp: [0, 1, 0],
  zoom: 1,
};
