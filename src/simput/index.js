import React from 'react';
import CellEditor from './CellEditor';
import RodEditor from './RodEditor';
import MapEditor from './MapEditor';

function registerLocalEditors(Simput) {
  if (Simput && Simput.updateWidgetMapping) {
    Simput.updateWidgetMapping('CellEditor', (prop, viewData, onChange) => (
      <CellEditor
        key={prop.data.id}
        data={prop.data}
        ui={prop.ui}
        viewData={viewData}
        show={prop.show}
        onChange={onChange || prop.onChange}
      />
    ));
    Simput.updateWidgetMapping('RodEditor', (prop, viewData, onChange) => (
      <RodEditor
        key={prop.data.id}
        data={prop.data}
        ui={prop.ui}
        viewData={viewData}
        show={prop.show}
        onChange={onChange || prop.onChange}
      />
    ));
    Simput.updateWidgetMapping('MapEditor', (prop, viewData, onChange) => (
      <MapEditor
        key={prop.data.id}
        data={prop.data}
        ui={prop.ui}
        viewData={viewData}
        show={prop.show}
        onChange={onChange || prop.onChange}
      />
    ));
  }
}

const Simput = (typeof window === 'undefined' ? {} : window).Simput;
registerLocalEditors(Simput);
