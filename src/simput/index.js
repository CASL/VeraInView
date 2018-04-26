import React from 'react';
import CellEditor from './CellEditor';
import Rod2DPreview from '../widgets/Rod2DPreview';

function registerLocalEditors(Simput) {
  if (Simput && Simput.updateWidgetMapping) {
    Simput.updateWidgetMapping('RodCellEditor', (prop, viewData, onChange) => (
      <CellEditor
        key={prop.data.id}
        data={prop.data}
        ui={prop.ui}
        viewData={viewData}
        show={prop.show}
        onChange={onChange || prop.onChange}
      />
    ));
    Simput.updateWidgetMapping('RodPreview', (prop, viewData, onChange) => (
      <Rod2DPreview key={prop.data.id} />
    ));
  }
}

const Simput = (typeof window === 'undefined' ? {} : window).Simput;
registerLocalEditors(Simput);
