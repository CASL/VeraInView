import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button, Radio, Select, Row, Col, Switch } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import DualRenderer from './DualRenderer';
import ImageGenerator from '../utils/ImageGenerator';
import InpHelper from '../utils/InpHelper';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;
const Option = Select.Option;

let layoutId = 10;

const {
  // materialColorManager,
  // materialLookupTable,
  updateLookupTables,
  updateLayoutImage,
} = ImageGenerator;

export default class AssemblyLayoutEditor extends React.Component {
  static createNew(item) {
    const newLayout = Object.assign({}, item, {
      id: `new-${layoutId++}`,
    });
    // Blank layout with correct size created by update3D()
    delete newLayout.cell_map;
    newLayout.labelToUse = newLayout.label;
    delete newLayout.has3D;
    delete newLayout.image;
    delete newLayout.imageSrc;
    return newLayout;
  }

  constructor(props) {
    super(props);
    this.state = {
      rendering: null,
      paintCell: '-',
      replaceAll: false,
    };

    this.onFieldUpdate = this.onFieldUpdate.bind(this);
    this.onSymmetryUpdate = this.onSymmetryUpdate.bind(this);
    this.addNew = this.addNew.bind(this);
    this.update3D = this.update3D.bind(this);
    this.on2DClick = this.on2DClick.bind(this);
    this.onRemove = this.onRemove.bind(this);
  }

  componentDidMount() {
    this.update3D();
    // make sure the text map is filled in.
    if (this.props.cells.length) {
      this.props.content.cellMap = this.getTextMap();
    }
  }

  // so far, unnecessary, since no other components edit while this is visible.
  // componentWillReceiveProps(nextProps)

  onFieldUpdate(e) {
    const value = e.target.value;
    const id = e.target.dataset ? e.target.dataset.id : e.target['data-id'];
    this.props.content[id] = value;
    if (id === 'label' && this.props.content.id !== 'new-000') {
      this.props.content.labelToUse = value;
    }
    this.props.update();
    this.update3D();
  }

  onSymmetryUpdate(e) {
    const value = e.target.value;
    const id = e.target.dataset ? e.target.dataset.id : e.target['data-id'];
    this.props.content[id] = value;
    // make sure the text map is trimmed/expanded as needed, based on fullMap
    this.props.content.cellMap = this.getTextMap();
    // now update, fullMap and pictures.
    this.props.update();
    this.update3D();
  }

  on2DClick(posx, posy, e) {
    const item = this.props.content;
    const { cell, index, i, j } = ImageGenerator.getLayoutCell(
      item,
      posx,
      posy
    );
    if (!cell) return;
    if (this.state.replaceAll) {
      item.cell_map.forEach((mapCell, k) => {
        if (cell === mapCell) {
          item.cell_map[k] = this.state.paintCell;
        }
      });
    } else {
      item.cell_map[index] = this.state.paintCell;
      if (item.symmetry === 'oct' || item.symmetry === 'quad') {
        // replace other cells based on symmetry.
        this.getSymCells(i, j).forEach((k) => {
          item.cell_map[k] = this.state.paintCell;
        });
      }
    }
    item.cellMap = this.getTextMap();
    this.props.update();
    this.update3D();
  }

  onRemove(e) {
    this.props.remove(e);
  }

  getNumPins() {
    return InpHelper.getNumPins(this.props.content, this.props.params);
  }

  getCells() {
    return (this.props.content.type === 'coremaps'
      ? this.props.assemblies
      : this.props.cells
    ).filter((cell) => cell.group === this.props.content.group);
  }

  getSymCells(inI, inJ) {
    let i = inI;
    let j = inJ;
    // i, j are from upper-left, coords in full cell map.
    // Mirror to upper quad.
    const numPins = this.getNumPins();
    const { symmetry } = this.props.content;
    const halfPins = Math.floor(numPins * 0.5);
    if (i > halfPins) i = numPins - i - 1;
    if (j > halfPins) j = numPins - j - 1;
    if (symmetry === 'oct' && i < j) {
      // swap - we want the upper-right triangle.
      const k = i;
      i = j;
      j = k;
    }
    let result = [
      j * numPins + i,
      j * numPins + (numPins - i - 1),
      (numPins - j - 1) * numPins + i,
      (numPins - j - 1) * numPins + (numPins - i - 1),
    ];
    if (symmetry === 'oct' && i !== j) {
      // swap and repeat for octant mirror.
      const k = i;
      i = j;
      j = k;
      result = result.concat([
        j * numPins + i,
        j * numPins + (numPins - i - 1),
        (numPins - j - 1) * numPins + i,
        (numPins - j - 1) * numPins + (numPins - i - 1),
      ]);
    }
    return result;
  }

