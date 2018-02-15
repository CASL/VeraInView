import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button, Select } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import VTKRenderer from './VTKRenderer';
import ImageGenerator from '../utils/ImageGenerator';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;
const Option = Select.Option;

let cellId = 1;

// const TYPES = ['fuel', 'other'];
const {
  materialColorManager,
  materialLookupTable,
  updateLookupTables,
} = ImageGenerator;

export default class CellEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rendering: {
        id: '000',
        type: 'cell',
        source: {
          radius: [1],
          cellFields: [1],
          resolution: 360,
        },
        lookupTable: materialLookupTable,
      },
    };

    this.onFieldUpdate = this.onFieldUpdate.bind(this);
    this.addNew = this.addNew.bind(this);
    this.onRadiiUpdate = this.onRadiiUpdate.bind(this);
    this.onMaterialUpdate = this.onMaterialUpdate.bind(this);
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

  onRadiiUpdate(e) {
    const radii = e.target.value
      .split(',')
      .map((s) => s.trim())
      .map((s) => Number(s));
    const numRings = radii.length;
    const mats = [].concat(this.props.content.mats);
    while (mats.length < numRings) {
      mats.push(this.props.materials[0].name);
    }
    while (mats.length > numRings) {
      mats.pop();
    }
    this.props.content.radii = radii;
    this.props.content.num_rings = numRings;
    this.props.content.mats = mats;
    this.update3D();
  }

  onMaterialUpdate(value) {
    const [idx, name] = value.split('::');
    this.props.content.mats[Number(idx)] = name;
    this.update3D();
  }

  update3D() {
    updateLookupTables();
    this.setState({
      rendering: {
        id: this.props.content.id,
        type: 'cell',
        source: {
          forceUpdate: true,
          radius: this.props.content.radii,
          cellFields: this.props.content.mats.map(materialColorManager.getId),
          resolution: 360,
        },
        lookupTable: materialLookupTable,
      },
    });
  }

  addNew() {
    if (this.props.addNew) {
      const newCell = Object.assign({}, this.props.content, {
        id: `new-${cellId++}`,
      });
      newCell.radii = newCell.radii.map((s) => Number(s));
      newCell.mats = newCell.mats.slice();
      newCell.labelToUse = newCell.label;
      this.props.addNew(this.props.type, newCell);
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
            label="Radii"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.content.radii}
              data-id="radii"
              onChange={this.onRadiiUpdate}
            />
          </FormItem>
          <FormItem
            label="Materials"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            {this.props.content.mats.map((m, idx) => (
              <Select
                key={`mat-${idx.toString(16)}`}
                value={m}
                onChange={this.onMaterialUpdate}
              >
                {this.props.materials.map((mt) => (
                  <Option key={mt.id} value={`${idx}::${mt.name}`}>
                    {mt.label}
                  </Option>
                ))}
              </Select>
            ))}
          </FormItem>
        </Form>
        <div className={style.preview}>
          <VTKRenderer nested content={this.state.rendering} />
        </div>
      </div>
    );
  }
}

CellEditor.propTypes = {
  content: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  addNew: PropTypes.func,
  type: PropTypes.string,
  materials: PropTypes.array,
};

CellEditor.defaultProps = {
  addNew: null,
  type: null,
  materials: [],
};
