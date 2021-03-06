import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button, Select, Row, Col } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import VTKRenderer from './VTKRenderer';
import ImageGenerator from '../utils/ImageGenerator';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;
const Option = Select.Option;

let cellId = 1;

const {
  // materialColorManager,
  // materialLookupTable,
  updateItemWithLayoutImages,
  updateLookupTables,
} = ImageGenerator;

export default class AssemblyEditor extends React.Component {
  static createNew(item) {
    const newAssembly = Object.assign({}, item, {
      id: `new-${cellId++}`,
    });
    newAssembly.axial_elevations = newAssembly.axial_elevations.map((s) =>
      Number(s)
    );
    newAssembly.layout = newAssembly.layout.slice(); // clone
    newAssembly.axial_labels = newAssembly.axial_labels.slice(); // clone
    newAssembly.labelToUse = newAssembly.label;
    delete newAssembly.has3D;
    delete newAssembly.image;
    delete newAssembly.imageSrc;
    return newAssembly;
  }

  constructor(props) {
    super(props);
    this.state = {
      rendering: null,
    };

    this.onFieldUpdate = this.onFieldUpdate.bind(this);
    this.addNew = this.addNew.bind(this);
    this.onElevationUpdate = this.onElevationUpdate.bind(this);
    this.onLayoutUpdate = this.onLayoutUpdate.bind(this);
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

  onElevationUpdate(e) {
    const elevations = e.target.value
      .split(',')
      .filter((s) => s.length)
      .map((s) => s.trim())
      .map((s) => Number(s));
    const numMaps = Math.max(0, elevations.length - 1);
    const axialLabels = [].concat(this.props.content.axial_labels);
    while (axialLabels.length < numMaps) {
      axialLabels.push(this.props.assemblyLayouts[0].label);
    }
    while (axialLabels.length > numMaps) {
      axialLabels.pop();
    }
    this.props.content.axial_elevations = elevations;
    this.props.content.axial_labels = axialLabels;
    this.props.content.layout = this.props.assemblyLayouts;
    // .filter((m) => m.id !== 'new-000');
    this.props.content.Cells = this.props.cells;
    this.props.update();
    this.update3D();
  }

  onLayoutUpdate(value) {
    const [idx, label] = value.split('::');
    this.props.content.axial_labels[Number(idx)] = label;
    this.props.update();
    this.update3D();
  }

  // eslint-disable-next-line class-methods-use-this
  update3D() {
    updateLookupTables();
    if (!this.props.content.Cells) this.props.content.Cells = this.props.cells;

    if (this.props.content.axial_labels.length) {
      updateItemWithLayoutImages(
        'ASSEMBLIES',
        this.props.content,
        {},
        this.props.imageSize
      );
      this.setState({
        rendering: this.props.content.stack.has3D,
      });
    } else {
      this.setState({
        rendering: null,
      });
    }
  }

  addNew() {
    if (this.props.addNew) {
      const newAssembly = AssemblyEditor.createNew(this.props.content);
      this.props.addNew(this.props.type, newAssembly);
    }
  }

  render() {
    return (
      <div className={style.form}>
        <Button
          shape="circle"
          style={{ position: 'absolute', right: 15, top: 68 }}
          icon="delete"
          onClick={this.props.remove}
        />
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
            label="Elevations"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              defaultValue={this.props.content.axial_elevations}
              data-id="elevations"
              onChange={this.onElevationUpdate}
            />
          </FormItem>
          <FormItem
            label="Maps"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Row>
              {this.props.content.axial_labels.map((ax, idx) => (
                <Col span={3} key={`layout-${idx.toString(16)}`}>
                  <Select value={ax} showSearch onChange={this.onLayoutUpdate}>
                    {this.props.assemblyLayouts
                      .filter(
                        (layout) => layout.group === this.props.content.group
                      )
                      .map(
                        (layout) =>
                          layout.id === 'new-000' ? null : (
                            <Option
                              key={layout.id}
                              value={`${idx}::${layout.label}`}
                            >
                              {layout.label}
                            </Option>
                          )
                      )}
                  </Select>
                </Col>
              ))}
            </Row>
          </FormItem>
        </Form>
        <div className={style.preview}>
          {this.state.rendering && (
            <VTKRenderer
              nested
              content={this.state.rendering}
              mask={this.props.mask}
            />
          )}
        </div>
      </div>
    );
  }
}

AssemblyEditor.propTypes = {
  content: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  addNew: PropTypes.func,
  type: PropTypes.string,
  assemblyLayouts: PropTypes.array,
  cells: PropTypes.array,
  mask: PropTypes.object,
  imageSize: PropTypes.number,
};

AssemblyEditor.defaultProps = {
  addNew: null,
  type: null,
  assemblyLayouts: [],
  cells: [],
  mask: {},
  imageSize: 512,
};
