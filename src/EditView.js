import 'antd/dist/antd.css';

import React from 'react';
import PropTypes from 'prop-types';

import { Breadcrumb, Button, Icon, Layout, Menu, Upload } from 'antd';

import macro from 'vtk.js/Sources/macro';

import Color from './widgets/Color';
import ImageGenerator from './utils/ImageGenerator';
import MaterialEditor from './widgets/MaterialEditor';
import ParamEditor from './widgets/ParamEditor';
import CellEditor from './widgets/CellEditor';
import AssemblyEditor from './widgets/AssemblyEditor';
import AssemblyLayoutEditor from './widgets/AssemblyLayoutEditor';
// import VTKRenderer from './widgets/VTKRenderer';
import ModelHelper from './utils/ModelHelper';
import Materials from './utils/Materials';

import style from './assets/vera.mcss';
import welcome from './assets/welcome.jpg';

const { SubMenu } = Menu;
const { Header, Content, Sider } = Layout;
const { capitalize } = macro;
const { fuels, materials, defaultMaterial, initMaterials } = Materials;
const { materialColorManager } = ImageGenerator;

ImageGenerator.setLogger(console.log);

const EDITORS = {
  Fuels: MaterialEditor,
  Materials: MaterialEditor,
  Cells: CellEditor,
  Assemblies: AssemblyEditor,
  AssemblyLayouts: AssemblyLayoutEditor,
  Params: ParamEditor,
};

const TEMPLATES = {
  materials: {
    label: 'New',
    color: null,
    density: 1,
    fracs: [1],
    names: [],
    thexp: 1,
  },
  fuels: {
    label: 'New',
    color: null,
    density: 10.257,
    enrichments: [2, 0.2],
    names: ['u-235', 'u-234'],
    thden: 1,
  },
  cells: {
    label: 'New',
    id: 'new-000',
    mats: [defaultMaterial.label],
    radii: [0.6],
    num_rings: 1,
  },
  assemblyLayouts: {
    label: 'New',
    id: 'new-000',
    cellMap: '',
    symmetry: 'oct',
  },
  assemblies: {
    label: 'New',
    id: 'new-000',
    axial_elevations: [],
    axial_labels: [],
    layout: [],
  },
};

// todo get from vtk-js
function uncapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function uniqueLabel(label, avoidList) {
  let newLabel = label;
  const loopFn = (item) => item.label === newLabel;
  while (avoidList.find(loopFn)) {
    const parts = newLabel.split('_');
    const val = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;
    if (!Number.isNaN(val)) {
      parts[parts.length - 1] = val + 1;
      newLabel = parts.join('_');
    } else {
      newLabel = `${newLabel}_1`;
    }
  }
  return newLabel;
}

function GroupTitle(props) {
  return (
    <span className={style.itemWithSmallIcon}>
      <Icon type={props.icon} />
      {props.title}
      <span style={{ flex: 1 }} />
      <Button
        shape="circle"
        icon="plus"
        className={style.menuAddNew}
        onClick={props.onClick}
      />
    </span>
  );
}

