import TestProperty from './TestProperty';
import CellEditor from './CellEditor';
import RodEditor from './RodEditor';
import AssemblyEditor from './AssemblyEditor';

function registerWidgets(Simput) {
  if (Simput.registerWidget) {
    Simput.registerWidget('test', TestProperty);
    Simput.registerWidget('CellEditor', CellEditor);
    Simput.registerWidget('RodEditor', RodEditor);
    Simput.registerWidget('AssemblyEditor', AssemblyEditor);
  }
}

if (typeof window !== 'undefined' && window.Simput) {
  registerWidgets(window.Simput);
}
