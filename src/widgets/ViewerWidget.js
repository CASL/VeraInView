import macro from 'vtk.js/Sources/macro';
import React from 'react';
import PropTypes from 'prop-types';

import style from './ViewerWidget.mcss';

export default class ViewerWidget extends React.Component {
  constructor(props) {
    super(props);

    // Functions for callback
    this.resize = macro.throttle(props.viewer.resize, 100);
  }

  componentDidMount() {
    // Bind viewer to ui
    this.props.viewer.setContainer(this.container);

    // resize handling
    window.addEventListener('resize', this.resize);

    // Push data on first load
    this.props.viewer.setData(this.props.data);

    setTimeout(() => {
      this.props.viewer.resize();
    }, 0);
  }

  componentWillReceiveProps(nextProps) {
    this.props.viewer.setData(nextProps.data);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.props.viewer.resize);
    this.props.viewer.setContainer(null);
  }

  render() {
    return (
      <div className={style.container}>
        <div className={style.toolbar}>{this.props.children}</div>
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

ViewerWidget.propTypes = {
  viewer: PropTypes.object.isRequired,
  data: PropTypes.object,
  children: PropTypes.node,
};

ViewerWidget.defaultProps = {
  data: null,
  children: [],
};
