import TestProperty from './TestProperty';
import CellEditor from './CellEditor';
import RodEditor from './RodEditor';

function registerWidgets(Simput) {
  if (Simput.registerWidget) {
    Simput.registerWidget('test', TestProperty);
    Simput.registerWidget('CellEditor', CellEditor);
    Simput.registerWidget('RodEditor', RodEditor);
  }
}

if (typeof window !== 'undefined' && window.Simput) {
  registerWidgets(window.Simput);
}
