import React from 'react';
import PropTypes from 'prop-types';

import { Form, Input, Button } from 'antd';

import macro from 'vtk.js/Sources/macro';
import ImageGenerator from '../utils/ImageGenerator';

import style from '../assets/vera.mcss';

import Color from './Color';

const { materialColorManager } = ImageGenerator;

const FormItem = Form.Item;
const { capitalize } = macro;

let matId = 1;
const TEMPLATE_NEW = {
  label: 'New material',
  color: null,
  density: 1,
  fracs: [1],
  names: [],
  thexp: 1,
};

function compareFunc(a, b) {
  if (a === 'label') return -1;
  if (b === 'label') return 1;
  return a.localeCompare(b);
}

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
    const { label } = this.props.content;
    return (
      <div className={style.form}>
        <Button
          type="primary"
          shape="circle"
          style={{ position: 'absolute', right: 15, top: 68 }}
          icon="plus"
          onClick={this.addNew}
        />
        <Form layout="horizontal" className={style.form}>
          {Object.keys(this.props.content)
            .sort(compareFunc)
            .map(
              (key) =>
                key === 'id' || key === 'name' ? null : (
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
                        color={
                          materialColorManager.hasName(label)
                            ? materialColorManager.getColorRGBA(label)
                            : this.props.content.color
                        }
                        key={`mat-${label}`}
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
