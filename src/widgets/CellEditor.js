import React from 'react';
import PropTypes from 'prop-types';
// import ReactCursorPosition from 'react-cursor-position';

import { Form, Input, InputNumber, Button, Select, Row, Col } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import DualRenderer from './DualRenderer';
import ImageGenerator from '../utils/ImageGenerator';
import CellTip from './CellTip';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;
const { Option, OptGroup } = Select;

let cellId = 1;

// const TYPES = ['fuel', 'other'];
const {
  materialColorManager,
  materialLookupTable,
  updateLookupTables,
  updateCellImage,
} = ImageGenerator;

export default class CellEditor extends React.Component {
  static createNew(item) {
    const newCell = Object.assign({}, item, {
      id: `new-${cellId++}`,
    });
    newCell.radii = newCell.radii.map((s) => Number(s));
    newCell.mats = newCell.mats.slice(); // clone
    newCell.labelToUse = newCell.label;
    delete newCell.has3D;
    delete newCell.image;
    // delete newCell.imageSrc;
    return newCell;
  }

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
    // this.onRadiiUpdate = this.onRadiiUpdate.bind(this);
    this.onRadiiAdd = this.onRadiiAdd.bind(this);
    this.onRadiiDelete = this.onRadiiDelete.bind(this);
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

  onRadiiUpdate(id, value) {
    // const id = e.target.dataset.id;
    // const newRadii = e.target.value
    //   .split(/[,\s]+/)
    //   .map((s) => s.trim())
    //   .map((s) => Number(s));
    const radii = [].concat(this.props.content.radii);

    // radii.splice(id, 1, ...newRadii);
    radii[id] = value;
    console.log(radii);
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
    // this.props.content.radiiStr = e.target.value;
    this.props.content.radii = radii;
    this.props.content.num_rings = numRings;
    this.props.content.mats = mats;
    this.update3D();
  }

  onRadiiAdd(e) {
    const id = e.target.dataset.id;
    this.props.content.radii.splice(id, 0, this.props.content.radii[id]);
    console.log(id, this.props.content.radii);
    this.props.content.mats.splice(id, 0, this.props.content.mats[id]);
    this.props.content.num_rings += 1;
    this.update3D();
  }
  onRadiiDelete(e) {
    const id = e.target.dataset.id;
    if (this.props.content.num_rings > 1) {
      this.props.content.radii.splice(id, 1);
      console.log(id, this.props.content.radii);
      this.props.content.mats.splice(id, 1);
      this.props.content.num_rings -= 1;
      this.update3D();
    }
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
    updateCellImage(
      this.props.content,
      this.props.imageSize,
      this.props.params.pinPitch
    );
    this.props.content.has3D.source.forceUpdate = true;
    this.setState({
      rendering: this.props.content.has3D,
    });
  }

  addNew() {
    if (this.props.addNew) {
      const newCell = CellEditor.createNew(this.props.content);
      this.props.addNew(this.props.type, newCell);
    }
  }

  render() {
    /* eslint-disable react/no-array-index-key, react/jsx-no-bind */
    return (
      <div className={style.form}>
        <Button
          shape="circle"
          style={{ position: 'absolute', right: 15, top: 68 }}
          icon="delete"
          onClick={this.props.remove}
        />
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
            label="Radii & Materials"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Row>
              {this.props.content.radii.map((m, idx) => (
                <Col span={3} key={`rad-${idx.toString(16)}`}>
                  <InputNumber
                    value={this.props.content.radii[idx]}
                    step={0.02}
                    data-id={idx}
                    size="100%"
                    style={{ width: '100%' }}
                    onChange={this.onRadiiUpdate.bind(this, idx)}
                  />
                </Col>
              ))}
            </Row>
            <Row>
              {this.props.content.mats.map((m, idx) => (
                <Col span={3} key={`add-${idx.toString(16)}`}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Button
                      shape="circle"
                      icon="plus"
                      data-id={idx}
                      className={style.cellNewRing}
                      onClick={this.onRadiiAdd}
                    />
                    {this.props.content.num_rings > 1 && (
                      <Button
                        shape="circle"
                        icon="delete"
                        data-id={idx}
                        className={style.cellNewRing}
                        onClick={this.onRadiiDelete}
                      />
                    )}
                  </div>
                </Col>
              ))}
            </Row>
            <Row>
              {this.props.content.mats.map((m, idx) => (
                <Col span={3} key={`mat-${idx.toString(16)}`}>
                  <Select
                    value={`${idx}::${m}`}
                    showSearch
                    onChange={this.onMaterialUpdate}
                  >
                    <OptGroup label="Fuels">
                      {this.props.fuels.map((mt) => (
                        <Option key={`${idx}::${mt.label}`}>{mt.label}</Option>
                      ))}
                    </OptGroup>
                    <OptGroup label="Normal">
                      {this.props.materials.map((mt) => (
                        <Option key={`${idx}::${mt.label}`}>{mt.label}</Option>
                      ))}
                    </OptGroup>
                  </Select>
                </Col>
              ))}
            </Row>
          </FormItem>
        </Form>
        <DualRenderer
          content={this.props.content}
          rendering={this.state.rendering}
          overlayText={`Contact radius: ${this.props.params.pinPitch * 0.5}`}
          getImageInfo={(posx, posy) => {
            const mat = ImageGenerator.getCellMaterial(
              this.props.content,
              posx,
              posy
            );
            return mat ? <CellTip mat={mat} /> : null;
          }}
          mask={this.props.mask}
        />
      </div>
    );
  }
}

CellEditor.propTypes = {
  content: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  addNew: PropTypes.func,
  type: PropTypes.string,
  params: PropTypes.object.isRequired,
  fuels: PropTypes.array,
  materials: PropTypes.array,
  defaultMaterial: PropTypes.object,
  mask: PropTypes.object,
  imageSize: PropTypes.number,
};

CellEditor.defaultProps = {
  addNew: null,
  type: null,
  fuels: [],
  materials: [],
  defaultMaterial: { label: 'ss' },
  mask: {},
  imageSize: 512,
};
