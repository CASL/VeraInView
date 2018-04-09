import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input } from 'antd';

// import macro from 'vtk.js/Sources/macro';

import style from '../assets/vera.mcss';

const FormItem = Form.Item;

export default class ParamEditor extends React.Component {
  constructor(props) {
    super(props);

    this.onFieldUpdate = this.onFieldUpdate.bind(this);
  }

  onFieldUpdate(e) {
    const value = e.target.value;
    const id = e.target.dataset.id;
    this.props.params[id] = value;
    this.props.update();
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
            label="Num Pins"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.params.numPins}
              data-id="numPins"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Pin Pitch"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.params.pinPitch}
              data-id="pinPitch"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Core Assemblies"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.params.numAssemblies}
              data-id="numAssemblies"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
          <FormItem
            label="Assembly Spacing"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
          >
            <Input
              value={this.props.params.assemblyPitch}
              data-id="assemblyPitch"
              onChange={this.onFieldUpdate}
            />
          </FormItem>
        </Form>
      </div>
    );
  }
}

ParamEditor.propTypes = {
  params: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
};

ParamEditor.defaultProps = {};
