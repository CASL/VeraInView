import macro from 'vtk.js/Sources/macro';
import React from 'react';
import PropTypes from 'prop-types';

import style from './VTKWidget.mcss';

export default class VTKWidget extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      parallelRendering: false,
      capture: null,
    };

    // Functions for callback
    this.toggleParallelRendering = this.toggleParallelRendering.bind(this);
    this.resize = macro.throttle(props.viewer.resize, 100);
    this.resetCamera = this.resetCamera.bind(this);
  }

  componentDidMount() {
    // Bind viewer to ui
    this.props.viewer.setContainer(this.container);

    // resize handling
    window.addEventListener('resize', this.resize);

    // Push data on first load
    this.props.viewer.setData(this.props.data);
    this.resetCamera();

    setTimeout(() => {
      this.props.viewer.resize();
      this.resetCamera();
    }, 10);
  }

  componentWillReceiveProps(nextProps) {
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

  decorateProps(children) {
    return React.Children.map(children, (child) => {
      if (child && typeof child.type === 'function') {
        return React.cloneElement(child, {
          viewer: this.props.viewer,
          resetCamera: this.resetCamera,
        });
      }
      return child;
    });
  }

  render() {
    return (
      <div className={style.container}>
        {this.decorateProps(this.props.children)}
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
  children: PropTypes.node,
};

VTKWidget.defaultProps = {
  data: null,
  orientation: [0, 0, 1000],
  viewUp: [0, 1, 0],
  zoom: 1,
  children: [],
};
