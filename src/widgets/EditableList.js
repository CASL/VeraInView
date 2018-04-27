import React from 'react';
import PropTypes from 'prop-types';

import style from '../assets/vera.mcss';

function EditableList(props) {
  const { columns, data, onAdd, onDelete } = props;

  const header = columns.map((col) => <th key={col.key}>{col.label}</th>);

  const rows = data.map((datum, idx) => {
    const cells = columns.map((col) => {
      const value = datum[col.dataKey];
      const content = col.render ? col.render(value, datum) : value;

      const cellKey = `${col.dataKey}::${datum.key}`;

      return <td key={cellKey}>{content}</td>;
    });

    return (
      <tr key={datum.key}>
        <td style={{ textAlign: 'right' }}>
          <button
            className={style.editableListAddBtn}
            onClick={() => onAdd(idx)}
          >
            +
          </button>
        </td>
        {cells}
        <td>
          <button
            className={style.editableListDelBtn}
            onClick={() => onDelete(idx)}
          >
            x
          </button>
        </td>
      </tr>
    );
  });

  return (
    <table className={style.editableListTable}>
      <thead>
        <tr>
          <th />
          {header}
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows
        ) : (
          <tr>
            <td style={{ textAlign: 'right' }}>
              <button
                className={style.editableListAddBtn}
                onClick={() => onAdd(-1)}
              >
                +
              </button>
            </td>
            <td>{props.addFirstRowText}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

EditableList.propTypes = {
  columns: PropTypes.array,
  data: PropTypes.array,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  addFirstRowText: PropTypes.string,
};

EditableList.defaultProps = {
  columns: [],
  data: [],
  onAdd: () => {},
  onDelete: () => {},
  addFirstRowText: 'Add new item',
};

export default EditableList;
