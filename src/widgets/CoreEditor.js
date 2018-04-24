import React from 'react';
import PropTypes from 'prop-types';
// import ReactCursorPosition from 'react-cursor-position';

import { Form, Input, Slider } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import DualRenderer from './DualRenderer';
import ImageGenerator from '../utils/ImageGenerator';
import ModelHelper from '../utils/ModelHelper';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;

// const TYPES = ['fuel', 'other'];
const { compute3DCore, updateLookupTables } = ImageGenerator;
const { extractCoremapElevations, extractCoreElevations } = ModelHelper;

export default class CoreEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      use3D: true,
      rendering: {},
      elevations: [],
      currElevation: -1,
    };

    this.onElevationChange = this.onElevationChange.bind(this);
    this.onFieldUpdate = this.onFieldUpdate.bind(this);
    this.update3D = this.update3D.bind(this);
    this.formatter = this.formatter.bind(this);
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
    // this.update3D();
  }

  onElevationChange(value) {
    const content =
      value === -1
        ? this.props.content.stack
        : this.props.content[this.state.elevations[value]];
    this.setState({
      rendering: content.has3D,
      currElevation: value,
    });
  }

  getCore() {
    const { params, coremaps } = this.props;
    const core = {
      core_size: params.numAssemblies,
      apitch: params.assemblyPitch,
      assm_map: coremaps.reduce(
        (prev, m) => (m.group === 'assemblies' ? m.cell_map : prev),
        null
      ),
      crd_map: coremaps.reduce(
        (prev, m) => (m.group === 'controls' ? m.cell_map : prev),
        null
      ),
      det_map: coremaps.reduce(
        (prev, m) => (m.group === 'detectors' ? m.cell_map : prev),
        null
      ),
      insert_map: coremaps.reduce(
        (prev, m) => (m.group === 'inserts' ? m.cell_map : prev),
        null
      ),
      height:
        this.state.elevations[this.state.elevations.length - 1] -
        this.state.elevations[0],
    };
    return core;
  }

  update3D() {
    updateLookupTables();
    const coreModel = this.getCore();
    compute3DCore(
      this.props.content.stack,
      coreModel,
      6,
      this.props.params.pinPitch * 0.5
    );
    const elevations = extractCoremapElevations(this.props.assemblies);
    extractCoreElevations(this.props.content, elevations, coreModel);

    // this.props.content.has3D.source.forceUpdate = true;
    const content =
      this.state.currElevation === -1
        ? this.props.content.stack
        : this.props.content[elevations[this.state.currElevation]];
    this.setState({
      rendering: content.has3D,
      elevations,
    });
  }

  formatter(val) {
    if (val === -1) return 'Full stack';
    return `${this.state.elevations[val]} - ${this.state.elevations[val + 1]}`;
  }

  render() {
    // HACK if slider is at -1, render full stack, otherwise elevation slice.
    const drContent =
      this.state.currElevation === -1
        ? this.props.content.stack
        : this.props.content[this.state.elevations[this.state.currElevation]];
    return (
      <div className={style.form}>
        <Form
          layout="horizontal"
          className={style.form}
          style={{ paddingBottom: 25 }}
        >
          <FormItem
            label="Title"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.content.title}
              data-id="title"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Elevation"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Slider
              style={{ width: '200px', marginRight: '20px' }}
              tipFormatter={this.formatter}
              min={-1}
              max={this.state.elevations.length - 2}
              step={1}
              value={this.state.currElevation}
              onChange={this.onElevationChange}
            />
          </FormItem>
        </Form>
        <DualRenderer
          content={drContent}
          rendering={this.state.rendering}
          getImageInfo={(posx, posy) => null}
        />
      </div>
    );
  }
}

CoreEditor.propTypes = {
  content: PropTypes.object.isRequired,
  // core: PropTypes.object.isRequired,
  assemblies: PropTypes.array.isRequired,
  coremaps: PropTypes.array.isRequired,
  update: PropTypes.func.isRequired,
  params: PropTypes.object.isRequired,
  // imageSize: PropTypes.number,
};

CoreEditor.defaultProps = {
  // imageSize: 512,
};
