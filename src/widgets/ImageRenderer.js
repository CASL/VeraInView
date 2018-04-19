import React from 'react';
import PropTypes from 'prop-types';

import ReactTooltip from 'react-tooltip';

import style from '../assets/vera.mcss';

export default class ImageRenderer extends React.Component {
  constructor(props) {
    super(props);
    this.getTooltip = this.getTooltip.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  onClick(e) {
    const {
      elementDimensions: { width = 0, height = 0 } = {},
      position: { x = 0, y = 0 } = {},
    } = this.props;

    // pass position as 0 -> 1
    const posx = (x - this.props.pad) / (width - 2 * this.props.pad);
    const posy = (y - this.props.pad) / (height - 2 * this.props.pad);
    if (this.props.onClick) this.props.onClick(posx, posy, e);
  }

  getTooltip() {
    const {
      elementDimensions: { width = 0, height = 0 } = {},
      position: { x = 0, y = 0 } = {},
    } = this.props;
    // console.log(x, y);

    // pass position as 0 -> 1
    const posx = (x - this.props.pad) / (width - 2 * this.props.pad);
    const posy = (y - this.props.pad) / (height - 2 * this.props.pad);
    if (posx >= 0 && posx <= 1.0 && posy >= 0 && posy <= 1.0) {
      const info = this.props.getImageInfo(posx, posy);
      if (info) return info;
    }
    return '';
  }

  render() {
    return (
      <div className={style.mainImageFrame}>
        <ReactTooltip
          id="mainImg"
          delayShow={50}
          scrollHide
          getContent={this.getTooltip}
          isCapture
          ref={(c) => {
            this.tooltipRef = c;
          }}
        />
        <div style={{ position: 'relative' }}>
          <div className={style.imageOverlayText}>{this.props.overlayText}</div>
          <img
            data-for="mainImg"
            data-tip=""
            alt="Element rendering"
            src={this.props.content}
            onClick={this.onClick}
          />
        </div>
      </div>
    );
  }
}

ImageRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  getImageInfo: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  position: PropTypes.object,
  elementDimensions: PropTypes.object,
  pad: PropTypes.number,
  overlayText: PropTypes.string,
};

ImageRenderer.defaultProps = {
  position: {},
  elementDimensions: {},
  pad: 0,
  onClick: null,
  overlayText: '',
};
