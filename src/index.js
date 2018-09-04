import TestProperty from './TestProperty';
import CellEditor from './CellEditor';

function registerWidgets(Simput) {
  if (Simput.registerWidget) {
    Simput.registerWidget('test', TestProperty);
    Simput.registerWidget('CellEditor', CellEditor);
  }
}

if (typeof window !== 'undefined' && window.Simput) {
  registerWidgets(window.Simput);
}

