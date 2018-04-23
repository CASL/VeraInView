import React from 'react';
import PropTypes from 'prop-types';
// import ReactCursorPosition from 'react-cursor-position';

import { Form, Input } from 'antd';

// import macro from 'vtk.js/Sources/macro';
import DualRenderer from './DualRenderer';
import ImageGenerator from '../utils/ImageGenerator';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;

// const TYPES = ['fuel', 'other'];
const { compute3DCore, updateLookupTables } = ImageGenerator;

export default class CoreEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      use3D: true,
      rendering: {},
    };

    this.onFieldUpdate = this.onFieldUpdate.bind(this);
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

  update3D() {
    updateLookupTables();
    compute3DCore(
      this.props.content,
      null,
      6,
      this.props.params.pinPitch * 0.5,
      this.props.params,
      this.props.coremaps
    );
    // this.props.content.has3D.source.forceUpdate = true;
    this.setState({
      rendering: this.props.content.has3D,
    });
  }

  render() {
    return (
      <div className={style.form}>
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
        </Form>
        <DualRenderer
          content={this.props.content}
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
  coremaps: PropTypes.array.isRequired,
  update: PropTypes.func.isRequired,
  params: PropTypes.object.isRequired,
  // imageSize: PropTypes.number,
};

CoreEditor.defaultProps = {
  // imageSize: 512,
};
