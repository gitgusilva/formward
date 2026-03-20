import { resolveConfig, getConfig } from '../config';
import { findModel } from '../utils/vnode';
import {
  getScope,
  getDataAttribute,
  isObject,
  toArray,
  find,
  getPath,
  hasPath,
  isNullOrUndefined,
  isCallable,
  deepParseInt,
  fillRulesFromElement,
  includes,
  normalizeRules,
  assign
} from '../utils';

/**
 * Returns the component instance from a vnode (Vue 3: component.proxy or componentInstance).
 *
 * @param {import('vue').VNode | null} vnode - VNode.
 * @returns {import('vue').ComponentPublicInstance | null}
 */
function getComponentInstance (vnode) {
  if (!vnode) return null;
  return (vnode.component && vnode.component.proxy) || vnode.componentInstance || null;
}

/**
 * Returns context from vnode or the explicitly provided context.
 *
 * @param {import('vue').VNode} vnode - VNode.
 * @param {*} [explicitContext] - Override context.
 * @returns {*}
 */
function getContextFromVnode (vnode: any, explicitContext?: any) {
  if (explicitContext) return explicitContext;
  return vnode && vnode.ctx !== undefined ? vnode.ctx : null;
}

/**
 * Resolves field options from element, binding, and vnode (used by the v-validate directive).
 */
export default class Resolver {
  /**
   * Builds full field options for Validator.attach (name, rules, getter, scope, events, etc.).
   *
   * @param {HTMLElement} el - Target element.
   * @param {import('vue').DirectiveBinding} binding - Directive binding.
   * @param {import('vue').VNode} vnode - Element vnode.
   * @param {*} [explicitContext] - Optional component context.
   * @returns {Object} Field options.
   */
  static generate (el, binding, vnode, explicitContext) {
    const context = getContextFromVnode(vnode, explicitContext);
    const componentInstance = getComponentInstance(vnode);
    const model = Resolver.resolveModel(binding, vnode, context);
    const options = resolveConfig(context);

    return {
      name: Resolver.resolveName(el, vnode, componentInstance),
      el: el,
      listen: !binding.modifiers.disable,
      bails: binding.modifiers.bails ? true : (binding.modifiers.continues === true ? false : undefined),
      scope: Resolver.resolveScope(el, binding, vnode),
      vm: context,
      expression: binding.value,
      component: componentInstance,
      classes: options.classes,
      classNames: options.classNames,
      getter: Resolver.resolveGetter(el, vnode, model, context, componentInstance),
      events: Resolver.resolveEvents(el, vnode, componentInstance) || options.events,
      model,
      delay: Resolver.resolveDelay(el, vnode, options, componentInstance),
      rules: Resolver.resolveRules(el, binding, vnode),
      immediate: !!binding.modifiers.initial || !!binding.modifiers.immediate,
      persist: !!binding.modifiers.persist,
      validity: options.validity && !componentInstance,
      aria: options.aria && !componentInstance,
      initialValue: Resolver.resolveInitialValue(vnode)
    };
  }

  /**
   * Returns component's $_formward config (from $options).
   *
   * @param {import('vue').VNode} vnode - VNode.
   * @param {*} [componentInstance] - Component instance (optional).
   * @returns {Object | null}
   */
  static getCtorConfig (vnode, componentInstance) {
    const comp = componentInstance || getComponentInstance(vnode);
    if (!comp) return null;

    const config = comp.$options && getPath('$_formward', comp.$options);

    return config;
  }

