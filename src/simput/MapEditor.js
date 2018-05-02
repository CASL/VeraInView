import React from 'react';
import PropTypes from 'prop-types';

import GridMapWidget from '../widgets/GridMapWidget';

export default function MapEditor(props) {
  console.log(props.data);
  return (
    <GridMapWidget
      gridSize={props.ui.domain.assemblySize}
      items={Object.keys(props.ui.domain.rodsNames)}
      itemRendererProps={{
        mapping: props.ui.domain.rodsNames,
        colors: props.ui.domain.rodsColors,
      }}
      emptyItem="-"
      onChange={props.onChange}
      grid={props.data.value || []}
      data={props.data}
    />
  );
}

MapEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  ui: PropTypes.object.isRequired,
};

MapEditor.defaultProps = {
  // name: '',
  // help: '',
};
