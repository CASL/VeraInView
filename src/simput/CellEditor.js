import React from 'react';
import PropTypes from 'prop-types';

export default class CellEditor extends React.Component {
  constructor(props) {
    super(props);

    this.onChange = this.onChange.bind(this);
  }
  onChange() {
    console.log(this.props);
  }

  render() {
    return <div onClick={this.onChange}>Cell editor {this.props.data}</div>;
  }
}

CellEditor.propTypes = {
  data: PropTypes.object.isRequired,
  // help: PropTypes.string,
  // name: PropTypes.string,
  // onChange: PropTypes.func.isRequired,
  // show: PropTypes.func.isRequired,
  // ui: PropTypes.object.isRequired,
  // viewData: PropTypes.object.isRequired,
};

CellEditor.defaultProps = {
  // name: '',
  // help: '',
};