  /**
   * Resolves validation rules from binding value, data-vv-rules, or element attributes (when useConstraintAttrs).
   *
   * @param {HTMLElement} el - Element.
   * @param {import('vue').DirectiveBinding} binding - Binding (value = rules).
   * @param {import('vue').VNode} vnode - VNode.
   * @returns {string | Object} Normalized rules.
   */
  static resolveRules (el, binding, vnode) {
    const comp = getComponentInstance(vnode);
    let rules = '';
    if (!binding.value && (!binding || !binding.expression)) {
      rules = getDataAttribute(el, 'rules');
    }

    if (binding.value && includes(['string', 'object'], typeof binding.value.rules)) {
      rules = binding.value.rules;
    } else if (binding.value) {
      rules = binding.value;
    }

    if (comp) {
      return rules;
    }

    // If validity is disabled, ignore field rules.
    const normalized = normalizeRules(rules);
    if (!getConfig().useConstraintAttrs) {
      return normalized;
    }

    return assign({}, fillRulesFromElement(el, {}), normalized);
  }

  /**
   * Resolves initial value from vnode props (model, modelValue, value).
   *
   * @param {import('vue').VNode} vnode - VNode.
   * @returns {*} Initial value or undefined.
   */
  static resolveInitialValue (vnode) {
    if (!vnode) return undefined;
    const data = vnode.props || {};
    const model = data.model || find(data.directives || [], d => d.name === 'model');
    if (model && model.value !== undefined) return model.value;
    if (data.modelValue !== undefined) return data.modelValue;
    if (data.value !== undefined) return data.value;
    return undefined;
  }

  /**
   * Resolves debounce delay (data-vv-delay, config, or component attrs).
   *
   * @param {HTMLElement} el - Element.
   * @param {import('vue').VNode} vnode - VNode.
   * @param {Object} options - Config (delay).
   * @param {*} [componentInstance] - Component instance.
   * @returns {number | Object} Delay in ms or event-keyed delay object.
   */
  static resolveDelay (el, vnode, options, componentInstance) {
    const comp = componentInstance !== undefined ? componentInstance : getComponentInstance(vnode);
    let delay = getDataAttribute(el, 'delay');
    const globalDelay = (options && 'delay' in options) ? options.delay : 0;

    if (!delay && comp && comp.$attrs) {
      delay = comp.$attrs['data-vv-delay'];
    }

    if (!isObject(globalDelay)) {
      return deepParseInt(delay || globalDelay);
    }

    if (!isNullOrUndefined(delay)) {
      globalDelay.input = delay;
    }

    return deepParseInt(globalDelay);
  }

  /**
   * Resolves event names for validation (data-vv-validate-on, config, or component model event).
   *
   * @param {HTMLElement} el - Element.
   * @param {import('vue').VNode} vnode - VNode.
   * @param {*} [componentInstance] - Component instance.
   * @returns {string} Pipe-separated event names.
   */
  static resolveEvents (el, vnode, componentInstance) {
    const comp = componentInstance !== undefined ? componentInstance : getComponentInstance(vnode);
    // resolve it from the root element.
    let events = getDataAttribute(el, 'validate-on');

    // resolve from data-vv-validate-on if its a vue component.
    if (!events && comp && comp.$attrs) {
      events = comp.$attrs['data-vv-validate-on'];
    }

    // resolve it from $_formward options.
    if (!events && comp) {
      const config = Resolver.getCtorConfig(vnode, comp);
      events = config && config.events;
    }

    if (!events && getConfig().events) {
      events = getConfig().events;
    }

    // resolve the model event if its configured for custom components.
    if (events && comp && includes(events, 'input')) {
      const modelOpts = comp.$options && comp.$options.model;
      const event = modelOpts && modelOpts.event ? modelOpts.event : 'input';
      events = events.replace('input', event);
    }

    return events;
  }

  /**
   * Resolves field scope (data-vv-scope on component or element).
   *
   * @param {HTMLElement} el - Element.
   * @param {import('vue').DirectiveBinding} binding - Binding.
   * @param {import('vue').VNode} [vnode={}] - VNode.
   * @returns {string | null} Scope name or null.
   */
  static resolveScope (el, binding, vnode = {}) {
    const comp = getComponentInstance(vnode);
    let scope = null;
    if (comp && comp.$attrs && isNullOrUndefined(scope)) {
      scope = comp.$attrs['data-vv-scope'];
    }

    return !isNullOrUndefined(scope) ? scope : getScope(el);
  }

