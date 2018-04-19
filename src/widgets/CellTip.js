import React from 'react';
import PropTypes from 'prop-types';

export default function cellTip(props) {
  return props.mat ? (
    <span>
      <div style={{ display: 'inline-block', textAlign: 'right' }}>
        Radius: <br />
        Material:
      </div>
      <div style={{ display: 'inline-block', marginLeft: '0.5em' }}>
        {props.mat.radius} cm<br />
        {props.mat.mat}
      </div>
    </span>
  ) : null;
}

cellTip.propTypes = {
  mat: PropTypes.object,
};

cellTip.defaultProps = {
  mat: null,
};
