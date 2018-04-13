import React from 'react';
import CellEditor from './CellEditor';

function registerLocalEditors(Simput) {
  if (Simput && Simput.updateWidgetMapping) {
    Simput.updateWidgetMapping(
      'rod-cell-editor',
      (prop, viewData, onChange) => (
        <CellEditor
          key={prop.data.id}
          data={prop.data}
          ui={prop.ui}
          viewData={viewData}
          show={prop.show}
          onChange={onChange || prop.onChange}
        />
      )
    );
  }
}

const Simput = (typeof window === 'undefined' ? {} : window).Simput;
registerLocalEditors(Simput);