  /**
   * Resolves v-model (or directive arg) for value binding and watchability.
   *
   * @param {import('vue').DirectiveBinding} binding - Binding (arg = expression).
   * @param {import('vue').VNode} vnode - VNode.
   * @param {*} [context] - Component context.
   * @returns {{ expression: string | null; lazy: boolean } | null}
   */
  static resolveModel (binding, vnode, context) {
    if (binding.arg) {
      return { expression: binding.arg };
    }

    const model = findModel(vnode);
    if (!model) {
      return null;
    }

    const ctx = context || getContextFromVnode(vnode);
    const watchable = ctx && !/[^\w.$]/.test(model.expression) && hasPath(model.expression, ctx);
    const lazy = !!((model as any)?.modifiers?.lazy);

    if (!watchable) {
      return { expression: null, lazy };
    }

    return { expression: model.expression, lazy };
  }

  /**
   * Resolves field name (data-vv-name, data-vv-name attr on component, or component name).
   *
   * @param {HTMLElement} el - Element.
   * @param {import('vue').VNode} [vnode] - VNode.
   * @param {*} [componentInstance] - Component instance.
   * @returns {string} Field name.
   */
  static resolveName (el: any, vnode?: any, componentInstance?: any) {
    const comp = componentInstance !== undefined ? componentInstance : getComponentInstance(vnode);
    let name = getDataAttribute(el, 'name');

    if (!name && !comp) {
      return el.name;
    }

    if (!name && comp && comp.$attrs) {
      name = comp.$attrs['data-vv-name'] || comp.$attrs['name'];
    }

    if (!name && comp) {
      const config = Resolver.getCtorConfig(vnode, comp);
      if (config && isCallable(config.name)) {
        const boundGetter = config.name.bind(comp);

        return boundGetter();
      }

      return comp.name;
    }

    return name;
  }

  /**
   * Returns a getter function for the field value (from model, component prop, or element).
   *
   * @param {HTMLElement} el - Element.
   * @param {import('vue').VNode} [vnode] - VNode.
   * @param {*} [model] - Resolved model (expression, lazy).
   * @param {*} [context] - Component context.
   * @param {*} [componentInstance] - Component instance.
   * @returns {() => any} Value getter.
   */
  static resolveGetter (el: any, vnode?: any, model?: any, context?: any, componentInstance?: any) {
    const ctx = context || getContextFromVnode(vnode);
    const comp = componentInstance !== undefined ? componentInstance : getComponentInstance(vnode);

    if (model && model.expression && ctx) {
      return () => {
        return getPath(model.expression, ctx);
      };
    }

    if (comp) {
      const path = getDataAttribute(el, 'value-path') || (comp.$attrs && comp.$attrs['data-vv-value-path']);
      if (path) {
        return () => {
          return getPath(path, comp);
        };
      }

      const config = Resolver.getCtorConfig(vnode, comp);
      if (config && isCallable(config.value)) {
        const boundGetter = config.value.bind(comp);

        return () => {
          return boundGetter();
        };
      }

      const modelOpts = comp.$options && comp.$options.model;
      const prop = modelOpts && modelOpts.prop ? modelOpts.prop : 'value';

      return () => {
        return comp[prop];
      };
    }

    switch (el.type) {
    case 'checkbox': return () => {
      const nodeList = document.querySelectorAll(`input[name="${el.name}"]`);
      const els = toArray(nodeList).filter((e: any) => e.checked);
      if (!els.length) return undefined;
      return els.map((checkbox: any) => checkbox.value);
    };
    case 'radio': return () => {
      const nodeList = document.querySelectorAll(`input[name="${el.name}"]`);
      const elm = find(toArray(nodeList), (e: any) => e.checked);

      return elm && elm.value;
    };
    case 'file': return (context) => {
      return toArray(el.files);
    };
    case 'select-multiple': return () => {
      return toArray(el.options).filter(opt => opt.selected).map(opt => opt.value);
    };
    default: return () => {
      return el && el.value;
    };
    }
  }
}
