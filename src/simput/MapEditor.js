import React from 'react';
import PropTypes from 'prop-types';

import GridMapWidget from '../widgets/GridMapWidget';

export default class MapEditor extends React.Component {
  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.data.value[0].grid !== prevState.grid) {
      if (
        !nextProps.data.value[0].grid ||
        nextProps.data.value[0].grid.join(':') !== prevState.grid.join(':')
      ) {
        return Object.assign(
          {
            grid: [],
            symmetry: 3,
            replacementMode: 0,
          },
          nextProps.data.value[0]
        );
      }
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = Object.assign(
      {
        grid: [],
        symmetry: 3,
        replacementMode: 0,
      },
      props.data.value[0]
    );

    this.onChange = this.onChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const nextState = MapEditor.getDerivedStateFromProps(nextProps, this.state);
    if (nextState) {
      this.setState(nextState);
    }
  }

  onChange(state) {
    this.setState(state);
    if (!this.props.data.value) {
      this.props.data.value = [];
    }
    this.props.data.value[0] = Object.assign(this.props.data.value[0], state);
    this.props.onChange(this.props.data);
  }

  render() {
    if (!this.props.data.value || !this.props.data.value[0]) {
      return null;
    }

    return (
      <GridMapWidget
        gridSize={this.props.gridSize}
        items={this.props.items}
        itemRendererProps={{
          mapping: this.props.names,
          colors: this.props.colors,
        }}
        onChange={this.onChange}
        state={this.state}
      />
    );
  }
}

MapEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  gridSize: PropTypes.number.isRequired,
  items: PropTypes.array.isRequired,
  names: PropTypes.object.isRequired,
  colors: PropTypes.object.isRequired,
};

MapEditor.defaultProps = {
  // name: '',
  // help: '',
};
