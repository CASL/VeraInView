import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button, Radio, Select, Row, Col, Switch } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import DualRenderer from './DualRenderer';
import ImageGenerator from '../utils/ImageGenerator';

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
    this.addNew = this.addNew.bind(this);
    this.update3D = this.update3D.bind(this);
    this.on2DClick = this.on2DClick.bind(this);
  }

  componentDidMount() {
    this.update3D();
  }

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

  getSymCells(inI, inJ) {
    let i = inI;
    let j = inJ;
    // i, j are from upper-left, coords in full cell map.
    // Mirror to upper quad.
    const { numPins } = this.props.params;
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

  // given the full array, generate a text map reduced by symmetry
  getTextMap() {
    const map = [];
    const { cell_map: cellMap } = this.props.content;
    const symmetry = this.props.content.symmetry || 'none';
    const { numPins } = this.props.params;
    const halfPins = Math.floor(numPins * 0.5);
    // copy from the lower-right quad, and left octant.
    if (halfPins > 1 && symmetry === 'oct') {
      for (let j = halfPins; j < numPins; ++j) {
        // i range is halfPins -> j
        map.push(
          cellMap.slice(j * numPins + halfPins, j * numPins + j + 1).join(' ')
        );
      }
    } else if (halfPins > 1 && symmetry === 'quad') {
      for (let j = halfPins; j < numPins; ++j) {
        // i range is halfPins -> end of row
        map.push(
          cellMap.slice(j * numPins + halfPins, (j + 1) * numPins).join(' ')
        );
      }
    } else {
      for (let i = 0; i < numPins; ++i) {
        map.push(cellMap.slice(i * numPins, (i + 1) * numPins).join(' '));
      }
    }
    return map.join('\n');
  }

  // given the text map with symmetry, generate the full array. Expand as necessary.
  getFullMap() {
    // Verify items in the cellMap. Unrecognized cells are empty.
    const symmetry = this.props.content.symmetry || 'none';
    const { numPins } = this.props.params;
    let cellMap = this.props.content.cellMap.trim();
    if (cellMap !== '') cellMap = cellMap.split(/[\n]+/);
    else cellMap = [];
    cellMap.forEach((row, i) => {
      cellMap[i] = row.trim().split(/[,\s]+/);
      cellMap[i].forEach((c, j) => {
        if (c === '') cellMap[i][j] = '-';
      });
    });
    let mapSize = numPins;
    const halfPins = Math.ceil(numPins * 0.5);
    if (symmetry === 'oct' || symmetry === 'quad') {
      // mapSize = halfPins * (halfPins + 1) / 2;
      mapSize = halfPins;
    }
    for (let i = 0; i < mapSize; ++i) {
      const rowSize = symmetry === 'oct' ? i + 1 : mapSize;
      if (!cellMap[i]) cellMap[i] = [];
      while (cellMap[i].length < rowSize) {
        cellMap[i].push('-');
      }
      while (cellMap[i].length > rowSize) {
        cellMap[i].pop();
      }
    }

    if (symmetry === 'oct') {
      // rebuild quad map
      for (let j = 0; j < halfPins; ++j) {
        for (let i = j + 1; i < halfPins; ++i) {
          cellMap[j].push(cellMap[i][j]);
        }
      }
    }
    if (symmetry === 'oct' || symmetry === 'quad') {
      // we have the bottom-right - add the bottom-left, as a mirror
      for (let j = 0; j < halfPins; ++j) {
        cellMap[j] = cellMap[j]
          .slice(1)
          .reverse()
          .concat(cellMap[j]);
      }
      // add the top half, mirrored.
      cellMap = cellMap
        .slice(1) // this is a copy, with the duplicate center row dropped.
        .reverse()
        .concat(cellMap);
    }
    // now flatten.
    return cellMap.reduce((p, row) => p.concat(row));
  }

  update3D() {
    updateLookupTables();
    if (this.props.cells.length) {
      const cellNameToIdMap = {};
      this.props.cells.forEach((cell) => {
        if (cell.id !== 'new-000') {
          cellNameToIdMap[cell.label] = cell.id;
        }
      });
      // Verify items in the cellMap. Unrecognized cells are empty.
      const { numPins, pinPitch } = this.props.params;

      this.props.content.cell_map = this.getFullMap();
      if (!this.props.content.cellMap) {
        this.props.content.cellMap = this.getTextMap();
      }
      updateLayoutImage(
        this.props.content,
        cellNameToIdMap,
        this.props.imageSize,
        pinPitch,
        numPins
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
            label="Cell Map"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input.TextArea
              style={{ fontFamily: 'monospace' }}
              value={this.props.content.cellMap}
              rows={Math.min(this.props.params.numPins, 3)}
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
              onChange={this.onFieldUpdate}
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
                  {this.props.cells.map(
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
            return cell;
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
  addNew: PropTypes.func,
  type: PropTypes.string,
  cells: PropTypes.array,
  imageSize: PropTypes.number,
};

AssemblyLayoutEditor.defaultProps = {
  addNew: null,
  type: null,
  // materials: [],
  cells: [],
  imageSize: 512,
};
