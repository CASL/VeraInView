import React from 'react';
import PropTypes from 'prop-types';

import vtkGridMap from '../utils/GridMap';

import style from './GridMapWidget.mcss';

const LEFT_BORDER = { borderRadius: '5px 0 0 5px' };
const MIDDLE_BORDER = { borderLeft: 'none' };
const RIGHT_BORDER = { borderRadius: '0 5px 5px 0', borderLeft: 'none' };

const SYMMETRY_STYLE = {
  border: 'solid 2px #333',
  // outline: 'solid 2px #333',
  borderRadius: '5px',
};

// ----------------------------------------------------------------------------

export function TextRenderer(props) {
  return (
    <div
      style={{
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        textAlign: 'center',
        width: '100%',
        height: '100%',
        background: props.colors ? props.colors[props.value] : '#efefef',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <span>{props.mapping ? props.mapping[props.value] : props.value}</span>
    </div>
  );
}

TextRenderer.propTypes = {
  value: PropTypes.string,
  mapping: PropTypes.object,
  colors: PropTypes.object,
};

TextRenderer.defaultProps = {
  value: '-',
  mapping: null,
  colors: null,
};

// ----------------------------------------------------------------------------

export default class GridMapWidget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeIds: [],
      selected: null,
    };
    this.gridMap = vtkGridMap.newInstance(
      Object.assign(
        {
          gridSize: props.gridSize,
        },
        props.state
      )
    );
    this.gridStyle = {
      gridTemplateColumns: `repeat(${props.gridSize}, calc(${100 /
        props.gridSize}% - 2px))`,
    };
    this.onClick = this.onClick.bind(this);
    this.onSelectItem = this.onSelectItem.bind(this);
    this.udpateMode = this.udpateMode.bind(this);
    this.onEnter = this.onEnter.bind(this);
    this.onLeave = this.onLeave.bind(this);
  }

  componentDidMount() {
    this.subscription = this.gridMap.onModified(() => {
      this.forceUpdate();
    });
  }

  componentDidUpdate() {
    if (this.gridMap.getReferenceByName('grid') !== this.props.state.grid) {
      this.gridMap.setGrid(this.props.state.grid);
      this.gridMap.setSymmetry(this.props.state.symmetry);
      this.gridMap.setReplacementMode(this.props.state.replacementMode);
      this.gridMap.setGridSize(this.props.gridSize);
      this.pushChanges();
    }
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  onEnter(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const activeIds = this.gridMap.getIndices(idx);
    this.setState({ activeIds });
  }

  onLeave() {
    this.setState({ activeIds: [] });
  }

  onClick(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (this.state.selected) {
      this.gridMap.setGridEntry(
        idx % this.props.gridSize,
        Math.floor(idx / this.props.gridSize),
        this.state.selected
      );
    }
    this.pushChanges();
  }

  onSelectItem(e) {
    this.setState({ selected: e.currentTarget.dataset.item });
  }

  pushChanges() {
    const grid = this.gridMap.getReferenceByName('grid');
    this.props.onChange(
      Object.assign({ grid }, this.gridMap.get('symmetry', 'replacementMode'))
    );
  }

  udpateMode(e) {
    const { mode, value } = e.currentTarget.dataset;
    this.gridMap.set({ [mode]: Number(value) });
  }

  /* eslint-disable react/no-array-index-key */
  render() {
    const axisIds = this.gridMap.getSymmetryAxialIndices();
    const { itemRenderer: Item, itemRendererProps } = this.props;
    return (
      <div className={style.container}>
        <div className={style.actionGroup}>
          <div
            style={LEFT_BORDER}
            onClick={this.udpateMode}
            data-mode="symmetry"
            data-value="0"
            className={
              this.gridMap.getSymmetry() === 0 ? style.activeItem : style.item
            }
          >
            None
          </div>
          <div
            style={MIDDLE_BORDER}
            onClick={this.udpateMode}
            data-mode="symmetry"
            data-value="1"
            className={
              this.gridMap.getSymmetry() === 1 ? style.activeItem : style.item
            }
          >
            Quadrant mirror
          </div>
          <div
            style={MIDDLE_BORDER}
            onClick={this.udpateMode}
            data-mode="symmetry"
            data-value="2"
            className={
              this.gridMap.getSymmetry() === 2 ? style.activeItem : style.item
            }
          >
            Quadrant rotation
          </div>
          <div
            style={RIGHT_BORDER}
            onClick={this.udpateMode}
            data-mode="symmetry"
            data-value="3"
            className={
              this.gridMap.getSymmetry() === 3 ? style.activeItem : style.item
            }
          >
            Octant
          </div>

          <div />
          <div
            style={LEFT_BORDER}
            onClick={this.udpateMode}
            data-mode="replacementMode"
            data-value="0"
            className={
              this.gridMap.getReplacementMode() === 0
                ? style.activeItem
                : style.item
            }
          >
            Single
          </div>
          <div
            style={RIGHT_BORDER}
            onClick={this.udpateMode}
            data-mode="replacementMode"
            data-value="1"
            className={
              this.gridMap.getReplacementMode() === 1
                ? style.activeItem
                : style.item
            }
          >
            All
          </div>
        </div>
        <div className={style.legend}>
          {this.props.items.map((v) => (
            <div
              key={v}
              data-item={v}
              className={
                v === this.state.selected
                  ? style.selectedLegendItem
                  : style.legendItem
              }
              onClick={this.onSelectItem}
            >
              <Item value={v} {...itemRendererProps} />
            </div>
          ))}
        </div>
        <div className={style.grid} style={this.gridStyle}>
          {this.gridMap.getGrid().map((v, i) => (
            <div
              key={i}
              data-idx={i}
              className={
                this.state.activeIds.length &&
                this.state.activeIds.indexOf(i) === -1
                  ? style.gridItem
                  : style.activeGridItem
              }
              onClick={this.onClick}
              onMouseEnter={this.onEnter}
              onMouseLeave={this.onLeave}
            >
              <div
                className={style.inner}
                style={axisIds.indexOf(i) !== -1 ? SYMMETRY_STYLE : null}
              >
                <Item value={v} {...itemRendererProps} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

GridMapWidget.propTypes = {
  itemRenderer: PropTypes.func,
  itemRendererProps: PropTypes.object,
  gridSize: PropTypes.number,
  items: PropTypes.array,
  emptyItem: PropTypes.string,
  onChange: PropTypes.func,
  state: PropTypes.object,
};

GridMapWidget.defaultProps = {
  itemRenderer: TextRenderer,
  itemRendererProps: {},
  gridSize: 15,
  items: [],
  emptyItem: '-',
  onChange: () => {},
  state: {
    grid: [],
    symmetry: 3,
    replacementMode: 0,
  },
};