  // given the full array, generate a text map reduced by symmetry.
  // This stomps on user input, so we only want to use when initializing,
  // or when updated via click-to-place on the image.
  getTextMap() {
    return InpHelper.getTextMap(this.props.content, this.props.params);
  }

  // given the text map with symmetry, generate the full array. Expand as necessary.
  getFullMap() {
    return InpHelper.getFullMap(this.props.content, this.props.params);
  }

  update3D() {
    updateLookupTables();
    if (
      (this.props.content.type === 'coremaps' &&
        this.props.assemblies.length) ||
      this.props.cells.length
    ) {
      const cellNameToIdMap = {};
      this.getCells().forEach((cell) => {
        if (cell.id !== 'new-000') {
          cellNameToIdMap[cell.label] = cell.id;
        }
      });
      // Verify items in the cellMap. Unrecognized cells are empty.
      const pinPitch =
        this.props.content.type === 'coremaps'
          ? this.props.params.assemblyPitch
          : this.props.params.pinPitch;

      this.props.content.cell_map = this.getFullMap();
      if (!this.props.content.cellMap) {
        this.props.content.cellMap = this.getTextMap();
      }
      if (this.props.content.type === 'coremaps') {
        // update the coreShape
        this.props.content.coreShape = InpHelper.getCoreShape(
          this.props.coremaps,
          this.props.content.coreShape
        );
      }
      updateLayoutImage(
        this.props.content,
        cellNameToIdMap,
        this.props.imageSize,
        pinPitch,
        this.getNumPins()
      );
      this.setState({
        rendering: this.props.content.has3D,
      });
    } else {
      this.setState({
        rendering: null,
      });
    }
  }

  addNew() {
    if (this.props.addNew) {
      const newLayout = AssemblyLayoutEditor.createNew(this.props.content);
      this.props.addNew(this.props.type, newLayout);
    }
  }

  render() {
    return (
      <div className={style.form}>
        <Button
          shape="circle"
          style={{ position: 'absolute', right: 15, top: 68 }}
          icon="delete"
          onClick={this.onRemove}
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
            label={
              this.props.content.type === 'coremaps'
                ? 'Assembly Map'
                : 'Cell Map'
            }
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input.TextArea
              style={{ fontFamily: 'monospace' }}
              value={this.props.content.cellMap}
              rows={Math.min(this.getNumPins(), 3)}
              data-id="cellMap"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Symmetry"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Radio.Group
              onChange={this.onSymmetryUpdate}
              value={this.props.content.symmetry}
              data-id="symmetry"
            >
              <Radio.Button data-id="symmetry" value="oct">
                Octant
              </Radio.Button>
              <Radio.Button data-id="symmetry" value="quad">
                Quadrant
              </Radio.Button>
              <Radio.Button data-id="symmetry" value="none">
                None
              </Radio.Button>
            </Radio.Group>
          </FormItem>
          <FormItem
            label="Place"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Row gutter={16}>
              <Col span={4}>
                <Select
                  value={this.state.paintCell}
                  onChange={(val) => this.setState({ paintCell: val })}
                >
                  {this.getCells().map(
                    (cell) =>
                      cell.id === 'new-000' ? null : (
                        <Option key={cell.id} value={`${cell.label}`}>
                          {cell.label}
                        </Option>
                      )
                  )}
                  <Option key="empty" value="-">
                    -
                  </Option>
                </Select>
              </Col>
              <Col span={4}>
                <Switch
                  key="toggle-replace"
                  checkedChildren="all"
                  unCheckedChildren="one"
                  onChange={(val) => this.setState({ replaceAll: val })}
                  checked={this.state.replaceAll}
                />
              </Col>
            </Row>
          </FormItem>
        </Form>
        <DualRenderer
          content={this.props.content}
          rendering={this.state.rendering}
          getImageInfo={(posx, posy) => {
            const { cell } = ImageGenerator.getLayoutCell(
              this.props.content,
              posx,
              posy
            );
            return `${cell}`;
          }}
          onClick={this.on2DClick}
        />
      </div>
    );
  }
}

AssemblyLayoutEditor.propTypes = {
  content: PropTypes.object.isRequired,
  params: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  addNew: PropTypes.func,
  type: PropTypes.string,
  cells: PropTypes.array,
  assemblies: PropTypes.array,
  coremaps: PropTypes.array,
  imageSize: PropTypes.number,
};

AssemblyLayoutEditor.defaultProps = {
  addNew: null,
  type: null,
  // materials: [],
  cells: [],
  assemblies: [],
  coremaps: [],
  imageSize: 512,
};
