import React from 'react';
import PropTypes from 'prop-types';
// import ReactCursorPosition from 'react-cursor-position';

import { Form, Input, Button, Select, Row, Col } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import DualRenderer from './DualRenderer';
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
  updateCellImage,
} = ImageGenerator;

export default class CellEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      use3D: false,
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
    // update image
    this.props.update();
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
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .map((s) => Number(s));
    const numRings = radii.length;
    const mats = [].concat(this.props.content.mats);
    if (numRings > 0 && mats.length === 0) {
      mats.push(this.props.defaultMaterial.label);
    }
    while (mats.length < numRings) {
      mats.push(mats[mats.length - 1]);
    }
    while (mats.length > numRings) {
      mats.pop();
    }
    this.props.content.radiiStr = e.target.value;
    this.props.content.radii = radii;
    this.props.content.num_rings = numRings;
    this.props.content.mats = mats;
    this.update3D();
  }

  onMaterialUpdate(value) {
    const [idx, name] = value.split('::');
    this.props.content.mats[Number(idx)] = name;
    // assign a color, if it doesn't already have one.
    materialColorManager.getColor(name);
    this.props.update();
    this.update3D();
  }

  update3D() {
    updateLookupTables();
    updateCellImage(this.props.content, this.props.imageSize);
    this.props.content.has3D.source.forceUpdate = true;
    this.setState({
      rendering: this.props.content.has3D,
    });
  }

  addNew() {
    if (this.props.addNew) {
      const newCell = Object.assign({}, this.props.content, {
        id: `new-${cellId++}`,
      });
      newCell.radii = newCell.radii.map((s) => Number(s));
      newCell.mats = newCell.mats.slice(); // clone
      newCell.labelToUse = newCell.label;
      delete newCell.has3D;
      delete newCell.image;
      // delete newCell.imageSrc;
      this.props.addNew(this.props.type, newCell);
    }
  }

  render() {
    return (
      <div className={style.form}>
        {this.props.content.id === 'new-000' ? (
          <Button
            type="primary"
            shape="circle"
            style={{ position: 'absolute', right: 15, top: 68 }}
            icon="plus"
            onClick={this.addNew}
          />
        ) : null}
        <Form
          layout="horizontal"
          className={style.form}
          style={{ paddingBottom: 25 }}
        >
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
              defaultValue={this.props.content.radii}
              data-id="radii"
              onChange={this.onRadiiUpdate}
            />
          </FormItem>
          <FormItem
            label="Materials"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Row>
              {this.props.content.mats.map((m, idx) => (
                <Col span={3} key={`mat-${idx.toString(16)}`}>
                  <Select value={m} showSearch onChange={this.onMaterialUpdate}>
                    {this.props.materials.map((mt) => (
                      <Option key={mt.id} value={`${idx}::${mt.label}`}>
                        {mt.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
              ))}
            </Row>
          </FormItem>
        </Form>
        <DualRenderer
          content={this.props.content}
          rendering={this.state.rendering}
          getImageInfo={(posx, posy) => {
            const mat = ImageGenerator.getCellMaterial(
              this.props.content,
              posx,
              posy
            );
            return mat ? (
              <span>
                {mat.radius} cm <br /> {mat.mat}
              </span>
            ) : null;
          }}
        />
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
  defaultMaterial: PropTypes.object,
  imageSize: PropTypes.number,
};

CellEditor.defaultProps = {
  addNew: null,
  type: null,
  materials: [],
  defaultMaterial: { label: 'ss' },
  imageSize: 512,
};
