import TestProperty from './TestProperty';
import CellEditor from './CellEditor';
import RodEditor from './RodEditor';
import AssemblyEditor from './AssemblyEditor';
import CoreEditor from './CoreEditor';

function registerWidgets(Simput) {
  if (Simput.registerWidget) {
    Simput.registerWidget('test', TestProperty);
    Simput.registerWidget('CellEditor', CellEditor);
    Simput.registerWidget('RodEditor', RodEditor);
    Simput.registerWidget('AssemblyEditor', AssemblyEditor);
    Simput.registerWidget('CoreEditor', CoreEditor);
  }
}

if (typeof window !== 'undefined' && window.Simput) {
  registerWidgets(window.Simput);
}