GroupTitle.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default class EditView extends React.Component {
  constructor(props) {
    super(props);
    initMaterials();
    TEMPLATES.cells.mats[0] = defaultMaterial.label;
    this.state = {
      title: '',
      materials,
      fuels,
      cells: [],
      assemblyLayouts: [],
      assemblies: [],
      params: {
        numPins: 1,
        pinPitch: 1.26,
      },
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
    this.forceUpdate = this.forceUpdate.bind(this);
    this.getSelectionByKey = this.getSelectionByKey.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.onNew = this.onNew.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.onToggle3D = this.onToggle3D.bind(this);
    this.onToggleMenu = this.onToggleMenu.bind(this);
    this.parseFile = this.parseFile.bind(this);
    this.updateImageIndex = this.updateImageIndex.bind(this);
  }

  onNew(type, baseTemplate) {
    const content = this.state[type];
    if (content) {
      content.unshift(baseTemplate);
      // make sure it's selected after creation.
      this.setState({ [type]: content }, () => {
        this.onSelect({ key: `${type}:${baseTemplate.id}` });
      });
    }
  }

  onMenuNew(type, category) {
    // create a new item based on the currently selected one.
    // state.content holds the current item.
    const base =
      capitalize(type) !== this.state.path[0]
        ? TEMPLATES[type]
        : this.state.content;
    const newItem = EDITORS[capitalize(type)].createNew(base);
    if (newItem.label !== undefined) {
      newItem.label = uniqueLabel(newItem.label, this.state[type]);
      if (newItem.labelToUse !== undefined) {
        newItem.labelToUse = newItem.label;
      }
    }
    this.onNew(type, newItem);
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
        if (container && (container.labelToUse || container.label)) {
          path.push(container.labelToUse || container.label);
        } else {
          path.push(name);
        }
      } else {
        // object container, keyed on name
        container = container[name];
        if (container && (container.labelToUse || container.label)) {
          path.push(container.labelToUse || container.label);
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

  parseFile(file) {
    this.setState({ title: file.name, file });
    ModelHelper.parseFile(file, this.props.imageSize, (newState) => {
      if (newState.cells) {
        // make sure each is unique - ids derived from radii+mat
        const idMap = {};
        const labelMap = {};
        const newCells = this.state.cells.slice();
        this.state.cells.forEach((cell) => {
          idMap[cell.id] = cell;
          labelMap[cell.label] = cell;
        });
        let count = newState.cells.length;
        while (count--) {
          const cell = newState.cells[count];
          // TODO: all cells
          // only extract assembly cells, to avoid label conflicts.
          if (
            !idMap[cell.id] &&
            (!cell.labelToUse || cell.labelToUse[0] === 'A')
          ) {
            idMap[cell.id] = cell;
            let extra = 2;
            const base = cell.label;
            while (labelMap[cell.label]) {
              cell.label = `${base}_${extra}`;
              extra += 1;
            }
            labelMap[cell.label] = cell;
            newCells.unshift(cell);
          }
        }
        this.setState({ cells: newCells });
      }
      if (newState.assemblies) {
        const labelMap = {};
        const newLayout = this.state.assemblyLayouts.slice();
        const newAssemblies = this.state.assemblies.slice();
        const params = Object.assign({}, this.state.params);
        newLayout.forEach((layout) => {
          labelMap[layout.label] = layout;
        });
        newAssemblies.forEach((a) => {
          labelMap[a.id] = a;
        });
        newState.assemblies.forEach((assembly) => {
          let count = assembly.layout.length;
          while (count--) {
            const layout = assembly.layout[count];
            if (!labelMap[layout.label]) {
              layout.id = `layout-${layout.label}`;
              const numPins = assembly.num_pins;
              layout.numPins = numPins;
              const map = [];
              for (let i = 0; i < numPins; ++i) {
                map.push(
                  layout.cell_map
                    .slice(i * numPins, (i + 1) * numPins)
                    .join(' ')
                );
              }
              layout.cellMap = map.join('\n');
              newLayout.unshift(layout);
              labelMap[layout.label] = layout;
            }
          }
          // use ID to avoid conflict with layouts.
          if (!labelMap[`assembly-${assembly.label}`]) {
            assembly.id = `assembly-${assembly.label}`;
            newAssemblies.unshift(assembly);
            labelMap[assembly.id] = assembly;
          }
          params.numPins = Math.max(params.numPins, assembly.num_pins);
          params.pinPitch = Math.max(params.pinPitch, assembly.ppitch);
        });
        this.setState({
          assemblyLayouts: newLayout,
          assemblies: newAssemblies,
          params,
        });
      }
      console.log('editor', newState);
    });
    return false;
  }

  render() {
    const contents = [];
    const menuSize = 240;

    if (this.state.content && this.state.editor) {
      const Editor = this.state.editor;
      // this is a little weird, because this is the union of
      // props needed by each editor.
      contents.push(
        <Editor
          key={`editor-${this.state.lastKey}`}
          content={this.state.content}
          update={this.forceUpdate}
          type={uncapitalize(this.state.path[0])}
          addNew={this.onNew}
          params={this.state.params}
          fuels={this.state.fuels}
          materials={this.state.materials}
          defaultMaterial={defaultMaterial}
          cells={this.state.cells}
          assemblyLayouts={this.state.assemblyLayouts}
          imageSize={this.props.imageSize}
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
              selectedKeys={this.state.selected}
            >
              <Menu.Item key="params">
                <span className={style.itemWithIcon}>
                  <Icon type="bars" />
                  Global Parameters
                </span>
              </Menu.Item>
              <SubMenu
                key="assemblies"
                title={
                  <span className={style.itemWithIcon}>
                    <Icon type="appstore-o" />Assemblies
                  </span>
                }
              >
                {this.state.assemblyLayouts.length > 0 && (
                  <Menu.ItemGroup
                    key="stacks"
                    title={
                      <GroupTitle
                        title="Axial Stacks"
                        icon="appstore-o"
                        onClick={() =>
                          this.onMenuNew('assemblies', 'assemblies')
                        }
                      />
                    }
                  >
                    {this.state.assemblies.map((a) => (
                      <Menu.Item key={`assemblies:${a.id}`}>
                        <span className={style.itemWithSmallIcon}>
                          <Icon type="api" />
                          {a.labelToUse || a.label}
                        </span>
                      </Menu.Item>
                    ))}
                  </Menu.ItemGroup>
                )}
                <Menu.ItemGroup
                  key="rodmaps"
                  title={
                    <GroupTitle
                      title="Rodmaps"
                      icon="appstore-o"
                      onClick={() =>
                        this.onMenuNew('assemblyLayouts', 'assemblies')
                      }
                    />
                  }
                >
                  {this.state.assemblyLayouts.map((l) => (
                    <Menu.Item key={`assemblyLayouts:${l.id}`}>
                      <span className={style.itemWithImage}>
                        <img alt="" src={l.imageSrc} />
                        {l.labelToUse || l.label}
                      </span>
                    </Menu.Item>
                  ))}
                </Menu.ItemGroup>
              </SubMenu>
              <SubMenu
                key="cells"
                title={
                  <span className={style.itemWithIcon}>
                    <Icon type="copyright" />Cell types
                  </span>
                }
              >
                <Menu.ItemGroup
                  key="assemblyCells"
                  title={
                    <GroupTitle
                      title="Assembly"
                      icon="copyright"
                      onClick={() => this.onMenuNew('cells', 'assemblies')}
                    />
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
                </Menu.ItemGroup>
              </SubMenu>
              <SubMenu
                key="materials"
                title={
                  <span className={style.itemWithIcon}>
                    <Icon type="tags-o" />Materials
                  </span>
                }
              >
                <Menu.ItemGroup
                  key="fuelMaterials"
                  title={
                    <GroupTitle
                      title="Fuels"
                      icon="tags-o"
                      onClick={() => this.onMenuNew('fuels', 'fuels')}
                    />
                  }
                >
                  {this.state.fuels.map(
                    (m) =>
                      m.hide ? null : (
                        <Menu.Item
                          key={`fuels:${m.id}`}
                          className={style.materialSelector}
                        >
                          <Color
                            title={m.label}
                            color={
                              materialColorManager.hasName(m.label)
                                ? materialColorManager.getColorRGBA(m.label)
                                : m.color
                            }
                            key={`mat-${m.id}`}
                          />
                        </Menu.Item>
                      )
                  )}
                </Menu.ItemGroup>
                <Menu.ItemGroup
                  key="normalMaterials"
                  title={
                    <GroupTitle
                      title="Normal"
                      icon="tags-o"
                      onClick={() => this.onMenuNew('materials', 'normal')}
                    />
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
                            color={
                              materialColorManager.hasName(m.label)
                                ? materialColorManager.getColorRGBA(m.label)
                                : m.color
                            }
                            key={`mat-${m.id}`}
                          />
                        </Menu.Item>
                      )
                  )}
                </Menu.ItemGroup>
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

EditView.propTypes = {
  imageSize: PropTypes.number,
};

EditView.defaultProps = {
  imageSize: 2048,
};