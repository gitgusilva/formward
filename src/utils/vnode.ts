// VNode Utils - Vue 2 & Vue 3 compatible
import { find, isCallable, isNullOrUndefined, isTextInput } from './index';

function getVNodeData (vnode) {
  return vnode.props || vnode.data || {};
}

function getVNodeDirectives (vnode) {
  const data = getVNodeData(vnode);
  return data.directives || [];
}

function isComponentVNode (vnode) {
  return !!(vnode.type && typeof vnode.type === 'object') || !!vnode.componentOptions;
}

// Gets the model object on the vnode (Vue 2 and Vue 3).
export function findModel (vnode) {
  if (!vnode) return null;

  const data = getVNodeData(vnode);

  // Vue 2: data.model or directive
  if (vnode.data) {
    if (vnode.data.model) return vnode.data.model;
    const dir = find(vnode.data.directives || [], d => d.name === 'model');
    if (dir) return dir;
  }

  // Vue 3: modelValue prop + onUpdate:modelValue
  if (vnode.props && ('modelValue' in vnode.props || 'value' in vnode.props)) {
    const prop = 'modelValue' in vnode.props ? 'modelValue' : 'value';
    const event = prop === 'modelValue' ? 'update:modelValue' : 'input';
    return {
      expression: null,
      value: vnode.props[prop],
      modifiers: {},
      prop,
      event
    };
  }

  return null;
}

function extractChildren (vnode) {
  if (Array.isArray(vnode)) {
    return vnode;
  }

  if (Array.isArray(vnode.children)) {
    return vnode.children;
  }

  // Vue 2
  if (vnode.componentOptions && Array.isArray(vnode.componentOptions.children)) {
    return vnode.componentOptions.children;
  }

  return [];
}

export function extractVNodes (vnode) {
  if (findModel(vnode)) {
    return [vnode];
  }

  const children = extractChildren(vnode);

  return children.reduce((nodes, node) => {
    const candidates = extractVNodes(node);
    if (candidates.length) {
      nodes.push(...candidates);
    }

    return nodes;
  }, []);
}

// Resolves v-model config if exists (Vue 2 and Vue 3).
export function findModelConfig (vnode) {
  if (isComponentVNode(vnode)) {
    const type = vnode.type || (vnode.componentOptions && vnode.componentOptions.Ctor);
    if (type && type.model) return type.model;
    if (type && type.props) {
      const hasModelValue = type.props.modelValue !== undefined || type.props.value !== undefined;
      return hasModelValue ? { prop: 'modelValue', event: 'update:modelValue' } : { prop: 'value', event: 'input' };
    }
    if (vnode.componentOptions && vnode.componentOptions.Ctor && vnode.componentOptions.Ctor.options) {
      return vnode.componentOptions.Ctor.options.model || { prop: 'value', event: 'input' };
    }
    return { prop: 'modelValue', event: 'update:modelValue' };
  }
  return null;
}

function toEventKey (eventName) {
  return 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
}

// Adds a listener to vnode listener object.
export function mergeVNodeListeners (obj, eventName, handler) {
  const key = toEventKey(eventName);
  if (isCallable(obj[key])) {
    const prevHandler = obj[key];
    obj[key] = [prevHandler];
  }
  if (isNullOrUndefined(obj[key])) {
    obj[key] = [];
  }
  obj[key].push(handler);
}

// Vue 2 used data.on; Vue 3 uses props with onXxx.
function addNativeNodeListener (node, eventName, handler) {
  const key = toEventKey(eventName);
  const data = getVNodeData(node);
  const on = node.data && node.data.on ? node.data.on : (node.props || {});
  if (!node.props) node.props = {};
  const target = node.props;
  if (isCallable(target[key])) {
    target[key] = [target[key]];
  }
  if (isNullOrUndefined(target[key])) {
    target[key] = [];
  }
  target[key].push(handler);
}

function addComponentNodeListener (node, eventName, handler) {
  const opts = node.props || (node.componentOptions && node.componentOptions.listeners) || {};
  if (!node.props) node.props = {};
  const key = toEventKey(eventName);
  if (isCallable(node.props[key])) node.props[key] = [node.props[key]];
  if (!node.props[key]) node.props[key] = [];
  node.props[key].push(handler);
}

export function addVNodeListener (vnode, eventName, handler) {
  if (isComponentVNode(vnode)) {
    addComponentNodeListener(vnode, eventName, handler);
    return;
  }
  addNativeNodeListener(vnode, eventName, handler);
}

export function getInputEventName (vnode, model) {
  if (isComponentVNode(vnode)) {
    const { event } = findModelConfig(vnode) || { event: 'input' };
    return event;
  }

  const data = getVNodeData(vnode);
  const attrs = data.attrs || data;

  const tag = vnode.type || vnode.tag;
  if ((model && model.modifiers && model.modifiers.lazy) || tag === 'select') {
    return 'change';
  }

  if (attrs && isTextInput({ type: attrs.type || 'text' } as HTMLInputElement)) {
    return 'input';
  }

  return 'change';
}

export function normalizeSlots (slots, ctx) {
  return Object.keys(slots).reduce((arr, key) => {
    const slotContent = slots[key];
    const list = Array.isArray(slotContent) ? slotContent : [slotContent];
    list.forEach((vnode) => {
      if (vnode && !vnode.ctx && !vnode.context && ctx) {
        vnode.ctx = ctx;
        vnode.context = ctx;
      }
    });
    return arr.concat(list);
  }, []);
}

export function createRenderless (h, children) {
  if (Array.isArray(children) && children[0]) {
    return children[0];
  }
  if (children) {
    return children;
  }
  return h();
}
