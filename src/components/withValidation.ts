import { ValidationProvider, createValidationCtx, createCommonHandlers, onRenderUpdate } from './provider';
import { assign, isCallable } from '../utils';
import { findModel, findModelConfig, mergeVNodeListeners, getInputEventName, normalizeSlots } from '../utils/vnode';

export function withValidation (component, ctxToProps = null) {
  const options = isCallable(component) ? component.options : component;
  options.$__formwardInject = false;
  const hoc: Record<string, any> = {
    name: `${options.name || 'AnonymousHoc'}WithValidation`,
    props: assign({}, ValidationProvider.props),
    data: ValidationProvider.data,
    computed: assign({}, ValidationProvider.computed),
    methods: assign({}, ValidationProvider.methods),
    $__formwardInject: false,
    beforeUnmount: ValidationProvider.beforeUnmount,
    inject: ValidationProvider.inject
  };

  if (!ctxToProps) {
    ctxToProps = (ctx: any) => ctx;
  }

  const eventName = (options.model && options.model.event) || 'input';

  hoc.render = function (this: any, h: any) {
    this.registerField();
    const vctx = createValidationCtx(this);
    const vnode = this.$.vnode || this._vnode || this.$vnode;
    // Vue 3: $listeners merged into $attrs; pick on* for listeners
    const listeners = {};
    const attrs = this.$attrs || {};
    Object.keys(attrs).forEach(k => {
      if (k.startsWith('on') && k.length > 2) listeners[k] = attrs[k];
    });

    const model = findModel(vnode);
    this._inputEventName = this._inputEventName || getInputEventName(vnode, model);
    onRenderUpdate.call(this, model);

    const { onInput, onBlur, onValidate } = createCommonHandlers(this);

    mergeVNodeListeners(listeners, eventName, onInput);
    mergeVNodeListeners(listeners, 'blur', onBlur);
    this.normalizedEvents.forEach((evt) => {
      mergeVNodeListeners(listeners, evt, onValidate);
    });

    const { prop } = findModelConfig(vnode) || { prop: 'value' };
    const modelValue = model && model.value !== undefined ? model.value : undefined;
    const props = assign({}, this.$attrs, { [prop]: modelValue }, ctxToProps(vctx));

    const slotContent = normalizeSlots(this.$slots || {}, this);

    return h(options, assign({}, props, listeners), slotContent);
  };

  return hoc;
}
