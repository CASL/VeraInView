import macro from 'vtk.js/Sources/macro';
import React from 'react';
import PropTypes from 'prop-types';

import style from './VTKWidget.mcss';

export default class VTKWidget extends React.Component {
  constructor(props) {
    super(props);

    let zSlider = 1;
    if (props.zRange) {
      const [a, b] = props.zRange;
      zSlider = Math.abs(Math.round(100 * (props.zScaling - a) / (b - a)));
    }

    this.state = {
      parallelRendering: false,
      capture: null,
      zSlider,
      zScaling: props.zScaling,
    };

    // Functions for callback
    this.toggleParallelRendering = this.toggleParallelRendering.bind(this);
    this.resize = macro.throttle(props.viewer.resize, 100);
    this.resetCamera = this.resetCamera.bind(this);
    this.sliderZScale = this.sliderZScale.bind(this);
  }

  componentDidMount() {
    // Bind viewer to ui
    this.props.viewer.setContainer(this.container);

    // resize handling
    setTimeout(() => this.props.viewer.resize(), 1);
    window.addEventListener('resize', this.resize);

    // Push data on first load
    this.componentWillReceiveProps(this.props);
    this.resetCamera();
    setTimeout(this.resetCamera, 0);
    setTimeout(this.resetCamera, 10);
  }

  componentWillReceiveProps(nextProps) {
    this.props.viewer.setZScale(this.state.zScaling);
    this.props.viewer.setData(nextProps.data);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.props.viewer.resize);
    this.props.viewer.setContainer(null);
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

  sliderZScale(e) {
    const zSlider = Number(e.target.value);
    const [a, b] = this.props.zRange;
    const zScaling = a + (b - a) * zSlider / 100;
    this.setState({ zSlider, zScaling });

    this.props.viewer.setZScale(zScaling);
    this.resetCamera();
  }

  render() {
    return (
      <div className={style.container}>
        <div className={style.resetCamera} onClick={this.resetCamera} />
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
        <div
          className={style.container}
          ref={(c) => {
            this.container = c;
          }}
        />
      </div>
    );
  }
}

VTKWidget.propTypes = {
  viewer: PropTypes.object.isRequired,
  data: PropTypes.object,
  orientation: PropTypes.array,
  viewUp: PropTypes.array,
  zoom: PropTypes.number,
  zScaling: PropTypes.number,
  zRange: PropTypes.array,
};

VTKWidget.defaultProps = {
  data: null,
  orientation: [0, 0, 1000],
  viewUp: [0, 1, 0],
  zoom: 1,
  zScaling: 1,
  zRange: null,
};
