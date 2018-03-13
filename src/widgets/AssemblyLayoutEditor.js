import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button, Select, Row, Col, Switch } from 'antd';

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
    const id = e.target.dataset.id;
    this.props.content[id] = value;
    if (id === 'label' && this.props.content.id !== 'new-000') {
      this.props.content.labelToUse = value;
    }
    this.props.update();
    this.update3D();
  }

  on2DClick(posx, posy, e) {
    const { cell, index } = ImageGenerator.getLayoutCell(
      this.props.content,
      posx,
      posy
    );
    if (!cell) return;
    if (this.state.replaceAll) {
      this.props.content.cell_map.forEach((mapCell, i) => {
        if (cell === mapCell) {
          this.props.content.cell_map[i] = this.state.paintCell;
        }
      });
    } else {
      this.props.content.cell_map[index] = this.state.paintCell;
    }
    const map = [];
    const { numPins, cell_map: cellMap } = this.props.content;
    for (let i = 0; i < numPins; ++i) {
      map.push(cellMap.slice(i * numPins, (i + 1) * numPins).join(' '));
    }
    this.props.content.cellMap = map.join('\n');
    this.props.update();
    this.update3D();
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
      const cellMap = this.props.content.cellMap.trim().split(/[,\s]+/);
      const fullMapSize =
        +this.props.content.numPins * +this.props.content.numPins;

      while (cellMap.length < fullMapSize) {
        cellMap.push('-');
      }
      while (cellMap.length > fullMapSize) {
        cellMap.pop();
      }
      cellMap.forEach((c, i) => {
        if (c === '') cellMap[i] = '-';
      });

      this.props.content.cell_map = cellMap;
      updateLayoutImage(
        this.props.content,
        cellNameToIdMap,
        this.props.imageSize,
        this.props.content.pinPitch,
        this.props.content.numPins
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
      const newLayout = Object.assign({}, this.props.content, {
        id: `new-${layoutId++}`,
      });
      newLayout.cell_map = newLayout.cell_map.slice(); // clone
      newLayout.labelToUse = newLayout.label;
      delete newLayout.has3D;
      delete newLayout.image;
      delete newLayout.imageSrc;

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
              rows={Math.min(this.props.content.numPins, 3)}
              data-id="cellMap"
              onChange={this.onFieldUpdate}
            />
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
