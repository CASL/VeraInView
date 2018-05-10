import React from 'react';
import PropTypes from 'prop-types';

import style from './VisibilityToolbar.mcss';

export default class VisibilityToolbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dropdownVisible: false,
    };

    this.containerEl = null;

    this.toggleDropdown = this.toggleDropdown.bind(this);
    this.onDocMouseDown = this.onDocMouseDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.onDocMouseDown, true);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onDocMouseDown, true);
  }

  onDocMouseDown(ev) {
    if (!this.containerEl.contains(ev.target)) {
      this.setState({ dropdownVisible: false });
    }
  }

  setVisibility(id, visible) {
    if (this.props.viewer) {
      this.props.viewer.setObjectVisibility(id, visible);
      this.props.viewer.applyVisibility();
      this.forceUpdate();
    }
  }

  toggleDropdown(ev) {
    this.setState(({ dropdownVisible }) => ({
      dropdownVisible: !dropdownVisible,
    }));
  }

  render() {
    const menuClasses = this.state.dropdownVisible
      ? style.menu
      : style.hiddenMenu;

    let list = [];
    if (this.state.dropdownVisible && this.props.viewer) {
      list = this.props.viewer
        .getVisibiltyOptions()
        .filter(({ type }) => !type || type === this.props.type)
        .map(({ id, label }) => {
          const visible = this.props.viewer.getObjectVisibility(id);
          return (
            <div
              key={id}
              className={style.menuItem}
              onClick={(ev) => this.setVisibility(id, !visible)}
            >
              <input type="checkbox" checked={visible} readOnly /> {label}
            </div>
          );
        });
    }

    return (
      <div
        className={style.container}
        ref={(r) => {
          this.containerEl = r;
        }}
      >
        <div
          onClick={this.toggleDropdown}
          className={this.state.dropdownVisible ? style.box : style.disableBox}
        >
          {this.props.title}
        </div>
        <div className={menuClasses}>{list}</div>
      </div>
    );
  }
}

VisibilityToolbar.propTypes = {
  title: PropTypes.string,
  viewer: PropTypes.object,
  type: PropTypes.string,
};

VisibilityToolbar.defaultProps = {
  title: 'Visibility List',
  viewer: null,
  type: '',
};
