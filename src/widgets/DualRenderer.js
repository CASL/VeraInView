import React from 'react';
import PropTypes from 'prop-types';
import ReactCursorPosition from 'react-cursor-position';

import { Switch } from 'antd';

// import ReactTooltip from 'react-tooltip';

import VTKRenderer from './VTKRenderer';
// import ImageGenerator from '../utils/ImageGenerator';
import ImageRenderer from './ImageRenderer';

import style from '../assets/vera.mcss';

export default class DualRenderer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      use3D: false,
    };
    this.onToggle3D = this.onToggle3D.bind(this);
  }

  onToggle3D(use3D) {
    this.setState({ use3D });
  }

  render() {
    const contents = [];
    if (
      this.props.content.imageSrc &&
      !(this.state.use3D && this.props.content.has3D)
    ) {
      contents.push(
        <div key="2d-content" className={style.mainImage}>
          <ReactCursorPosition>
            <ImageRenderer
              content={this.props.content.imageSrc}
              getImageInfo={this.props.getImageInfo}
              onClick={this.props.onClick}
            />
          </ReactCursorPosition>
        </div>
      );
    }

    if (this.props.content.has3D) {
      contents.push(
        <Switch
          key="toggle-3d"
          style={{ position: 'absolute', right: 0, top: -45 }}
          checkedChildren="3D"
          unCheckedChildren="2D"
          onChange={this.onToggle3D}
          checked={this.state.use3D}
        />
      );
    }
    if (this.props.content.has3D && this.state.use3D) {
      contents.push(
        <VTKRenderer key="3d-renderer" nested content={this.props.rendering} />
      );
    }
    return <div className={style.preview}>{contents}</div>;
  }
}

DualRenderer.propTypes = {
  rendering: PropTypes.object,
  content: PropTypes.object.isRequired,
  getImageInfo: PropTypes.func.isRequired,
  onClick: PropTypes.func,
};

DualRenderer.defaultProps = {
  rendering: null,
  onClick: null,
};
