import 'antd/dist/antd.css';

import React from 'react';
import PropTypes from 'prop-types';

import { Breadcrumb, Icon, Layout, Menu, Upload } from 'antd';

import macro from 'vtk.js/Sources/macro';

import Color from './widgets/Color';
import ImageGenerator from './utils/ImageGenerator';
import MaterialEditor from './widgets/MaterialEditor';
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
const { materials, defaultMaterial, initMaterials } = Materials;
const { materialColorManager } = ImageGenerator;

ImageGenerator.setLogger(console.log);

const EDITORS = {
  Materials: MaterialEditor,
  Cells: CellEditor,
  Assemblies: AssemblyEditor,
  AssemblyLayouts: AssemblyLayoutEditor,
};

function uncapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

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
          mats: [defaultMaterial.label],
          radii: [0.6],
          num_rings: 1,
          labelToUse: 'New cell',
        },
      ],
      assemblyLayouts: [
        {
          label: 'New',
          id: 'new-000',
          numPins: 3,
          pinPitch: 1.26,
          labelToUse: 'New map',
          cellMap: '- - -\n- - -\n- - -',
        },
      ],
      assemblies: [
        {
          label: 'New',
          id: 'new-000',
          labelToUse: 'New assembly',
          axial_elevations: [],
          axial_labels: [],
          layout: [],
        },
      ],
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
      // Ensure material callbacks exists
      // if (newState.materials) {
      //   let count = newState.materials.length;
      //   while (count--) {
      //     const mat = newState.materials[count];
      //     this.toggleMaskFn[mat.id] = (check) => {
      //       const { mask } = this.state;
      //       mask[mat.id] = !check;
      //       this.setState({ mask });
      //     };
      //   }
      // }
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
        newLayout.forEach((layout) => {
          labelMap[layout.label] = layout;
        });
        newState.assemblies.forEach((assembly) => {
          let count = assembly.layout.length;
          while (count--) {
            const layout = assembly.layout[count];
            if (!labelMap[layout.label]) {
              layout.id = `layout-${layout.label}`;
              const numPins = Math.round(Math.sqrt(layout.cell_map.length));
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
          assembly.id = `assembly-${assembly.label}`;
          newAssemblies.unshift(assembly);
        });
        this.setState({
          assemblyLayouts: newLayout,
          assemblies: newAssemblies,
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
              <SubMenu
                key="assemblies"
                title={
                  <span>
                    <Icon type="appstore-o" />Assemblies
                  </span>
                }
              >
                {this.state.assemblyLayouts.map((l) => (
                  <Menu.Item key={`assemblyLayouts:${l.id}`}>
                    <span className={style.itemWithImage}>
                      <img alt="" src={l.imageSrc} />
                      {l.labelToUse || l.label}
                    </span>
                    <span className={style.itemWithIcon}>
                      <Icon type="check-square-o" />
                      {l.labelToUse || l.label}
                    </span>
                  </Menu.Item>
                ))}
                {this.state.assemblyLayouts.length > 1 &&
                  this.state.assemblies.map((a) => (
                    <Menu.Item key={`assemblies:${a.id}`}>
                      <span className={style.itemWithIcon}>
                        <Icon type="api" />
                        {a.labelToUse || a.label}
                      </span>
                    </Menu.Item>
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
