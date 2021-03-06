import React from 'react';
import PropTypes from 'prop-types';

// import ColorManager from '../utils/ColorManager';
import style from '../assets/vera.mcss';

export default function Color(props) {
  return (
    <div className={props.className}>
      <span
        className={props.border ? style.colorWithBorder : style.color}
        style={{
          background: props.color ? props.color : '#000',
        }}
      />
      <span className={style.colorLabel}>{props.title}</span>
    </div>
  );
}

Color.propTypes = {
  title: PropTypes.string,
  className: PropTypes.string,
  color: PropTypes.string,
  border: PropTypes.bool,
};

Color.defaultProps = {
  className: '',
  title: 'No Name',
  color: '#000',
  border: false,
};
