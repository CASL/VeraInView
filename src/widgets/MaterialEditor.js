import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button } from 'antd';

import macro from 'vtk.js/Sources/macro';

import style from '../assets/vera.mcss';

import Color from './Color';

const FormItem = Form.Item;
const { capitalize } = macro;

let matId = 1;
const TEMPLATE_NEW = {
  label: 'New material',
  density: 1,
  fracs: [1],
  names: [],
  thexp: 1,
};

export default class MaterialEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.onFieldUpdate = this.onFieldUpdate.bind(this);
    this.addNew = this.addNew.bind(this);
  }

  onFieldUpdate(e) {
    const value = e.target.value;
    const id = e.target.dataset.id;
    this.props.content[id] = value;
    this.props.update();
  }

  addNew() {
    if (this.props.addNew) {
      this.props.addNew(
        this.props.type,
        Object.assign({ id: `new-${matId++}` }, TEMPLATE_NEW)
      );
    }
  }

  render() {
    return (
      <div className={style.form}>
        <Button
          shape="circle"
          style={{ position: 'absolute', right: 15, top: 72 }}
          icon="plus"
          size="small"
          onClick={this.addNew}
        />
        <Form layout="horizontal" className={style.form}>
          {Object.keys(this.props.content).map(
            (key) =>
              key === 'id' ? null : (
                <FormItem
                  key={key}
                  label={capitalize(key)}
                  labelCol={{ span: 4 }}
                  wrapperCol={{ span: 20 }}
                >
                  {key === 'color' ? (
                    <Color
                      title=" "
                      border
                      color={this.props.content.color}
                      key={`mat-${this.props.content.label}`}
                    />
                  ) : (
                    <Input
                      value={this.props.content[key]}
                      data-id={key}
                      onChange={this.onFieldUpdate}
                    />
                  )}
                </FormItem>
              )
          )}
        </Form>
      </div>
    );
  }
}

MaterialEditor.propTypes = {
  content: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  addNew: PropTypes.func,
  type: PropTypes.string,
};

MaterialEditor.defaultProps = {
  addNew: null,
  type: null,
};
