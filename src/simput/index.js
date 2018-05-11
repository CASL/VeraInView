import React from 'react';
import CellEditor from './CellEditor';
import RodEditor from './RodEditor';
import MapEditor from './MapEditor';
import AssemblyEditor from './AssemblyEditor';
import CoreEditor from './CoreEditor';
import InpHelper from '../utils/InpHelper';

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
    Simput.updateWidgetMapping('AssemblyEditor', (prop, viewData, onChange) => (
      <AssemblyEditor
        key={prop.data.id}
        data={prop.data}
        ui={prop.ui}
        viewData={viewData}
        show={prop.show}
        onChange={onChange || prop.onChange}
      />
    ));
    Simput.updateWidgetMapping('CoreEditor', (prop, viewData, onChange) => (
      <CoreEditor
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

if (typeof window !== 'undefined') {
  // expose global so simput/types/vera/src/convert.js can use it.
  if (window.Simput.types.vera) {
    window.Simput.types.vera.helper = { InpHelper };
  }
  registerLocalEditors(window.Simput);
}
