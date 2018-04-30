import macro from 'vtk.js/Sources/macro';
import React from 'react';
import PropTypes from 'prop-types';

import style from './VTKWidget.mcss';

export default class VTKWidget extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      parallelRendering: false,
      zScaling: 1,
      capture: null,
    };

    // Functions for callback
    this.onScaleChange = macro.throttle(this.onScaleChange.bind(this), 100);
    this.toggleParallelRendering = this.toggleParallelRendering.bind(this);
    this.resize = macro.throttle(props.viewer.resize, 100);
    this.resetCamera = this.resetCamera.bind(this);
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
    this.props.viewer.setZScale(this.props.zScaling);
    this.props.viewer.setData(nextProps.data);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.props.viewer.resize);
    this.props.viewer.setContainer(null);
  }

  onScaleChange(zScaling) {
    this.setState({ zScaling });
    this.props.viewer.setZScale(zScaling);
  }

  toggleParallelRendering(parallelRendering) {
    this.setState({ parallelRendering });
    this.props.viewer.setParallelRendering(parallelRendering);
  }

  resetCamera() {
    this.props.viewer.render();
    this.props.viewer.resetCamera(
      this.props.orientation,
      this.props.viewUp,
      this.props.zoom
    );
  }

  render() {
    return (
      <div className={style.container}>
        <div className={style.resetCamera} onClick={this.resetCamera} />
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
};

VTKWidget.defaultProps = {
  data: null,
  orientation: [0, 0, 1000],
  viewUp: [0, 1, 0],
  zoom: 1,
  zScaling: 1,
};
