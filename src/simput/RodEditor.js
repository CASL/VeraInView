import React from 'react';
import PropTypes from 'prop-types';

import Rod2DPreview from '../widgets/Rod2DPreview';
import EditableList from '../widgets/EditableList';

import style from './RodEditor.mcss';

export default class RodEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.onLengthChange = this.onLengthChange.bind(this);
    this.addLayer = this.addLayer.bind(this);
    this.delLayer = this.delLayer.bind(this);
  }

  onLengthChange(layer, value) {
    const data = this.props.data;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      const newValue = Number(value);
      const totalLength = Number(this.props.viewData.rodInfo.height.value[0]);
      const currentLength = stack.reduce((t, l) => t + l.length, 0);
      const newLength = currentLength - stack[layer.key].length + newValue;

      if (newLength <= totalLength) {
        stack[layer.key].length = newValue;
        this.props.onChange(data);
      }
    }
  }

  addLayer(idx) {
    const data = this.props.data;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      const afterIdx = idx + 1;
      stack.splice(afterIdx, 0, {
        color: 'blue',
        type: 'gap',
        length: 0,
      });

      this.props.onChange(data);
    }
  }

  delLayer(idx) {
    const data = this.props.data;
    if (data.value && data.value.length) {
      const stack = data.value[0].stack;
      stack.splice(idx, 1);

      this.props.onChange(data);
    }
  }

  render() {
    const columns = [
      {
        key: 'color',
        dataKey: 'color',
        label: 'Color',
      },
      {
        key: 'type',
        dataKey: 'label',
        label: 'Layer Type',
      },
      {
        key: 'length',
        dataKey: 'length',
        label: 'Length',
        classes: style.centeredCell,
        render: (value, layer) => (
          <input
            type="number"
            min="0"
            step="1"
            value={layer.length}
            onChange={(e) => this.onLengthChange(layer, e.target.value)}
          />
        ),
      },
    ];

    let items = [];
    if (this.props.data.value && this.props.data.value.length) {
      items = this.props.data.value[0].stack.map((layer, idx) =>
        Object.assign({ key: idx }, layer)
      );
    }

    const totalLength = Number(this.props.viewData.rodInfo.height.value[0]);

    return (
      <div>
        <Rod2DPreview stack={items} totalLength={totalLength} />
        <EditableList
          columns={columns}
          data={items}
          onAdd={this.addLayer}
          onDelete={this.delLayer}
        />
      </div>
    );
  }
}

RodEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  // ui: PropTypes.object.isRequired,
  viewData: PropTypes.object.isRequired,
};

RodEditor.defaultProps = {
  // name: '',
  // help: '',
};
