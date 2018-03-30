import 'antd/dist/antd.css';

import React from 'react';
import PropTypes from 'prop-types';
import ReactCursorPosition from 'react-cursor-position';

import { Breadcrumb, Icon, Layout, Menu, message, Switch, Upload } from 'antd';

import macro from 'vtk.js/Sources/macro';

import Color from './widgets/Color';
import ImageRenderer from './widgets/ImageRenderer';
import VTKRenderer from './widgets/VTKRenderer';
import ModelHelper from './utils/ModelHelper';
import ImageGenerator from './utils/ImageGenerator';

import style from './assets/vera.mcss';
import welcome from './assets/welcome.jpg';

const { SubMenu } = Menu;
const { Header, Content, Sider } = Layout;
const { capitalize } = macro;

ImageGenerator.setLogger(message.info);

export default class MainView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      title: '',
      materials: [],
      cells: [],
      assemblies: [],
      controls: [],
      detectors: [],
      inserts: [],
      states: [],
      content: null,
      path: ['Home'],
      elevations: [],
      mask: {},
      core: {},
      has3D: false,
      use3D: false,
      showMenu: true,
    };

    // Toggle mask callback handler
    this.toggleMaskFn = {};

    // Functions for callback
    this.parseFile = this.parseFile.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.getSelectionByKey = this.getSelectionByKey.bind(this);
    this.getImageInfo = this.getImageInfo.bind(this);
    this.updateImageIndex = this.updateImageIndex.bind(this);
    this.onToggle3D = this.onToggle3D.bind(this);
    this.onToggleMenu = this.onToggleMenu.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  onSelect(options) {
    const { item, path } = this.getSelectionByKey(options.key);
    if (item && item.imageSrc) {
      this.setState({
        content: item.imageSrc,
        legend: item.legend,
        path,
        has3D: item.has3D,
        lastKey: options.key,
      });
    } else if (item && item.has3D) {
      this.setState({
        content: null,
        legend: item.legend,
        path,
        has3D: item.has3D,
        use3D: true,
        lastKey: options.key,
      });
    } else if (item && item.label.startsWith('State_')) {
      // Display 3D stack
      const { item: coreItem, path: corePath } = this.getSelectionByKey(
        'core:stack'
      );
      if (coreItem && coreItem.has3D) {
        // state block that sets position of control rods
        const controlRods = {};
        if (coreItem.has3D.controlRodTags) {
          // set defaults, position 0 is fully inserted
          // setControlRods(controlRods, coreItem.has3D.controlRodTags, 0);
          // copy current state over defaults.
          Object.assign(controlRods, this.state.controlRods);
        }

        if (item.bank_labels) {
          item.bank_labels.forEach((label, i) => {
            controlRods[label] = item.bank_pos[i];
          });
        }
        this.setState({
          content: null,
          legend: coreItem.legend,
          corePath,
          has3D: coreItem.has3D,
          use3D: true,
          controlRods,
          lastKey: options.key,
        });
      }
    } else {
      this.setState({
        content: null,
        path: ['Home'],
        has3D: false,
        lastKey: options.key,
      });
    }
  }

  onToggle3D(use3D) {
    this.setState({ use3D });
  }

  onToggleMenu() {
    const showMenu = !this.state.showMenu;
    this.setState({ showMenu });
    setTimeout(() => {
      if (this.renderer) {
        this.renderer.resize();
      }
    }, 0);
    setTimeout(() => {
      if (this.renderer) {
        this.renderer.resize();
      }
    }, 100);
  }

  getSelectionByKey(keyPath) {
    const tokens = keyPath.split(':');
    const path = [capitalize(tokens[0])];
    let index = 0;
    let container = this.state[tokens[index++]];
    while (container && index < tokens.length) {
      // Find object with label
      const name = tokens[index++];
      if (Array.isArray(container)) {
        container =
          container.find((item) => item.id === name) ||
          container.find((item) => item.label === name);
        if (container && container.labelToUse) {
          path.push(container.labelToUse);
        } else {
          path.push(name);
        }
      } else {
        container = container[name];
        if (container && container.labelToUse) {
          path.push(container.labelToUse);
        }
      }
    }
    return { item: container, path };
  }

  // get info about what mouse is over in 2D view.
  getImageInfo(posx, posy) {
    if (!this.state.lastKey) {
      return null;
    }
    const { item } = this.getSelectionByKey(this.state.lastKey);
    if (this.state.has3D && this.state.has3D.type === 'layout') {
      const { cell } = ImageGenerator.getLayoutCell(item, posx, posy);
      return cell;
    }
    if (this.state.has3D && this.state.has3D.type === 'cell') {
      const mat = ImageGenerator.getCellMaterial(item, posx, posy);
      return mat ? (
        <span>
          {mat.radius} cm <br /> {mat.mat}
        </span>
      ) : null;
    }
    return null;
  }

  handleKeyPress(event) {
    if (event.key === 'm') {
      this.onToggleMenu();
    }
  }

  updateImageIndex(imageIndex) {
    this.setState({ imageIndex });
  }

  parseFile(file) {
    this.setState({ title: file.name, file });
    ModelHelper.parseFile(file, this.props.imageSize, (newState) => {
      // Ensure material callbacks exists
      if (newState.materials) {
        let count = newState.materials.length;
        while (count--) {
          const mat = newState.materials[count];
          this.toggleMaskFn[mat.id] = (check) => {
            const { mask } = this.state;
            mask[mat.id] = !check;
            this.setState({ mask });
          };
        }
      }
      this.setState(newState);
    });
    return false;
  }

  render() {
    const contents = [];
    const menuSize = 240;

    if (!this.state.file) {
      contents.push(
        <Upload
          accept="xml"
          key="welcome"
          className={style.uploadWelcomeContent}
          showUploadList={false}
          beforeUpload={this.parseFile}
        >
          <div className={style.welcome}>
            <div className={style.welcomeTitle}>VERAin</div>
            <img alt="Welcome" src={welcome} className={style.welcomeImage} />
          </div>
        </Upload>
      );
    }

    if (this.state.content && !(this.state.use3D && this.state.has3D)) {
      contents.push(
        <div key="2d-content" className={style.mainImage}>
          <ReactCursorPosition>
            <ImageRenderer
              content={this.state.content}
              getImageInfo={this.getImageInfo}
            />
          </ReactCursorPosition>
        </div>
      );
    }

    if (
      this.state.legend &&
      this.state.content &&
      !(this.state.use3D && this.state.has3D)
    ) {
      contents.push(
        <div key="2d-legend" className={style.legendContainer}>
          {this.state.legend.map((m) => (
            <Color
              className={style.legend}
              key={`core-${m.title}`}
              title={m.title}
              color={m.color}
              border
            />
          ))}
        </div>
      );
    }

    if (this.state.has3D && this.state.content) {
      contents.push(
        <Switch
          key="toggle-3d"
          style={{ position: 'absolute', right: '10px', top: '72px' }}
          checkedChildren="3D"
          unCheckedChildren="2D"
          onChange={this.onToggle3D}
          checked={this.state.use3D}
        />
      );
    }

    if (this.state.has3D && this.state.use3D) {
      contents.push(
        <VTKRenderer
          ref={(c) => {
            this.renderer = c;
          }}
          key="3d-renderer"
          content={this.state.has3D}
          mask={this.state.mask}
          states={this.state.states}
          // controlRods={this.state.controlRods}
          // onControlRodChange={this.onControlRodChange}
        />
      );
    }

    if (contents.length === 0) {
      contents.push(
        <div className={style.welcome} key="welcome-img">
          <div className={style.welcomeTitle}>VERAin</div>
          <img alt="Welcome" src={welcome} className={style.welcomeImage} />
        </div>
      );
    }

    return (
      <Layout>
        <Header className={style.header}>
          <div
            role="button"
            tabIndex={0}
            className={style.logo}
            onClick={this.onToggleMenu}
            onKeyPress={this.handleKeyPress}
          />
          <div className={style.title}>{this.state.title}</div>
          {this.state.file ? null : (
            <Upload
              accept="xml"
              className={style.fileLoader}
              showUploadList={false}
              beforeUpload={this.parseFile}
            >
              <Icon type="plus" className={style.fileLoaderTrigger} />
            </Upload>
          )}
        </Header>
        <Layout>
          <Sider
            width={this.state.showMenu ? menuSize : 0}
            className={style.sideBar}
          >
            <Menu
              theme="dark"
              mode="inline"
              style={{ height: '100%', borderRight: 0 }}
              defaultOpenKeys={[]}
              onSelect={this.onSelect}
              onOpenChange={this.onOpenChange}
            >
              <SubMenu
                key="core"
                title={
                  <span>
                    <Icon type="global" />Core
                  </span>
                }
              >
                <Menu.Item key="core:stack">
                  <span className={style.itemWithIcon}>
                    <Icon type="check-square-o" />3D Stack
                  </span>
                </Menu.Item>
                {this.state.elevations.map(
                  (e, idx) =>
                    idx + 1 < this.state.elevations.length ? (
                      <Menu.Item key={`core:${e}`}>
                        {this.state.core[e] ? (
                          <span className={style.itemWithImage}>
                            <img alt="" src={this.state.core[e].imageSrc} />
                            {`${e} to ${this.state.elevations[idx + 1]}`}
                          </span>
                        ) : (
                          `${e} to ${this.state.elevations[idx + 1]}`
                        )}
                      </Menu.Item>
                    ) : null
                )}
              </SubMenu>
              <SubMenu
                key="assemblies"
                title={
                  <span>
                    <Icon type="appstore-o" />Assemblies
                  </span>
                }
              >
                {this.state.assemblies.map((a) => (
                  <SubMenu
                    key={`assemblies:${a.label}`}
                    title={a.label}
                    selectable
                  >
                    <Menu.Item key={`assemblies:${a.label}:stack`}>
                      <span className={style.itemWithIcon}>
                        <Icon type="check-square-o" />3D Stack
                      </span>
                    </Menu.Item>
                    {a.layout.map((l) => (
                      <Menu.Item
                        key={`assemblies:${a.label}:layout:${l.label}`}
                      >
                        <span className={style.itemWithImage}>
                          <img alt="" src={l.imageSrc} />
                          {l.label}
                        </span>
                      </Menu.Item>
                    ))}
                  </SubMenu>
                ))}
              </SubMenu>
              <SubMenu
                key="controls"
                title={
                  <span>
                    <Icon type="scan" />Controls
                  </span>
                }
              >
                {this.state.controls.map((a) => (
                  <SubMenu key={`controls:${a.label}`} title={a.label}>
                    <Menu.Item key={`controls:${a.label}:stack`}>
                      <span className={style.itemWithIcon}>
                        <Icon type="check-square-o" />3D Stack
                      </span>
                    </Menu.Item>
                    {a.layout.map((l) => (
                      <Menu.Item key={`controls:${a.label}:layout:${l.label}`}>
                        <span className={style.itemWithImage}>
                          <img alt="" src={l.imageSrc} />
                          {l.label}
                        </span>
                      </Menu.Item>
                    ))}
                  </SubMenu>
                ))}
              </SubMenu>
              <SubMenu
                key="detectors"
                title={
                  <span>
                    <Icon type="scan" />Detectors
                  </span>
                }
              >
                {this.state.detectors.map((a) => (
                  <SubMenu key={`detectors:${a.label}`} title={a.label}>
                    <Menu.Item key={`detectors:${a.label}:stack`}>
                      <span className={style.itemWithIcon}>
                        <Icon type="check-square-o" />3D Stack
                      </span>
                    </Menu.Item>
                    {a.layout.map((l) => (
                      <Menu.Item key={`detectors:${a.label}:layout:${l.label}`}>
                        <span className={style.itemWithImage}>
                          <img alt="" src={l.imageSrc} />
                          {l.label}
                        </span>
                      </Menu.Item>
                    ))}
                  </SubMenu>
                ))}
              </SubMenu>
              <SubMenu
                key="inserts"
                title={
                  <span>
                    <Icon type="scan" />Inserts
                  </span>
                }
              >
                {this.state.inserts.map((a) => (
                  <SubMenu key={`inserts:${a.label}`} title={a.label}>
                    <Menu.Item key={`inserts:${a.label}:stack`}>
                      <span className={style.itemWithIcon}>
                        <Icon type="check-square-o" />3D Stack
                      </span>
                    </Menu.Item>
                    {a.layout.map((l) => (
                      <Menu.Item key={`inserts:${a.label}:layout:${l.label}`}>
                        <span className={style.itemWithImage}>
                          <img alt="" src={l.imageSrc} />
                          {l.label}
                        </span>
                      </Menu.Item>
                    ))}
                  </SubMenu>
                ))}
              </SubMenu>
              <SubMenu
                key="cells"
                title={
                  <span>
                    <Icon type="copyright" />Cell types
                  </span>
                }
              >
                {this.state.cells.map((m) => (
                  <Menu.Item key={`cells:${m.id}`}>
                    <span className={style.itemWithImage}>
                      <img alt="" src={m.imageSrc} />
                      {m.labelToUse}
                    </span>
                  </Menu.Item>
                ))}
              </SubMenu>
              <SubMenu
                key="colors"
                title={
                  <span>
                    <Icon type="tags-o" />Colors
                  </span>
                }
              >
                {this.state.materials.map(
                  (m) =>
                    m.hide ? null : (
                      <Menu.Item
                        key={`materials:${m.title}`}
                        disabled
                        className={style.materialSelector}
                      >
                        <Color
                          title={m.title}
                          color={m.color}
                          key={`mat-${m.title}`}
                        />
                        <Switch
                          className={style.materialSwitch}
                          checked={!this.state.mask[m.id]}
                          size="small"
                          onChange={this.toggleMaskFn[m.id]}
                        />
                      </Menu.Item>
                    )
                )}
              </SubMenu>
            </Menu>
          </Sider>
          <Layout>
            <Breadcrumb style={{ margin: '10px 24px' }}>
              {this.state.path.map((label) => (
                <Breadcrumb.Item key={label}>{label}</Breadcrumb.Item>
              ))}
            </Breadcrumb>

            <Content
              style={{
                background: '#fff',
                padding: 24,
                margin: 0,
                minHeight: 280,
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 64px - 38px)',
                display: 'flex',
                width: '100%',
              }}
            >
              {contents}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    );
  }
}

MainView.propTypes = {
  imageSize: PropTypes.number,
};

MainView.defaultProps = {
  imageSize: 2048,
};
