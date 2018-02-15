import 'antd/dist/antd.css';

import React from 'react';
// import PropTypes from 'prop-types';

import { Breadcrumb, Icon, Layout, Menu, message } from 'antd';

import macro from 'vtk.js/Sources/macro';

import Color from './widgets/Color';
import MaterialEditor from './widgets/MaterialEditor';
import CellEditor from './widgets/CellEditor';
// import VTKRenderer from './widgets/VTKRenderer';
import ImageGenerator from './utils/ImageGenerator';
import { materials, initMaterials } from './utils/Materials';

import style from './assets/vera.mcss';
import welcome from './assets/welcome.jpg';

const { SubMenu } = Menu;
const { Header, Content, Sider } = Layout;
const { capitalize } = macro;

ImageGenerator.setLogger(message.info);

const EDITORS = {
  Materials: MaterialEditor,
  Cells: CellEditor,
};

export default class EditView extends React.Component {
  constructor(props) {
    super(props);
    initMaterials();
    this.state = {
      title: '',
      materials,
      cells: [
        {
          label: 'New',
          id: 'new-000',
          mats: [materials[0].name],
          radii: [1],
          labelToUse: 'New cell',
        },
      ],
      assemblies: [],
      content: null,
      path: ['Home'],
      has3D: false,
      use3D: false,
      showMenu: true,
      selected: [],
    };

    // Toggle mask callback handler
    this.toggleMaskFn = {};

    // Functions for callback
    this.onSelect = this.onSelect.bind(this);
    this.getSelectionByKey = this.getSelectionByKey.bind(this);
    this.updateImageIndex = this.updateImageIndex.bind(this);
    this.onToggle3D = this.onToggle3D.bind(this);
    this.onToggleMenu = this.onToggleMenu.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.forceUpdate = this.forceUpdate.bind(this);
    this.onNew = this.onNew.bind(this);
  }

  onNew(type, baseTemplate) {
    const content = this.state[type];
    if (content) {
      content.unshift(baseTemplate);
      this.setState({ [type]: content }, () => {
        this.onSelect({ key: `${type}:${baseTemplate.id}` });
      });
    }
  }

  onSelect(options) {
    const selected = [options.key];
    const { item, path } = this.getSelectionByKey(options.key);

    if (item && EDITORS[path[0]]) {
      this.setState({
        selected,
        content: item,
        editor: EDITORS[path[0]],
        path,
        lastKey: options.key,
      });
    } else {
      this.setState({ selected });
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
        if (
          container &&
          (container.labelToUse || container.label || container.name)
        ) {
          path.push(container.labelToUse || container.label || container.name);
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

  handleKeyPress(event) {
    if (event.key === 'm') {
      this.onToggleMenu();
    }
  }

  updateImageIndex(imageIndex) {
    this.setState({ imageIndex });
  }

  render() {
    const contents = [];
    const menuSize = 240;

    if (this.state.content && this.state.editor) {
      const Editor = this.state.editor;
      contents.push(
        <Editor
          key={`editor-${this.state.lastKey}`}
          content={this.state.content}
          update={this.forceUpdate}
          type={this.state.path[0].toLowerCase()}
          addNew={this.onNew}
          materials={this.state.materials}
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
              selectedKeys={this.state.selected}
            >
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
                key="materials"
                title={
                  <span>
                    <Icon type="tags-o" />Materials
                  </span>
                }
              >
                {this.state.materials.map(
                  (m) =>
                    m.hide ? null : (
                      <Menu.Item
                        key={`materials:${m.id}`}
                        className={style.materialSelector}
                      >
                        <Color
                          title={m.label}
                          color={m.color}
                          key={`mat-${m.id}`}
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

EditView.propTypes = {};

EditView.defaultProps = {};
