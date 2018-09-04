function clamp(min, max, value) {
  return Math.min(max, Math.max(min, value));
}

// ----------------------------------------------------------------------------

export default {
  name: 'EditableList',
  props: {
    columns: {
      type: Array,
      default() {
        return [];
      },
    },
    data: {
      type: Array,
      default() {
        return [];
      },
    },
    sortable: {
      type: Boolean,
      default() {
        return false;
      },
    },
    onAdd: {
      type: Function,
      default() {
        return () => {};
      },
    },
    onDelete: {
      type: Function,
      default() {
        return () => {};
      },
    },
    onSortChange: {
      type: Function,
      default() {
        return () => {};
      },
    },
    addLabel: {
      type: String,
      default() {
        return 'Add new item';
      },
    },
  },
  data() {
    return {
      dragTargetKey: null,
      dragOffset: 0,
      initialMouseY: 0,
      initialTargetY: 0,
      initialIndex: 0,
      sortIndex: 0,
      container: null,
      dragTargetEl: null,
    };
  },
  methods: {
    onDragStart(ev, itemKey) {
      // gets the drag handle's containing row div
      let target = ev.target;
      while (!target.getAttribute('draggrip')) {
        target = target.parentNode;
      }
      target = target.parentNode;

      const itemIndex = this.data.findIndex((item) => item.key === itemKey);

      const targetRect = target.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();

      const window = this.getWindow();
      window.addEventListener('mousemove', this.onDragMove);
      window.addEventListener('mouseup', this.onDragEnd);

      this.dragTargetEl = target;

      this.dragTargetKey = itemKey;
      this.dragOffset = 0;
      // only lock to Y axis
      this.initialMouseY = ev.pageY;
      this.initialTargetY = targetRect.top - containerRect.top;
      this.initialIndex = itemIndex;
      this.sortIndex = itemIndex;

      ev.stopPropagation();
      ev.preventDefault();
    },

    onDragMove(ev) {
      const containerRect = this.container.getBoundingClientRect();
      const clampedMouseY = clamp(
        containerRect.top,
        containerRect.bottom,
        ev.pageY
      );

      // ignore currently dragging node
      const siblings = Array.from(
        this.dragTargetEl.parentNode.childNodes
      ).filter((node) => node !== this.dragTargetEl);

      let newIndex = -1;
      for (let i = 0; i < siblings.length; ++i) {
        const { top: siblingTop, bottom: siblingBottom } = siblings[
          i
        ].getBoundingClientRect();

        if (clampedMouseY >= siblingTop && clampedMouseY <= siblingBottom) {
          newIndex = i;
        }
      }

      const targetHeight = this.dragTargetEl.offsetHeight;
      const newDragOffset = clamp(
        -this.initialTargetY,
        containerRect.height - this.initialTargetY - targetHeight,
        ev.pageY - this.initialMouseY
      );

      this.dragOffset = newDragOffset;
      this.sortIndex = newIndex;

      ev.stopPropagation();
      ev.preventDefault();
    },

    onDragEnd(ev) {
      window.removeEventListener('mousemove', this.onDragMove);
      window.removeEventListener('mouseup', this.onDragEnd);

      this.dragTargetKey = null;
      this.setState({ dragTargetKey: null });

      ev.stopPropagation();
      ev.preventDefault();

      this.onSortChange(this.initialIndex, this.sortIndex);
    },

    getWindow() {
      const doc = (this.container || {}).ownerDocument || document;
      return doc.defaultView || window;
    },

    getRowCSS(item) {
      const classes = [this.$style.row];
      const styles = {};
      if (this.dragTargetKey === item.key) {
        classes.push(this.$style.dragging);
        Object.assign(rowStyles, {
          top: `${this.initialTargetY + this.dragOffset}px`,
        });
      }

      return {
        class: classes,
        style: styles,
      };
    },
  },
};
