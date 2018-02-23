import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import VTKRenderer from './VTKRenderer';
import ImageGenerator from '../utils/ImageGenerator';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;
// const Option = Select.Option;

let layoutId = 10;

// const TYPES = ['fuel', 'other'];
const {
  // materialColorManager,
  // materialLookupTable,
  updateLookupTables,
  updateLayoutImage,
} = ImageGenerator;

export default class AssemblyLayoutEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rendering: null,
    };

    this.onFieldUpdate = this.onFieldUpdate.bind(this);
    this.addNew = this.addNew.bind(this);
    this.update3D = this.update3D.bind(this);
  }

  componentDidMount() {
    this.update3D();
  }

  onFieldUpdate(e) {
    const value = e.target.value;
    const id = e.target.dataset.id;
    this.props.content[id] = value;
    if (id === 'label' && this.props.content.id !== 'new-000') {
      this.props.content.labelToUse = value;
    }
    this.props.update();
    this.update3D();
  }

  // eslint-disable-next-line class-methods-use-this
  update3D() {
    updateLookupTables();
    if (this.props.cells.length) {
      const cellNameToIdMap = {};
      this.props.cells.forEach((cell) => {
        if (cell.id !== 'new-000') {
          cellNameToIdMap[cell.label] = cell.id;
        }
      });
      // TODO verify items in the cellMap
      const cellMap = this.props.content.cellMap.split(/\s+/);
      // if (
      //   cellMap.length ===
      //   +this.props.content.numPins * +this.props.content.numPins
      // ) {
      this.props.content.cell_map = cellMap;
      updateLayoutImage(this.props.content, cellNameToIdMap);
      this.setState({
        rendering: this.props.content.has3D,
      });
      // }
    } else {
      this.setState({
        rendering: null,
      });
    }
  }

  addNew() {
    if (this.props.addNew) {
      const newLayout = Object.assign({}, this.props.content, {
        id: `new-${layoutId++}`,
      });
      newLayout.cell_map = newLayout.cell_map.slice();
      newLayout.labelToUse = newLayout.label;
      this.props.addNew(this.props.type, newLayout);
    }
  }

  render() {
    return (
      <div className={style.form}>
        {this.props.content.id === 'new-000' ? (
          <Button
            shape="circle"
            style={{ position: 'absolute', right: 15, top: 72 }}
            icon="plus"
            size="small"
            onClick={this.addNew}
          />
        ) : null}
        <Form layout="horizontal" className={style.form}>
          <FormItem
            label="Label"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.content.label}
              data-id="label"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Num Pins"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.content.numPins}
              data-id="numPins"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Pitch"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.content.pinPitch}
              data-id="pinPitch"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Cell Map"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input.TextArea
              style={{ fontFamily: 'monospace' }}
              value={this.props.content.cellMap}
              rows={this.props.content.numPins}
              data-id="cellMap"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
        </Form>
        <div className={style.preview}>
          {this.state.rendering && (
            <VTKRenderer nested content={this.state.rendering} />
          )}
        </div>
      </div>
    );
  }
}

AssemblyLayoutEditor.propTypes = {
  content: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  addNew: PropTypes.func,
  type: PropTypes.string,
  // materials: PropTypes.array,
  cells: PropTypes.array,
};

AssemblyLayoutEditor.defaultProps = {
  addNew: null,
  type: null,
  // materials: [],
  cells: [],
};
