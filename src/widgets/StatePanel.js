import React from 'react';
import PropTypes from 'prop-types';

import { Button, Icon, Select, Slider, Switch, Tabs } from 'antd';

import style from '../assets/vera.mcss';
import ColorManager from '../utils/ColorManager';
import units from '../utils/Units';

function setControlRods(controlRods, tagList, rodPos) {
  const keyList = tagList || Object.keys(controlRods);
  keyList.forEach((rod) => {
    controlRods[rod] = Object.assign({}, controlRods[rod], {
      pos: rodPos,
    });
  });
}

export default class StatePanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      controlRods: {},
      currentState: 0,
      currTab: 'values',
    };
    this.colorManager = ColorManager.createColorManager();
    // avoid blue and grey, moderator and zirc/steel
    this.colorManager.setColor('mod', [128 / 255, 177 / 255, 211 / 255, 1]);
    this.colorManager.setColor('zirc2', [217 / 255, 217 / 255, 217 / 255, 1]);
    this.colorManager.setColor('NA', [255 / 255, 255 / 255, 179 / 255, 1]);
    // grab starting control rod pos from props.
    if (props.content.controlRodTags) {
      props.content.controlRodTags.forEach((tag) => {
        this.state.controlRods[tag] = {
          pos: 0,
          viz: true,
          color: this.colorManager.getColor(tag),
        };
      });
    }
    this.onControlRodChange = this.onControlRodChange.bind(this);
    this.onStateChange = this.onStateChange.bind(this);
  }

  componentDidMount() {
    this.onStateChange(this.state.currentState, true);
  }

  componentWillUnmount() {
    if (this.props.onControlRodChange) {
      // send an empty control rod update, so they reset.
      this.props.onControlRodChange({});
    }
  }

  onControlRodChange(newVal, key, rod) {
    const controlRods = Object.assign({}, this.state.controlRods);
    controlRods[rod] = Object.assign({}, controlRods[rod], {
      [key]: newVal,
    });
    this.setState({ controlRods });
    // pass to vtkRenderer, passes them to Pipeline
    if (this.props.onControlRodChange) {
      this.props.onControlRodChange(controlRods);
    }
  }

  onStateChange(stateIndexStr, force = false) {
    const stateIndex = +stateIndexStr;
    const item = this.props.states[stateIndex];
    const lastItem = this.props.states[this.state.currentState];
    const controlRods = Object.assign({}, this.state.controlRods);
    // controlRodPositions holds complete cumulative rod positions for state 0->stateIndex
    Object.keys(item.controlRodPositions).forEach((rod) => {
      // Check the default rod position of the last state, to see if the user
      // moved something. If they did, don't move it automatically.
      if (
        force ||
        lastItem.controlRodPositions[rod].pos === controlRods[rod].pos
      ) {
        controlRods[rod] = Object.assign(
          {},
          controlRods[rod],
          item.controlRodPositions[rod]
        );
      }
    });
    // always set the rod positions specified in the state. Redundant if
    // user isn't moving anything.
    if (item.bank_labels && !force) {
      item.bank_labels.forEach((rod, i) => {
        controlRods[rod] = Object.assign({}, controlRods[rod], {
          pos: item.bank_pos[i],
        });
      });
    }
    if (this.props.onControlRodChange) {
      this.props.onControlRodChange(controlRods);
    }
    // }

    this.setState({ currentState: stateIndex, controlRods });
  }

  setRods(place) {
    const rodPos = place === 'up' ? this.props.content.maxstep : 0;
    const controlRods = Object.assign({}, this.state.controlRods);
    setControlRods(controlRods, null, rodPos);
    this.setState({ controlRods });
    if (this.props.onControlRodChange) {
      this.props.onControlRodChange(controlRods);
    }
  }
  // eslint-disable-next-line react/sort-comp
  resetRods() {
    // Set any control rods in the last state selected.
    this.onStateChange(this.state.currentState, true);
  }

  // get tickmarks for rod group 'rod'
  getMarks(rod) {
    // always a blank tick at zero.
    const result = { 0: '' };
    const item = this.props.states[this.state.currentState];
    if (item.controlRodPositions && item.controlRodPositions[rod]) {
      const val = item.controlRodPositions[rod].pos;
      result[val] = val;
    }
    return result;
  }
  // does the current state change the position of this rod?
  changedRodPos(rod) {
    const item = this.props.states[this.state.currentState];
    if (item.bank_labels) {
      const index = item.bank_labels.findIndex((label) => label === rod);
      if (index !== -1) {
        return true;
      }
    }
    return false;
  }

  render() {
    const a = this.props.states[this.state.currentState];
    if (!a) {
      return null;
    }
    const infoText = Object.keys(a).filter(
      (key) => !(key === 'labelToUse' || key === 'controlRodPositions')
    );
    // const stateName = a.labelToUse;
    infoText.sort();
    let rodsTags = null;
    if (this.state.controlRods) {
      rodsTags = Object.keys(this.state.controlRods);
      rodsTags.sort();
    }
    return (
      <div>
        <div style={{ display: 'flex' }}>
          <Button
            disabled={this.state.currentState === 0}
            onClick={() => {
              this.onStateChange(this.state.currentState - 1);
            }}
          >
            <Icon type="left" />
          </Button>
          <Select
            style={{ flex: 1 }}
            value={`${this.state.currentState}`}
            onSelect={(index) => this.onStateChange(index)}
          >
            {this.props.states.map((state, i) => (
              <Select.Option key={state.labelToUse} value={`${i}`}>
                {`State ${state.labelToUse}`}
              </Select.Option>
            ))}
          </Select>
          <Button
            disabled={this.state.currentState === this.props.states.length - 1}
            onClick={() => {
              this.onStateChange(this.state.currentState + 1);
            }}
          >
            <Icon type="right" />
          </Button>
        </div>
        <Tabs
          defaultActiveKey="values"
          tabBarExtraContent={
            <div className={style.stateButtons}>
              <Button
                shape="circle"
                icon="double-left"
                onClick={() => this.setRods('down')}
              />
              <Button
                shape="circle"
                icon="double-right"
                onClick={() => this.setRods('up')}
              />
            </div>
          }
        >
          <Tabs.TabPane tab="Info" key="values">
            <div className={style.stateValuesLabel}>
              {infoText.map((key) => [
                <label className={style.stateLabel} key={`key${key}`}>
                  {key}
                </label>,
                <div key={`val${key}`}>{`${a[key]} ${units[key] || ''}`}</div>,
              ])}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Controls" key="controls">
            <div className={style.stateValuesControls}>
              {rodsTags.map((rod, i) => [
                <div key={`label${rod}`} className={style.stateControlLabel}>
                  <Switch
                    style={{
                      backgroundColor: this.state.controlRods[rod].viz
                        ? this.colorManager.getColorRGBA(rod)
                        : undefined,
                    }}
                    checkedChildren={rod}
                    unCheckedChildren={rod}
                    checked={this.state.controlRods[rod].viz}
                    onChange={(val) => this.onControlRodChange(val, 'viz', rod)}
                    // style={{ marginLeft: '10px' }}
                  />
                </div>,
                <Slider
                  className={
                    this.changedRodPos(rod) ? style.highlightSlider : undefined
                  }
                  key={`slider${rod}`}
                  style={{ margin: '10px 20px 28px 10px' }}
                  // tipFormatter={null}
                  min={0}
                  max={this.props.content.maxstep}
                  step={1}
                  value={this.state.controlRods[rod].pos}
                  onChange={(val) => this.onControlRodChange(val, 'pos', rod)}
                  marks={Object.assign({ 0: '' }, this.getMarks(rod))}
                  // marks={ i === 0 ? { 0: 0, [this.state.has3D.maxstep]: this.state.has3D.maxstep,
                  //       } : undefined }
                />,
              ])}
            </div>
            <div className={style.controlButtons}>
              <Button
                className={style.controlButton}
                onClick={() => {
                  if (this.props.onControlRodChange) {
                    this.props.onControlRodChange(this.state.controlRods);
                  }
                }}
              >
                Apply group color
              </Button>
              <Button
                className={style.controlButton}
                onClick={() => this.resetRods()}
              >
                Reset to state positions
              </Button>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>
    );
  }
}

StatePanel.propTypes = {
  content: PropTypes.object,
  // controlRods: PropTypes.object,
  onControlRodChange: PropTypes.func,
  states: PropTypes.array,
};

StatePanel.defaultProps = {
  content: null,
  // controlRods: null,
  onControlRodChange: null,
  states: null,
};
