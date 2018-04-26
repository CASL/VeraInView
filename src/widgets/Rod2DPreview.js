import React from 'react';
import PropTypes from 'prop-types';

import style from './Rod2DPreview.mcss';

/* eslint-disable react/no-array-index-key */

export default function Rod2DPreview(props) {
  const remaining = Number(
    props.totalLength -
      props.stack.map((i) => i.length).reduce((a, b) => a + b, 0)
  ).toFixed(1);
  return (
    <table className={style.container}>
      <tbody>
        <tr className={style.colors}>
          {props.stack.map(({ color: background, length }, i) => (
            <td
              key={i}
              style={{
                background,
                width: `${100 * length / props.totalLength}%`,
              }}
            />
          ))}
          <td className={style.last} />
        </tr>
        <tr className={style.labels}>
          {props.stack.map(({ label }, i) => (
            <td key={i}>
              <label className={style.label}>{label}</label>
            </td>
          ))}
          <td className={style.last}>
            <label className={style.label}>{remaining}</label>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

Rod2DPreview.propTypes = {
  totalLength: PropTypes.number,
  stack: PropTypes.array,
};

Rod2DPreview.defaultProps = {
  totalLength: 100,
  stack: [
    { color: '#447c69', label: 'A', length: 0.5 },
    { color: '#f19670', label: 'B', length: 4.5 },
    { color: '#993767', label: 'C', length: 45 },
    { color: '#74c493', label: 'D', length: 10.3 },
    { color: '#c94a53', label: 'E', length: 13.5 },
  ],
};
