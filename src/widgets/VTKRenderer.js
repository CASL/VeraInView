import macro from 'vtk.js/Sources/macro';
import React from 'react';
import PropTypes from 'prop-types';

import vtkURLExtract from 'vtk.js/Sources/Common/Core/URLExtract';

import { Slider, Button, Switch, Icon, Menu, Dropdown } from 'antd';

import StatePanel from './StatePanel';

import style from '../assets/vera.mcss';
import vtkPipelineManager from '../utils/PipelineManager';

const userParams = vtkURLExtract.extractURLParameters();
const EXPORT = !!userParams.export;

const SCALING_MARKS = {
  0.25: '1/4',
  0.5: '1/2',
  0.75: '3/4',
  1: '1',
};

export default class VTKRenderer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      parallelRendering: false,
      zScaling: 1,
      isFullSize: props.content.type !== 'core',
      capture: null,
      isVR: false,
      statesOn: false,
      isVRSupported: !!navigator.getVRDisplays,
      actorVisibilityByName: { Plate: false },
      // controlRods: {},
    };
    // grab starting control rod pos from props.
    // if (props.content.controlRodTags) {
    //   if (props.controlRods) {
    //     this.state.controlRods = Object.assign(
    //       this.state.controlRods,
    //       props.controlRods
    //     );
    //   } else {
    //     // set defaults, position 0 is fully inserted
    //     setControlRods(this.state.controlRods, props.content.controlRodTags, 0);
    //   }
    // }

    this.pipeline = vtkPipelineManager.newInstance();

    // Functions for callback
    this.onControlRodChange = macro.throttle(
      this.onControlRodChange.bind(this),
      100
    );
    this.onScaleChange = macro.throttle(this.onScaleChange.bind(this), 100);
    this.toggleImage = this.toggleImage.bind(this);
    this.toggleLOD = this.toggleLOD.bind(this);
    this.toggleParallelRendering = this.toggleParallelRendering.bind(this);
    this.toggleVR = this.toggleVR.bind(this);
    this.updateVRResolution = this.updateVRResolution.bind(this);
    this.resize = macro.throttle(this.pipeline.resize, 100);
  }

  componentDidMount() {
    this.pipeline.setContainer(this.container);
    this.pipeline.update(
      this.props.content,
      !this.state.isFullSize,
      this.state.actorVisibilityByName,
      this.props.mask
      // this.state.controlRods
    );
    this.pipeline.resetCamera();
    this.pipeline.resize();
    window.addEventListener('resize', this.resize);

    // Force a second render to flush actorVisibility switch
    this.forceUpdate();
  }

  componentWillReceiveProps(nextProps) {
    // let controlRods = {};
    // // if this comes from a state block, update the current control rods
    // if (nextProps.controlRods) {
    //   controlRods = Object.assign({}, nextProps.controlRods);
    // } else if (nextProps.content.controlRodTags) {
    //   // null controlRods means a reset - not a State transition:
    //   nextProps.content.controlRodTags.forEach((tag) => {
    //     controlRods[tag] = 0;
    //   });
    // }
    // console.log('vtkRenderer', nextProps.controlRods, controlRods);
    this.setState(
      this.pipeline.update(
        nextProps.content,
        !this.state.isFullSize,
        this.state.actorVisibilityByName,
        nextProps.mask
        // controlRods
      )
    );
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
    this.pipeline.resetPipeline();
    this.pipeline.setContainer(null);
    this.pipeline.delete();
  }

  onScaleChange(zScaling) {
    this.setState({ zScaling });
    this.pipeline.setZScale(zScaling);
  }

  onControlRodChange(controlRods) {
    // StatePanel tells us what control rods to render.
    this.pipeline.update(
      this.props.content,
      !this.state.isFullSize,
      this.state.actorVisibilityByName,
      this.props.mask,
      controlRods
    );
  }

  toggleImage(needCapture) {
    if (needCapture) {
      const capture = this.pipeline.captureImage();
      this.setState({ capture });
    } else {
      this.setState({ capture: null });
    }
  }

  toggleParallelRendering(parallelRendering) {
    this.setState({ parallelRendering });
    this.pipeline.setParallelRendering(parallelRendering);
  }

  toggleLOD(isFullSize) {
    this.setState({ isFullSize });
    this.pipeline.render(!isFullSize);
  }

  toggleVR(isVR) {
    this.setState({ isVR });
    if (isVR) {
      this.pipeline.enableVR();
    } else {
      this.pipeline.disableVR();
    }
  }

  updateVRResolution({ key }) {
    switch (Number(key)) {
      case 1:
        this.pipeline.updateVRSettings([2160, 1200], true);
        break;
      case 2:
        this.pipeline.updateVRSettings([1080, 600], false);
        break;
      case 4:
        this.pipeline.updateVRSettings([540, 300], false);
        break;
      case 0:
        this.pipeline.updateVRSettings(this.pipeline.getSize(), false);
        break;
      default:
        this.pipeline.updateVRSettings(this.pipeline.getSize(), false);
        break;
    }
  }

  render() {
    this.pipeline.updateMonitor();
    const addOn = [];
    const toggleActors = this.pipeline.getToggleActors();
    if (toggleActors) {
      const list = ['Grid', 'Baffle', 'Vessel', 'Plate'];
      let count = list.length;
      while (count--) {
        const actorName = list[count];
        // one special case - Plate displayed only with full-stack
        // i.e. when there's not a 'slice'
        if (
          toggleActors[actorName] &&
          !(actorName === 'Plate' && this.props.content.slice)
        ) {
          const currentVisibility = Array.isArray(toggleActors[actorName])
            ? toggleActors[actorName][0].getVisibility()
            : toggleActors[actorName].getVisibility();
          addOn.push(
            <Switch
              key={actorName}
              className={style.leftSpacer}
              checkedChildren={actorName}
              unCheckedChildren={actorName}
              checked={currentVisibility}
              onChange={() => {
                const visibility = !currentVisibility;
                if (Array.isArray(toggleActors[actorName])) {
                  let aCount = toggleActors[actorName].length;
                  while (aCount--) {
                    toggleActors[actorName][aCount].setVisibility(visibility);
                  }
                } else {
                  toggleActors[actorName].setVisibility(visibility);
                }
                this.pipeline.render(!this.state.isFullSize);
                const { actorVisibilityByName } = this.state;
                actorVisibilityByName[actorName] = visibility;
                this.setState({ actorVisibilityByName });
              }}
            />
          );
        }
      }
    }
    return (
      <div
        className={this.props.nested ? style.vtkNested : style.vtkRootContainer}
      >
        <div className={style.vtkToolBar}>
          <div className={style.vtkToolBarSection}>
            <Switch
              checkedChildren="Full"
              unCheckedChildren="LOD"
              checked={this.state.isFullSize}
              onChange={this.toggleLOD}
              style={{ width: '57px' }}
            />
            {this.props.content.stroke &&
              !this.props.content.slice && (
                <Switch
                  className={style.leftSpacer}
                  checkedChildren="States"
                  unCheckedChildren="States"
                  checked={this.state.statesOn}
                  onChange={(statesOn) => this.setState({ statesOn })}
                />
              )}
            {this.state.isVRSupported ? (
              <Switch
                key="vr-switch"
                className={style.leftSpacer}
                checkedChildren="VR"
                unCheckedChildren="VR"
                checked={this.state.isVR}
                onChange={this.toggleVR}
              />
            ) : null}
            {this.state.isVRSupported && !this.state.isVR ? (
              <div className={style.zoomButtons}>
                <Dropdown
                  overlay={
                    <Menu onClick={this.updateVRResolution}>
                      <Menu.Item key="0">Laptop Screen</Menu.Item>
                      <Menu.Item key="4">1/4 Headset Resolution</Menu.Item>
                      <Menu.Item key="2">1/2 Headset Resolution</Menu.Item>
                      <Menu.Item key="1">1 Headset Resolution</Menu.Item>
                    </Menu>
                  }
                >
                  <Button shape="circle" size="small" icon="safety" />
                </Dropdown>
              </div>
            ) : null}
            {this.state.isVRSupported && this.state.isVR ? (
              <div className={style.zoomButtons}>
                <Button
                  shape="circle"
                  size="small"
                  icon="plus"
                  onClick={this.pipeline.increasePhysicalScale}
                />
                <Button
                  shape="circle"
                  size="small"
                  icon="minus"
                  onClick={this.pipeline.decreasePhysicalScale}
                />
              </div>
            ) : null}
          </div>
          <div className={style.vtkToolBarSection}>{addOn}</div>
          <div className={style.vtkToolBarSection}>
            <Switch
              checkedChildren={<Icon type="appstore-o" />}
              unCheckedChildren={<Icon type="windows-o" />}
              checked={this.state.parallelRendering}
              onChange={this.toggleParallelRendering}
            />
            <div className={style.leftSpacer} style={{ marginRight: '10px' }}>
              <Switch
                className={style.warningSwitch}
                checkedChildren={<Icon type="lock" />}
                unCheckedChildren={<Icon type="unlock" />}
                checked={!!this.state.capture}
                onChange={this.toggleImage}
              />
            </div>
            <div className={style.leftSpacer}>
              <Slider
                style={{ width: '200px', marginRight: '20px' }}
                tipFormatter={null}
                min={0.01}
                max={1.0}
                step={0.01}
                value={this.state.zScaling}
                onChange={this.onScaleChange}
                marks={SCALING_MARKS}
              />
            </div>
            <div className={style.leftSpacer}>
              <Button icon="scan" onClick={this.pipeline.resetCamera} />
            </div>
            {EXPORT ? (
              <div className={style.leftSpacer}>
                <Button
                  icon="file-add"
                  onClick={this.pipeline.downloadExport}
                />
              </div>
            ) : null}
          </div>
        </div>
        {this.state.capture && (
          <img
            alt="Screen capture"
            className={style.vtkRenderer}
            src={this.state.capture}
          />
        )}
        <div
          className={style.vtkRenderer}
          ref={(c) => {
            this.container = c;
          }}
          style={{ display: this.state.capture ? 'none' : 'block' }}
        />
        {this.props.content.stroke &&
          !this.props.content.slice &&
          this.state.statesOn && (
            <div className={style.statesPanel}>
              <StatePanel
                states={this.props.states}
                content={this.props.content || null}
                // controlRods={this.props.controlRods}
                onControlRodChange={this.onControlRodChange}
              />
            </div>
          )}
      </div>
    );
  }
}

VTKRenderer.propTypes = {
  content: PropTypes.object,
  mask: PropTypes.object,
  states: PropTypes.array,
  nested: PropTypes.bool,
  // controlRods: PropTypes.object,
  // onControlRodChange: PropTypes.func,
};

VTKRenderer.defaultProps = {
  content: null,
  mask: {},
  states: [],
  nested: false,
  // controlRods: null,
  // onControlRodChange: null,
};
