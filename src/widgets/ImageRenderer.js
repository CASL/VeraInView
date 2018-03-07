import React from 'react';
import PropTypes from 'prop-types';

import ReactTooltip from 'react-tooltip';

import style from '../assets/vera.mcss';

export default class ImageRenderer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { show: true, first: true };
    this.getTooltip = this.getTooltip.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { position: { x = 0, y = 0 } = {} } = nextProps;
    // console.log('IMGpos', x, y);
    if ((x < 100 || y < 100) && this.tooltipRef) {
      // this.setState({ show: false });
    } else {
      this.setState({ show: true });
    }
  }

  getTooltip() {
    const {
      elementDimensions: { width = 0, height = 0 } = {},
      position: { x = 0, y = 0 } = {},
    } = this.props;

    // pass position as 0 -> 1
    const posx = (x - this.props.pad) / (width - 2 * this.props.pad);
    const posy = (y - this.props.pad) / (height - 2 * this.props.pad);
    if (posx >= 0 && posx <= 1.0 && posy >= 0 && posy <= 1.0) {
      const info = this.props.getImageInfo(posx, posy);
      // if (info && !this.state.show) {
      //   this.setState({ show: true }, () => {
      //     console.log('show');
      //     // this.tooltipRef.style.opacity = 1;
      //     // this.tooltipRef.showTooltip();
      //   });
      // }
      if (info) return info;
    }
    // if (this.state.show) {
    //   this.setState({ show: false }, () => {
    //     console.log('hide');
    //     // this.tooltipRef.style.opacity = 0;
    //     // this.tooltipRef.hideTooltip();
    //   });
    // }
    // if (this.state.first) {
    //   this.setState({ first: false });
    //   return 'empty';
    // }
    return '';
  }

  render() {
    return (
      <div className={style.mainImageFrame}>
        <ReactTooltip
          id="overTime"
          delayShow={50}
          scrollHide
          disable={!this.state.show}
          getContent={[this.getTooltip, 50]}
          ref={(c) => {
            this.tooltipRef = c;
          }}
        />
        <img
          data-for="overTime"
          data-tip=""
          alt="Element rendering"
          src={this.props.content}
        />
      </div>
    );
  }
}

ImageRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  getImageInfo: PropTypes.func.isRequired,
  position: PropTypes.object,
  elementDimensions: PropTypes.object,
  pad: PropTypes.number,
};

ImageRenderer.defaultProps = {
  position: {},
  elementDimensions: {},
  pad: 50,
};
